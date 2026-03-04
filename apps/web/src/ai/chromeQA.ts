import type { QAProvider } from './types'
import { fitsInContext, chunkByParagraphs, relevanceScore } from './textUtils'

/** Conservative token limit for Chrome Prompt API (context size not exposed). */
const CHROME_QA_MAX_TOKENS = 4000

export function createChromeQA(): QAProvider {
  let cancelled = false
  let instance: LanguageModelInstance | null = null

  return {
    id: 'chrome',
    label: 'Chrome Prompt API',
    description: 'On-device · Private',

    async checkAvailability() {
      if (typeof LanguageModel === 'undefined') return 'unavailable'
      try {
        return await LanguageModel.availability()
      } catch {
        return 'unavailable'
      }
    },

    async run(text, options, { onDownloadProgress, onRunning }) {
      cancelled = false
      instance = null

      const created = await LanguageModel.create({
        systemPrompt: 'You are a helpful assistant. Answer the user\'s question using ONLY the provided text as context. If the answer cannot be found in the text, say so. Be concise and direct.',
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            if (onDownloadProgress && e.total > 0) {
              onDownloadProgress(e.loaded / e.total)
            }
          })
        },
      })

      if (cancelled) {
        created.destroy()
        throw new DOMException('Cancelled', 'AbortError')
      }

      instance = created
      onRunning?.()

      // If text exceeds context, pick the most relevant chunk
      let inputText = text
      if (!fitsInContext(text, CHROME_QA_MAX_TOKENS)) {
        const chunks = chunkByParagraphs(text, CHROME_QA_MAX_TOKENS)
        let bestIdx = 0
        let bestScore = -1
        for (let i = 0; i < chunks.length; i++) {
          const score = relevanceScore(chunks[i], options.question)
          if (score > bestScore) {
            bestScore = score
            bestIdx = i
          }
        }
        inputText = chunks[bestIdx]
      }

      const result = await created.prompt(
        `Context:\n${inputText}\n\nQuestion: ${options.question}`,
      )
      created.destroy()
      instance = null

      if (cancelled) {
        throw new DOMException('Cancelled', 'AbortError')
      }

      return result
    },

    cancel() {
      cancelled = true
      if (instance) {
        instance.destroy()
        instance = null
      }
    },
  }
}

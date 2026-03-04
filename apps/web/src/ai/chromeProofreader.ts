import type { ProofreaderProvider, ProofResult } from './types'
import { fitsInContext, chunkByParagraphs } from './textUtils'

/** Conservative token limit for Chrome Proofreader (context size not exposed). */
const CHROME_PROOFREADER_MAX_TOKENS = 4000

export function createChromeProofreader(): ProofreaderProvider {
  let cancelled = false
  let instance: ProofreaderInstance | null = null

  return {
    id: 'chrome',
    label: 'Chrome Proofreader',
    description: 'On-device \u00b7 Private',

    async checkAvailability() {
      if (typeof Proofreader === 'undefined') return 'unavailable'
      try {
        return await Proofreader.availability({ expectedInputLanguages: ['en'] })
      } catch {
        return 'unavailable'
      }
    },

    async run(text, { onDownloadProgress, onRunning }) {
      cancelled = false
      instance = null

      const created = await Proofreader.create({
        expectedInputLanguages: ['en'],
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

      // Short text — single pass
      if (fitsInContext(text, CHROME_PROOFREADER_MAX_TOKENS)) {
        const result = await created.proofread(text)
        created.destroy()
        instance = null

        if (cancelled) throw new DOMException('Cancelled', 'AbortError')

        return {
          corrections: result.corrections.map(c => ({
            startIndex: c.startIndex,
            endIndex: c.endIndex,
            correction: c.correction,
          })),
        }
      }

      // Long text — chunk, proofread each, adjust offsets
      const chunks = chunkByParagraphs(text, CHROME_PROOFREADER_MAX_TOKENS)
      const allCorrections: ProofResult['corrections'] = []

      let searchFrom = 0
      const chunkOffsets: number[] = []
      for (const chunk of chunks) {
        const idx = text.indexOf(chunk, searchFrom)
        chunkOffsets.push(idx >= 0 ? idx : searchFrom)
        searchFrom = (idx >= 0 ? idx : searchFrom) + chunk.length
      }

      for (let i = 0; i < chunks.length; i++) {
        if (cancelled) {
          created.destroy()
          instance = null
          throw new DOMException('Cancelled', 'AbortError')
        }

        const result = await created.proofread(chunks[i])
        const offset = chunkOffsets[i]
        for (const c of result.corrections) {
          allCorrections.push({
            startIndex: c.startIndex + offset,
            endIndex: c.endIndex + offset,
            correction: c.correction,
          })
        }
      }

      created.destroy()
      instance = null

      if (cancelled) throw new DOMException('Cancelled', 'AbortError')
      return { corrections: allCorrections }
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

import type { QAProvider } from './types'
import { sendWorkerRequest, getWorkerCapabilities } from './transformersWorkerClient'
import { getWebGPUModel } from './modelConfig'
import { fitsInContext, chunkByParagraphs, relevanceScore } from './textUtils'

export function createTransformersQA(): QAProvider {
  let cancelFn: (() => void) | null = null
  let resolvedLabel = 'Local AI'
  let resolvedDescription = 'On-device via transformers.js'

  return {
    id: 'transformers',
    get label() { return resolvedLabel },
    get description() { return resolvedDescription },

    async checkAvailability() {
      const caps = await getWorkerCapabilities()
      if (caps.device !== 'webgpu') {
        return 'unavailable'
      }
      const model = getWebGPUModel()
      resolvedLabel = `Local AI (${model.shortLabel})`
      resolvedDescription = model.description
      try {
        const cache = await caches.open('transformers-cache')
        const keys = await cache.keys()
        const hasCached = keys.some(k => k.url.includes(model.cachePattern))
        return hasCached ? 'available' : 'downloadable'
      } catch {
        return 'downloadable'
      }
    },

    async run(text, options, callbacks) {
      const model = getWebGPUModel()
      let inputText = text

      // If text exceeds context, pick the most relevant chunk
      if (!fitsInContext(text, model.maxInputTokens)) {
        const chunks = chunkByParagraphs(text, model.maxInputTokens)
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

      const { promise, cancel } = sendWorkerRequest(
        { type: 'qa', text: inputText, question: options.question },
        {
          onDownloadProgress: callbacks.onDownloadProgress,
          onRunning: callbacks.onRunning,
        },
      )

      cancelFn = cancel

      const response = await promise
      cancelFn = null

      if (response.type !== 'qa-result') {
        throw new Error('Unexpected response from worker')
      }

      return response.answer
    },

    cancel() {
      cancelFn?.()
      cancelFn = null
    },
  }
}

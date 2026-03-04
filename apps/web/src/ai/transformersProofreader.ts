import type { ProofreaderProvider, ProofResult } from './types'
import { sendWorkerRequest, getWorkerCapabilities } from './transformersWorkerClient'
import { computeCorrections } from './diffCorrections'
import { getWebGPUModel, getWasmModel } from './modelConfig'
import { fitsInContext, chunkByParagraphs } from './textUtils'

export function createTransformersProofreader(): ProofreaderProvider {
  let cancelFn: (() => void) | null = null
  let resolvedLabel = 'Local AI'
  let resolvedDescription = 'On-device via transformers.js'

  return {
    id: 'transformers',
    get label() { return resolvedLabel },
    get description() { return resolvedDescription },

    async checkAvailability() {
      const caps = await getWorkerCapabilities()
      const model = caps.device === 'webgpu' ? getWebGPUModel() : getWasmModel('proofread')
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

    async run(text, callbacks) {
      const caps = await getWorkerCapabilities()
      const model = caps.device === 'webgpu' ? getWebGPUModel() : getWasmModel('proofread')
      const maxTokens = model.maxInputTokens

      // Short text — single pass (existing behavior)
      if (fitsInContext(text, maxTokens)) {
        const { promise, cancel } = sendWorkerRequest(
          { type: 'proofread', text },
          {
            onDownloadProgress: callbacks.onDownloadProgress,
            onRunning: callbacks.onRunning,
          },
        )
        cancelFn = cancel
        const response = await promise
        cancelFn = null

        if (response.type !== 'proofread-result') {
          throw new Error('Unexpected response from worker')
        }
        return { corrections: computeCorrections(text, response.correctedText) }
      }

      // Long text — chunk, proofread each, adjust offsets
      const chunks = chunkByParagraphs(text, maxTokens)
      const allCorrections: ProofResult['corrections'] = []

      // Find each chunk's character offset in the original text
      let searchFrom = 0
      const chunkOffsets: number[] = []
      for (const chunk of chunks) {
        const idx = text.indexOf(chunk, searchFrom)
        chunkOffsets.push(idx >= 0 ? idx : searchFrom)
        searchFrom = (idx >= 0 ? idx : searchFrom) + chunk.length
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunkCallbacks = i === 0
          ? { onDownloadProgress: callbacks.onDownloadProgress, onRunning: callbacks.onRunning }
          : { onRunning: callbacks.onRunning }

        const { promise, cancel } = sendWorkerRequest(
          { type: 'proofread', text: chunks[i] },
          chunkCallbacks,
        )
        cancelFn = cancel
        const response = await promise
        cancelFn = null

        if (response.type !== 'proofread-result') {
          throw new Error('Unexpected response from worker')
        }

        const chunkCorrections = computeCorrections(chunks[i], response.correctedText)
        const offset = chunkOffsets[i]
        for (const c of chunkCorrections) {
          allCorrections.push({
            startIndex: c.startIndex + offset,
            endIndex: c.endIndex + offset,
            correction: c.correction,
          })
        }
      }

      return { corrections: allCorrections }
    },

    cancel() {
      cancelFn?.()
      cancelFn = null
    },
  }
}

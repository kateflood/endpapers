import type { ProofreaderProvider, ProofResult } from './types'
import { sendWorkerRequest, getWorkerCapabilities } from './transformersWorkerClient'
import { computeCorrections } from './diffCorrections'
import { getWebGPUModel, getWasmModel } from './modelConfig'

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

      const corrections = computeCorrections(text, response.correctedText)
      const result: ProofResult = { corrections }
      return result
    },

    cancel() {
      cancelFn?.()
      cancelFn = null
    },
  }
}

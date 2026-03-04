import type { SummarizerProvider } from './types'
import { sendWorkerRequest, getWorkerCapabilities } from './transformersWorkerClient'
import { getWebGPUModel, getWasmModel } from './modelConfig'

/** Map summary length option to token limits (WASM fallback path). */
function lengthToTokens(length: string): { maxLength: number; minLength: number } {
  switch (length) {
    case 'short':  return { maxLength: 50, minLength: 10 }
    case 'long':   return { maxLength: 250, minLength: 80 }
    case 'medium':
    default:       return { maxLength: 130, minLength: 30 }
  }
}

export function createTransformersSummarizer(): SummarizerProvider {
  let cancelFn: (() => void) | null = null
  let resolvedLabel = 'Local AI'
  let resolvedDescription = 'On-device via transformers.js'

  return {
    id: 'transformers',
    get label() { return resolvedLabel },
    get description() { return resolvedDescription },

    async checkAvailability() {
      const caps = await getWorkerCapabilities()
      const model = caps.device === 'webgpu' ? getWebGPUModel() : getWasmModel('summarize')
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
      const { maxLength, minLength } = lengthToTokens(options.length)

      const { promise, cancel } = sendWorkerRequest(
        {
          type: 'summarize',
          text,
          options: {
            maxLength,
            minLength,
            summaryType: options.type,
            summaryLength: options.length,
          },
        },
        {
          onDownloadProgress: callbacks.onDownloadProgress,
          onRunning: callbacks.onRunning,
        },
      )

      cancelFn = cancel

      const response = await promise
      cancelFn = null

      if (response.type !== 'summarize-result') {
        throw new Error('Unexpected response from worker')
      }

      return response.summary
    },

    cancel() {
      cancelFn?.()
      cancelFn = null
    },
  }
}

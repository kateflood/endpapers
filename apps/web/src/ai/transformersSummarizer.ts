import type { SectionInput, SummarizerProvider } from './types'
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

async function summarizeOne(
  text: string,
  options: { type: string; length: string },
  callbacks: {
    onDownloadProgress?: (progress: number) => void
    onRunning?: () => void
  },
): Promise<{ summary: string; cancel: () => void }> {
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

  const response = await promise

  if (response.type !== 'summarize-result') {
    throw new Error('Unexpected response from worker')
  }

  return { summary: response.summary, cancel }
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
      // Single section — summarize directly
      if (typeof text === 'string') {
        const { summary, cancel } = await summarizeOne(text, options, callbacks)
        cancelFn = cancel
        cancelFn = null
        return summary
      }

      // Multiple sections — summarize each independently
      const sections = text as SectionInput[]
      const results: string[] = []

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        callbacks.onSectionProgress?.(i + 1, sections.length, section.title)

        const sectionCallbacks = i === 0
          ? callbacks
          : { onRunning: callbacks.onRunning }

        const { summary, cancel } = await summarizeOne(
          section.text,
          options,
          sectionCallbacks,
        )
        cancelFn = cancel
        cancelFn = null

        results.push(`## ${section.title}\n\n${summary}`)
      }

      return results.join('\n\n')
    },

    cancel() {
      cancelFn?.()
      cancelFn = null
    },
  }
}

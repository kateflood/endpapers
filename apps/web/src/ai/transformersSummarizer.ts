import type { SectionInput, SummarizerProvider } from './types'
import { sendWorkerRequest, getWorkerCapabilities } from './transformersWorkerClient'
import { getWebGPUModel, getWasmModel } from './modelConfig'
import { fitsInContext, chunkByParagraphs } from './textUtils'

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
      const caps = await getWorkerCapabilities()
      const model = caps.device === 'webgpu' ? getWebGPUModel() : getWasmModel('summarize')
      const maxTokens = model.maxInputTokens

      // Single section — may need chunking if oversized
      if (typeof text === 'string') {
        const chunks = fitsInContext(text, maxTokens)
          ? [text]
          : chunkByParagraphs(text, maxTokens)

        if (chunks.length === 1) {
          const { summary, cancel } = await summarizeOne(text, options, callbacks)
          cancelFn = cancel
          cancelFn = null
          return summary
        }

        const results: string[] = []
        for (let i = 0; i < chunks.length; i++) {
          callbacks.onSectionProgress?.(i + 1, chunks.length, `Part ${i + 1}`)
          const chunkCallbacks = i === 0 ? callbacks : { onRunning: callbacks.onRunning }
          const { summary, cancel } = await summarizeOne(chunks[i], options, chunkCallbacks)
          cancelFn = cancel
          cancelFn = null
          results.push(summary)
        }
        return results.join('\n\n')
      }

      // Multiple sections — summarize each, chunking oversized ones
      const sections = text as SectionInput[]
      const results: string[] = []
      // Pre-compute total work units for progress
      const work: Array<{ title: string; chunks: string[] }> = sections.map(s => ({
        title: s.title,
        chunks: fitsInContext(s.text, maxTokens) ? [s.text] : chunkByParagraphs(s.text, maxTokens),
      }))
      const totalUnits = work.reduce((n, w) => n + w.chunks.length, 0)
      let completedUnits = 0

      for (const { title, chunks } of work) {
        const sectionSummaries: string[] = []
        for (let j = 0; j < chunks.length; j++) {
          completedUnits++
          const progressLabel = chunks.length > 1 ? `${title} (part ${j + 1}/${chunks.length})` : title
          callbacks.onSectionProgress?.(completedUnits, totalUnits, progressLabel)

          const chunkCallbacks = completedUnits === 1 ? callbacks : { onRunning: callbacks.onRunning }
          const { summary, cancel } = await summarizeOne(chunks[j], options, chunkCallbacks)
          cancelFn = cancel
          cancelFn = null
          sectionSummaries.push(summary)
        }
        results.push(`## ${title}\n\n${sectionSummaries.join('\n\n')}`)
      }

      return results.join('\n\n')
    },

    cancel() {
      cancelFn?.()
      cancelFn = null
    },
  }
}

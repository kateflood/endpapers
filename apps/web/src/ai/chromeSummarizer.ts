import type { SectionInput, SummarizerProvider } from './types'
import { fitsInContext, chunkByParagraphs } from './textUtils'

/** Conservative token limit for Chrome Summarizer (context size not exposed). */
const CHROME_SUMMARIZER_MAX_TOKENS = 4000

export function createChromeSummarizer(): SummarizerProvider {
  let cancelled = false
  let instance: SummarizerInstance | null = null

  async function createInstance(
    options: { type: string; length: string },
    onDownloadProgress?: (progress: number) => void,
  ): Promise<SummarizerInstance> {
    return Summarizer.create({
      type: options.type as SummarizerType,
      format: 'markdown',
      length: options.length as SummarizerLength,
      expectedInputLanguages: ['en'],
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          if (onDownloadProgress && e.total > 0) {
            onDownloadProgress(e.loaded / e.total)
          }
        })
      },
    })
  }

  return {
    id: 'chrome',
    label: 'Chrome Summarizer',
    description: 'On-device · Private',

    async checkAvailability() {
      if (typeof Summarizer === 'undefined') return 'unavailable'
      try {
        return await Summarizer.availability({ expectedInputLanguages: ['en'] })
      } catch {
        return 'unavailable'
      }
    },

    async run(text, options, { onDownloadProgress, onRunning, onSectionProgress }) {
      cancelled = false
      instance = null

      const created = await createInstance(options, onDownloadProgress)

      if (cancelled) {
        created.destroy()
        throw new DOMException('Cancelled', 'AbortError')
      }

      instance = created
      onRunning?.()

      /** Summarize a single chunk of text. */
      async function summarizeChunk(chunk: string, context: string): Promise<string> {
        if (cancelled) {
          created.destroy()
          instance = null
          throw new DOMException('Cancelled', 'AbortError')
        }
        return created.summarize(chunk, { context })
      }

      /** Summarize a text that may need chunking. */
      async function summarizeText(fullText: string, context: string): Promise<string> {
        const chunks = fitsInContext(fullText, CHROME_SUMMARIZER_MAX_TOKENS)
          ? [fullText]
          : chunkByParagraphs(fullText, CHROME_SUMMARIZER_MAX_TOKENS)

        const summaries: string[] = []
        for (const chunk of chunks) {
          summaries.push(await summarizeChunk(chunk, context))
        }
        return summaries.join('\n\n')
      }

      // Single section
      if (typeof text === 'string') {
        const result = await summarizeText(text, 'This is a section from a creative writing project.')
        created.destroy()
        instance = null

        if (cancelled) throw new DOMException('Cancelled', 'AbortError')
        return result
      }

      // Multiple sections — summarize each, chunking oversized ones
      const sections = text as SectionInput[]
      const work = sections.map(s => ({
        title: s.title,
        chunks: fitsInContext(s.text, CHROME_SUMMARIZER_MAX_TOKENS)
          ? [s.text]
          : chunkByParagraphs(s.text, CHROME_SUMMARIZER_MAX_TOKENS),
      }))
      const totalUnits = work.reduce((n, w) => n + w.chunks.length, 0)
      let completedUnits = 0
      const results: string[] = []

      for (const { title, chunks } of work) {
        const sectionSummaries: string[] = []
        for (let j = 0; j < chunks.length; j++) {
          completedUnits++
          const label = chunks.length > 1 ? `${title} (part ${j + 1}/${chunks.length})` : title
          onSectionProgress?.(completedUnits, totalUnits, label)

          sectionSummaries.push(await summarizeChunk(
            chunks[j],
            `This is a section titled "${title}" from a creative writing project.`,
          ))
        }
        results.push(`## ${title}\n\n${sectionSummaries.join('\n\n')}`)
      }

      created.destroy()
      instance = null

      if (cancelled) throw new DOMException('Cancelled', 'AbortError')
      return results.join('\n\n')
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

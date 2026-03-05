import type { SectionInput, SummarizerProvider } from './types'
import { fitsInContext, chunkByParagraphs } from './textUtils'

/** Fallback token limit if inputQuota is not available. */
const FALLBACK_MAX_TOKENS = 4000

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

      const maxTokens = created.inputQuota || FALLBACK_MAX_TOKENS

      /** Check cancellation and throw if cancelled. */
      function checkCancelled() {
        if (cancelled) {
          created.destroy()
          instance = null
          throw new DOMException('Cancelled', 'AbortError')
        }
      }

      /** Summarize a single chunk of text. */
      async function summarizeChunk(chunk: string, context: string): Promise<string> {
        checkCancelled()
        return created.summarize(chunk, { context })
      }

      /** Summarize text that may need chunking, with optional summary-of-summaries reduce. */
      async function summarizeText(fullText: string, context: string, reduce: boolean): Promise<string> {
        const chunks = fitsInContext(fullText, maxTokens)
          ? [fullText]
          : chunkByParagraphs(fullText, maxTokens)

        if (chunks.length === 1) {
          return summarizeChunk(chunks[0], context)
        }

        // Summarize each chunk individually
        const summaries: string[] = []
        for (const chunk of chunks) {
          summaries.push(await summarizeChunk(chunk, context))
        }

        if (!reduce) {
          return summaries.join('\n\n')
        }

        // Recursive summary-of-summaries: greedily pack partial summaries
        // into groups that fit the input quota, then re-summarize
        return reduceSummaries(summaries, context)
      }

      /**
       * Recursively reduce an array of summaries into a single summary.
       * Groups partial summaries that fit within inputQuota, summarizes
       * each group, and recurses until only one group remains.
       */
      async function reduceSummaries(summaries: string[], context: string): Promise<string> {
        const groups: string[] = []
        let currentGroup: string[] = []

        for (const summary of summaries) {
          checkCancelled()
          const candidate = [...currentGroup, summary].join('\n')

          // Use measureInputUsage if available, otherwise estimate
          let fits: boolean
          if (typeof created.measureInputUsage === 'function') {
            const usage = await created.measureInputUsage(candidate)
            fits = usage <= maxTokens
          } else {
            fits = fitsInContext(candidate, maxTokens)
          }

          if (!fits && currentGroup.length > 0) {
            groups.push(currentGroup.join('\n'))
            currentGroup = [summary]
          } else {
            currentGroup.push(summary)
          }
        }
        if (currentGroup.length > 0) {
          groups.push(currentGroup.join('\n'))
        }

        if (groups.length === 1) {
          // Final pass — one last summarization to produce a cohesive result
          return summarizeChunk(groups[0], context)
        }

        // Multiple groups — summarize each group, then recurse
        const groupSummaries: string[] = []
        for (const group of groups) {
          groupSummaries.push(await summarizeChunk(group, context))
        }
        return reduceSummaries(groupSummaries, context)
      }

      const isShort = options.length === 'short'

      // Single section
      if (typeof text === 'string') {
        const result = await summarizeText(
          text,
          'This is a section from a creative writing project.',
          isShort,
        )
        created.destroy()
        instance = null

        if (cancelled) throw new DOMException('Cancelled', 'AbortError')
        return result
      }

      // Multiple sections — summarize each, chunking oversized ones
      const sections = text as SectionInput[]
      const work = sections.map(s => ({
        title: s.title,
        chunks: fitsInContext(s.text, maxTokens)
          ? [s.text]
          : chunkByParagraphs(s.text, maxTokens),
      }))
      const totalUnits = work.reduce((n, w) => n + w.chunks.length, 0)
      let completedUnits = 0
      const results: string[] = []

      for (const { title, chunks } of work) {
        const context = `This is a section titled "${title}" from a creative writing project.`
        const sectionSummaries: string[] = []

        for (let j = 0; j < chunks.length; j++) {
          completedUnits++
          const label = chunks.length > 1 ? `${title} (part ${j + 1}/${chunks.length})` : title
          onSectionProgress?.(completedUnits, totalUnits, label)
          sectionSummaries.push(await summarizeChunk(chunks[j], context))
        }

        // For short: reduce chunk summaries within a section to one summary
        if (isShort && sectionSummaries.length > 1) {
          const reduced = await reduceSummaries(sectionSummaries, context)
          results.push(`## ${title}\n\n${reduced}`)
        } else {
          results.push(`## ${title}\n\n${sectionSummaries.join('\n\n')}`)
        }
      }

      // For short with multiple sections: do a final reduce across all section summaries
      if (isShort && results.length > 1) {
        const allSummaryText = results.join('\n\n')
        const finalResult = await summarizeText(
          allSummaryText,
          'These are summaries of sections from a creative writing project. Produce a single cohesive summary.',
          true,
        )
        created.destroy()
        instance = null
        if (cancelled) throw new DOMException('Cancelled', 'AbortError')
        return finalResult
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

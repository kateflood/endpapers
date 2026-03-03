import type { SummarizerProvider } from './types'

export function createChromeSummarizer(): SummarizerProvider {
  let cancelled = false
  let instance: SummarizerInstance | null = null

  return {
    id: 'chrome',
    label: 'Chrome Summarizer',
    description: 'On-device \u00b7 Private',

    async checkAvailability() {
      if (typeof Summarizer === 'undefined') return 'unavailable'
      try {
        return await Summarizer.availability({ expectedInputLanguages: ['en'] })
      } catch {
        return 'unavailable'
      }
    },

    async run(text, options, { onDownloadProgress, onRunning }) {
      cancelled = false
      instance = null

      const created = await Summarizer.create({
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

      if (cancelled) {
        created.destroy()
        throw new DOMException('Cancelled', 'AbortError')
      }

      instance = created
      onRunning?.()

      const result = await created.summarize(text, {
        context: 'This is a section from a creative writing project.',
      })
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

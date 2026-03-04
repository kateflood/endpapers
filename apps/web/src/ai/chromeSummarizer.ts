import type { SectionInput, SummarizerProvider } from './types'

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

      // Single section
      if (typeof text === 'string') {
        const result = await created.summarize(text, {
          context: 'This is a section from a creative writing project.',
        })
        created.destroy()
        instance = null

        if (cancelled) throw new DOMException('Cancelled', 'AbortError')
        return result
      }

      // Multiple sections — summarize each independently
      const sections = text as SectionInput[]
      const results: string[] = []

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        onSectionProgress?.(i + 1, sections.length, section.title)

        if (cancelled) {
          created.destroy()
          instance = null
          throw new DOMException('Cancelled', 'AbortError')
        }

        const result = await created.summarize(section.text, {
          context: `This is a section titled "${section.title}" from a creative writing project.`,
        })
        results.push(`## ${section.title}\n\n${result}`)
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

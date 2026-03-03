import type { ProofreaderProvider, ProofResult } from './types'

export function createChromeProofreader(): ProofreaderProvider {
  let cancelled = false
  let instance: ProofreaderInstance | null = null

  return {
    id: 'chrome',
    label: 'Chrome Proofreader',
    description: 'On-device \u00b7 Private',

    async checkAvailability() {
      if (typeof Proofreader === 'undefined') return 'unavailable'
      try {
        return await Proofreader.availability({ expectedInputLanguages: ['en'] })
      } catch {
        return 'unavailable'
      }
    },

    async run(text, { onDownloadProgress, onRunning }) {
      cancelled = false
      instance = null

      const created = await Proofreader.create({
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

      const result = await created.proofread(text)
      created.destroy()
      instance = null

      if (cancelled) {
        throw new DOMException('Cancelled', 'AbortError')
      }

      const proofResult: ProofResult = {
        corrections: result.corrections.map(c => ({
          startIndex: c.startIndex,
          endIndex: c.endIndex,
          correction: c.correction,
        })),
      }

      return proofResult
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

import { useEffect, useRef, useState } from 'react'
import type { WorkerLinter } from 'harper.js'

export function useHarperLinter(enabled: boolean): {
  linter: WorkerLinter | null
  isReady: boolean
} {
  const linterRef = useRef<WorkerLinter | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function init() {
      try {
        const { WorkerLinter, binaryInlined } = await import('harper.js')
        if (cancelled) return
        const linter = new WorkerLinter({ binary: binaryInlined })
        await linter.setup()
        if (cancelled) {
          linter.dispose()
          return
        }
        linterRef.current = linter
        setIsReady(true)
      } catch (err) {
        // Initialization failures are silent; isReady stays false
        if (!cancelled) console.error('Failed to load grammar checker:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      if (linterRef.current) {
        linterRef.current.dispose()
        linterRef.current = null
        setIsReady(false)
      }
    }
  }, [enabled])

  return { linter: linterRef.current, isReady }
}

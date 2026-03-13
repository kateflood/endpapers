import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkerLinter } from 'harper.js'
import { IconSpellCheck, IconLoader, IconClose, IconCheckCircle } from '../shared/icons'
import { CenteredState, actionBtnClass } from './shared'

export interface SpellLint {
  index: number
  span: { start: number; end: number }
  message: string
  suggestions: string[]
  originalText: string
}

interface SpellCheckPanelProps {
  linter: WorkerLinter | null
  isReady: boolean
  getEditorText: () => string
  onLintsChange: (lints: SpellLint[]) => void
  onApplyFix: (lint: SpellLint, suggestionIndex: number) => void
}

export default function SpellCheckPanel({
  linter, isReady, getEditorText, onLintsChange, onApplyFix,
}: SpellCheckPanelProps) {
  const [running, setRunning] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [lints, setLints] = useState<SpellLint[]>([])
  const [isStale, setIsStale] = useState(false)
  const lastCheckedTextRef = useRef<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function runCheck() {
    if (!linter || !isReady) return
    const text = getEditorText()
    setRunning(true)
    setIsStale(false)
    try {
      const rawLints = await linter.lint(text)
      lastCheckedTextRef.current = text

      const serialized: SpellLint[] = []
      for (let i = 0; i < rawLints.length; i++) {
        const lint = rawLints[i]
        const span = lint.span()
        const message = lint.message()
        const originalText = text.slice(span.start, span.end)
        const rawSuggestions = lint.suggestions()
        const suggestions: string[] = []
        for (const suggestion of rawSuggestions) {
          try {
            const corrected = await linter.applySuggestion(text, lint, suggestion)
            const newText = corrected.slice(span.start, corrected.length - (text.length - span.end))
            if (newText !== originalText) suggestions.push(newText)
          } catch {
            // Skip suggestions that fail to compute
          }
        }
        serialized.push({ index: i, span, message, suggestions, originalText })
      }

      setLints(serialized)
      onLintsChange(serialized)
      setHasRun(true)
    } finally {
      setRunning(false)
    }
  }

  // Auto-recheck after text changes (debounced 3s), only after first run
  const scheduleRecheck = useCallback(() => {
    if (!hasRun) return
    const currentText = getEditorText()
    if (currentText === lastCheckedTextRef.current) return
    setIsStale(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runCheck()
    }, 3000)
  }, [hasRun]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Poll for text changes to trigger auto-recheck
  useEffect(() => {
    if (!hasRun) return
    const interval = setInterval(scheduleRecheck, 1000)
    return () => clearInterval(interval)
  }, [hasRun, scheduleRecheck])

  function handleDismiss(lintIndex: number) {
    const updated = lints.filter(l => l.index !== lintIndex)
    setLints(updated)
    onLintsChange(updated)
  }

  if (!isReady) {
    return (
      <CenteredState
        icon={<IconLoader size={24} className="text-text-placeholder animate-spin" />}
        title="Loading grammar checker"
        subtitle="Setting up the on-device grammar engine…"
      />
    )
  }

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <IconLoader size={22} className="text-accent animate-spin" />
        <p className="text-[0.8125rem] text-text-secondary">Checking…</p>
      </div>
    )
  }

  if (!hasRun) {
    return (
      <CenteredState
        icon={<IconSpellCheck size={24} className="text-text-placeholder" />}
        title="Grammar & spell check"
        subtitle="Check this section for spelling mistakes, grammar issues, and style suggestions."
      >
        <button className={actionBtnClass} onClick={runCheck}>
          Check this section
        </button>
      </CenteredState>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-[0.8125rem] font-medium text-text">
            {lints.length === 0 ? 'No issues' : `${lints.length} issue${lints.length === 1 ? '' : 's'}`}
          </span>
          {isStale && (
            <span className="text-[0.6875rem] text-text-placeholder italic">stale</span>
          )}
        </div>
        <button
          className="text-[0.75rem] text-accent hover:text-accent/80 cursor-pointer transition-colors"
          onClick={runCheck}
        >
          Re-check
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {lints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-hover flex items-center justify-center">
              <IconCheckCircle size={22} className="text-green-500" />
            </div>
            <p className="text-[0.9375rem] font-medium text-text">No issues found</p>
            <p className="text-[0.8125rem] text-text-secondary">Your writing looks good!</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/40">
            {lints.map(lint => (
              <LintCard
                key={lint.index}
                lint={lint}
                onApply={i => onApplyFix(lint, i)}
                onDismiss={() => handleDismiss(lint.index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LintCard({
  lint, onApply, onDismiss,
}: {
  lint: SpellLint
  onApply: (suggestionIndex: number) => void
  onDismiss: () => void
}) {
  return (
    <div className="px-4 py-3 group/lint">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-[0.8125rem] text-text leading-snug">{lint.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-sm text-text-placeholder hover:text-text hover:bg-hover transition-colors cursor-pointer opacity-0 group-hover/lint:opacity-100"
          title="Dismiss"
        >
          <IconClose size={11} />
        </button>
      </div>
      {lint.originalText && (
        <code className="text-[0.75rem] text-text-secondary bg-hover px-1.5 py-0.5 rounded-sm mb-2 inline-block max-w-full truncate">
          {lint.originalText}
        </code>
      )}
      {lint.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {lint.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onApply(i)}
              className="px-2 py-0.5 text-[0.75rem] bg-accent/10 text-accent rounded-sm hover:bg-accent/20 transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

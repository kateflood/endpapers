import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { IconSpellCheck, IconCheckCircle, IconDownload, IconLoader } from '../icons'
import type { ProviderAvailability, ProofreaderProvider } from '../../ai/types'
import { getProofreaderProviders } from '../../ai/providers'
import { CorrectionCard, type TrackedCorrection } from './CorrectionCard'
import {
  type ToolState,
  actionBtnClass, cancelBtnClass,
  DownloadProgressBar, CenteredState, AvailabilityBadge,
} from './shared'

interface ProofreaderTabProps {
  getEditorText: () => string
  applyCorrection: (startIndex: number, endIndex: number, replacement: string) => void
  highlightTextRange: (startIndex: number, endIndex: number) => void
  clearHighlight: () => void
}

export default function ProofreaderTab({
  getEditorText, applyCorrection, highlightTextRange, clearHighlight,
}: ProofreaderTabProps) {
  const { showToast } = useToast()

  // Provider (resolved once on mount)
  const [provider] = useState<ProofreaderProvider>(() => getProofreaderProviders()[0])

  // Availability
  const [availability, setAvailability] = useState<ProviderAvailability | 'checking'>('checking')

  // Tool state
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [corrections, setCorrections] = useState<TrackedCorrection[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const activeProviderRef = useRef<ProofreaderProvider | null>(null)

  // Scroll active correction into view + highlight in editor
  const activeCardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    if (activeIndex >= 0 && activeIndex < corrections.length) {
      const tracked = corrections[activeIndex]
      if (tracked.status === 'pending') {
        highlightTextRange(tracked.correction.startIndex, tracked.correction.endIndex)
      }
    } else {
      clearHighlight()
    }
  }, [activeIndex])

  // Check availability on mount
  useEffect(() => {
    provider.checkAvailability()
      .then(setAvailability)
      .catch(() => setAvailability('unavailable'))
  }, [])

  // ── Handlers ──────────────────────────────────────────────────

  async function handleRun() {
    const text = getEditorText()
    if (!text.trim()) {
      showToast('No text to proofread. Write something first.', 'info')
      return
    }
    clearHighlight()
    setToolState('downloading')
    setProgress(null)
    setCorrections([])
    setActiveIndex(0)

    const runProvider = getProofreaderProviders()[0]
    activeProviderRef.current = runProvider

    try {
      const result = await runProvider.run(text, {
        onDownloadProgress(p) { setProgress(p) },
        onRunning() { setToolState('running'); setProgress(null) },
      })

      activeProviderRef.current = null

      const tracked: TrackedCorrection[] = result.corrections.map(c => ({
        correction: c,
        originalText: text.slice(c.startIndex, c.endIndex),
        status: 'pending',
      }))
      setCorrections(tracked)
      setActiveIndex(tracked.length > 0 ? 0 : -1)
      setToolState('results')
    } catch (err) {
      activeProviderRef.current = null
      if (err instanceof DOMException && err.name === 'AbortError') return
      showToast('Proofreading failed. The model may not be available.', 'error')
      console.error('Proofreader error:', err)
      setToolState('idle')
    }
  }

  function handleCancel() {
    if (activeProviderRef.current) {
      activeProviderRef.current.cancel()
      activeProviderRef.current = null
    }
    clearHighlight()
    setToolState('idle')
    setProgress(null)
  }

  function advanceToNext(currentIndex: number) {
    const nextIdx = corrections.findIndex(
      (c, i) => i > currentIndex && c.status === 'pending',
    )
    setActiveIndex(nextIdx >= 0 ? nextIdx : -1)
  }

  function handleAccept(index: number) {
    const tracked = corrections[index]
    if (!tracked || tracked.status !== 'pending') return

    const { startIndex, endIndex } = tracked.correction
    const replacement = tracked.correction.correction
    const delta = replacement.length - (endIndex - startIndex)

    applyCorrection(startIndex, endIndex, replacement)

    setCorrections(prev => prev.map((c, i) => {
      if (i === index) return { ...c, status: 'accepted' }
      if (i > index && c.status === 'pending') {
        return {
          ...c,
          correction: {
            ...c.correction,
            startIndex: c.correction.startIndex + delta,
            endIndex: c.correction.endIndex + delta,
          },
        }
      }
      return c
    }))

    const nextIdx = corrections.findIndex(
      (c, i) => i > index && c.status === 'pending',
    )
    setActiveIndex(nextIdx >= 0 ? nextIdx : -1)
  }

  function handleSkip(index: number) {
    setCorrections(prev => prev.map((c, i) =>
      i === index ? { ...c, status: 'skipped' } : c,
    ))
    advanceToNext(index)
  }

  function handleAcceptAll() {
    const pending = corrections
      .map((c, i) => ({ ...c, index: i }))
      .filter(c => c.status === 'pending')
      .reverse()

    for (const tracked of pending) {
      applyCorrection(
        tracked.correction.startIndex,
        tracked.correction.endIndex,
        tracked.correction.correction,
      )
    }

    setCorrections(prev => prev.map(c =>
      c.status === 'pending' ? { ...c, status: 'accepted' } : c,
    ))
    setActiveIndex(-1)
  }

  function handleSkipAll() {
    setCorrections(prev => prev.map(c =>
      c.status === 'pending' ? { ...c, status: 'skipped' } : c,
    ))
    setActiveIndex(-1)
  }

  // ── Derived ───────────────────────────────────────────────────

  const reviewedCount = corrections.filter(c => c.status !== 'pending').length
  const pendingCount = corrections.filter(c => c.status === 'pending').length

  // ── Render ────────────────────────────────────────────────────

  if (availability === 'unavailable') {
    return (
      <CenteredState
        icon={<IconSpellCheck size={24} className="text-text-placeholder" />}
        title="Proofreader not available"
        subtitle="This feature requires Chrome 138+ with on-device AI enabled."
      />
    )
  }

  if (toolState === 'idle') {
    return (
      <CenteredState
        icon={<IconSpellCheck size={24} className="text-accent" />}
        title="Proofread with AI"
        subtitle="Check spelling and grammar using a private on-device model."
      >
        <div className="w-full rounded-md border border-border bg-surface p-3 text-left space-y-1">
          <p className="text-[0.75rem] font-medium text-text-secondary">Model</p>
          <p className="text-[0.8125rem] text-text font-medium">{provider.label}</p>
          <p className="text-[0.75rem] text-text-placeholder">{provider.description}</p>
        </div>
        <AvailabilityBadge availability={availability} />
        <button
          className={actionBtnClass}
          onClick={handleRun}
          disabled={availability === 'checking'}
        >
          Run Proofread
        </button>
        <p className="text-[0.75rem] text-text-placeholder">Your text never leaves your device.</p>
      </CenteredState>
    )
  }

  if (toolState === 'downloading') {
    return (
      <CenteredState
        icon={<IconDownload size={24} className="text-accent" />}
        title="Downloading model…"
        subtitle={provider.label}
      >
        <DownloadProgressBar progress={progress} />
        <p className="text-[0.75rem] text-text-placeholder">Only downloaded once. Stored locally.</p>
        <button className={cancelBtnClass} onClick={handleCancel}>Cancel</button>
      </CenteredState>
    )
  }

  if (toolState === 'running') {
    return (
      <CenteredState
        icon={<IconLoader size={24} className="text-accent animate-spin" />}
        title="Analysing text…"
        subtitle="Running on-device. This may take a moment."
      >
        <button className={cancelBtnClass} onClick={handleCancel}>Cancel</button>
      </CenteredState>
    )
  }

  // Results state
  if (corrections.length === 0) {
    return (
      <CenteredState
        icon={<IconCheckCircle size={24} className="text-accent" />}
        title="No issues found"
        subtitle="Your text looks good!"
      >
        <button className={actionBtnClass} onClick={() => setToolState('idle')}>
          Run Again
        </button>
      </CenteredState>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.8125rem] font-medium text-text">
            {corrections.length} suggestion{corrections.length !== 1 ? 's' : ''} found
          </span>
          <span className="text-[0.75rem] text-text-secondary">
            {reviewedCount} / {corrections.length} reviewed
          </span>
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${(reviewedCount / corrections.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Correction cards */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {corrections.map((tracked, i) => (
          <div key={i} ref={activeIndex === i ? activeCardRef : null}>
            <CorrectionCard
              tracked={tracked}
              isActive={activeIndex === i}
              onClick={() => setActiveIndex(activeIndex === i ? -1 : i)}
              onAccept={() => handleAccept(i)}
              onSkip={() => handleSkip(i)}
            />
          </div>
        ))}
      </div>

      {/* Batch actions */}
      {pendingCount > 0 ? (
        <div className="flex gap-2 px-3 py-3 border-t border-border shrink-0">
          <button
            onClick={handleAcceptAll}
            className="flex-1 h-8 rounded-sm text-[0.8125rem] font-medium text-white bg-accent hover:opacity-[0.82] transition-opacity cursor-pointer"
          >
            Accept All
          </button>
          <button
            onClick={handleSkipAll}
            className="flex-1 h-8 rounded-sm text-[0.8125rem] font-medium text-text-secondary bg-bg border border-border hover:bg-hover transition-colors cursor-pointer"
          >
            Skip All
          </button>
        </div>
      ) : (
        <div className="px-3 py-3 border-t border-border shrink-0">
          <button
            className="w-full h-8 rounded-sm text-[0.8125rem] font-medium text-accent bg-accent/10 hover:bg-accent/15 transition-colors cursor-pointer"
            onClick={() => setToolState('idle')}
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import {
  IconSparkles, IconClose, IconLoader, IconAlertCircle,
  IconSpellCheck, IconCheckCircle, IconDownload,
} from '../icons'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AITab = 'proofread' | 'summarize'
type ToolState = 'idle' | 'downloading' | 'running' | 'results'
type CorrectionStatus = 'pending' | 'accepted' | 'skipped'

interface TrackedCorrection {
  correction: ProofreaderCorrection
  originalText: string
  status: CorrectionStatus
}

interface AIPanelProps {
  getEditorText: () => string
  onClose: () => void
  aiEnabled: boolean
  onNavigateSettings: () => void
  applyCorrection: (startIndex: number, endIndex: number, replacement: string) => void
  highlightTextRange: (startIndex: number, endIndex: number) => void
  clearHighlight: () => void
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DownloadProgressBar({ progress }: { progress: number | null }) {
  if (progress === null) return null
  return (
    <div className="w-full space-y-1.5">
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[0.75rem] text-text-secondary">
        <span>{Math.round(progress * 100)}%</span>
      </div>
    </div>
  )
}

function CorrectionCard({
  tracked, isActive, onClick, onAccept, onSkip,
}: {
  tracked: TrackedCorrection
  isActive: boolean
  onClick: () => void
  onAccept: () => void
  onSkip: () => void
}) {
  if (tracked.status === 'accepted') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm opacity-40">
        <IconCheckCircle size={12} className="text-accent shrink-0" />
        <span className="text-[0.75rem] text-text-secondary line-through truncate">
          {tracked.originalText}
        </span>
      </div>
    )
  }

  if (tracked.status === 'skipped') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm opacity-30">
        <IconClose size={12} className="text-text-placeholder shrink-0" />
        <span className="text-[0.75rem] text-text-placeholder truncate">
          {tracked.originalText}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-md border cursor-pointer transition-all ${
        isActive
          ? 'border-accent/30 shadow-sm bg-surface'
          : 'border-border hover:border-accent/20 hover:shadow-sm bg-surface'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
        <span className="text-[0.75rem] text-text-secondary truncate">
          &ldquo;{tracked.originalText.slice(0, 30)}{tracked.originalText.length > 30 ? '…' : ''}&rdquo;
        </span>
      </div>

      {/* Expanded diff */}
      {isActive && (
        <>
          <div className="px-3 pb-2 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[0.75rem] text-danger font-medium w-3 shrink-0">&ndash;</span>
              <span className="text-[0.75rem] text-text-secondary leading-relaxed line-through">
                {tracked.originalText}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[0.75rem] text-accent font-medium w-3 shrink-0">+</span>
              <span className="text-[0.75rem] text-text leading-relaxed font-medium">
                {tracked.correction.correction}
              </span>
            </div>
          </div>
          <div className="flex gap-2 px-3 pb-3">
            <button
              onClick={e => { e.stopPropagation(); onAccept() }}
              className="flex-1 h-7 rounded-sm text-[0.75rem] font-medium text-white bg-accent hover:opacity-[0.82] transition-opacity cursor-pointer"
            >
              Accept
            </button>
            <button
              onClick={e => { e.stopPropagation(); onSkip() }}
              className="flex-1 h-7 rounded-sm text-[0.75rem] font-medium text-text-secondary bg-bg border border-border hover:bg-hover transition-colors cursor-pointer"
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared button class
// ---------------------------------------------------------------------------

const actionBtnClass = 'w-full h-8 rounded-sm text-[0.8125rem] font-medium bg-accent text-white hover:opacity-[0.82] transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2'
const cancelBtnClass = 'text-[0.8125rem] text-text-secondary hover:text-text cursor-pointer transition-colors'

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export default function AIPanel({
  getEditorText, onClose, aiEnabled, onNavigateSettings, applyCorrection, highlightTextRange, clearHighlight,
}: AIPanelProps) {
  const { showToast } = useToast()

  // Tab
  const [activeTab, setActiveTab] = useState<AITab>('proofread')

  // Availability (checked once on mount)
  const [proofreaderAvailability, setProofreaderAvailability] = useState<AIAvailability | 'checking'>('checking')
  const [summarizerAvailability, setSummarizerAvailability] = useState<AIAvailability | 'checking'>('checking')

  // Proofreader state
  const [proofreaderState, setProofreaderState] = useState<ToolState>('idle')
  const [proofreaderProgress, setProofreaderProgress] = useState<number | null>(null)
  const [corrections, setCorrections] = useState<TrackedCorrection[]>([])
  const [activeIndex, setActiveIndex] = useState<number>(0)
  const proofreaderRef = useRef<ProofreaderInstance | null>(null)
  const proofCancelledRef = useRef(false)

  // Summarizer state
  const [summarizerState, setSummarizerState] = useState<ToolState>('idle')
  const [summarizerProgress, setSummarizerProgress] = useState<number | null>(null)
  const [summaryResult, setSummaryResult] = useState('')
  const [summaryType, setSummaryType] = useState<SummarizerType>('key-points')
  const [summaryLength, setSummaryLength] = useState<SummarizerLength>('medium')
  const summarizerRef = useRef<SummarizerInstance | null>(null)
  const sumCancelledRef = useRef(false)

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
    if (typeof Proofreader !== 'undefined') {
      Proofreader.availability({ expectedInputLanguages: ['en'] })
        .then(setProofreaderAvailability)
        .catch(() => setProofreaderAvailability('unavailable'))
    } else {
      setProofreaderAvailability('unavailable')
    }

    if (typeof Summarizer !== 'undefined') {
      Summarizer.availability({ expectedInputLanguages: ['en'] })
        .then(setSummarizerAvailability)
        .catch(() => setSummarizerAvailability('unavailable'))
    } else {
      setSummarizerAvailability('unavailable')
    }
  }, [])

  // ── Proofreader handlers ──────────────────────────────────────

  async function handleRunProofreader() {
    const text = getEditorText()
    if (!text.trim()) {
      showToast('No text to proofread. Write something first.', 'info')
      return
    }
    proofCancelledRef.current = false
    clearHighlight()
    setProofreaderState('downloading')
    setProofreaderProgress(null)
    setCorrections([])
    setActiveIndex(0)

    try {
      const instance = await Proofreader.create({
        expectedInputLanguages: ['en'],
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            setProofreaderProgress(e.total > 0 ? e.loaded / e.total : null)
          })
        },
      })

      if (proofCancelledRef.current) {
        instance.destroy()
        return
      }

      proofreaderRef.current = instance
      setProofreaderState('running')
      setProofreaderProgress(null)

      const result = await instance.proofread(text)
      instance.destroy()
      proofreaderRef.current = null

      if (proofCancelledRef.current) return

      const tracked: TrackedCorrection[] = result.corrections.map(c => ({
        correction: c,
        originalText: text.slice(c.startIndex, c.endIndex),
        status: 'pending',
      }))
      setCorrections(tracked)
      setActiveIndex(tracked.length > 0 ? 0 : -1)
      setProofreaderState('results')
    } catch (err) {
      if (!proofCancelledRef.current) {
        showToast('Proofreading failed. The model may not be available.', 'error')
        console.error('Proofreader error:', err)
        setProofreaderState('idle')
      }
    }
  }

  function handleCancelProofreader() {
    proofCancelledRef.current = true
    clearHighlight()
    if (proofreaderRef.current) {
      proofreaderRef.current.destroy()
      proofreaderRef.current = null
    }
    setProofreaderState('idle')
    setProofreaderProgress(null)
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

    // Advance — need to find next pending after this one
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
    // Apply in reverse order so earlier indices stay valid
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

  // ── Summarizer handlers ───────────────────────────────────────

  async function handleRunSummarizer() {
    const text = getEditorText()
    if (!text.trim()) {
      showToast('No text to summarize. Write something first.', 'info')
      return
    }
    sumCancelledRef.current = false
    setSummarizerState('downloading')
    setSummarizerProgress(null)
    setSummaryResult('')

    try {
      const instance = await Summarizer.create({
        type: summaryType,
        format: 'markdown',
        length: summaryLength,
        expectedInputLanguages: ['en'],
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            setSummarizerProgress(e.total > 0 ? e.loaded / e.total : null)
          })
        },
      })

      if (sumCancelledRef.current) {
        instance.destroy()
        return
      }

      summarizerRef.current = instance
      setSummarizerState('running')
      setSummarizerProgress(null)

      const result = await instance.summarize(text, {
        context: 'This is a section from a creative writing project.',
      })
      instance.destroy()
      summarizerRef.current = null

      if (sumCancelledRef.current) return

      setSummaryResult(result)
      setSummarizerState('results')
    } catch (err) {
      if (!sumCancelledRef.current) {
        showToast('Summarization failed. The model may not be available.', 'error')
        console.error('Summarizer error:', err)
        setSummarizerState('idle')
      }
    }
  }

  function handleCancelSummarizer() {
    sumCancelledRef.current = true
    if (summarizerRef.current) {
      summarizerRef.current.destroy()
      summarizerRef.current = null
    }
    setSummarizerState('idle')
    setSummarizerProgress(null)
  }

  // ── Derived values ────────────────────────────────────────────

  const reviewedCount = corrections.filter(c => c.status !== 'pending').length
  const pendingCount = corrections.filter(c => c.status === 'pending').length
  const selectClass = 'h-7 px-1.5 rounded-sm text-[0.8125rem] text-text bg-bg border border-border outline-none cursor-pointer'
  const tabClass = (tab: AITab) =>
    `px-2 py-0.5 rounded-sm text-[0.75rem] transition-colors cursor-pointer ${
      activeTab === tab
        ? 'bg-accent/10 text-accent font-medium'
        : 'text-text-secondary hover:text-text'
    }`

  // ── Render helpers ────────────────────────────────────────────

  function renderAvailabilityBadge(availability: AIAvailability | 'checking') {
    if (availability === 'checking') {
      return <span className="text-[0.6875rem] text-text-placeholder">Checking…</span>
    }
    if (availability === 'unavailable') {
      return (
        <span className="flex items-center gap-1 text-[0.6875rem] text-text-placeholder">
          <IconAlertCircle size={11} /> Not available
        </span>
      )
    }
    if (availability === 'downloadable') {
      return <span className="text-[0.6875rem] text-accent">Model will download on first use</span>
    }
    return null
  }

  function renderCenteredState(
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    children?: React.ReactNode,
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-hover flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-[0.9375rem] font-medium text-text mb-1">{title}</p>
          <p className="text-[0.8125rem] text-text-secondary leading-relaxed">{subtitle}</p>
        </div>
        {children}
      </div>
    )
  }

  // ── Proofreader tab content ───────────────────────────────────

  function renderProofreaderContent() {
    const availability = proofreaderAvailability

    if (availability === 'unavailable') {
      return renderCenteredState(
        <IconSpellCheck size={24} className="text-text-placeholder" />,
        'Proofreader not available',
        'This feature requires Chrome 138+ with on-device AI enabled.',
      )
    }

    if (proofreaderState === 'idle') {
      return renderCenteredState(
        <IconSpellCheck size={24} className="text-accent" />,
        'Proofread with AI',
        'Check spelling and grammar using a private on-device model.',
        <>
          <div className="w-full rounded-md border border-border bg-surface p-3 text-left space-y-1">
            <p className="text-[0.75rem] font-medium text-text-secondary">Model</p>
            <p className="text-[0.8125rem] text-text font-medium">Chrome Proofreader</p>
            <p className="text-[0.75rem] text-text-placeholder">On-device &middot; Private</p>
          </div>
          {renderAvailabilityBadge(availability)}
          <button
            className={actionBtnClass}
            onClick={handleRunProofreader}
            disabled={availability === 'checking'}
          >
            Run Proofread
          </button>
          <p className="text-[0.75rem] text-text-placeholder">Your text never leaves your device.</p>
        </>,
      )
    }

    if (proofreaderState === 'downloading') {
      return renderCenteredState(
        <IconDownload size={24} className="text-accent" />,
        'Downloading model…',
        'Chrome Proofreader',
        <>
          <DownloadProgressBar progress={proofreaderProgress} />
          <p className="text-[0.75rem] text-text-placeholder">Only downloaded once. Stored locally.</p>
          <button className={cancelBtnClass} onClick={handleCancelProofreader}>Cancel</button>
        </>,
      )
    }

    if (proofreaderState === 'running') {
      return renderCenteredState(
        <IconLoader size={24} className="text-accent animate-spin" />,
        'Analysing text…',
        'Running on-device. This may take a moment.',
        <button className={cancelBtnClass} onClick={handleCancelProofreader}>Cancel</button>,
      )
    }

    // Results state
    if (corrections.length === 0) {
      return renderCenteredState(
        <IconCheckCircle size={24} className="text-accent" />,
        'No issues found',
        'Your text looks good!',
        <button
          className={actionBtnClass}
          onClick={() => setProofreaderState('idle')}
        >
          Run Again
        </button>,
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
              onClick={() => setProofreaderState('idle')}
            >
              Run Again
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Summarizer tab content ────────────────────────────────────

  function renderSummarizerContent() {
    const availability = summarizerAvailability

    if (availability === 'unavailable') {
      return renderCenteredState(
        <IconSparkles size={24} className="text-text-placeholder" />,
        'Summarizer not available',
        'This feature requires Chrome 138+ with on-device AI enabled.',
      )
    }

    if (summarizerState === 'idle') {
      return renderCenteredState(
        <IconSparkles size={24} className="text-accent" />,
        'Summarize with AI',
        'Get key points, a TL;DR, or a teaser using a private on-device model.',
        <>
          <div className="w-full rounded-md border border-border bg-surface p-3 text-left space-y-2">
            <p className="text-[0.75rem] font-medium text-text-secondary">Model</p>
            <p className="text-[0.8125rem] text-text font-medium">Chrome Summarizer</p>
            <p className="text-[0.75rem] text-text-placeholder">On-device &middot; Private</p>
          </div>
          <div className="flex items-center gap-2 w-full">
            <select
              className={selectClass}
              value={summaryType}
              onChange={e => setSummaryType(e.target.value as SummarizerType)}
            >
              <option value="key-points">Key Points</option>
              <option value="tldr">TL;DR</option>
              <option value="teaser">Teaser</option>
              <option value="headline">Headline</option>
            </select>
            <select
              className={selectClass}
              value={summaryLength}
              onChange={e => setSummaryLength(e.target.value as SummarizerLength)}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
          {renderAvailabilityBadge(availability)}
          <button
            className={actionBtnClass}
            onClick={handleRunSummarizer}
            disabled={availability === 'checking'}
          >
            Run Summary
          </button>
          <p className="text-[0.75rem] text-text-placeholder">Your text never leaves your device.</p>
        </>,
      )
    }

    if (summarizerState === 'downloading') {
      return renderCenteredState(
        <IconDownload size={24} className="text-accent" />,
        'Downloading model…',
        'Chrome Summarizer',
        <>
          <DownloadProgressBar progress={summarizerProgress} />
          <p className="text-[0.75rem] text-text-placeholder">Only downloaded once. Stored locally.</p>
          <button className={cancelBtnClass} onClick={handleCancelSummarizer}>Cancel</button>
        </>,
      )
    }

    if (summarizerState === 'running') {
      return renderCenteredState(
        <IconLoader size={24} className="text-accent animate-spin" />,
        'Summarizing…',
        'Running on-device. This may take a moment.',
        <button className={cancelBtnClass} onClick={handleCancelSummarizer}>Cancel</button>,
      )
    }

    // Results state
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <select
              className={selectClass}
              value={summaryType}
              onChange={e => setSummaryType(e.target.value as SummarizerType)}
            >
              <option value="key-points">Key Points</option>
              <option value="tldr">TL;DR</option>
              <option value="teaser">Teaser</option>
              <option value="headline">Headline</option>
            </select>
            <select
              className={selectClass}
              value={summaryLength}
              onChange={e => setSummaryLength(e.target.value as SummarizerLength)}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="p-3 bg-bg rounded-sm text-[0.8125rem] text-text leading-relaxed whitespace-pre-wrap">
            {summaryResult}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-border shrink-0">
          <button
            className="w-full h-8 rounded-sm text-[0.8125rem] font-medium text-accent bg-accent/10 hover:bg-accent/15 transition-colors cursor-pointer"
            onClick={() => { setSummarizerState('idle'); setSummaryResult('') }}
          >
            Run Again
          </button>
        </div>
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 h-12 border-b border-border shrink-0 gap-2">
        <IconSparkles size={14} className="text-accent shrink-0" />
        <span className="text-[0.9375rem] font-medium text-text">AI Tools</span>

        {/* Tabs */}
        {aiEnabled && (
          <div className="flex items-center gap-1 ml-auto mr-1">
            <button className={tabClass('proofread')} onClick={() => setActiveTab('proofread')}>
              Proofread
            </button>
            <button className={tabClass('summarize')} onClick={() => setActiveTab('summarize')}>
              Summarize
            </button>
          </div>
        )}

        {!aiEnabled && <div className="flex-1" />}

        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {!aiEnabled ? (
          /* Disabled state */
          renderCenteredState(
            <IconSparkles size={24} className="text-text-placeholder" />,
            'AI tools are not enabled',
            'Enable on-device AI tools to proofread and summarize your writing. Your text never leaves your device.',
            <button className={actionBtnClass} onClick={onNavigateSettings}>
              Go to Settings
            </button>,
          )
        ) : activeTab === 'proofread' ? (
          renderProofreaderContent()
        ) : (
          renderSummarizerContent()
        )}
      </div>
    </aside>
  )
}

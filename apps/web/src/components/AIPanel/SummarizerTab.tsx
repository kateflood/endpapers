import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { IconSparkles, IconDownload, IconLoader } from '../icons'
import type { ProviderAvailability, SummarizerProvider } from '../../ai/types'
import { getSummarizerProviders } from '../../ai/providers'
import {
  type ToolState,
  actionBtnClass, cancelBtnClass,
  DownloadProgressBar, CenteredState, AvailabilityBadge,
} from './shared'

interface SummarizerTabProps {
  getEditorText: () => string
}

export default function SummarizerTab({ getEditorText }: SummarizerTabProps) {
  const { showToast } = useToast()

  // Provider (resolved once on mount)
  const [provider] = useState<SummarizerProvider>(() => getSummarizerProviders()[0])

  // Availability
  const [availability, setAvailability] = useState<ProviderAvailability | 'checking'>('checking')

  // Tool state
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [summaryResult, setSummaryResult] = useState('')
  const [summaryType, setSummaryType] = useState<SummarizerType>('key-points')
  const [summaryLength, setSummaryLength] = useState<SummarizerLength>('medium')
  const activeProviderRef = useRef<SummarizerProvider | null>(null)

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
      showToast('No text to summarize. Write something first.', 'info')
      return
    }
    setToolState('downloading')
    setProgress(null)
    setSummaryResult('')

    const runProvider = getSummarizerProviders()[0]
    activeProviderRef.current = runProvider

    try {
      const result = await runProvider.run(
        text,
        { type: summaryType, length: summaryLength },
        {
          onDownloadProgress(p) { setProgress(p) },
          onRunning() { setToolState('running'); setProgress(null) },
        },
      )

      activeProviderRef.current = null
      setSummaryResult(result)
      setToolState('results')
    } catch (err) {
      activeProviderRef.current = null
      if (err instanceof DOMException && err.name === 'AbortError') return
      showToast('Summarization failed. The model may not be available.', 'error')
      console.error('Summarizer error:', err)
      setToolState('idle')
    }
  }

  function handleCancel() {
    if (activeProviderRef.current) {
      activeProviderRef.current.cancel()
      activeProviderRef.current = null
    }
    setToolState('idle')
    setProgress(null)
  }

  // ── Derived ───────────────────────────────────────────────────

  const selectClass = 'h-7 px-1.5 rounded-sm text-[0.8125rem] text-text bg-bg border border-border outline-none cursor-pointer'

  // ── Render ────────────────────────────────────────────────────

  if (availability === 'unavailable') {
    return (
      <CenteredState
        icon={<IconSparkles size={24} className="text-text-placeholder" />}
        title="Summarizer not available"
        subtitle="This feature requires Chrome 138+ with on-device AI enabled."
      />
    )
  }

  if (toolState === 'idle') {
    return (
      <CenteredState
        icon={<IconSparkles size={24} className="text-accent" />}
        title="Summarize with AI"
        subtitle="Get key points, a TL;DR, or a teaser using a private on-device model."
      >
        <div className="w-full rounded-md border border-border bg-surface p-3 text-left space-y-2">
          <p className="text-[0.75rem] font-medium text-text-secondary">Model</p>
          <p className="text-[0.8125rem] text-text font-medium">{provider.label}</p>
          <p className="text-[0.75rem] text-text-placeholder">{provider.description}</p>
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
        <AvailabilityBadge availability={availability} />
        <button
          className={actionBtnClass}
          onClick={handleRun}
          disabled={availability === 'checking'}
        >
          Run Summary
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
        title="Summarizing…"
        subtitle="Running on-device. This may take a moment."
      >
        <button className={cancelBtnClass} onClick={handleCancel}>Cancel</button>
      </CenteredState>
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
          onClick={() => { setToolState('idle'); setSummaryResult('') }}
        >
          Run Again
        </button>
      </div>
    </div>
  )
}

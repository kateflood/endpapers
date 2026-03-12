import { useEffect, useRef, useState } from 'react'
import type { AIBackend } from '@endpapers/types'
import { useToast } from '../../contexts/ToastContext'
import { useProject } from '../../contexts/ProjectContext'
import { readSectionsIndividually } from '../../fs/projectFs'
import { IconSparkles, IconDownload, IconLoader } from '../shared/icons'
import type { ProviderAvailability, SummarizerProvider } from '../../ai/types'
import { getSummarizerProviders } from '../../ai/providers'
import { terminateWorker } from '../../ai/transformersWorkerClient'
import {
  type ToolState,
  actionBtnClass, cancelBtnClass,
  DownloadProgressBar, CenteredState, AvailabilityBadge,
} from './shared'

type SummaryScope = 'section' | 'draft'

interface SummarizerTabProps {
  getEditorText: () => string
  backend: AIBackend
}

export default function SummarizerTab({ getEditorText, backend }: SummarizerTabProps) {
  const { showToast } = useToast()
  const { project, handle } = useProject()

  // Provider (resolved via availability check)
  const [provider, setProvider] = useState<SummarizerProvider | null>(null)

  // Availability
  const [availability, setAvailability] = useState<ProviderAvailability | 'checking'>('checking')

  // Tool state
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [summaryResult, setSummaryResult] = useState('')
  const [summaryType, setSummaryType] = useState<SummarizerType>('tldr')
  const [summaryLength, setSummaryLength] = useState<SummarizerLength>('medium')
  const [scope, setScope] = useState<SummaryScope>('section')
  const [sectionProgress, setSectionProgress] = useState<{ current: number; total: number; title: string } | null>(null)
  const activeProviderRef = useRef<SummarizerProvider | null>(null)

  // Resolve best available provider on mount / backend change
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      const providers = getSummarizerProviders(backend)
      for (const p of providers) {
        const avail = await p.checkAvailability()
        if (cancelled) return
        if (avail !== 'unavailable') {
          setProvider(p)
          setAvailability(avail)
          return
        }
      }
      if (!cancelled) {
        setProvider(providers[providers.length - 1])
        setAvailability('unavailable')
      }
    }
    setAvailability('checking')
    resolve()
    return () => { cancelled = true }
  }, [backend])

  // ── Handlers ──────────────────────────────────────────────────

  async function handleRun() {
    let input: string | Array<{ title: string; text: string }>
    if (scope === 'draft' && handle && project) {
      const sections = await readSectionsIndividually(handle, project.sections)
      if (sections.length === 0) {
        showToast('No text to summarize. Write something first.', 'info')
        return
      }
      input = sections
    } else {
      const text = getEditorText()
      if (!text.trim()) {
        showToast('No text to summarize. Write something first.', 'info')
        return
      }
      input = text
    }
    if (!provider) return
    setToolState('downloading')
    setProgress(null)
    setSummaryResult('')
    setSectionProgress(null)

    // Create a fresh provider instance for this run
    const providers = getSummarizerProviders(backend)
    const runProvider = providers.find(p => p.id === provider.id) ?? providers[0]
    activeProviderRef.current = runProvider

    try {
      const result = await runProvider.run(
        input,
        { type: summaryType, length: summaryLength },
        {
          onDownloadProgress(p) { setProgress(p) },
          onRunning() { setToolState('running'); setProgress(null) },
          onSectionProgress(current, total, title) { setSectionProgress({ current, total, title }) },
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
    const wasRunning = toolState === 'running'
    if (activeProviderRef.current) {
      activeProviderRef.current.cancel()
      if (wasRunning && activeProviderRef.current.id === 'transformers') {
        terminateWorker()
      }
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
        subtitle="Get key points, a summary or a teaser using a private on-device model."
      >
        <div className="w-full rounded-md border border-border bg-surface p-3 text-left space-y-2">
          <p className="text-[0.75rem] font-medium text-text-secondary">Model</p>
          <p className="text-[0.8125rem] text-text font-medium">{provider?.label}</p>
          <p className="text-[0.75rem] text-text-placeholder">{provider?.description}</p>
        </div>
        <div className="flex items-center gap-2 w-full flex-wrap">
          <select
            className={selectClass}
            value={scope}
            onChange={e => setScope(e.target.value as SummaryScope)}
          >
            <option value="section">Current Section</option>
            <option value="draft">Entire Draft</option>
          </select>
          <select
            className={selectClass}
            value={summaryType}
            onChange={e => setSummaryType(e.target.value as SummarizerType)}
          >
            <option value="tldr">Summary</option>
            <option value="key-points">Key Points</option>
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
        subtitle={provider?.label ?? ''}
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
        title={sectionProgress
          ? `Summarizing section ${sectionProgress.current} of ${sectionProgress.total}…`
          : 'Summarizing…'}
        subtitle={sectionProgress
          ? sectionProgress.title
          : 'Running on-device. This may take a moment.'}
      >
        {sectionProgress && (
          <div className="w-full bg-border rounded-full h-1.5">
            <div
              className="bg-accent h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(sectionProgress.current / sectionProgress.total) * 100}%` }}
            />
          </div>
        )}
        <button className={cancelBtnClass} onClick={handleCancel}>Cancel</button>
      </CenteredState>
    )
  }

  // Results state
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className={selectClass}
            value={scope}
            onChange={e => setScope(e.target.value as SummaryScope)}
          >
            <option value="section">Current Section</option>
            <option value="draft">Entire Draft</option>
          </select>
          <select
            className={selectClass}
            value={summaryType}
            onChange={e => setSummaryType(e.target.value as SummarizerType)}
          >
            <option value="tldr">Summary</option>
            <option value="key-points">Key Points</option>
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

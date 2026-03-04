import { useEffect, useRef, useState } from 'react'
import type { AIBackend } from '@endpapers/types'
import { useToast } from '../../contexts/ToastContext'
import { useProject } from '../../contexts/ProjectContext'
import { readSectionsIndividually } from '../../fs/projectFs'
import { relevanceScore } from '../../ai/textUtils'
import { IconSparkles, IconDownload, IconLoader } from '../icons'
import type { ProviderAvailability, QAProvider } from '../../ai/types'
import { getQAProviders } from '../../ai/providers'
import { terminateWorker } from '../../ai/transformersWorkerClient'
import {
  type ToolState,
  actionBtnClass, cancelBtnClass,
  DownloadProgressBar, CenteredState, AvailabilityBadge,
} from './shared'

type QAScope = 'section' | 'draft'

interface QATabProps {
  getEditorText: () => string
  backend: AIBackend
}

export default function QATab({ getEditorText, backend }: QATabProps) {
  const { showToast } = useToast()
  const { project, handle } = useProject()

  const [provider, setProvider] = useState<QAProvider | null>(null)
  const [availability, setAvailability] = useState<ProviderAvailability | 'checking'>('checking')
  const [toolState, setToolState] = useState<ToolState>('idle')
  const [progress, setProgress] = useState<number | null>(null)
  const [answer, setAnswer] = useState('')
  const [question, setQuestion] = useState('')
  const [askedQuestion, setAskedQuestion] = useState('')
  const [matchedSection, setMatchedSection] = useState('')
  const [scope, setScope] = useState<QAScope>('section')
  const activeProviderRef = useRef<QAProvider | null>(null)

  // Resolve best available provider on mount / backend change
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      const providers = getQAProviders(backend)
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

  async function handleRun() {
    if (!question.trim()) {
      showToast('Type a question first.', 'info')
      return
    }

    let text: string
    let sectionTitle = ''

    if (scope === 'draft' && handle && project) {
      const sections = await readSectionsIndividually(handle, project.sections)
      if (sections.length === 0) {
        showToast('No text to search. Write something first.', 'info')
        return
      }
      // Find the most relevant section via keyword overlap
      let bestIdx = 0
      let bestScore = -1
      for (let i = 0; i < sections.length; i++) {
        const score = relevanceScore(sections[i].text, question)
        if (score > bestScore) {
          bestScore = score
          bestIdx = i
        }
      }
      text = sections[bestIdx].text
      sectionTitle = sections[bestIdx].title
    } else {
      text = getEditorText()
      if (!text.trim()) {
        showToast('No text to search. Write something first.', 'info')
        return
      }
    }
    if (!provider) return

    setToolState('downloading')
    setProgress(null)
    setAnswer('')
    setAskedQuestion(question)
    setMatchedSection(sectionTitle)

    const providers = getQAProviders(backend)
    const runProvider = providers.find(p => p.id === provider.id) ?? providers[0]
    activeProviderRef.current = runProvider

    try {
      const result = await runProvider.run(
        text,
        { question },
        {
          onDownloadProgress(p) { setProgress(p) },
          onRunning() { setToolState('running'); setProgress(null) },
        },
      )

      activeProviderRef.current = null
      setAnswer(result)
      setToolState('results')
    } catch (err) {
      activeProviderRef.current = null
      if (err instanceof DOMException && err.name === 'AbortError') return
      showToast('Q&A failed. The model may not be available.', 'error')
      console.error('Q&A error:', err)
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

  const selectClass = 'h-7 px-1.5 rounded-sm text-[0.8125rem] text-text bg-bg border border-border outline-none cursor-pointer'

  if (availability === 'unavailable') {
    return (
      <CenteredState
        icon={<IconSparkles size={24} className="text-text-placeholder" />}
        title="Q&A not available"
        subtitle="This feature requires a WebGPU-capable browser or Chrome with the Prompt API enabled."
      />
    )
  }

  if (toolState === 'idle') {
    return (
      <CenteredState
        icon={<IconSparkles size={24} className="text-accent" />}
        title="Ask about your text"
        subtitle="Ask a question and get an answer based only on your writing."
      >
        <div className="w-full rounded-md border border-border bg-surface p-3 text-left space-y-2">
          <p className="text-[0.75rem] font-medium text-text-secondary">Model</p>
          <p className="text-[0.8125rem] text-text font-medium">{provider?.label}</p>
          <p className="text-[0.75rem] text-text-placeholder">{provider?.description}</p>
        </div>
        <textarea
          className="w-full h-20 px-3 py-2 rounded-sm text-[0.8125rem] text-text bg-bg border border-border outline-none resize-none placeholder:text-text-placeholder"
          placeholder="Type your question…"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleRun()
            }
          }}
        />
        <div className="flex items-center gap-2 w-full">
          <select
            className={selectClass}
            value={scope}
            onChange={e => setScope(e.target.value as QAScope)}
          >
            <option value="section">Current Section</option>
            <option value="draft">Entire Draft</option>
          </select>
        </div>
        <AvailabilityBadge availability={availability} />
        <button
          className={actionBtnClass}
          onClick={handleRun}
          disabled={availability === 'checking' || !question.trim()}
        >
          Ask
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
        title="Thinking…"
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
        <p className="text-[0.75rem] text-text-secondary mb-1">Question</p>
        <p className="text-[0.8125rem] text-text">{askedQuestion}</p>
        {matchedSection && (
          <p className="text-[0.75rem] text-text-placeholder mt-1">Answered from: {matchedSection}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="p-3 bg-bg rounded-sm text-[0.8125rem] text-text leading-relaxed whitespace-pre-wrap">
          {answer}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-border shrink-0">
        <button
          className="w-full h-8 rounded-sm text-[0.8125rem] font-medium text-accent bg-accent/10 hover:bg-accent/15 transition-colors cursor-pointer"
          onClick={() => { setToolState('idle'); setAnswer(''); setQuestion(''); setMatchedSection('') }}
        >
          Ask Another
        </button>
      </div>
    </div>
  )
}

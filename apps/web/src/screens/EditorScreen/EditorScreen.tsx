import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { estimatePages } from '@endpapers/utils'
import { useProject } from '../../contexts/ProjectContext'
import SectionsSidebar from '../../components/SectionsSidebar/SectionsSidebar'
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor'
import WritingGoalsPanel from '../../components/WritingGoalsPanel/WritingGoalsPanel'
import { IconMenu, IconSettings, IconHelpCircle, IconMaximize } from '../../components/icons'

export default function EditorScreen() {
  const navigate = useNavigate()
  const { project, recentId, closeProject, activeSectionId, sectionWordCounts, writingLog, sessionStartWords, updateGoals } = useProject()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  const draftSectionIds = new Set(
    (project?.sections ?? []).flatMap(e =>
      e.type === 'section' ? [e.id] : (e.children ?? []).map(c => c.id)
    )
  )
  const totalWords = Object.entries(sectionWordCounts)
    .filter(([id]) => draftSectionIds.has(id))
    .reduce((acc, [, count]) => acc + count, 0)
  const sessionWords = Math.max(0, totalWords - sessionStartWords)
  const wordsPerPage = project?.settings?.wordsPerPage ?? 250
  const showWordCount = project?.settings?.showWordCount ?? true
  // Each section is at least 1 page; unvisited sections (no word count yet) count as 1 page
  const totalPages = (project?.sections ?? []).reduce((acc, entry) => {
    if (entry.type === 'section') {
      return acc + Math.max(1, estimatePages(sectionWordCounts[entry.id] ?? 0, wordsPerPage))
    }
    return acc + (entry.children ?? []).reduce((cacc, child) =>
      cacc + Math.max(1, estimatePages(sectionWordCounts[child.id] ?? 0, wordsPerPage)), 0)
  }, 0)

  // Cmd/Ctrl+. toggles focus mode (only when a section is active)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setFocusMode(f => f ? false : !!activeSectionId)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeSectionId])

  // Sync browser fullscreen with focus mode state
  useEffect(() => {
    if (focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [focusMode])

  // Exit focus mode when user exits fullscreen via browser (Escape or browser UI)
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        setFocusMode(false)
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!project) navigate('/', { replace: true })
  }, [project, navigate])

  if (!project) return null

  return (
    <div className={`h-screen flex flex-col overflow-hidden${focusMode ? ' focus-mode-active' : ''}`}>
      {/* Header */}
      {!focusMode && (
        <header className="flex items-center px-4 h-12 border-b border-border bg-surface shrink-0 gap-3">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sections sidebar"
          >
            <IconMenu size={16} />
          </button>
          <span
            className="text-[0.9375rem] font-serif text-text flex-1 truncate cursor-pointer hover:opacity-70 transition-opacity tracking-wide"
            onClick={() => { closeProject(); navigate('/') }}
          >
            endpapers
          </span>
          {showWordCount && totalPages > 0 && (
            <button
              className={`text-[0.8125rem] shrink-0 px-2 h-7 rounded-sm transition-colors cursor-pointer ${
                goalsOpen
                  ? 'text-text bg-black/[0.06]'
                  : 'text-text-secondary hover:text-text hover:bg-black/[0.04]'
              }`}
              onClick={() => setGoalsOpen(o => !o)}
              aria-label="Writing goals"
            >
              {totalWords.toLocaleString()} words · {totalPages} {totalPages === 1 ? 'page' : 'pages'}
            </button>
          )}
          <div className="flex items-center gap-1">
            <button
              className="px-3 h-7 rounded-sm text-[0.8125rem] text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
              onClick={() => navigate('/reference')}
            >
              Reference
            </button>
            <button
              className={`w-8 h-8 flex items-center justify-center rounded-sm transition-colors ${activeSectionId ? 'text-text-secondary hover:text-text hover:bg-black/[0.04] cursor-pointer' : 'text-text-placeholder cursor-default'}`}
              onClick={() => { if (activeSectionId) setFocusMode(true) }}
              aria-label="Focus mode"
              disabled={!activeSectionId}
            >
              <IconMaximize size={16} />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
              onClick={() => navigate('/help')}
              aria-label="Help"
            >
              <IconHelpCircle size={16} />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
              onClick={() => navigate('/settings')}
              aria-label="Settings"
            >
              <IconSettings size={16} />
            </button>
          </div>
        </header>
      )}

      {/* Demo banner */}
      {!focusMode && recentId === 'demo-project' && (
        <div className="flex items-center justify-center px-4 h-8 bg-accent/[0.06] border-b border-border text-[0.8125rem] text-text-secondary shrink-0 gap-2">
          <span>You are viewing the demo project.</span>
          <button
            className="text-accent hover:underline cursor-pointer"
            onClick={() => { closeProject(); navigate('/') }}
          >
            Back to home
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections sidebar */}
        {!focusMode && sidebarOpen && (
          <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
            <SectionsSidebar />
          </aside>
        )}

        {/* Editor area */}
        <main className="flex-1 flex overflow-hidden">
          <RichTextEditor focusMode={focusMode} onExitFocus={() => setFocusMode(false)} />
        </main>

        {/* Writing goals panel */}
        {!focusMode && goalsOpen && (
          <WritingGoalsPanel
            writingLog={writingLog}
            sessionWords={sessionWords}
            totalWords={totalWords}
            onUpdateGoals={updateGoals}
            onClose={() => setGoalsOpen(false)}
          />
        )}
      </div>

    </div>
  )
}

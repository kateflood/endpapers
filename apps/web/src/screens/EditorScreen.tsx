import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findSectionTitle, todayISODate, isThisWeek, isThisMonth, sumWritingLog } from '@endpapers/utils'
import type { WritingLogEntry } from '@endpapers/types'
import { useProject, DEMO_RECENT_ID, PREVIEW_RECENT_ID } from '../contexts/ProjectContext'
import SectionsSidebar from '../components/sidebar/SectionsSidebar'
import RichTextEditor from '../components/editor/RichTextEditor'
import type { RichTextEditorHandle, GoalInfo } from '../components/editor/RichTextEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import { useEditorSetup } from '../components/editor/useEditorSetup'
import WritingGoalsPanel from '../components/panels/WritingGoalsPanel'
import AIPanel from '../components/panels/AIPanel'
import {
  IconSettings, IconFolderOpen, IconChevronDown, IconBookOpen, IconArchive,
  IconPanelLeft, IconType, IconSparkles, IconTarget, IconMaximize,
} from '../components/shared/icons'
import BackupsDialog from '../components/dialogs/BackupsDialog'
import ConfirmDialog from '../components/dialogs/ConfirmDialog'
import ToolbarButton from '../components/shared/ToolbarButton'
import Card, { CardHeader } from '../components/shared/Card'

function computeGoal(
  sessionWords: number,
  totalWords: number,
  log: WritingLogEntry[],
  lastKnownTotal: number | undefined,
  goals: { session?: number; daily?: number; weekly?: number; monthly?: number },
): { progress: number; info: GoalInfo | null } {
  const unlogged = Math.max(0, totalWords - (lastKnownTotal ?? 0))
  const today = todayISODate()
  const todayLogged = sumWritingLog(log, e => e.date === today)
  const dailyWords = todayLogged + unlogged
  const weeklyWords = sumWritingLog(log, e => isThisWeek(e.date) && e.date !== today) + dailyWords
  const monthlyWords = sumWritingLog(log, e => isThisMonth(e.date) && e.date !== today) + dailyWords

  if (goals.session && goals.session > 0) return { progress: Math.min(1, sessionWords / goals.session), info: { label: 'Session goal', current: sessionWords, target: goals.session } }
  if (goals.daily && goals.daily > 0) return { progress: Math.min(1, dailyWords / goals.daily), info: { label: 'Daily goal', current: dailyWords, target: goals.daily } }
  if (goals.weekly && goals.weekly > 0) return { progress: Math.min(1, weeklyWords / goals.weekly), info: { label: 'Weekly goal', current: weeklyWords, target: goals.weekly } }
  if (goals.monthly && goals.monthly > 0) return { progress: Math.min(1, monthlyWords / goals.monthly), info: { label: 'Monthly goal', current: monthlyWords, target: goals.monthly } }
  return { progress: -1, info: null }
}

export default function EditorScreen() {
  const navigate = useNavigate()
  const { project, recentId, closeProject, closePreview, restoreFromPreview, activeSectionId, sectionWordCounts, writingLog, sessionStartWords, updateGoals } = useProject()
  const editor = useEditorSetup()
  const editorRef = useRef<RichTextEditorHandle>(null)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showToolbar, setShowToolbar] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [backupsOpen, setBackupsOpen] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  type RightPanel = 'goals' | 'ai' | null
  const [rightPanel, setRightPanel] = useState<RightPanel>(null)
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
  const { progress: goalPct, info: goalInfo } = computeGoal(sessionWords, totalWords, writingLog.log, writingLog.lastKnownTotal, writingLog.goals)

  const font = project?.settings?.font ?? 'Inter, sans-serif'
  const fontSize = project?.settings?.fontSize ?? 16

  // Resolve active section title for breadcrumb
  const activeSectionTitle = activeSectionId
    ? findSectionTitle(project?.sections ?? [], activeSectionId)
      ?? findSectionTitle(project?.extras ?? [], activeSectionId)
      ?? findSectionTitle(project?.frontMatter ?? [], activeSectionId)
      ?? findSectionTitle(project?.backMatter ?? [], activeSectionId)
    : null

  // Cmd/Ctrl+. toggles focus mode
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

  // Sync browser fullscreen with focus mode
  useEffect(() => {
    if (focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [focusMode])

  // Exit focus mode when user exits fullscreen via browser
  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setFocusMode(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    if (!project) navigate('/', { replace: true })
  }, [project, navigate])

  if (!project) return null

  const titleBarBtnClass = 'flex items-center gap-1 px-2 py-1 rounded-sm text-xs text-white/45 hover:bg-white/[0.08] transition-colors cursor-pointer'
  const bannerClass = 'flex items-center justify-center px-4 h-8 bg-accent/[0.06] border-b border-border text-[0.8125rem] text-text-secondary shrink-0 gap-2'

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-bg text-text${focusMode ? ' focus-mode-active' : ''}${project.settings?.darkMode ? ' dark' : ''}`}>

      {/* Title bar */}
      {!focusMode && (
        <div className="flex items-center gap-2 px-4 shrink-0 h-10 bg-navy">
          {/* Logo + app name */}
          <svg viewBox="0 0 32 32" width="20" height="20" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect width="32" height="32" rx="5" fill="rgba(255,255,255,0.08)"/>
            <path d="M4 5 L14 5 L14 27 Q9 26 4 27 Z" fill="white" opacity="0.9"/>
            <line x1="6" y1="10" x2="12" y2="10" stroke="#90CDF4" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
            <line x1="6" y1="14" x2="12" y2="14" stroke="#90CDF4" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
            <line x1="6" y1="18" x2="10" y2="18" stroke="#90CDF4" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
            <line x1="6" y1="22" x2="12" y2="22" stroke="#90CDF4" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
            <path d="M17 5 L28 5 L28 27 Q23 26 17 27 Z" fill="url(#titlebar-lm)"/>
            <path d="M18 7 Q23 12 21 18 Q19 23 24 26" stroke="#2B6CB0" strokeWidth="1" fill="none" opacity="0.6"/>
            <rect x="14" y="5" width="3" height="22" fill="url(#titlebar-ls)" rx="0.5"/>
            <defs>
              <linearGradient id="titlebar-lm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#EBF8FF"/><stop offset="50%" stopColor="#BEE3F8"/><stop offset="100%" stopColor="#63B3ED"/></linearGradient>
              <linearGradient id="titlebar-ls" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#2B6CB0"/><stop offset="100%" stopColor="#1A365D"/></linearGradient>
            </defs>
          </svg>
          <span className="font-serif text-sm text-white/70 cursor-pointer" onClick={() => { closeProject(); navigate('/') }}>
            endpapers
          </span>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 ml-3 text-xs text-white/40">
            <IconFolderOpen size={11} />
            <span className="truncate max-w-[200px]">{project.title || 'Untitled'}</span>
            {activeSectionTitle && (
              <>
                <IconChevronDown size={9} className="rotate-[-90deg] opacity-40" />
                <span className="truncate max-w-[200px] text-white/60">{activeSectionTitle}</span>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1">
            {project.settings?.backupsEnabled === true && recentId !== PREVIEW_RECENT_ID && (
              <button className={titleBarBtnClass} onClick={() => setBackupsOpen(true)} title="Backups">
                <IconArchive size={13} />
              </button>
            )}
            <button className={titleBarBtnClass} onClick={() => navigate('/reference')} title="Reference">
              <IconBookOpen size={13} />
            </button>
            <button className={titleBarBtnClass} onClick={() => navigate('/settings')} title="Settings">
              <IconSettings size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Demo banner */}
      {!focusMode && recentId === DEMO_RECENT_ID && (
        <div className={bannerClass}>
          <span>You are viewing the demo project.</span>
          <button className="text-accent hover:underline cursor-pointer" onClick={() => { closeProject(); navigate('/') }}>
            Back to home
          </button>
        </div>
      )}

      {/* Backup preview banner */}
      {!focusMode && recentId === PREVIEW_RECENT_ID && (
        <div className={bannerClass}>
          <span>You are previewing a backup (read-only).</span>
          <button className="text-accent hover:underline cursor-pointer" onClick={() => setRestoreConfirmOpen(true)}>
            Restore this backup
          </button>
          <span className="text-text-placeholder">·</span>
          <button className="text-text-secondary hover:underline cursor-pointer" onClick={() => closePreview()}>
            Close preview
          </button>
        </div>
      )}

      {/* Three-column body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left column — sidebar toggle + toolbar toggle + optional sections */}
        {!focusMode && (
          <aside className={`flex flex-col bg-surface overflow-hidden shrink-0${sidebarOpen ? ' w-64' : ''}`}>
            <div className="h-10 flex items-center px-1 shrink-0 gap-1">
              <ToolbarButton icon={<IconPanelLeft size={15} />} title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'} onClick={() => setSidebarOpen(v => !v)} active={sidebarOpen} />
              <ToolbarButton icon={<IconType size={15} />} title={showToolbar ? 'Hide toolbar' : 'Show toolbar'} onClick={() => setShowToolbar(v => !v)} active={showToolbar} />
            </div>
            {sidebarOpen && (
              <div className="flex-1 overflow-y-auto pl-3 pr-1">
                <SectionsSidebar />
              </div>
            )}
          </aside>
        )}

        {/* Center column — editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Center column header */}
          {!focusMode && showToolbar && (
            <div className="bg-surface shrink-0 flex items-center justify-center h-10 px-2">
                <EditorToolbar
                  editor={editor}
                  defaultFont={font}
                  defaultFontSize={fontSize}
                  onSearch={() => setSearchOpen(o => !o)}
                  searchActive={searchOpen}
                  onExport={() => setExportOpen(true)}
                />
            </div>
          )}
          <RichTextEditor
            ref={editorRef}
            editor={editor}
            focusMode={focusMode}
            onExitFocus={() => setFocusMode(false)}
            totalWords={totalWords}
            goalProgress={goalPct}
            goalInfo={goalInfo}
            searchOpen={searchOpen}
            onOpenSearch={() => setSearchOpen(true)}
            onCloseSearch={() => setSearchOpen(false)}
            exportOpen={exportOpen}
            onCloseExport={() => setExportOpen(false)}
          />
        </main>

        {/* Right column — panel toggle buttons + optional panel content */}
        {!focusMode && (
          <aside className={`flex flex-col bg-surface overflow-hidden shrink-0${rightPanel ? ' w-80' : ''}`}>
            <div className="h-10 flex items-center px-1 shrink-0 justify-end gap-1">
              <ToolbarButton icon={<IconSparkles size={15} />} title="AI Tools" onClick={() => { if (rightPanel === 'ai') editorRef.current?.clearHighlight(); setRightPanel(p => p === 'ai' ? null : 'ai') }} active={rightPanel === 'ai'} />
              <ToolbarButton icon={<IconTarget size={15} />} title="Writing Goals" onClick={() => setRightPanel(p => p === 'goals' ? null : 'goals')} active={rightPanel === 'goals'} />
              <div className="hidden lg:flex">
                <ToolbarButton icon={<IconMaximize size={15} />} title={activeSectionId ? 'Enter focus mode' : 'Select a section to focus'} onClick={() => setFocusMode(f => f ? false : !!activeSectionId)} disabled={!activeSectionId} />
              </div>
            </div>
            {rightPanel === 'goals' && (
              <div className="flex-1 overflow-y-auto pr-3 pl-1 pt-2">
                <Card>
                  <CardHeader title="Writing Goals" onClose={()=>setRightPanel(null)} />
                  <WritingGoalsPanel
                    writingLog={writingLog}
                    sessionWords={sessionWords}
                    totalWords={totalWords}
                    onUpdateGoals={updateGoals}
                  />
                </Card>
              </div>
            )}
            {rightPanel === 'ai' && (
              <div className="flex-1 overflow-y-auto pr-3 pl-1 pt-2">
                <Card>
                  <CardHeader title="On device AI (BETA)" onClose={()=>setRightPanel(null)} />
                  <AIPanel
                    getEditorText={() => editorRef.current?.getText() ?? ''}
                    aiEnabled={project.settings?.aiEnabled ?? false}
                    aiBackend={project.settings?.aiBackend ?? 'auto'}
                    onNavigateSettings={() => navigate('/settings')}
                    applyCorrection={(start, end, replacement) => {
                      editorRef.current?.replaceTextRange(start, end, replacement)
                    }}
                    highlightTextRange={(start, end) => {
                      editorRef.current?.highlightTextRange(start, end)
                    }}
                    clearHighlight={() => {
                      editorRef.current?.clearHighlight()
                    }}
                  />
                </Card>
              </div>
            )}
          </aside>
        )}
      </div>

      {backupsOpen && <BackupsDialog onClose={() => setBackupsOpen(false)} />}
      {restoreConfirmOpen && (
        <ConfirmDialog
          title="Restore backup"
          message="This will replace all current project files with this backup. A backup of the current state will be created first."
          confirmLabel="Restore"
          onConfirm={restoreFromPreview}
          onClose={() => setRestoreConfirmOpen(false)}
        />
      )}
    </div>
  )
}

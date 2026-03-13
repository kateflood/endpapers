import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findSectionTitle, todayISODate, isThisWeek, isThisMonth, sumWritingLog } from '@endpapers/utils'
import type { WritingLogEntry, WritingGoals } from '@endpapers/types'
import { useProject, DEMO_RECENT_ID, PREVIEW_RECENT_ID } from '../contexts/ProjectContext'
import SectionsSidebar from '../components/sidebar/SectionsSidebar'
import RichTextEditor from '../components/editor/RichTextEditor'
import type { RichTextEditorHandle, GoalInfo } from '../components/editor/RichTextEditor'
import EditorToolbar from '../components/editor/EditorToolbar'
import EditorNav from '../components/editor/EditorNav'
import { useEditorSetup } from '../components/editor/useEditorSetup'
import WritingGoalsPanel from '../components/panels/WritingGoalsPanel'
import AIPanel from '../components/panels/AIPanel'
import SpellCheckPanel from '../components/panels/SpellCheckPanel'
import type { SpellLint } from '../components/panels/SpellCheckPanel'
import { useHarperLinter } from '../hooks/useHarperLinter'
import { IconSparkles, IconTarget, IconMaximize, IconPanelLeft, IconSpellCheck } from '../components/shared/icons'
import BackupsDialog from '../components/dialogs/BackupsDialog'
import ConfirmDialog from '../components/dialogs/ConfirmDialog'
import ToolbarButton from '../components/shared/ToolbarButton'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar'

type RightPanel = 'goals' | 'ai' | 'spellcheck' | null

function computeGoal(
  totalWords: number,
  log: WritingLogEntry[],
  lastKnownTotal: number | undefined,
  goals: WritingGoals,
): { progress: number; info: GoalInfo | null } {
  const unlogged = Math.max(0, totalWords - (lastKnownTotal ?? 0))
  const today = todayISODate()
  const todayLogged = sumWritingLog(log, e => e.date === today)
  const dailyWords = todayLogged + unlogged
  const weeklyWords = sumWritingLog(log, e => isThisWeek(e.date) && e.date !== today) + dailyWords
  const monthlyWords = sumWritingLog(log, e => isThisMonth(e.date) && e.date !== today) + dailyWords

  if (goals.daily && goals.daily > 0) return { progress: Math.min(1, dailyWords / goals.daily), info: { label: 'Daily goal', current: dailyWords, target: goals.daily } }
  if (goals.weekly && goals.weekly > 0) return { progress: Math.min(1, weeklyWords / goals.weekly), info: { label: 'Weekly goal', current: weeklyWords, target: goals.weekly } }
  if (goals.monthly && goals.monthly > 0) return { progress: Math.min(1, monthlyWords / goals.monthly), info: { label: 'Monthly goal', current: monthlyWords, target: goals.monthly } }
  if (goals.project && goals.project > 0) return { progress: Math.min(1, totalWords / goals.project), info: { label: 'Project goal', current: totalWords, target: goals.project } }
  return { progress: -1, info: null }
}

interface EditorToolbarRowProps {
  editor: ReturnType<typeof useEditorSetup>
  font: string
  fontSize: number
  aiEnabled: boolean
  harperEnabled: boolean
  activeSectionId: string | null
  rightPanel: RightPanel
  searchOpen: boolean
  onSearch: () => void
  onExport: () => void
  onRightPanel: (panel: RightPanel) => void
  onFocusMode: () => void
}

// Rendered inside SidebarProvider so it can access toggleSidebar.
function EditorToolbarRow({
  editor,
  font,
  fontSize,
  aiEnabled,
  harperEnabled,
  activeSectionId,
  rightPanel,
  searchOpen,
  onSearch,
  onExport,
  onRightPanel,
  onFocusMode,
}: EditorToolbarRowProps) {
  const { toggleSidebar, open } = useSidebar()
  const sidebarOpen = open.includes('left')

  function handleRightPanel(panel: 'goals' | 'ai' | 'spellcheck') {
    const rightIsOpen = open.includes('right')
    if (rightPanel === panel && rightIsOpen) {
      toggleSidebar(['right'])
      onRightPanel(null)
    } else if (!rightIsOpen) {
      toggleSidebar(['right'])
      onRightPanel(panel)
    } else {
      onRightPanel(panel)
    }
  }

  return (
    <div className="relative flex items-center h-10 bg-surface border-b border-border/20 shrink-0 px-1">
      {/* Left: sidebar toggle */}
      <div className="flex items-center gap-0.5 shrink-0">
        <ToolbarButton
          icon={<IconPanelLeft size={15} />}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={() => toggleSidebar(['left'])}
          active={sidebarOpen}
        />
      </div>

      {/* Center: in-flow scrollable on mobile, absolute-centered on desktop */}
      <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none flex items-center md:absolute md:inset-0 md:justify-center md:overflow-visible md:pointer-events-none">
        <div className="flex items-center md:pointer-events-auto">
          <EditorToolbar
            editor={editor}
            defaultFont={font}
            defaultFontSize={fontSize}
            onSearch={onSearch}
            searchActive={searchOpen}
            onExport={onExport}
          />
        </div>
      </div>

      {/* Right: panel toggles */}
      <div className="flex items-center gap-0.5 shrink-0 ml-auto">
        {harperEnabled && (
          <ToolbarButton
            icon={<IconSpellCheck size={15} />}
            title="Grammar & spell check"
            onClick={() => handleRightPanel('spellcheck')}
            active={rightPanel === 'spellcheck'}
          />
        )}
        {aiEnabled && (
          <ToolbarButton
            icon={<IconSparkles size={15} />}
            title="AI Tools"
            onClick={() => handleRightPanel('ai')}
            active={rightPanel === 'ai'}
          />
        )}
        <ToolbarButton
          icon={<IconTarget size={15} />}
          title="Writing Goals"
          onClick={() => handleRightPanel('goals')}
          active={rightPanel === 'goals'}
        />
        <div className="hidden lg:flex">
          <ToolbarButton
            icon={<IconMaximize size={15} />}
            title={activeSectionId ? 'Enter focus mode' : 'Select a section to focus'}
            onClick={onFocusMode}
            disabled={!activeSectionId}
          />
        </div>
      </div>
    </div>
  )
}

export default function EditorScreen() {
  const navigate = useNavigate()
  const { project, recentId, closeProject, closePreview, restoreFromPreview, activeSectionId, sectionWordCounts, writingLog, updateGoals } = useProject()
  const editor = useEditorSetup()
  const editorRef = useRef<RichTextEditorHandle>(null)

  const [openSidebars, setOpenSidebars] = useState<string[]>(['left'])
  const [searchOpen, setSearchOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [backupsOpen, setBackupsOpen] = useState(false)
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false)
  const [rightPanel, setRightPanel] = useState<RightPanel>(null)
  const [focusMode, setFocusMode] = useState(false)
  const activeSectionIdRef = useRef(activeSectionId)
  useEffect(() => { activeSectionIdRef.current = activeSectionId }, [activeSectionId])

  const draftSectionIds = useMemo(() =>
    new Set(
      (project?.sections ?? []).flatMap(e =>
        e.type === 'section' ? [e.id] : (e.children ?? []).map(c => c.id)
      )
    ),
    [project?.sections]
  )
  const totalWords = useMemo(() =>
    Object.entries(sectionWordCounts)
      .filter(([id]) => draftSectionIds.has(id))
      .reduce((acc, [, count]) => acc + count, 0),
    [sectionWordCounts, draftSectionIds]
  )
  const { progress: goalPct, info: goalInfo } = useMemo(
    () => computeGoal(totalWords, writingLog.log, writingLog.lastKnownTotal, writingLog.goals),
    [totalWords, writingLog.log, writingLog.lastKnownTotal, writingLog.goals]
  )

  const harperEnabled = project?.settings?.harperEnabled ?? false
  const { linter, isReady } = useHarperLinter(harperEnabled)
  const [spellLints, setSpellLints] = useState<SpellLint[]>([])

  // Clear spell lints when the active section changes
  useEffect(() => {
    setSpellLints([])
  }, [activeSectionId])

  const activeSectionTitle = activeSectionId
    ? findSectionTitle(project?.sections ?? [], activeSectionId)
      ?? findSectionTitle(project?.extras ?? [], activeSectionId)
      ?? findSectionTitle(project?.frontMatter ?? [], activeSectionId)
      ?? findSectionTitle(project?.backMatter ?? [], activeSectionId)
    : null

  function handleSetRightPanel(panel: RightPanel) {
    if (panel === null) {
      editorRef.current?.clearHighlight()
      setSpellLints([])
    }
    setRightPanel(panel)
  }

  function handleApplySpellFix(lint: SpellLint, suggestionIndex: number) {
    const replacement = lint.suggestions[suggestionIndex]
    editorRef.current?.replaceTextRange(lint.span.start, lint.span.end, replacement)
    const delta = replacement.length - (lint.span.end - lint.span.start)
    setSpellLints(prev =>
      prev
        .filter(l => l.index !== lint.index)
        .map(l =>
          l.span.start >= lint.span.end
            ? { ...l, span: { start: l.span.start + delta, end: l.span.end + delta } }
            : l
        )
    )
  }

  function toggleFocusMode() {
    setFocusMode(f => f ? false : !!activeSectionId)
  }

  // Cmd/Ctrl+. toggles focus mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        setFocusMode(f => f ? false : !!activeSectionIdRef.current)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

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

  const bannerClass = 'flex items-center justify-center px-4 h-8 bg-accent/[0.06] border-b border-border text-[0.8125rem] text-text-secondary shrink-0 gap-2'
  const aiEnabled = project.settings?.aiEnabled ?? false
  const showBackups = project.settings?.backupsEnabled === true && recentId !== PREVIEW_RECENT_ID
  const font = project.settings?.font ?? 'Inter, sans-serif'
  const fontSize = project.settings?.fontSize ?? 16

  const editorContent = (
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
      spellLints={spellLints}
    />
  )

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-bg text-text${focusMode ? ' focus-mode-active' : ''}${project.settings?.darkMode ? ' dark' : ''}`}>

      {/* Nav */}
      {!focusMode && (
        <EditorNav
          projectTitle={project.title}
          sectionTitle={activeSectionTitle}
          showBackups={showBackups}
          onClose={() => { closeProject(); navigate('/') }}
          onBackups={() => setBackupsOpen(true)}
        />
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

      {/* Body */}
      {!focusMode ? (
        <SidebarProvider
          open={openSidebars}
          onOpenChange={setOpenSidebars}
          sidebarNames={['left', 'right']}
          className="flex-1 flex-col overflow-hidden"
          style={{ '--sidebar': 'var(--color-sidebar)' } as React.CSSProperties}
        >
          {/* Toolbar — inside provider to access toggleSidebar */}
          <EditorToolbarRow
            editor={editor}
            font={font}
            fontSize={fontSize}
            aiEnabled={aiEnabled}
            harperEnabled={harperEnabled}
            activeSectionId={activeSectionId}
            rightPanel={rightPanel}
            searchOpen={searchOpen}
            onSearch={() => setSearchOpen(o => !o)}
            onExport={() => setExportOpen(true)}
            onRightPanel={handleSetRightPanel}
            onFocusMode={toggleFocusMode}
          />

          {/* Three-column body */}
          <div className="flex flex-1 overflow-hidden relative bg-surface">
            <Sidebar name="left" side="left" collapsible="offcanvas" width="16rem" variant="floating">
              <SidebarContent className="pl-3 pr-1 pt-2 scrollbar-none">
                <SectionsSidebar />
              </SidebarContent>
            </Sidebar>

            <SidebarInset className="overflow-hidden bg-transparent min-h-0">
              {editorContent}
            </SidebarInset>

            <Sidebar
              name="right"
              side="right"
              collapsible="offcanvas"
              width="20rem"
              variant="floating"
              onClose={() => handleSetRightPanel(null)}
            >
              <SidebarContent className="p-3 scrollbar-none">
                {rightPanel === 'goals' && (
                  <WritingGoalsPanel
                    writingLog={writingLog}
                    totalWords={totalWords}
                    onUpdateGoals={updateGoals}
                  />
                )}
                {rightPanel === 'ai' && (
                  <AIPanel
                    getEditorText={() => editorRef.current?.getText() ?? ''}
                    aiEnabled={aiEnabled}
                    aiBackend={project.settings?.aiBackend ?? 'auto'}
                    onNavigateSettings={() => navigate('/settings')}
                  />
                )}
                {rightPanel === 'spellcheck' && (
                  <SpellCheckPanel
                    key={activeSectionId ?? 'none'}
                    linter={linter}
                    isReady={isReady}
                    getEditorText={() => editorRef.current?.getText() ?? ''}
                    onLintsChange={setSpellLints}
                    onApplyFix={handleApplySpellFix}
                  />
                )}
              </SidebarContent>
            </Sidebar>
          </div>
        </SidebarProvider>
      ) : (
        // Focus mode — editor only, full width
        <main className="flex-1 overflow-hidden">
          {editorContent}
        </main>
      )}

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

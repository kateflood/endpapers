import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { WritingLogEntry } from '@endpapers/types'
import { todayISODate, isThisWeek, isThisMonth, findSectionTitle, sumWritingLog } from '@endpapers/utils'
import { useProject, DEMO_RECENT_ID, PREVIEW_RECENT_ID } from '../../contexts/ProjectContext'
import SectionsSidebar from '../../components/SectionsSidebar/SectionsSidebar'
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor'
import type { RichTextEditorHandle } from '../../components/RichTextEditor/RichTextEditor'
import WritingGoalsPanel from '../../components/WritingGoalsPanel/WritingGoalsPanel'
import AIPanel from '../../components/AIPanel/AIPanel'
import { IconSettings, IconFolderOpen, IconChevronDown, IconSparkles, IconBookOpen, IconArchive } from '../../components/icons'
import BackupsDialog from '../../components/BackupsDialog/BackupsDialog'

// ── Goal progress helpers ────────────────────────────────────────────────

/** Returns 0–1 progress toward the first active goal (session > daily > weekly > monthly), or -1 if no goal is set. */
function goalProgress(
  sessionWords: number,
  totalWords: number,
  log: WritingLogEntry[],
  lastKnownTotal: number | undefined,
  goals: { session?: number; daily?: number; weekly?: number; monthly?: number },
): number {
  const unlogged = Math.max(0, totalWords - (lastKnownTotal ?? 0))
  const today = todayISODate()
  const todayLogged = sumWritingLog(log, e => e.date === today)
  const dailyWords = todayLogged + unlogged
  const weeklyWords = sumWritingLog(log, e => isThisWeek(e.date) && e.date !== today) + dailyWords
  const monthlyWords = sumWritingLog(log, e => isThisMonth(e.date) && e.date !== today) + dailyWords

  if (goals.session && goals.session > 0) return Math.min(1, sessionWords / goals.session)
  if (goals.daily && goals.daily > 0) return Math.min(1, dailyWords / goals.daily)
  if (goals.weekly && goals.weekly > 0) return Math.min(1, weeklyWords / goals.weekly)
  if (goals.monthly && goals.monthly > 0) return Math.min(1, monthlyWords / goals.monthly)
  return -1
}

/** A 16px circular progress ring. -1 = no goal (empty ring), 0–1 = partial/full fill. */
function GoalRing({ progress }: { progress: number }) {
  const r = 6
  const circumference = 2 * Math.PI * r
  const noGoal = progress < 0
  const pct = noGoal ? 0 : progress
  const offset = circumference - pct * circumference
  const met = progress >= 1

  // Color: no goal → dim, in progress → white-ish, met → green
  const ringColor = noGoal
    ? 'rgba(255,255,255,0.2)'
    : met
      ? '#68D391'
      : 'rgba(255,255,255,0.7)'

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
      {/* Background track */}
      <circle cx="8" cy="8" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
      {/* Progress arc */}
      {!noGoal && (
        <circle
          cx="8" cy="8" r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 8 8)"
          className="transition-all duration-500"
        />
      )}
    </svg>
  )
}

export default function EditorScreen() {
  const navigate = useNavigate()
  const { project, recentId, closeProject, closePreview, restoreFromPreview, activeSectionId, sectionWordCounts, writingLog, sessionStartWords, updateGoals } = useProject()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [backupsOpen, setBackupsOpen] = useState(false)
  type RightPanel = 'goals' | 'ai' | null
  const [rightPanel, setRightPanel] = useState<RightPanel>(null)
  const [focusMode, setFocusMode] = useState(false)
  const editorRef = useRef<RichTextEditorHandle>(null)

  const draftSectionIds = new Set(
    (project?.sections ?? []).flatMap(e =>
      e.type === 'section' ? [e.id] : (e.children ?? []).map(c => c.id)
    )
  )
  const totalWords = Object.entries(sectionWordCounts)
    .filter(([id]) => draftSectionIds.has(id))
    .reduce((acc, [, count]) => acc + count, 0)
  const sessionWords = Math.max(0, totalWords - sessionStartWords)

  // Resolve active section title for breadcrumb
  const activeSectionTitle = activeSectionId
    ? findSectionTitle(project?.sections ?? [], activeSectionId)
      ?? findSectionTitle(project?.extras ?? [], activeSectionId)
      ?? findSectionTitle(project?.frontMatter ?? [], activeSectionId)
      ?? findSectionTitle(project?.backMatter ?? [], activeSectionId)
    : null

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
          <span
            className="font-serif text-sm text-white/70 cursor-pointer"
            onClick={() => { closeProject(); navigate('/') }}
          >
            endpapers
          </span>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 ml-3 text-xs text-white/40">
            <IconFolderOpen size={11} />
            <span className="truncate max-w-[200px]">{project.title || 'Untitled'}</span>
            {activeSectionTitle && (
              <>
                <IconChevronDown size={9} className="rotate-[-90deg] opacity-40" />
                <span className="truncate max-w-[200px] text-white/60">
                  {activeSectionTitle}
                </span>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1">
            {project.settings?.backupsEnabled === true && recentId !== PREVIEW_RECENT_ID && (
              <button
                className={titleBarBtnClass}
                onClick={() => setBackupsOpen(true)}
                title="Backups"
              >
                <IconArchive size={13} />
              </button>
            )}
            <button
              className={titleBarBtnClass}
              onClick={() => navigate('/reference')}
              title="Reference"
            >
              <IconBookOpen size={13} />
            </button>
            <button
              className={`${titleBarBtnClass}${rightPanel === 'ai' ? ' text-white/80' : ''}`}
              onClick={() => setRightPanel(p => p === 'ai' ? null : 'ai')}
              title="AI Tools"
            >
              <IconSparkles size={13} />
            </button>
            <button
              className={`${titleBarBtnClass}${rightPanel === 'goals' ? ' text-white/80' : ''}`}
              onClick={() => setRightPanel(p => p === 'goals' ? null : 'goals')}
              title="Writing goals"
            >
              <GoalRing progress={goalProgress(
                sessionWords, totalWords,
                writingLog.log, writingLog.lastKnownTotal,
                writingLog.goals,
              )} />
            </button>
            <button
              className={titleBarBtnClass}
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              <IconSettings size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Demo banner */}
      {!focusMode && recentId === DEMO_RECENT_ID && (
        <div className={bannerClass}>
          <span>You are viewing the demo project.</span>
          <button
            className="text-accent hover:underline cursor-pointer"
            onClick={() => { closeProject(); navigate('/') }}
          >
            Back to home
          </button>
        </div>
      )}

      {/* Backup preview banner */}
      {!focusMode && recentId === PREVIEW_RECENT_ID && (
        <div className={bannerClass}>
          <span>You are previewing a backup (read-only).</span>
          <button
            className="text-accent hover:underline cursor-pointer"
            onClick={() => {
              if (confirm('This will replace all current project files with this backup.\n\nA backup of the current state will be created first.\n\nContinue?')) {
                restoreFromPreview()
              }
            }}
          >
            Restore this backup
          </button>
          <span className="text-text-placeholder">·</span>
          <button
            className="text-text-secondary hover:underline cursor-pointer"
            onClick={() => closePreview()}
          >
            Close preview
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
          <RichTextEditor
            ref={editorRef}
            focusMode={focusMode}
            onExitFocus={() => setFocusMode(false)}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(o => !o)}
            onToggleFocus={() => setFocusMode(f => f ? false : !!activeSectionId)}
            focusModeEnabled={!!activeSectionId}
            totalWords={totalWords}
          />
        </main>

        {/* Right panels — only one at a time, hidden in focus mode */}
        {!focusMode && rightPanel === 'goals' && (
          <WritingGoalsPanel
            writingLog={writingLog}
            sessionWords={sessionWords}
            totalWords={totalWords}
            onUpdateGoals={updateGoals}
            onClose={() => setRightPanel(null)}
          />
        )}
        {!focusMode && rightPanel === 'ai' && (
          <AIPanel
            getEditorText={() => editorRef.current?.getText() ?? ''}
            onClose={() => { editorRef.current?.clearHighlight(); setRightPanel(null) }}
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
        )}
      </div>

      {backupsOpen && <BackupsDialog onClose={() => setBackupsOpen(false)} />}
    </div>
  )
}

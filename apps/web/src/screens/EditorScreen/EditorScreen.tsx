import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { estimatePages } from '@endpapers/utils'
import { useProject } from '../../contexts/ProjectContext'
import SectionsSidebar from '../../components/SectionsSidebar/SectionsSidebar'
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor'
import WritingGoalsPanel from '../../components/WritingGoalsPanel/WritingGoalsPanel'
import { IconMenu, IconSettings } from '../../components/icons'

export default function EditorScreen() {
  const navigate = useNavigate()
  const { project, closeProject, sectionWordCounts, writingLog, sessionStartWords, updateGoals } = useProject()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [goalsOpen, setGoalsOpen] = useState(false)

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

  useEffect(() => {
    if (!project) navigate('/', { replace: true })
  }, [project, navigate])

  if (!project) return null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center px-4 h-12 border-b border-border bg-surface shrink-0 gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle sections sidebar"
        >
          <IconMenu size={16} />
        </button>
        <span
          className="text-[0.9375rem] font-medium text-text flex-1 truncate cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => { closeProject(); navigate('/') }}
        >
          Endpapers
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
            className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
            onClick={() => navigate('/settings')}
            aria-label="Settings"
          >
            <IconSettings size={16} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sections sidebar */}
        {sidebarOpen && (
          <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
            <SectionsSidebar />
          </aside>
        )}

        {/* Editor area */}
        <main className="flex-1 flex overflow-hidden">
          <RichTextEditor />
        </main>

        {/* Writing goals panel */}
        {goalsOpen && (
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

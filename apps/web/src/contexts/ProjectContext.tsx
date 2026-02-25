import { createContext, useContext, useState, useRef, type ReactNode } from 'react'
import type { Project, ProjectSettings, SectionManifestEntry, WritingLog, WritingGoals, AuthorInfo } from '@endpapers/types'
import { writeProjectJson, writeWritingLog, readSectionFile } from '../fs/projectFs'
import { DEMO_PROJECT, DEMO_WRITING_LOG } from '../demo/demoContent'
import { createDemoHandle } from '../demo/memoryHandle'
import { todayISODate, countWords } from '@endpapers/utils'
import { useToast } from './ToastContext'

interface ProjectContextValue {
  project: Project | null
  handle: FileSystemDirectoryHandle | null
  recentId: string | null
  activeSectionId: string | null
  sectionWordCounts: Record<string, number>
  writingLog: WritingLog
  sessionStartWords: number
  openProject: (handle: FileSystemDirectoryHandle, project: Project, recentId: string, writingLog: WritingLog) => void
  closeProject: () => void
  setActiveSectionId: (id: string | null) => void
  updateSections: (sections: SectionManifestEntry[]) => Promise<void>
  updateExtras: (extras: SectionManifestEntry[]) => Promise<void>
  updateBothManifests: (sections: SectionManifestEntry[], extras: SectionManifestEntry[]) => Promise<void>
  updateFrontMatter: (frontMatter: SectionManifestEntry[]) => Promise<void>
  updateBackMatter: (backMatter: SectionManifestEntry[]) => Promise<void>
  updateAllManifests: (sections: SectionManifestEntry[], extras: SectionManifestEntry[], frontMatter: SectionManifestEntry[], backMatter: SectionManifestEntry[]) => Promise<void>
  updateSettings: (settings: ProjectSettings) => Promise<void>
  updateProjectMeta: (patch: { title?: string; subtitle?: string; authorInfo?: AuthorInfo }) => Promise<void>
  updateSectionWordCount: (id: string, count: number) => void
  updateGoals: (goals: WritingGoals) => Promise<void>
  openDemoProject: () => void
}

const EMPTY_LOG: WritingLog = { goals: {}, log: [] }

// Mirrors TipTap's getText() behaviour: block elements add whitespace so words
// across paragraph boundaries are counted separately by countWords().
const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE', 'BR'])
function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType === Node.ELEMENT_NODE) {
      const text = Array.from(node.childNodes).map(walk).join('')
      return BLOCK_TAGS.has((node as Element).tagName) ? text + ' ' : text
    }
    return ''
  }
  return walk(doc.body)
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [recentId, setRecentId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [sectionWordCounts, setSectionWordCounts] = useState<Record<string, number>>({})
  const [writingLog, setWritingLog] = useState<WritingLog>(EMPTY_LOG)
  const [sessionStartWords, setSessionStartWords] = useState(0)

  // Refs for the debounced log flush — avoids stale closures inside setTimeout
  const writingLogRef = useRef<WritingLog>(EMPTY_LOG)
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openProject(
    newHandle: FileSystemDirectoryHandle,
    newProject: Project,
    newRecentId: string,
    newWritingLog: WritingLog,
  ) {
    setHandle(newHandle)
    setProject(newProject)
    setRecentId(newRecentId)
    setActiveSectionId(null)
    setSectionWordCounts({})
    setWritingLog(newWritingLog)
    setSessionStartWords(newWritingLog.lastKnownTotal ?? 0)
    writingLogRef.current = newWritingLog
    handleRef.current = newHandle

    // Eagerly load word counts for all sections (Draft + Drawer + Front matter + Back matter)
    const allSections = [
      ...newProject.sections,
      ...(newProject.extras ?? []),
      ...(newProject.frontMatter ?? []),
      ...(newProject.backMatter ?? []),
    ].flatMap(e => e.type === 'section' ? [e] : (e.children ?? []))
    for (const section of allSections) {
      if (!section.file) continue
      readSectionFile(newHandle, section.file)
        .then(html => {
          setSectionWordCounts(prev => ({ ...prev, [section.id]: countWords(htmlToPlainText(html)) }))
        })
        .catch(() => {})
    }
  }

  function closeProject() {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    setHandle(null)
    setProject(null)
    setRecentId(null)
    setActiveSectionId(null)
    setSectionWordCounts({})
    setWritingLog(EMPTY_LOG)
    setSessionStartWords(0)
    writingLogRef.current = EMPTY_LOG
    handleRef.current = null
  }

  function openDemoProject() {
    const demoHandle = createDemoHandle()
    openProject(demoHandle, DEMO_PROJECT, 'demo-project', DEMO_WRITING_LOG)
  }

  // Debounced: 2 seconds after last word count change, flush delta to writing-log.json
  function scheduleLogFlush(currentTotal: number) {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = setTimeout(() => {
      const log = writingLogRef.current
      const h = handleRef.current
      const delta = currentTotal - (log.lastKnownTotal ?? 0)
      if (delta <= 0 || !h) return
      const today = todayISODate()
      const hasToday = log.log.some(e => e.date === today)
      const newEntries = hasToday
        ? log.log.map(e => e.date === today ? { ...e, words: e.words + delta } : e)
        : [...log.log, { date: today, words: delta }]
      const updated: WritingLog = { ...log, log: newEntries, lastKnownTotal: currentTotal }
      writingLogRef.current = updated
      setWritingLog(updated)
      writeWritingLog(h, updated).catch(() => {})
    }, 2000)
  }

  function updateSectionWordCount(id: string, count: number) {
    setSectionWordCounts(prev => {
      const next = { ...prev, [id]: count }
      const total = Object.values(next).reduce((a, b) => a + b, 0)
      scheduleLogFlush(total)
      return next
    })
  }

  async function saveProject(updated: Project) {
    if (!handle) return
    setProject(updated)
    try {
      await writeProjectJson(handle, updated)
    } catch {
      showToast('Failed to save project — check file permissions.', 'error')
    }
  }

  async function updateSections(sections: SectionManifestEntry[]) {
    if (!project || !handle) return
    await saveProject({ ...project, sections, updatedAt: todayISODate() })
  }

  async function updateExtras(extras: SectionManifestEntry[]) {
    if (!project || !handle) return
    await saveProject({ ...project, extras, updatedAt: todayISODate() })
  }

  async function updateBothManifests(sections: SectionManifestEntry[], extras: SectionManifestEntry[]) {
    if (!project || !handle) return
    await saveProject({ ...project, sections, extras, updatedAt: todayISODate() })
  }

  async function updateFrontMatter(frontMatter: SectionManifestEntry[]) {
    if (!project || !handle) return
    await saveProject({ ...project, frontMatter, updatedAt: todayISODate() })
  }

  async function updateBackMatter(backMatter: SectionManifestEntry[]) {
    if (!project || !handle) return
    await saveProject({ ...project, backMatter, updatedAt: todayISODate() })
  }

  async function updateAllManifests(sections: SectionManifestEntry[], extras: SectionManifestEntry[], frontMatter: SectionManifestEntry[], backMatter: SectionManifestEntry[]) {
    if (!project || !handle) return
    await saveProject({ ...project, sections, extras, frontMatter, backMatter, updatedAt: todayISODate() })
  }

  async function updateSettings(settings: ProjectSettings) {
    if (!project || !handle) return
    await saveProject({ ...project, settings, updatedAt: todayISODate() })
  }

  async function updateProjectMeta(patch: { title?: string; subtitle?: string; authorInfo?: AuthorInfo }) {
    if (!project || !handle) return
    await saveProject({ ...project, ...patch, updatedAt: todayISODate() })
  }

  async function updateGoals(goals: WritingGoals) {
    const h = handleRef.current
    if (!h) return
    const updated: WritingLog = { ...writingLogRef.current, goals }
    writingLogRef.current = updated
    setWritingLog(updated)
    try {
      await writeWritingLog(h, updated)
    } catch {
      showToast('Failed to save writing goals.', 'error')
    }
  }

  return (
    <ProjectContext.Provider
      value={{
        project,
        handle,
        recentId,
        activeSectionId,
        sectionWordCounts,
        writingLog,
        sessionStartWords,
        openProject,
        closeProject,
        setActiveSectionId,
        updateSections,
        updateExtras,
        updateBothManifests,
        updateFrontMatter,
        updateBackMatter,
        updateAllManifests,
        updateSettings,
        updateProjectMeta,
        updateSectionWordCount,
        updateGoals,
        openDemoProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import type { Project, ProjectType, ProjectSettings, SectionManifestEntry, WritingLog, WritingGoals, AuthorInfo } from '@endpapers/types'
import { writeProjectJson, writeWritingLog, readSectionFile } from '../fs/projectFs'
import { createBackup, restoreBackup, unzipToMemoryHandle } from '../fs/backups'
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
  closeProject: () => Promise<void>
  createManualBackup: () => Promise<void>
  previewBackupFilename: string | null
  openBackupPreview: (filename: string) => Promise<void>
  closePreview: () => void
  restoreFromPreview: () => Promise<void>
  setActiveSectionId: (id: string | null) => void
  updateSections: (sections: SectionManifestEntry[]) => Promise<void>
  updateExtras: (extras: SectionManifestEntry[]) => Promise<void>
  updateBothManifests: (sections: SectionManifestEntry[], extras: SectionManifestEntry[]) => Promise<void>
  updateFrontMatter: (frontMatter: SectionManifestEntry[]) => Promise<void>
  updateBackMatter: (backMatter: SectionManifestEntry[]) => Promise<void>
  updateAllManifests: (sections: SectionManifestEntry[], extras: SectionManifestEntry[], frontMatter: SectionManifestEntry[], backMatter: SectionManifestEntry[]) => Promise<void>
  updateSettings: (settings: ProjectSettings) => Promise<void>
  updateProjectMeta: (patch: { title?: string; subtitle?: string; type?: ProjectType; customTypeLabel?: string; authorInfo?: AuthorInfo }) => Promise<void>
  updateSectionWordCount: (id: string, count: number) => void
  updateGoals: (goals: WritingGoals) => Promise<void>
  openDemoProject: () => void
}

const EMPTY_LOG: WritingLog = { goals: {}, log: [] }

export const DEMO_RECENT_ID = 'demo-project'
export const PREVIEW_RECENT_ID = 'backup-preview'

/** Returns true for demo and backup-preview projects (in-memory, no persistence). */
export function isEphemeral(id: string | null): boolean {
  return id === DEMO_RECENT_ID || id === PREVIEW_RECENT_ID
}

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

  // Backup refs
  const lastBackupTimeRef = useRef(0)
  const lastSaveTimeRef = useRef(0)
  const projectRef = useRef<Project | null>(null)
  const recentIdRef = useRef<string | null>(null)

  // Preview state
  const [previewBackupFilename, setPreviewBackupFilename] = useState<string | null>(null)
  const previewSourceHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const previewSourceProjectRef = useRef<Project | null>(null)
  const previewSourceRecentIdRef = useRef<string | null>(null)
  const previewSourceWritingLogRef = useRef<WritingLog>(EMPTY_LOG)

  function openProject(
    newHandle: FileSystemDirectoryHandle,
    newProject: Project,
    newRecentId: string,
    newWritingLog: WritingLog,
  ) {
    setHandle(newHandle)
    setProject(newProject)
    setRecentId(newRecentId)
    // Auto-select the first section in the draft manifest
    const firstSection = newProject.sections.length > 0
      ? newProject.sections[0].type === 'section'
        ? newProject.sections[0].id
        : (newProject.sections[0].children?.[0]?.id ?? null)
      : null
    setActiveSectionId(firstSection)
    setSectionWordCounts({})
    setWritingLog(newWritingLog)
    setSessionStartWords(newWritingLog.lastKnownTotal ?? 0)
    writingLogRef.current = newWritingLog
    handleRef.current = newHandle
    projectRef.current = newProject
    recentIdRef.current = newRecentId
    lastSaveTimeRef.current = 0
    lastBackupTimeRef.current = 0

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

  /** Returns true if conditions are met for an automatic backup (enabled, not ephemeral, stale). */
  function shouldAutoBackup(): boolean {
    const p = projectRef.current
    if (!handleRef.current || !p?.settings?.backupsEnabled || p?.settings?.backupOnClose === false) return false
    if (isEphemeral(recentIdRef.current)) return false
    return lastSaveTimeRef.current > lastBackupTimeRef.current && Date.now() - lastBackupTimeRef.current > 60_000
  }

  async function closeProject() {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)

    // Backup on close if enabled and there are unsaved changes
    if (shouldAutoBackup()) {
      try {
        await createBackup(handleRef.current!, projectRef.current?.settings?.backupRetentionCount)
        lastBackupTimeRef.current = Date.now()
      } catch {
        // Best-effort
      }
    }

    setHandle(null)
    setProject(null)
    setRecentId(null)
    setActiveSectionId(null)
    setSectionWordCounts({})
    setWritingLog(EMPTY_LOG)
    setSessionStartWords(0)
    writingLogRef.current = EMPTY_LOG
    handleRef.current = null
    projectRef.current = null
    recentIdRef.current = null
    setPreviewBackupFilename(null)
    previewSourceHandleRef.current = null
    previewSourceProjectRef.current = null
    previewSourceRecentIdRef.current = null
    previewSourceWritingLogRef.current = EMPTY_LOG
  }

  function openDemoProject() {
    const demoHandle = createDemoHandle()
    openProject(demoHandle, DEMO_PROJECT, DEMO_RECENT_ID, DEMO_WRITING_LOG)
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
      writeWritingLog(h, updated).then(() => { lastSaveTimeRef.current = Date.now() }).catch(() => {})
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

  const openBackupPreview = useCallback(async (filename: string) => {
    const h = handleRef.current
    if (!h) return
    // Unzip first — only mutate state once we know the operation succeeded
    const { handle: memHandle, project: backupProject, writingLog: backupLog } = await unzipToMemoryHandle(h, filename)
    // Stash the real project state for closePreview / restore
    previewSourceHandleRef.current = h
    previewSourceProjectRef.current = projectRef.current
    previewSourceRecentIdRef.current = recentIdRef.current
    previewSourceWritingLogRef.current = writingLogRef.current
    setPreviewBackupFilename(filename)
    openProject(memHandle, backupProject, PREVIEW_RECENT_ID, backupLog)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closePreview = useCallback(() => {
    const h = previewSourceHandleRef.current
    const p = previewSourceProjectRef.current
    const rid = previewSourceRecentIdRef.current
    const wl = previewSourceWritingLogRef.current
    if (!h || !p || !rid) return
    // Re-open the original project
    openProject(h, p, rid, wl)
    setPreviewBackupFilename(null)
    previewSourceHandleRef.current = null
    previewSourceProjectRef.current = null
    previewSourceRecentIdRef.current = null
    previewSourceWritingLogRef.current = EMPTY_LOG
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restoreFromPreview = useCallback(async () => {
    const h = previewSourceHandleRef.current
    const fn = previewBackupFilename
    if (!h || !fn) return
    try {
      const retentionCount = previewSourceProjectRef.current?.settings?.backupRetentionCount
      await createBackup(h, retentionCount, 'Pre-restore backup')
      await restoreBackup(h, fn)
      showToast('Backup restored. Reloading…', 'info')
      setTimeout(() => window.location.reload(), 500)
    } catch {
      showToast('Failed to restore backup.', 'error')
    }
  }, [previewBackupFilename, showToast])

  const createManualBackup = useCallback(async () => {
    const h = handleRef.current
    if (!h || isEphemeral(recentIdRef.current)) return
    try {
      await createBackup(h, projectRef.current?.settings?.backupRetentionCount)
      lastBackupTimeRef.current = Date.now()
      showToast('Backup created.', 'info')
    } catch {
      showToast('Failed to create backup.', 'error')
    }
  }, [showToast])

  // Backup on visibilitychange (tab hide / close)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'hidden') return
      if (!shouldAutoBackup()) return
      createBackup(handleRef.current!, projectRef.current?.settings?.backupRetentionCount)
        .then(() => { lastBackupTimeRef.current = Date.now() })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  async function saveProject(updated: Project) {
    if (!handle) return
    setProject(updated)
    projectRef.current = updated
    try {
      await writeProjectJson(handle, updated)
      lastSaveTimeRef.current = Date.now()
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

  async function updateProjectMeta(patch: { title?: string; subtitle?: string; type?: ProjectType; customTypeLabel?: string; authorInfo?: AuthorInfo }) {
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
        createManualBackup,
        previewBackupFilename,
        openBackupPreview,
        closePreview,
        restoreFromPreview,
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

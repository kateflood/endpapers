import { generateId, todayISODate } from '@endpapers/utils'
import type { Project, ProjectType, WritingLog, ReferenceManifest, ReferenceItem, ReferenceGraph, ReferenceManifestEntry, SectionManifestEntry, BoardAnnotation, ReferenceEdge } from '@endpapers/types'

export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return null
    throw err
  }
}

export async function requestPermissionForHandle(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  const h = handle as FileSystemDirectoryHandle & {
    queryPermission(descriptor: { mode: string }): Promise<PermissionState>
    requestPermission(descriptor: { mode: string }): Promise<PermissionState>
  }
  const permission = await h.queryPermission({ mode: 'readwrite' })
  if (permission === 'granted') return true
  if (permission === 'prompt') {
    const result = await h.requestPermission({ mode: 'readwrite' })
    return result === 'granted'
  }
  return false
}

const BUILT_IN_COLLECTIONS: ReferenceManifest = {
  collections: [
    {
      type: 'character',
      label: 'Characters',
      builtIn: true,
      fields: [
        { key: 'role', label: 'Role', inputType: 'text' },
        { key: 'description', label: 'Description', inputType: 'textarea' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
    {
      type: 'location',
      label: 'Locations',
      builtIn: true,
      fields: [
        { key: 'description', label: 'Description', inputType: 'textarea' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
    {
      type: 'timeline',
      label: 'Timeline',
      builtIn: true,
      fields: [
        { key: 'date', label: 'Date', inputType: 'text' },
        { key: 'description', label: 'Description', inputType: 'textarea' },
      ],
    },
    {
      type: 'scenes',
      label: 'Scenes',
      builtIn: true,
      fields: [
        { key: 'setting', label: 'Setting', inputType: 'text' },
        { key: 'summary', label: 'Summary', inputType: 'textarea' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
    {
      type: 'notes',
      label: 'Notes',
      builtIn: true,
      fields: [
        { key: 'content', label: 'Content', inputType: 'textarea' },
      ],
    },
    {
      type: 'research',
      label: 'Research',
      builtIn: true,
      fields: [
        { key: 'source', label: 'Source', inputType: 'text' },
        { key: 'notes', label: 'Notes', inputType: 'textarea' },
      ],
    },
  ],
}

const DEFAULT_SETTINGS = {
  spellCheck: true,
  paperMode: true,
  darkMode: false,
  font: 'Inter, sans-serif',
  fontSize: 16,
  wordsPerPage: 250,
  showWordCount: true,
} as const

async function writeJson(
  dir: FileSystemDirectoryHandle,
  filename: string,
  data: unknown,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
}

export async function createProjectStructure(
  handle: FileSystemDirectoryHandle,
  title: string,
  author: string,
  projectType: ProjectType = 'fiction',
  customTypeLabel?: string,
): Promise<Project> {
  const sectionId = generateId()
  const sectionFile = `${sectionId}.html`

  const project: Project = {
    id: generateId(),
    title,
    type: projectType,
    ...(projectType === 'custom' && customTypeLabel ? { customTypeLabel } : {}),
    author,
    createdAt: todayISODate(),
    updatedAt: todayISODate(),
    sections: [
      { id: sectionId, title: 'Untitled Section', type: 'section', file: sectionFile },
    ],
    settings: { ...DEFAULT_SETTINGS },
  }

  const writingLog: WritingLog = { goals: {}, log: [] }

  await writeJson(handle, 'project.json', project)
  await writeJson(handle, 'writing-log.json', writingLog)

  const sectionsDir = await handle.getDirectoryHandle('sections', { create: true })
  const sectionFileHandle = await sectionsDir.getFileHandle(sectionFile, { create: true })
  const writable = await sectionFileHandle.createWritable()
  await writable.write('')
  await writable.close()

  const referenceDir = await handle.getDirectoryHandle('reference', { create: true })
  await writeJson(referenceDir, 'collections.json', BUILT_IN_COLLECTIONS)
  await writeJson(referenceDir, 'graph.json', { edges: [], annotations: [] } satisfies ReferenceGraph)
  await handle.getDirectoryHandle('assets', { create: true })

  return project
}

// ── Clone project from existing ───────────────────────────────────────────────

export interface TemplateOptions {
  sections: boolean
  frontMatter: boolean
  backMatter: boolean
  extras: boolean
  reference: boolean
  settings: boolean
  goals: boolean
}

function remapManifestIds(
  entries: SectionManifestEntry[],
): { remapped: SectionManifestEntry[]; fileMap: Map<string, string> } {
  const fileMap = new Map<string, string>()

  function remapEntry(e: SectionManifestEntry): SectionManifestEntry {
    const newId = generateId()
    if (e.type === 'section' && e.file) {
      const newFile = `${newId}.html`
      fileMap.set(e.file, newFile)
      return { ...e, id: newId, file: newFile }
    }
    if (e.type === 'group') {
      return {
        ...e,
        id: newId,
        children: (e.children ?? []).map(remapEntry),
      }
    }
    return { ...e, id: newId }
  }

  return { remapped: entries.map(remapEntry), fileMap }
}

export async function cloneProjectFromSource(
  sourceHandle: FileSystemDirectoryHandle,
  destHandle: FileSystemDirectoryHandle,
  title: string,
  projectType: ProjectType = 'fiction',
  customTypeLabel?: string,
  options: TemplateOptions = { sections: true, frontMatter: true, backMatter: true, extras: true, reference: true, settings: true, goals: true },
): Promise<{ project: Project; writingLog: WritingLog }> {
  const sourceProject = await readProjectJson(sourceHandle)

  // Remap section manifests and collect file copy mappings
  const allFileMaps: Map<string, string>[] = []

  let sections: SectionManifestEntry[]
  if (options.sections && sourceProject.sections.length > 0) {
    const result = remapManifestIds(sourceProject.sections)
    sections = result.remapped
    allFileMaps.push(result.fileMap)
  } else {
    const id = generateId()
    const file = `${id}.html`
    sections = [{ id, title: 'Untitled Section', type: 'section', file }]
  }

  let frontMatter: SectionManifestEntry[] | undefined
  if (options.frontMatter && (sourceProject.frontMatter ?? []).length > 0) {
    const result = remapManifestIds(sourceProject.frontMatter!)
    frontMatter = result.remapped
    allFileMaps.push(result.fileMap)
  }

  let backMatter: SectionManifestEntry[] | undefined
  if (options.backMatter && (sourceProject.backMatter ?? []).length > 0) {
    const result = remapManifestIds(sourceProject.backMatter!)
    backMatter = result.remapped
    allFileMaps.push(result.fileMap)
  }

  let extras: SectionManifestEntry[] | undefined
  if (options.extras && (sourceProject.extras ?? []).length > 0) {
    const result = remapManifestIds(sourceProject.extras!)
    extras = result.remapped
    allFileMaps.push(result.fileMap)
  }

  // Build the new project
  const project: Project = {
    id: generateId(),
    title,
    type: projectType,
    ...(projectType === 'custom' && customTypeLabel ? { customTypeLabel } : {}),
    author: '',
    createdAt: todayISODate(),
    updatedAt: todayISODate(),
    sections,
    ...(frontMatter ? { frontMatter } : {}),
    ...(backMatter ? { backMatter } : {}),
    ...(extras ? { extras } : {}),
    ...(options.settings && sourceProject.settings ? { settings: { ...sourceProject.settings } } : {
      settings: { ...DEFAULT_SETTINGS },
    }),
  }

  // Write project.json
  await writeJson(destHandle, 'project.json', project)

  // Write writing-log.json (copy goals only, not log entries)
  let writingLog: WritingLog = { goals: {}, log: [] }
  if (options.goals) {
    try {
      const sourceLog = await readWritingLog(sourceHandle)
      writingLog = { goals: { ...sourceLog.goals }, log: [] }
    } catch {
      // source has no writing log, use defaults
    }
  }
  await writeJson(destHandle, 'writing-log.json', writingLog)

  // Copy section content files
  const destSectionsDir = await destHandle.getDirectoryHandle('sections', { create: true })
  let sourceSectionsDir: FileSystemDirectoryHandle | null = null
  try {
    sourceSectionsDir = await sourceHandle.getDirectoryHandle('sections')
  } catch {
    // source has no sections dir
  }

  for (const fileMap of allFileMaps) {
    for (const [oldFile, newFile] of fileMap) {
      let content = ''
      if (sourceSectionsDir) {
        try {
          const srcFileHandle = await sourceSectionsDir.getFileHandle(oldFile)
          const srcFile = await srcFileHandle.getFile()
          content = await srcFile.text()
        } catch {
          // source file missing, write empty
        }
      }
      const destFileHandle = await destSectionsDir.getFileHandle(newFile, { create: true })
      const writable = await destFileHandle.createWritable()
      await writable.write(content)
      await writable.close()
    }
  }

  // If no file maps (sections not copied), ensure the default section file exists
  if (allFileMaps.length === 0 || !options.sections) {
    const defaultFile = sections[0]?.file
    if (defaultFile) {
      const fh = await destSectionsDir.getFileHandle(defaultFile, { create: true })
      const w = await fh.createWritable()
      await w.write('')
      await w.close()
    }
  }

  // Copy reference board
  const destReferenceDir = await destHandle.getDirectoryHandle('reference', { create: true })
  if (options.reference) {
    // Copy collections.json
    try {
      const sourceCollections = await readReferenceCollections(sourceHandle)
      await writeJson(destReferenceDir, 'collections.json', sourceCollections)
    } catch {
      await writeJson(destReferenceDir, 'collections.json', BUILT_IN_COLLECTIONS)
    }

    // Read source items and remap IDs
    const sourceItems = await readAllReferenceItems(sourceHandle)
    const itemIdMap = new Map<string, string>()

    for (const item of sourceItems) {
      const newId = generateId()
      itemIdMap.set(item.id, newId)
      const cloned: ReferenceItem = {
        ...item,
        id: newId,
        createdAt: todayISODate(),
        updatedAt: todayISODate(),
      }
      await writeJson(destReferenceDir, `${newId}.json`, cloned)
    }

    // Remap graph references
    try {
      const sourceGraph = await readReferenceGraph(sourceHandle)
      const remappedEdges: ReferenceEdge[] = sourceGraph.edges
        .filter(e => itemIdMap.has(e.source) && itemIdMap.has(e.target))
        .map(e => ({
          ...e,
          id: generateId(),
          source: itemIdMap.get(e.source)!,
          target: itemIdMap.get(e.target)!,
        }))
      const remappedAnnotations: BoardAnnotation[] = sourceGraph.annotations.map(a => ({
        ...a,
        id: generateId(),
      }))
      await writeJson(destReferenceDir, 'graph.json', { edges: remappedEdges, annotations: remappedAnnotations } satisfies ReferenceGraph)
    } catch {
      await writeJson(destReferenceDir, 'graph.json', { edges: [], annotations: [] } satisfies ReferenceGraph)
    }

    // Remap manifest references
    try {
      const sourceManifest = await readReferenceManifest(sourceHandle, sourceItems)
      const remappedManifest: Record<string, ReferenceManifestEntry[]> = {}
      for (const [collType, entries] of Object.entries(sourceManifest)) {
        remappedManifest[collType] = remapRefManifestIds(entries, itemIdMap)
      }
      await writeJson(destReferenceDir, 'manifest.json', remappedManifest)
    } catch {
      // no manifest to copy
    }
  } else {
    await writeJson(destReferenceDir, 'collections.json', BUILT_IN_COLLECTIONS)
    await writeJson(destReferenceDir, 'graph.json', { edges: [], annotations: [] } satisfies ReferenceGraph)
  }

  // Create assets directory
  await destHandle.getDirectoryHandle('assets', { create: true })

  return { project, writingLog }
}

function remapRefManifestIds(
  entries: ReferenceManifestEntry[],
  itemIdMap: Map<string, string>,
): ReferenceManifestEntry[] {
  return entries
    .map(e => {
      if (e.type === 'item') {
        const newId = itemIdMap.get(e.id)
        if (!newId) return null
        return { ...e, id: newId }
      }
      // group
      return {
        ...e,
        id: generateId(),
        children: (e.children ?? [])
          .map(c => {
            const newId = itemIdMap.get(c.id)
            if (!newId) return null
            return { ...c, id: newId }
          })
          .filter((c): c is ReferenceManifestEntry => c !== null),
      }
    })
    .filter((e): e is ReferenceManifestEntry => e !== null)
}

export async function validateProjectDirectory(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  try {
    await handle.getFileHandle('project.json')
    return true
  } catch {
    return false
  }
}

export async function readProjectJson(handle: FileSystemDirectoryHandle): Promise<Project> {
  const fileHandle = await handle.getFileHandle('project.json')
  const file = await fileHandle.getFile()
  const text = await file.text()
  return JSON.parse(text) as Project
}

export async function writeProjectJson(
  handle: FileSystemDirectoryHandle,
  project: Project,
): Promise<void> {
  await writeJson(handle, 'project.json', project)
}

export async function readWritingLog(handle: FileSystemDirectoryHandle): Promise<WritingLog> {
  try {
    const fileHandle = await handle.getFileHandle('writing-log.json')
    const file = await fileHandle.getFile()
    const text = await file.text()
    return JSON.parse(text) as WritingLog
  } catch {
    return { goals: {}, log: [] }
  }
}

export async function writeWritingLog(
  handle: FileSystemDirectoryHandle,
  log: WritingLog,
): Promise<void> {
  await writeJson(handle, 'writing-log.json', log)
}

export async function createSectionFile(
  handle: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  const sectionsDir = await handle.getDirectoryHandle('sections')
  const fileHandle = await sectionsDir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write('')
  await writable.close()
}

export async function deleteSectionFile(
  handle: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  const sectionsDir = await handle.getDirectoryHandle('sections')
  await sectionsDir.removeEntry(filename)
}

export async function readSectionFile(
  handle: FileSystemDirectoryHandle,
  filename: string,
): Promise<string> {
  const sectionsDir = await handle.getDirectoryHandle('sections')
  const fileHandle = await sectionsDir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  return file.text()
}

/**
 * Read all section files from a manifest and return concatenated plain text.
 */
export async function readAllSectionsAsText(
  handle: FileSystemDirectoryHandle,
  sections: SectionManifestEntry[],
): Promise<string> {
  const flat = sections.flatMap(e =>
    e.type === 'section' ? [e] : (e.children ?? [])
  )
  const texts: string[] = []
  for (const entry of flat) {
    if (!entry.file) continue
    try {
      const html = await readSectionFile(handle, entry.file)
      const doc = new DOMParser().parseFromString(html, 'text/html')
      texts.push(doc.body.textContent ?? '')
    } catch { /* skip missing files */ }
  }
  return texts.filter(t => t.trim()).join('\n\n')
}

export async function writeSectionFile(
  handle: FileSystemDirectoryHandle,
  filename: string,
  content: string,
): Promise<void> {
  const sectionsDir = await handle.getDirectoryHandle('sections')
  const fileHandle = await sectionsDir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export async function readReferenceCollections(
  handle: FileSystemDirectoryHandle,
): Promise<ReferenceManifest> {
  try {
    const referenceDir = await handle.getDirectoryHandle('reference')
    const fileHandle = await referenceDir.getFileHandle('collections.json')
    const file = await fileHandle.getFile()
    return JSON.parse(await file.text()) as ReferenceManifest
  } catch {
    return BUILT_IN_COLLECTIONS
  }
}

export async function readAllReferenceItems(
  handle: FileSystemDirectoryHandle,
): Promise<ReferenceItem[]> {
  try {
    const referenceDir = await handle.getDirectoryHandle('reference')
    const items: ReferenceItem[] = []
    for await (const [name, entry] of referenceDir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
      if (entry.kind !== 'file' || name === 'collections.json' || name === 'graph.json' || name === 'manifest.json' || !name.endsWith('.json')) continue
      const file = await (entry as FileSystemFileHandle).getFile()
      const item = JSON.parse(await file.text()) as ReferenceItem & { parentId?: string }
      delete item.parentId // strip legacy field
      items.push(item)
    }
    return items
  } catch {
    return []
  }
}

export async function readReferenceGraph(
  handle: FileSystemDirectoryHandle,
): Promise<ReferenceGraph> {
  try {
    const referenceDir = await handle.getDirectoryHandle('reference')
    const fileHandle = await referenceDir.getFileHandle('graph.json')
    const file = await fileHandle.getFile()
    const data = JSON.parse(await file.text()) as ReferenceGraph & { groups?: unknown[] }
    // Migrate legacy format: drop groups, ensure annotations exists
    return { edges: data.edges ?? [], annotations: data.annotations ?? [] }
  } catch {
    return { edges: [], annotations: [] }
  }
}

export async function writeReferenceGraph(
  handle: FileSystemDirectoryHandle,
  graph: ReferenceGraph,
): Promise<void> {
  const referenceDir = await handle.getDirectoryHandle('reference', { create: true })
  await writeJson(referenceDir, 'graph.json', graph)
}

export async function writeReferenceItem(
  handle: FileSystemDirectoryHandle,
  item: ReferenceItem,
): Promise<void> {
  const referenceDir = await handle.getDirectoryHandle('reference', { create: true })
  await writeJson(referenceDir, `${item.id}.json`, item)
}

export async function deleteReferenceItem(
  handle: FileSystemDirectoryHandle,
  itemId: string,
): Promise<void> {
  const referenceDir = await handle.getDirectoryHandle('reference')
  await referenceDir.removeEntry(`${itemId}.json`)
}

export async function readReferenceManifest(
  handle: FileSystemDirectoryHandle,
  items: ReferenceItem[],
): Promise<Record<string, ReferenceManifestEntry[]>> {
  try {
    const referenceDir = await handle.getDirectoryHandle('reference')
    const fileHandle = await referenceDir.getFileHandle('manifest.json')
    const file = await fileHandle.getFile()
    return JSON.parse(await file.text()) as Record<string, ReferenceManifestEntry[]>
  } catch {
    // No manifest.json — generate from existing items (migration)
    const manifest: Record<string, ReferenceManifestEntry[]> = {}
    const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    for (const item of sorted) {
      if (!manifest[item.type]) manifest[item.type] = []
      manifest[item.type].push({ id: item.id, type: 'item' })
    }
    // Write the generated manifest to disk
    try {
      const referenceDir = await handle.getDirectoryHandle('reference', { create: true })
      await writeJson(referenceDir, 'manifest.json', manifest)
    } catch {
      // Ignore write errors during migration
    }
    return manifest
  }
}

export async function writeReferenceManifest(
  handle: FileSystemDirectoryHandle,
  manifest: Record<string, ReferenceManifestEntry[]>,
): Promise<void> {
  const referenceDir = await handle.getDirectoryHandle('reference', { create: true })
  await writeJson(referenceDir, 'manifest.json', manifest)
}

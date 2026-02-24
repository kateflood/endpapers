import { generateId, todayISODate } from '@endpapers/utils'
import type { Project, WritingLog, ReferenceManifest, ReferenceItem, ReferenceGraph, ReferenceManifestEntry } from '@endpapers/types'

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
): Promise<Project> {
  const project: Project = {
    id: generateId(),
    title,
    author,
    createdAt: todayISODate(),
    updatedAt: todayISODate(),
    sections: [],
  }

  const writingLog: WritingLog = { goals: {}, log: [] }

  await writeJson(handle, 'project.json', project)
  await writeJson(handle, 'writing-log.json', writingLog)

  await handle.getDirectoryHandle('sections', { create: true })
  const referenceDir = await handle.getDirectoryHandle('reference', { create: true })
  await writeJson(referenceDir, 'collections.json', BUILT_IN_COLLECTIONS)
  await writeJson(referenceDir, 'graph.json', { edges: [], annotations: [] } satisfies ReferenceGraph)
  await handle.getDirectoryHandle('assets', { create: true })

  return project
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

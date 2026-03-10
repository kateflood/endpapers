import { zipSync, unzipSync } from 'fflate'
import type { Project, WritingLog } from '@endpapers/types'
import { MemoryDirectoryHandle } from '../demo/memoryHandle'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackupInfo {
  filename: string
  createdAt: Date
  sizeBytes: number
  name?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BACKUPS_DIR = 'backups'
const NAMES_FILE = 'backup-names.json'
const SKIP_DIRS = new Set([BACKUPS_DIR])

function makeBackupFilename(): string {
  const ts = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, '')
  return `backup-${ts}.zip`
}

export function parseBackupDate(filename: string): Date {
  const match = filename.match(/^backup-(.+)\.zip$/)
  if (!match) return new Date(0)
  // Filename timestamp: 2026-03-10T14-30-00 → need to restore colons in time portion
  const raw = match[1]
  const tIdx = raw.indexOf('T')
  if (tIdx === -1) return new Date(raw)
  const datePart = raw.slice(0, tIdx)
  const timePart = raw.slice(tIdx + 1).replace(/-/g, ':')
  return new Date(`${datePart}T${timePart}`)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Recursively read all files in a directory, skipping specified subdirectories. */
async function readDirectoryRecursive(
  dir: FileSystemDirectoryHandle,
  basePath: string,
): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {}

  for await (const [name, entry] of dir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (entry.kind === 'directory') {
      if (SKIP_DIRS.has(name)) continue
      const subDir = await dir.getDirectoryHandle(name)
      const subFiles = await readDirectoryRecursive(subDir, basePath ? `${basePath}/${name}` : name)
      Object.assign(files, subFiles)
    } else {
      const file = await (entry as FileSystemFileHandle).getFile()
      const buffer = await file.arrayBuffer()
      const path = basePath ? `${basePath}/${name}` : name
      files[path] = new Uint8Array(buffer)
    }
  }

  return files
}

/** Write a file into a directory, creating intermediate subdirectories as needed. */
async function writeFileAtPath(
  root: FileSystemDirectoryHandle,
  path: string,
  data: Uint8Array,
): Promise<void> {
  const parts = path.split('/')
  const filename = parts.pop()!

  let dir = root
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true })
  }

  const fileHandle = await dir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(data.buffer as ArrayBuffer)
  await writable.close()
}

// ── Backup names manifest ─────────────────────────────────────────────────────

async function readBackupNames(
  handle: FileSystemDirectoryHandle,
): Promise<Record<string, string>> {
  try {
    const backupsDir = await handle.getDirectoryHandle(BACKUPS_DIR)
    const fileHandle = await backupsDir.getFileHandle(NAMES_FILE)
    const file = await fileHandle.getFile()
    return JSON.parse(await file.text())
  } catch {
    return {}
  }
}

async function writeBackupNames(
  handle: FileSystemDirectoryHandle,
  names: Record<string, string>,
): Promise<void> {
  const backupsDir = await handle.getDirectoryHandle(BACKUPS_DIR, { create: true })
  const fileHandle = await backupsDir.getFileHandle(NAMES_FILE, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(names))
  await writable.close()
}

/** Set or remove the user-assigned name for a backup. */
export async function renameBackup(
  handle: FileSystemDirectoryHandle,
  filename: string,
  name: string,
): Promise<void> {
  const names = await readBackupNames(handle)
  if (name.trim()) {
    names[filename] = name.trim()
  } else {
    delete names[filename]
  }
  await writeBackupNames(handle, names)
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Create a compressed zip backup of the entire project (excluding backups/ itself). */
export async function createBackup(
  handle: FileSystemDirectoryHandle,
  retentionCount = 10,
  name?: string,
): Promise<BackupInfo> {
  const files = await readDirectoryRecursive(handle, '')
  const zipped = zipSync(files, { level: 6 })

  const backupsDir = await handle.getDirectoryHandle(BACKUPS_DIR, { create: true })
  const filename = makeBackupFilename()

  const fileHandle = await backupsDir.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(zipped)
  await writable.close()

  // Write name if provided
  if (name) {
    const names = await readBackupNames(handle)
    names[filename] = name
    await writeBackupNames(handle, names)
  }

  // Auto-prune after creating
  await pruneBackups(handle, retentionCount)

  return {
    filename,
    createdAt: new Date(),
    sizeBytes: zipped.byteLength,
    name,
  }
}

/** List all existing backups, sorted newest first. */
export async function listBackups(
  handle: FileSystemDirectoryHandle,
): Promise<BackupInfo[]> {
  let backupsDir: FileSystemDirectoryHandle
  try {
    backupsDir = await handle.getDirectoryHandle(BACKUPS_DIR)
  } catch {
    return []
  }

  const names = await readBackupNames(handle)
  const backups: BackupInfo[] = []

  for await (const [name, entry] of backupsDir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (entry.kind !== 'file' || !name.startsWith('backup-') || !name.endsWith('.zip')) continue
    const file = await (entry as FileSystemFileHandle).getFile()
    backups.push({
      filename: name,
      createdAt: parseBackupDate(name),
      sizeBytes: file.size,
      name: names[name],
    })
  }

  return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

/** Delete a specific backup by filename. */
export async function deleteBackup(
  handle: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  const backupsDir = await handle.getDirectoryHandle(BACKUPS_DIR)
  await backupsDir.removeEntry(filename)

  // Remove name entry if present
  const names = await readBackupNames(handle)
  if (names[filename]) {
    delete names[filename]
    await writeBackupNames(handle, names)
  }
}

/** Restore a backup: extract zip contents, overwrite project files. */
export async function restoreBackup(
  handle: FileSystemDirectoryHandle,
  filename: string,
): Promise<void> {
  const backupsDir = await handle.getDirectoryHandle(BACKUPS_DIR)
  const fileHandle = await backupsDir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const buffer = await file.arrayBuffer()
  const files = unzipSync(new Uint8Array(buffer))

  for (const [path, data] of Object.entries(files)) {
    // Don't write into backups/ directory
    if (path.startsWith(`${BACKUPS_DIR}/`)) continue
    await writeFileAtPath(handle, path, data)
  }
}

/** Unzip a backup into an in-memory handle for read-only preview. */
export async function unzipToMemoryHandle(
  projectHandle: FileSystemDirectoryHandle,
  filename: string,
): Promise<{ handle: FileSystemDirectoryHandle; project: Project; writingLog: WritingLog }> {
  const backupsDir = await projectHandle.getDirectoryHandle(BACKUPS_DIR)
  const fileHandle = await backupsDir.getFileHandle(filename)
  const file = await fileHandle.getFile()
  const buffer = await file.arrayBuffer()
  const files = unzipSync(new Uint8Array(buffer))

  const decoder = new TextDecoder()
  const root = new MemoryDirectoryHandle('Backup Preview')

  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith(`${BACKUPS_DIR}/`)) continue
    const parts = path.split('/')
    const name = parts.pop()!

    let dir = root
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true }) as unknown as MemoryDirectoryHandle
    }
    dir._addFile(name, decoder.decode(data))
  }

  // Parse project.json
  const projectFile = await (root as unknown as FileSystemDirectoryHandle).getFileHandle('project.json')
  const projectBlob = await projectFile.getFile()
  const project: Project = JSON.parse(await projectBlob.text())

  // Parse writing-log.json (optional)
  let writingLog: WritingLog = { goals: {}, log: [] }
  try {
    const logFile = await (root as unknown as FileSystemDirectoryHandle).getFileHandle('writing-log.json')
    const logBlob = await logFile.getFile()
    writingLog = JSON.parse(await logBlob.text())
  } catch {
    // No writing log in backup — use empty
  }

  return {
    handle: root as unknown as FileSystemDirectoryHandle,
    project,
    writingLog,
  }
}

/** Keep only the N most recent backups, delete the rest. */
export async function pruneBackups(
  handle: FileSystemDirectoryHandle,
  keepCount: number,
): Promise<void> {
  const backups = await listBackups(handle)
  if (backups.length <= keepCount) return

  const toDelete = backups.slice(keepCount)
  for (const backup of toDelete) {
    try {
      await deleteBackup(handle, backup.filename)
    } catch {
      // Ignore individual deletion errors
    }
  }
}

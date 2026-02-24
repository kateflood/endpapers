import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'

export interface RecentProject {
  id: string                        // project.id from project.json — used as IndexedDB key
  handle: FileSystemDirectoryHandle
  title: string
  lastOpened: string                // ISO date string e.g. "2026-02-17"
}

const DB_NAME = 'endpapers-recents'
const DB_VERSION = 1
const STORE_NAME = 'recent-projects'

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    },
  })
}

export async function getAllRecents(): Promise<RecentProject[]> {
  try {
    const db = await getDb()
    const all = (await db.getAll(STORE_NAME)) as RecentProject[]
    return all.sort((a, b) => b.lastOpened.localeCompare(a.lastOpened))
  } catch {
    return []
  }
}

export async function upsertRecent(project: RecentProject): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, project)
}

export async function removeRecent(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

export async function touchRecent(id: string): Promise<void> {
  const db = await getDb()
  const record = (await db.get(STORE_NAME, id)) as RecentProject | undefined
  if (record) {
    record.lastOpened = new Date().toISOString().split('T')[0]
    await db.put(STORE_NAME, record)
  }
}

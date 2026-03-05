import { openDB } from 'idb'
import type { IDBPDatabase } from 'idb'

export interface EmbeddedChunk {
  id?: number
  projectId: string
  sectionId: string
  sectionTitle: string
  chunkIndex: number
  text: string
  contentHash: number
  embedding: Float32Array
}

const DB_NAME = 'endpapers-embeddings'
const DB_VERSION = 1
const STORE_NAME = 'chunks'

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      store.createIndex('projectId', 'projectId', { unique: false })
      store.createIndex('projectSection', ['projectId', 'sectionId'], { unique: false })
    },
  })
}

export async function getChunksForProject(projectId: string): Promise<EmbeddedChunk[]> {
  try {
    const db = await getDb()
    return (await db.getAllFromIndex(STORE_NAME, 'projectId', projectId)) as EmbeddedChunk[]
  } catch {
    return []
  }
}

export async function putChunks(chunks: EmbeddedChunk[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  for (const chunk of chunks) {
    await tx.store.put(chunk)
  }
  await tx.done
}

export async function deleteSectionChunks(projectId: string, sectionId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const index = tx.store.index('projectSection')
  let cursor = await index.openCursor([projectId, sectionId])
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function deleteProjectChunks(projectId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const index = tx.store.index('projectId')
  let cursor = await index.openCursor(projectId)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }
  await tx.done
}

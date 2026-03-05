import type { SectionManifestEntry } from '@endpapers/types'
import { readSectionsIndividually } from '../fs/projectFs'
import { sendWorkerRequest } from './transformersWorkerClient'
import { chunkByParagraphs, fnvHash } from './textUtils'
import { getEmbeddingModel } from './modelConfig'
import { cosineSimilarity } from './vectorMath'
import { estimateTokens } from './textUtils'
import {
  getChunksForProject, putChunks, deleteSectionChunks, deleteProjectChunks,
} from '../db/embeddings'
import type { EmbeddedChunk } from '../db/embeddings'

export interface RetrievalResult {
  context: string
  sourceLabels: string[]
}

export interface RetrievalCallbacks {
  onEmbeddingDownloadProgress?: (progress: number) => void
  onIndexingProgress?: (current: number, total: number) => void
}

/**
 * Retrieve semantically relevant context for a Q&A question.
 * Embeds all sections (with caching), embeds the question, then returns
 * the top chunks that fit within the token budget.
 */
export async function retrieveContext(
  projectId: string,
  handle: FileSystemDirectoryHandle,
  sections: SectionManifestEntry[],
  question: string,
  maxTokens: number,
  callbacks: RetrievalCallbacks,
): Promise<RetrievalResult> {
  const embeddingModel = getEmbeddingModel()
  const chunkTokenLimit = embeddingModel.maxInputTokens

  // 1. Read all sections from disk
  const sectionData = await readSectionsIndividually(handle, sections)
  if (sectionData.length === 0) {
    return { context: '', sourceLabels: [] }
  }

  // 2. Load existing embeddings from IndexedDB
  const storedChunks = await getChunksForProject(projectId)
  const storedBySection = new Map<string, EmbeddedChunk[]>()
  for (const chunk of storedChunks) {
    const list = storedBySection.get(chunk.sectionId) ?? []
    list.push(chunk)
    storedBySection.set(chunk.sectionId, list)
  }

  // 3. Determine which sections need (re-)embedding
  const freshChunks: EmbeddedChunk[] = [] // already cached and up-to-date
  const textsToEmbed: string[] = []
  const embedMeta: Array<{ sectionId: string; sectionTitle: string; chunkIndex: number; text: string; contentHash: number }> = []

  for (const section of sectionData) {
    if (!section.text.trim()) continue

    const hash = fnvHash(section.text)
    const existing = storedBySection.get(section.id)

    if (existing && existing.length > 0 && existing[0].contentHash === hash) {
      // Section unchanged — reuse cached embeddings
      freshChunks.push(...existing)
    } else {
      // Section is new or changed — delete stale chunks, queue for embedding
      if (existing) {
        await deleteSectionChunks(projectId, section.id)
      }
      const chunks = chunkByParagraphs(section.text, chunkTokenLimit)
      for (let i = 0; i < chunks.length; i++) {
        textsToEmbed.push(chunks[i])
        embedMeta.push({
          sectionId: section.id,
          sectionTitle: section.title,
          chunkIndex: i,
          text: chunks[i],
          contentHash: hash,
        })
      }
    }
  }

  // 4. Embed new chunks + the question in a single worker call
  // Append the question as the last text to embed
  const allTexts = [...textsToEmbed, question]
  let questionEmbedding: Float32Array

  if (allTexts.length === 1) {
    // Only the question needs embedding (all sections cached)
    const { promise } = sendWorkerRequest(
      { type: 'embed', texts: [question] },
      {
        onDownloadProgress: callbacks.onEmbeddingDownloadProgress,
        onEmbedProgress: callbacks.onIndexingProgress,
      },
    )
    const response = await promise
    if (response.type !== 'embed-result') throw new Error('Unexpected worker response')
    questionEmbedding = new Float32Array(response.embeddings[0])
  } else {
    // Embed new chunks + question together
    const { promise } = sendWorkerRequest(
      { type: 'embed', texts: allTexts },
      {
        onDownloadProgress: callbacks.onEmbeddingDownloadProgress,
        onEmbedProgress: callbacks.onIndexingProgress,
      },
    )
    const response = await promise
    if (response.type !== 'embed-result') throw new Error('Unexpected worker response')

    // Store new chunk embeddings in IndexedDB
    const newChunks: EmbeddedChunk[] = []
    for (let i = 0; i < embedMeta.length; i++) {
      const meta = embedMeta[i]
      const embedding = new Float32Array(response.embeddings[i])
      const chunk: EmbeddedChunk = {
        projectId,
        sectionId: meta.sectionId,
        sectionTitle: meta.sectionTitle,
        chunkIndex: meta.chunkIndex,
        text: meta.text,
        contentHash: meta.contentHash,
        embedding,
      }
      newChunks.push(chunk)
      freshChunks.push(chunk)
    }
    await putChunks(newChunks)

    // Last embedding is the question
    questionEmbedding = new Float32Array(response.embeddings[response.embeddings.length - 1])
  }

  // 5. Rank all chunks by cosine similarity to the question
  const scored = freshChunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }))
  scored.sort((a, b) => b.score - a.score)

  // 6. Greedily pack top chunks into the token budget
  const selected: typeof scored = []
  let usedTokens = 0

  for (const entry of scored) {
    const chunkTokens = estimateTokens(entry.chunk.text)
    // Reserve ~100 tokens for the attribution headers
    if (usedTokens + chunkTokens > maxTokens - 100) {
      if (selected.length > 0) break
      // Always include at least one chunk even if it exceeds budget
    }
    selected.push(entry)
    usedTokens += chunkTokens
  }

  // 7. Build context string with source attribution
  const sourceLabels: string[] = []
  const seen = new Set<string>()
  const contextParts: string[] = []

  for (const { chunk } of selected) {
    if (!seen.has(chunk.sectionTitle)) {
      seen.add(chunk.sectionTitle)
      sourceLabels.push(chunk.sectionTitle)
    }
    contextParts.push(`--- From: ${chunk.sectionTitle} ---\n${chunk.text}`)
  }

  return {
    context: contextParts.join('\n\n'),
    sourceLabels,
  }
}

/** Remove all cached embeddings for a project. */
export async function clearProjectIndex(projectId: string): Promise<void> {
  await deleteProjectChunks(projectId)
}

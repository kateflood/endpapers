// Pure utility functions for AI text processing.
// No async, no side effects — safe to import anywhere.

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
  'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'about', 'up', 'down',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
}

/** Estimate token count (conservative: 1 token ≈ 3.5 chars). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/** Check if text likely fits in a token budget. */
export function fitsInContext(text: string, maxTokens: number): boolean {
  return estimateTokens(text) <= maxTokens
}

/**
 * Split text into chunks that fit within a token budget.
 * Splits at paragraph boundaries (\n\n), grouping paragraphs greedily.
 * If a single paragraph exceeds maxTokens, splits at sentence boundaries.
 * Always returns at least one chunk.
 */
export function chunkByParagraphs(text: string, maxTokens: number): string[] {
  if (fitsInContext(text, maxTokens)) return [text]

  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (!para.trim()) continue

    if (!fitsInContext(para, maxTokens)) {
      // Paragraph itself is too large — split at sentence boundaries
      if (current.trim()) {
        chunks.push(current.trim())
        current = ''
      }
      const sentences = splitSentences(para)
      for (const sentence of sentences) {
        const candidate = current ? current + ' ' + sentence : sentence
        if (current && !fitsInContext(candidate, maxTokens)) {
          chunks.push(current.trim())
          current = sentence
        } else {
          current = candidate
        }
      }
      continue
    }

    const candidate = current ? current + '\n\n' + para : para
    if (current && !fitsInContext(candidate, maxTokens)) {
      chunks.push(current.trim())
      current = para
    } else {
      current = candidate
    }
  }

  if (current.trim()) chunks.push(current.trim())
  return chunks.length > 0 ? chunks : [text]
}

/** Split text at sentence boundaries. */
function splitSentences(text: string): string[] {
  // Split on period/exclamation/question mark followed by space and uppercase letter, or end of string
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/)
  return parts.filter(s => s.trim())
}

export function relevanceScore(text: string, question: string): number {
  const questionKeywords = extractKeywords(question)
  if (questionKeywords.length === 0) return 0

  const textLower = text.toLowerCase()
  let matches = 0
  for (const keyword of questionKeywords) {
    if (textLower.includes(keyword)) matches++
  }

  return matches / questionKeywords.length
}

/** FNV-1a hash for fast content-change detection. Returns unsigned 32-bit integer. */
export function fnvHash(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

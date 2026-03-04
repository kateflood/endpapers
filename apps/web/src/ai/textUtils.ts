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
 * Score how relevant a section's text is to a question (keyword overlap).
 * Returns a value between 0 and 1.
 */
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

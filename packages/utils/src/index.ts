// Word count utilities

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export function countCharacters(text: string): number {
  return text.length
}

export function estimatePages(wordCount: number, wordsPerPage = 250): number {
  return Math.ceil(wordCount / wordsPerPage)
}

// ID generation

export function generateId(): string {
  return crypto.randomUUID()
}

// Date utilities

export function todayISODate(): string {
  return new Date().toISOString().split('T')[0]
}

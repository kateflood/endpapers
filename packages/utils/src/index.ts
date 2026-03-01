import type { SectionManifestEntry, WritingLogEntry } from '@endpapers/types'

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

export function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const daysFromMonday = today.getDay() === 0 ? 6 : today.getDay() - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return d >= monday && d <= sunday
}

export function isThisMonth(dateStr: string): boolean {
  return dateStr.startsWith(todayISODate().slice(0, 7))
}

// Section manifest helpers

export function findSectionTitle(sections: SectionManifestEntry[], id: string): string | null {
  for (const entry of sections) {
    if (entry.id === id) return entry.title
    if (entry.type === 'group' && entry.children) {
      for (const child of entry.children) {
        if (child.id === id) return child.title
      }
    }
  }
  return null
}

// Writing log helpers

export function sumWritingLog(log: WritingLogEntry[], filter: (e: WritingLogEntry) => boolean): number {
  return log.filter(filter).reduce((s, e) => s + e.words, 0)
}

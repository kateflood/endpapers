// Project

export type ProjectType = 'fiction' | 'non-fiction' | 'stories' | 'essays' | 'article' | 'script' | 'custom'

export type AIBackend = 'auto' | 'chrome' | 'transformers' | 'transformers-enhanced'

export interface ProjectSettings {
  spellCheck: boolean
  paperMode: boolean
  darkMode: boolean
  font: string
  fontSize: number
  wordsPerPage: number
  showWordCount: boolean
  aiEnabled?: boolean
  aiBackend?: AIBackend
  backupsEnabled?: boolean          // default false (opt-in)
  backupOnClose?: boolean           // default true (when backups enabled)
  backupRetentionCount?: number     // default 10
  harperEnabled?: boolean           // opt-in grammar & spell check panel
}

export interface AuthorInfo {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
}

export interface Project {
  id: string
  title: string
  subtitle?: string
  type?: ProjectType          // absent treated as 'fiction'
  customTypeLabel?: string    // display label when type is 'custom'
  author: string
  authorInfo?: AuthorInfo
  createdAt: string
  updatedAt: string
  sections: SectionManifestEntry[]
  extras?: SectionManifestEntry[]      // Drawer sections; absent treated as []
  frontMatter?: SectionManifestEntry[] // Front matter sections; absent treated as []
  backMatter?: SectionManifestEntry[]  // Back matter sections; absent treated as []
  settings?: ProjectSettings
}

// Sections

export interface SectionManifestEntry {
  id: string
  title: string
  type: 'section' | 'group'
  file?: string           // only on type: 'section'
  children?: SectionManifestEntry[]  // only on type: 'group', one level deep
}

// Reference

export interface ReferenceItem {
  id: string
  type: string            // 'character' | 'location' | 'timeline' | 'research' | 'notes' | 'scenes' | custom
  name: string
  fields: Record<string, string>
  position: { x: number; y: number }  // board node position
  createdAt: string
  updatedAt: string
}

export interface ReferenceManifestEntry {
  id: string              // references a ReferenceItem.id or is a group ID
  type: 'item' | 'group'
  title?: string          // display name for groups; items use item.name
  children?: ReferenceManifestEntry[]  // only on groups, one level deep
}

export interface BoardAnnotation {
  id: string
  kind: 'rectangle' | 'annotation'
  position: { x: number; y: number }
  size?: { width: number; height: number }  // rectangles
  text: string
  color?: string
}

export interface ReferenceEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface ReferenceGraph {
  edges: ReferenceEdge[]
  annotations: BoardAnnotation[]
}

export interface ReferenceCollection {
  type: string
  label: string
  builtIn: boolean
  fields: ReferenceFieldDefinition[]
}

export interface ReferenceFieldDefinition {
  key: string
  label: string
  inputType: 'text' | 'textarea'
}

export interface ReferenceManifest {
  collections: ReferenceCollection[]
}

// Writing log

export interface WritingGoals {
  project?: number
  daily?: number
  weekly?: number
  monthly?: number
}

export interface WritingLogEntry {
  date: string            // ISO date string, e.g. "2026-02-16"
  words: number           // net words written that day
}

export interface WritingLog {
  goals: WritingGoals
  log: WritingLogEntry[]
  lastKnownTotal?: number   // total word count at end of last session; used to compute net session delta
}

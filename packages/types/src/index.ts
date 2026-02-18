// Project

export interface Project {
  id: string
  title: string
  author: string
  createdAt: string
  updatedAt: string
  sections: SectionManifestEntry[]
}

// Sections

export interface SectionManifestEntry {
  id: string
  title: string
  type: 'section' | 'group'
  file?: string           // only on type: 'section'
  children?: SectionManifestEntry[]  // only on type: 'group', one level deep
}

// Metadata

export interface MetadataItem {
  id: string
  type: string            // 'character' | 'location' | 'timeline' | 'research' | custom
  name: string
  fields: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface MetadataCollection {
  type: string
  label: string
  builtIn: boolean
  fields: MetadataFieldDefinition[]
}

export interface MetadataFieldDefinition {
  key: string
  label: string
  inputType: 'text' | 'textarea'
}

export interface CollectionsManifest {
  collections: MetadataCollection[]
}

// Writing log

export interface WritingGoals {
  session?: number
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
}

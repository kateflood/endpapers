// Type declarations for Chrome on-device AI APIs (Summarizer API, Proofreader API)

// -- Shared --

type AIAvailability = 'available' | 'downloadable' | 'unavailable'

interface AIDownloadProgressEvent extends Event {
  readonly loaded: number
  readonly total: number
}

interface AICreateMonitor extends EventTarget {
  addEventListener(
    type: 'downloadprogress',
    callback: (event: AIDownloadProgressEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void
}

// -- Summarizer API (Chrome 138+) --

type SummarizerType = 'key-points' | 'tldr' | 'teaser' | 'headline'
type SummarizerFormat = 'markdown' | 'plain-text'
type SummarizerLength = 'short' | 'medium' | 'long'

interface SummarizerCreateOptions {
  type?: SummarizerType
  format?: SummarizerFormat
  length?: SummarizerLength
  sharedContext?: string
  expectedInputLanguages?: string[]
  monitor?: (monitor: AICreateMonitor) => void
}

interface SummarizerInstance {
  summarize(text: string, options?: { context?: string }): Promise<string>
  summarizeStreaming(text: string, options?: { context?: string }): ReadableStream<string>
  destroy(): void
}

interface SummarizerConstructor {
  availability(options?: SummarizerCreateOptions): Promise<AIAvailability>
  create(options?: SummarizerCreateOptions): Promise<SummarizerInstance>
}

declare const Summarizer: SummarizerConstructor

// -- Proofreader API (Chrome 141+) --

interface ProofreaderCreateOptions {
  expectedInputLanguages?: string[]
  monitor?: (monitor: AICreateMonitor) => void
}

interface ProofreaderCorrection {
  startIndex: number
  endIndex: number
  correction: string
}

interface ProofreaderResult {
  correctedInput: string
  corrections: ProofreaderCorrection[]
}

interface ProofreaderInstance {
  proofread(text: string): Promise<ProofreaderResult>
  destroy(): void
}

interface ProofreaderConstructor {
  availability(options?: ProofreaderCreateOptions): Promise<AIAvailability>
  create(options?: ProofreaderCreateOptions): Promise<ProofreaderInstance>
}

declare const Proofreader: ProofreaderConstructor

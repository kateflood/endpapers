// AI provider abstraction — backend-agnostic interfaces for AI tools

export type ProviderAvailability = 'available' | 'downloadable' | 'unavailable'

// --- Proofreader ---

export interface ProofCorrection {
  startIndex: number
  endIndex: number
  correction: string
}

export interface ProofResult {
  corrections: ProofCorrection[]
}

export interface ProofreaderProvider {
  readonly id: string
  readonly label: string
  readonly description: string
  checkAvailability(): Promise<ProviderAvailability>
  run(
    text: string,
    callbacks: {
      onDownloadProgress?: (progress: number) => void
      onRunning?: () => void
    },
  ): Promise<ProofResult>
  cancel(): void
}

// --- Q&A ---

export interface QAProvider {
  readonly id: string
  readonly label: string
  readonly description: string
  checkAvailability(): Promise<ProviderAvailability>
  run(
    text: string,
    options: { question: string },
    callbacks: {
      onDownloadProgress?: (progress: number) => void
      onRunning?: () => void
    },
  ): Promise<string>
  cancel(): void
}

// --- Summarizer ---

export interface SectionInput {
  title: string
  text: string
}

export interface SummarizerProvider {
  readonly id: string
  readonly label: string
  readonly description: string
  checkAvailability(): Promise<ProviderAvailability>
  run(
    text: string | SectionInput[],
    options: { type: string; length: string },
    callbacks: {
      onDownloadProgress?: (progress: number) => void
      onRunning?: () => void
      onSectionProgress?: (current: number, total: number, title: string) => void
    },
  ): Promise<string>
  cancel(): void
}

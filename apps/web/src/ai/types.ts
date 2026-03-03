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

// --- Summarizer ---

export interface SummarizerProvider {
  readonly id: string
  readonly label: string
  readonly description: string
  checkAvailability(): Promise<ProviderAvailability>
  run(
    text: string,
    options: { type: string; length: string },
    callbacks: {
      onDownloadProgress?: (progress: number) => void
      onRunning?: () => void
    },
  ): Promise<string>
  cancel(): void
}

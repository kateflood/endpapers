// Shared message types for transformers.js web worker communication

// Main thread → worker
export type WorkerRequest =
  | { type: 'init'; id: number }
  | { type: 'proofread'; id: number; text: string }
  | { type: 'summarize'; id: number; text: string; options: {
      maxLength: number; minLength: number
      summaryType?: string; summaryLength?: string
    } }
  | { type: 'qa'; id: number; text: string; question: string }
  | { type: 'cancel'; id: number }

// Worker → main thread
export type WorkerResponse =
  | { type: 'init-result'; id: number; device: 'webgpu' | 'wasm' }
  | { type: 'download-progress'; id: number; progress: number }
  | { type: 'running'; id: number }
  | { type: 'proofread-result'; id: number; correctedText: string }
  | { type: 'summarize-result'; id: number; summary: string }
  | { type: 'qa-result'; id: number; answer: string }
  | { type: 'error'; id: number; message: string }

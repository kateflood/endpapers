// Central registry for all transformers.js model configuration.
// Pure data — no side effects, no async, no imports from @huggingface/transformers.
// Safe to import from both the main thread and the web worker.

export type PipelineType = 'text-generation' | 'text2text-generation' | 'summarization' | 'feature-extraction'
export type ModelDevice = 'webgpu' | 'wasm'
export type ModelCapability = 'proofread' | 'summarize' | 'qa' | 'embedding'

export interface ModelConfig {
  readonly id: string
  readonly hfId: string
  readonly dtype: string
  readonly label: string
  readonly shortLabel: string
  readonly description: string
  readonly cachePattern: string
  readonly approxSize: string
  readonly pipelineType: PipelineType
  readonly device: ModelDevice
  readonly capabilities: readonly ModelCapability[]
  readonly maxInputTokens: number
}

const MODELS = {
  'qwen3-0.6b': {
    id: 'qwen3-0.6b',
    hfId: 'onnx-community/Qwen3-0.6B-ONNX',
    dtype: 'q4f16',
    label: 'Qwen3 0.6B (GPU)',
    shortLabel: 'Qwen3 0.6B',
    description: 'GPU-accelerated on-device model',
    cachePattern: 'Qwen3',
    approxSize: '~400 MB',
    pipelineType: 'text-generation',
    device: 'webgpu',
    capabilities: ['proofread', 'summarize', 'qa'],
    maxInputTokens: 1800,
  },
  'flan-t5-base': {
    id: 'flan-t5-base',
    hfId: 'Xenova/flan-t5-base',
    dtype: 'q8',
    label: 'Flan-T5 Base (CPU fallback)',
    shortLabel: 'Flan-T5',
    description: 'On-device via transformers.js · Works in any browser',
    cachePattern: 'flan-t5',
    approxSize: '~250 MB',
    pipelineType: 'text2text-generation',
    device: 'wasm',
    capabilities: ['proofread'],
    maxInputTokens: 450,
  },
  'distilbart-cnn-6-6': {
    id: 'distilbart-cnn-6-6',
    hfId: 'Xenova/distilbart-cnn-6-6',
    dtype: 'q8',
    label: 'DistilBART CNN (CPU fallback)',
    shortLabel: 'DistilBART',
    description: 'On-device via transformers.js · Works in any browser',
    cachePattern: 'distilbart',
    approxSize: '~300 MB',
    pipelineType: 'summarization',
    device: 'wasm',
    capabilities: ['summarize'],
    maxInputTokens: 900,
  },
  'phi-3.5-mini': {
    id: 'phi-3.5-mini',
    hfId: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
    dtype: 'q4f16',
    label: 'Phi-3.5 Mini (GPU)',
    shortLabel: 'Phi-3.5',
    description: 'Enhanced on-device model · WebGPU required',
    cachePattern: 'Phi-3.5',
    approxSize: '~2.2 GB',
    pipelineType: 'text-generation',
    device: 'webgpu',
    capabilities: ['proofread', 'summarize', 'qa'],
    maxInputTokens: 8000,
  },
  'all-minilm-l6-v2': {
    id: 'all-minilm-l6-v2',
    hfId: 'Xenova/all-MiniLM-L6-v2',
    dtype: 'q8',
    label: 'MiniLM L6 v2 (Embeddings)',
    shortLabel: 'MiniLM',
    description: 'Sentence embeddings for semantic search',
    cachePattern: 'all-MiniLM',
    approxSize: '~23 MB',
    pipelineType: 'feature-extraction',
    device: 'wasm',
    capabilities: ['embedding'],
    maxInputTokens: 256,
  },
} as const satisfies Record<string, ModelConfig>

export function getWebGPUModel(): ModelConfig {
  return MODELS['qwen3-0.6b']
}

export function getEnhancedWebGPUModel(): ModelConfig {
  return MODELS['phi-3.5-mini']
}

export function getWasmModel(capability: ModelCapability): ModelConfig {
  const model = Object.values(MODELS).find(
    m => m.device === 'wasm' && (m.capabilities as readonly string[]).includes(capability),
  )
  if (!model) throw new Error(`No WASM model for capability: ${capability}`)
  return model
}

export function getEmbeddingModel(): ModelConfig {
  return MODELS['all-minilm-l6-v2']
}

export function getAllModels(): ModelConfig[] {
  return Object.values(MODELS)
}

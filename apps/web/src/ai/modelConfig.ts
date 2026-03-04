// Central registry for all transformers.js model configuration.
// Pure data — no side effects, no async, no imports from @huggingface/transformers.
// Safe to import from both the main thread and the web worker.

export type PipelineType = 'text-generation' | 'text2text-generation' | 'summarization'
export type ModelDevice = 'webgpu' | 'wasm'
export type ModelCapability = 'proofread' | 'summarize' | 'qa'

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
  },
} as const satisfies Record<string, ModelConfig>

export function getWebGPUModel(): ModelConfig {
  return MODELS['qwen3-0.6b']
}

export function getWasmModel(capability: ModelCapability): ModelConfig {
  const model = Object.values(MODELS).find(
    m => m.device === 'wasm' && (m.capabilities as readonly string[]).includes(capability),
  )
  if (!model) throw new Error(`No WASM model for capability: ${capability}`)
  return model
}

export function getAllModels(): ModelConfig[] {
  return Object.values(MODELS)
}

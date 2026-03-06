// Web worker for transformers.js model inference
// Supports WebGPU (Qwen3 0.6B or Phi-3.5 Mini) with WASM fallback (Flan-T5 / DistilBART).
// WebGPU detection runs once on init; all subsequent requests use the detected path.

import { pipeline } from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './transformersWorkerProtocol'
import { getWebGPUModel, getEnhancedWebGPUModel, getWasmModel, getEmbeddingModel } from './modelConfig'

// ── State ────────────────────────────────────────────────────────────────

let deviceMode: 'webgpu' | 'wasm' | null = null
let useEnhancedModel = false

// WebGPU: single shared pipeline for both tasks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webgpuPipeline: any = null

// WASM: separate pipelines per task
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmProofreadPipeline: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmSummarizePipeline: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null

const cancelledIds = new Set<number>()

// ── Helpers ──────────────────────────────────────────────────────────────

function send(msg: WorkerResponse) {
  self.postMessage(msg)
}

function progressCallback(id: number) {
  return (data: { status: string; progress?: number }) => {
    if (data.status === 'progress' && data.progress != null) {
      send({ type: 'download-progress', id, progress: data.progress / 100 })
    }
  }
}

/** Strip Qwen3 <think>...</think> reasoning blocks from generated text. */
function stripThinkingTokens(text: string): string {
  // Strip closed thinking blocks
  let result = text.replace(/<think>[\s\S]*?<\/think>/g, '')
  // Strip unclosed thinking block (model ran out of tokens before closing)
  result = result.replace(/<think>[\s\S]*$/g, '')
  return result.trim()
}

/**
 * Extract the generated text from a WebGPU chat-style pipeline result.
 * Handles both string and message-array formats, strips thinking tokens.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractGeneratedText(result: any): string {
  const output = Array.isArray(result) ? result[0] : result
  const generated = output.generated_text
  const raw = typeof generated === 'string'
    ? generated
    : Array.isArray(generated)
      ? generated[generated.length - 1]?.content ?? ''
      : String(generated)
  return stripThinkingTokens(raw)
}

async function detectWebGPU(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu
    if (!gpu) return false
    const adapter = await gpu.requestAdapter()
    return adapter != null
  } catch {
    return false
  }
}

// ── Pipeline loaders ─────────────────────────────────────────────────────

async function getWebGPUPipeline(id: number) {
  if (webgpuPipeline) return webgpuPipeline
  const model = useEnhancedModel ? getEnhancedWebGPUModel() : getWebGPUModel()
  webgpuPipeline = await (pipeline as Function)(model.pipelineType, model.hfId, {
    device: 'webgpu',
    dtype: model.dtype,
    ...(model.id === 'phi-3.5-mini' ? { use_external_data_format: true } : {}),
    progress_callback: progressCallback(id),
  })
  return webgpuPipeline
}

async function getWasmProofreadPipeline(id: number) {
  if (wasmProofreadPipeline) return wasmProofreadPipeline
  const model = getWasmModel('proofread')
  wasmProofreadPipeline = await (pipeline as Function)(model.pipelineType, model.hfId, {
    dtype: model.dtype,
    progress_callback: progressCallback(id),
  })
  return wasmProofreadPipeline
}

async function getWasmSummarizePipeline(id: number) {
  if (wasmSummarizePipeline) return wasmSummarizePipeline
  const model = getWasmModel('summarize')
  wasmSummarizePipeline = await (pipeline as Function)(model.pipelineType, model.hfId, {
    dtype: model.dtype,
    progress_callback: progressCallback(id),
  })
  return wasmSummarizePipeline
}

async function getEmbeddingPipeline(id: number) {
  if (embeddingPipeline) return embeddingPipeline
  const model = getEmbeddingModel()
  embeddingPipeline = await (pipeline as Function)(model.pipelineType, model.hfId, {
    dtype: model.dtype,
    progress_callback: progressCallback(id),
  })
  return embeddingPipeline
}

// ── Chat prompt builders (WebGPU path) ───────────────────────────────────

function buildProofreadMessages(text: string) {
  return [
    {
      role: 'system',
      content: 'You are a proofreader. Fix only grammar and spelling errors in the user\'s text. Output ONLY the corrected text — no explanations, no preamble, no markdown formatting. Preserve the original wording, structure, and style as much as possible.',
    },
    { role: 'user', content: text },
  ]
}

function buildSummarizeMessages(text: string, summaryType?: string, summaryLength?: string) {
  const lengthGuide = summaryLength === 'short' ? '2-3 sentences'
    : summaryLength === 'long' ? '2-3 paragraphs'
    : '1 paragraph'

  const typeGuide = summaryType === 'key-points' ? 'key points as a bulleted list'
    : summaryType === 'tldr' ? 'a TL;DR summary'
    : summaryType === 'teaser' ? 'an engaging teaser that would make someone want to read the full text'
    : summaryType === 'headline' ? 'a single headline'
    : 'a summary'

  return [
    {
      role: 'system',
      content: `Provide ${typeGuide} of the following text. Keep it to approximately ${lengthGuide}. Output only the summary with no preamble or extra commentary.`,
    },
    { role: 'user', content: text },
  ]
}

function buildQAMessages(text: string, question: string) {
  return [
    {
      role: 'system',
      content: 'You are a helpful assistant. Answer the user\'s question using ONLY the provided text as context. If the answer cannot be found in the text, say so. Be concise and direct.',
    },
    { role: 'user', content: `Context:\n${text}\n\nQuestion: ${question}` },
  ]
}

// ── Handlers ─────────────────────────────────────────────────────────────

async function handleInit(id: number, preferEnhanced?: boolean) {
  useEnhancedModel = preferEnhanced ?? false
  try {
    const hasWebGPU = await detectWebGPU()
    deviceMode = hasWebGPU ? 'webgpu' : 'wasm'
    send({ type: 'init-result', id, device: deviceMode })
  } catch {
    deviceMode = 'wasm'
    send({ type: 'init-result', id, device: 'wasm' })
  }
}

async function handleProofread(id: number, text: string) {
  try {
    if (deviceMode === 'webgpu') {
      const pipe = await getWebGPUPipeline(id)
      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      send({ type: 'running', id })

      const messages = buildProofreadMessages(text)
      const result = await pipe(messages, {
        max_new_tokens: Math.max(128, Math.ceil(text.length * 1.5)),
        return_full_text: false,
      })

      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      send({ type: 'proofread-result', id, correctedText: extractGeneratedText(result) })
    } else {
      // WASM fallback path
      const pipe = await getWasmProofreadPipeline(id)
      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      send({ type: 'running', id })

      const prompt = `Correct only the grammar and spelling errors in the following text. Do not rephrase, reword, or add new content:\n${text}`
      const result = await pipe(prompt, { max_new_tokens: Math.max(64, Math.ceil(text.length * 1.1)) })

      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      const correctedText = Array.isArray(result)
        ? result[0].generated_text
        : result.generated_text

      send({ type: 'proofread-result', id, correctedText })
    }
  } catch (err) {
    if (!cancelledIds.has(id)) {
      send({ type: 'error', id, message: err instanceof Error ? err.message : String(err) })
    }
    cancelledIds.delete(id)
  }
}

async function handleSummarize(
  id: number,
  text: string,
  options: { maxLength: number; minLength: number; summaryType?: string; summaryLength?: string },
) {
  try {
    if (deviceMode === 'webgpu') {
      const pipe = await getWebGPUPipeline(id)
      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      send({ type: 'running', id })

      const tokenLimit = options.summaryLength === 'short' ? 256
        : options.summaryLength === 'long' ? 1024
        : 512

      const messages = buildSummarizeMessages(text, options.summaryType, options.summaryLength)
      const result = await pipe(messages, {
        max_new_tokens: tokenLimit,
        return_full_text: false,
      })

      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      send({ type: 'summarize-result', id, summary: extractGeneratedText(result) })
    } else {
      // WASM fallback path
      const pipe = await getWasmSummarizePipeline(id)
      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      send({ type: 'running', id })

      const result = await pipe(text, {
        max_new_tokens: options.maxLength,
        min_new_tokens: options.minLength,
      })

      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      const summary = Array.isArray(result)
        ? result[0].summary_text
        : result.summary_text

      send({ type: 'summarize-result', id, summary })
    }
  } catch (err) {
    if (!cancelledIds.has(id)) {
      send({ type: 'error', id, message: err instanceof Error ? err.message : String(err) })
    }
    cancelledIds.delete(id)
  }
}

async function handleQA(id: number, text: string, question: string) {
  try {
    if (deviceMode !== 'webgpu') {
      send({ type: 'error', id, message: 'Q&A requires WebGPU. Your browser does not support it.' })
      return
    }

    const pipe = await getWebGPUPipeline(id)
    if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

    send({ type: 'running', id })

    const messages = buildQAMessages(text, question)
    const result = await pipe(messages, {
      max_new_tokens: 512,
      return_full_text: false,
    })

    if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

    send({ type: 'qa-result', id, answer: extractGeneratedText(result) })
  } catch (err) {
    if (!cancelledIds.has(id)) {
      send({ type: 'error', id, message: err instanceof Error ? err.message : String(err) })
    }
    cancelledIds.delete(id)
  }
}

async function handleEmbed(id: number, texts: string[]) {
  try {
    const pipe = await getEmbeddingPipeline(id)
    if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

    send({ type: 'running', id })

    const embeddings: number[][] = []
    for (let i = 0; i < texts.length; i++) {
      if (cancelledIds.has(id)) { cancelledIds.delete(id); return }

      const result = await pipe(texts[i], { pooling: 'mean', normalize: true })
      embeddings.push(Array.from(result.data as Float32Array))
      send({ type: 'embed-progress', id, current: i + 1, total: texts.length })
    }

    if (cancelledIds.has(id)) { cancelledIds.delete(id); return }
    send({ type: 'embed-result', id, embeddings })
  } catch (err) {
    if (!cancelledIds.has(id)) {
      send({ type: 'error', id, message: err instanceof Error ? err.message : String(err) })
    }
    cancelledIds.delete(id)
  }
}

// ── Message router ───────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  if (msg.type === 'cancel') {
    cancelledIds.add(msg.id)
    return
  }
  if (msg.type === 'init') {
    handleInit(msg.id, msg.preferEnhanced)
    return
  }
  if (msg.type === 'proofread') {
    handleProofread(msg.id, msg.text)
    return
  }
  if (msg.type === 'summarize') {
    handleSummarize(msg.id, msg.text, msg.options)
    return
  }
  if (msg.type === 'qa') {
    handleQA(msg.id, msg.text, msg.question)
    return
  }
  if (msg.type === 'embed') {
    handleEmbed(msg.id, msg.texts)
  }
}

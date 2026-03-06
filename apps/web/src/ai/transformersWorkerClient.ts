// Singleton web worker manager for transformers.js inference

import type { WorkerResponse } from './transformersWorkerProtocol'

let worker: Worker | null = null
let nextId = 1
let capabilities: { device: 'webgpu' | 'wasm' } | null = null
let initPromise: Promise<{ device: 'webgpu' | 'wasm' }> | null = null
let preferEnhanced = false

const INFERENCE_TIMEOUT_MS = 120_000 // 2 minutes

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(
      new URL('./transformersWorker.ts', import.meta.url),
      { type: 'module' },
    )
  }
  return worker
}

/**
 * Send the init message to the worker and cache the result.
 * Called lazily before the first real request.
 */
function initWorker(): Promise<{ device: 'webgpu' | 'wasm' }> {
  if (capabilities) return Promise.resolve(capabilities)
  if (initPromise) return initPromise

  initPromise = new Promise<{ device: 'webgpu' | 'wasm' }>((resolve) => {
    const w = getWorker()
    const id = nextId++

    function onMsg(e: MessageEvent<WorkerResponse>) {
      if (e.data.id === id && e.data.type === 'init-result') {
        w.removeEventListener('message', onMsg)
        capabilities = { device: e.data.device }
        resolve(capabilities)
      }
    }

    w.addEventListener('message', onMsg)
    w.postMessage({ type: 'init', id, preferEnhanced })
  })

  return initPromise
}

/**
 * Get the worker's detected capabilities (device mode).
 * Spins up the worker if needed and waits for init.
 */
export function getWorkerCapabilities(): Promise<{ device: 'webgpu' | 'wasm' }> {
  return initWorker()
}

/**
 * Forcefully terminate the worker. The next request will spin up a fresh one.
 * Use this when the worker is stuck in WASM inference and can't process messages.
 */
export function terminateWorker() {
  if (worker) {
    worker.terminate()
    worker = null
  }
  capabilities = null
  initPromise = null
}

/**
 * Set whether the worker should load the enhanced (Phi-3.5) model.
 * If the preference changed while a worker is alive, terminates it so
 * the next request spins up a fresh worker with the correct model.
 */
export function setPreferEnhanced(enhanced: boolean) {
  if (enhanced === preferEnhanced) return
  preferEnhanced = enhanced
  terminateWorker()
}

/**
 * Send a request to the transformers.js worker and return a promise + cancel handle.
 * Automatically initializes the worker (WebGPU detection) on first call.
 * The callbacks fire as the worker reports download progress and running state.
 * Includes a timeout that auto-terminates the worker if inference takes too long.
 */
export function sendWorkerRequest(
  request: { type: string; [key: string]: unknown },
  callbacks: {
    onDownloadProgress?: (progress: number) => void
    onRunning?: () => void
    onEmbedProgress?: (current: number, total: number) => void
  },
): { promise: Promise<WorkerResponse>; cancel: () => void } {
  const id = nextId++
  let settled = false
  let cleanupFn: (() => void) | null = null
  let rejectFn: ((reason: unknown) => void) | null = null

  const promise = initWorker().then(() => {
    return new Promise<WorkerResponse>((resolve, reject) => {
      rejectFn = reject

      if (settled) {
        reject(new DOMException('Cancelled', 'AbortError'))
        return
      }

      const w = getWorker()
      let timeoutId: ReturnType<typeof setTimeout> | null = null

      function cleanup() {
        w.removeEventListener('message', onMessage)
        if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
      }

      cleanupFn = cleanup

      function onMessage(e: MessageEvent<WorkerResponse>) {
        const msg = e.data
        if (msg.id !== id) return

        if (msg.type === 'download-progress') {
          callbacks.onDownloadProgress?.(msg.progress)
          return
        }

        if (msg.type === 'embed-progress') {
          if ('current' in msg && 'total' in msg) {
            callbacks.onEmbedProgress?.(msg.current, msg.total)
          }
          return
        }

        if (msg.type === 'running') {
          callbacks.onRunning?.()
          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            if (!settled) {
              settled = true
              cleanup()
              terminateWorker()
              reject(new Error('Inference timed out. The worker has been terminated.'))
            }
          }, INFERENCE_TIMEOUT_MS)
          return
        }

        // Terminal messages
        cleanup()
        settled = true

        if (msg.type === 'error') {
          reject(new Error(msg.message))
        } else {
          resolve(msg)
        }
      }

      w.addEventListener('message', onMessage)
      w.postMessage({ ...request, id })
    })
  })

  function cancel() {
    if (settled) return
    settled = true
    cleanupFn?.()
    if (worker) {
      worker.postMessage({ type: 'cancel', id })
    }
    rejectFn?.(new DOMException('Cancelled', 'AbortError'))
  }

  return { promise, cancel }
}

// Utilities for inspecting and deleting cached AI models

import { getAllModels, type ModelConfig } from './modelConfig'

export interface CachedModelInfo extends ModelConfig {
  cached: boolean
  entryCount: number
}

/**
 * Check which transformers.js models are cached in the browser.
 * Returns info for each known model.
 */
export async function getCachedModels(): Promise<CachedModelInfo[]> {
  try {
    const cache = await caches.open('transformers-cache')
    const keys = await cache.keys()
    const urls = keys.map(k => k.url)

    return getAllModels().map(model => {
      const matchingUrls = urls.filter(u => u.includes(model.cachePattern))
      return {
        ...model,
        cached: matchingUrls.length > 0,
        entryCount: matchingUrls.length,
      }
    })
  } catch {
    // Cache API not available
    return getAllModels().map(model => ({ ...model, cached: false, entryCount: 0 }))
  }
}

/**
 * Delete a specific model's entries from the transformers.js cache.
 */
export async function deleteModel(model: CachedModelInfo): Promise<void> {
  try {
    const cache = await caches.open('transformers-cache')
    const keys = await cache.keys()
    const toDelete = keys.filter(k => k.url.includes(model.cachePattern))
    await Promise.all(toDelete.map(k => cache.delete(k)))
  } catch {
    throw new Error('Failed to delete model from cache')
  }
}

/**
 * Delete all transformers.js cached models.
 */
export async function deleteAllModels(): Promise<void> {
  try {
    await caches.delete('transformers-cache')
  } catch {
    throw new Error('Failed to clear model cache')
  }
}

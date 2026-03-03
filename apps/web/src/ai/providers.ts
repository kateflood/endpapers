import type { AIBackend } from '@endpapers/types'
import type { ProofreaderProvider, SummarizerProvider } from './types'
import { createChromeProofreader } from './chromeProofreader'
import { createChromeSummarizer } from './chromeSummarizer'
import { createTransformersProofreader } from './transformersProofreader'
import { createTransformersSummarizer } from './transformersSummarizer'

export function getProofreaderProviders(backend: AIBackend = 'auto'): ProofreaderProvider[] {
  if (backend === 'chrome') return [createChromeProofreader()]
  if (backend === 'transformers') return [createTransformersProofreader()]
  // 'auto': Chrome first, transformers.js as fallback
  return [createChromeProofreader(), createTransformersProofreader()]
}

export function getSummarizerProviders(backend: AIBackend = 'auto'): SummarizerProvider[] {
  if (backend === 'chrome') return [createChromeSummarizer()]
  if (backend === 'transformers') return [createTransformersSummarizer()]
  return [createChromeSummarizer(), createTransformersSummarizer()]
}

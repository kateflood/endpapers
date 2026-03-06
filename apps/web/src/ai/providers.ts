import type { AIBackend } from '@endpapers/types'
import type { ProofreaderProvider, SummarizerProvider, QAProvider } from './types'
import { createChromeProofreader } from './chromeProofreader'
import { createChromeSummarizer } from './chromeSummarizer'
import { createChromeQA } from './chromeQA'
import { createTransformersProofreader } from './transformersProofreader'
import { createTransformersSummarizer } from './transformersSummarizer'
import { createTransformersQA } from './transformersQA'

export function getProofreaderProviders(backend: AIBackend = 'auto'): ProofreaderProvider[] {
  if (backend === 'chrome') return [createChromeProofreader()]
  if (backend === 'transformers' || backend === 'transformers-enhanced')
    return [createTransformersProofreader()]
  // 'auto': Chrome first, transformers.js as fallback
  return [createChromeProofreader(), createTransformersProofreader()]
}

export function getSummarizerProviders(backend: AIBackend = 'auto'): SummarizerProvider[] {
  if (backend === 'chrome') return [createChromeSummarizer()]
  if (backend === 'transformers' || backend === 'transformers-enhanced')
    return [createTransformersSummarizer()]
  return [createChromeSummarizer(), createTransformersSummarizer()]
}

export function getQAProviders(backend: AIBackend = 'auto'): QAProvider[] {
  if (backend === 'chrome') return [createChromeQA()]
  if (backend === 'transformers' || backend === 'transformers-enhanced')
    return [createTransformersQA()]
  return [createChromeQA(), createTransformersQA()]
}

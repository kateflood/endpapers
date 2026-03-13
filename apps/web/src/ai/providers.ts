import type { AIBackend } from '@endpapers/types'
import type { SummarizerProvider, QAProvider } from './types'
import { createChromeSummarizer } from './chromeSummarizer'
import { createChromeQA } from './chromeQA'
import { createTransformersSummarizer } from './transformersSummarizer'
import { createTransformersQA } from './transformersQA'

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

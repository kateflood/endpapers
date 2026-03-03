import type { ProofreaderProvider, SummarizerProvider } from './types'
import { createChromeProofreader } from './chromeProofreader'
import { createChromeSummarizer } from './chromeSummarizer'

export function getProofreaderProviders(): ProofreaderProvider[] {
  return [createChromeProofreader()]
}

export function getSummarizerProviders(): SummarizerProvider[] {
  return [createChromeSummarizer()]
}

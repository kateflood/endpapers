import { useEffect, useState } from 'react'
import type { AIBackend } from '@endpapers/types'
import { setPreferEnhanced } from '../../ai/transformersWorkerClient'
import { IconSparkles } from '../icons'
import { actionBtnClass, CenteredState } from './shared'
import ProofreaderTab from './ProofreaderTab'
import SummarizerTab from './SummarizerTab'
import QATab from './QATab'

type AITab = 'proofread' | 'summarize' | 'qa'

interface AIPanelProps {
  getEditorText: () => string
  aiEnabled: boolean
  aiBackend: AIBackend
  onNavigateSettings: () => void
  applyCorrection: (startIndex: number, endIndex: number, replacement: string) => void
  highlightTextRange: (startIndex: number, endIndex: number) => void
  clearHighlight: () => void
}

export default function AIPanel({
  getEditorText, aiEnabled, aiBackend, onNavigateSettings, applyCorrection, highlightTextRange, clearHighlight,
}: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<AITab>('proofread')

  // Sync worker model preference when backend changes
  useEffect(() => {
    setPreferEnhanced(aiBackend === 'transformers-enhanced')
  }, [aiBackend])

  const tabClass = (tab: AITab) =>
    `px-2 py-0.5 rounded-sm text-[0.75rem] transition-colors cursor-pointer ${
      activeTab === tab
        ? 'bg-accent/10 text-accent font-medium'
        : 'text-text-secondary hover:text-text'
    }`

  return (
    <>
      {/* Tab bar */}
      {aiEnabled && (
        <div className="flex items-center gap-1 px-4 py-1.5 shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <button className={tabClass('proofread')} onClick={() => setActiveTab('proofread')}>
            Proofread
          </button>
          <button className={tabClass('summarize')} onClick={() => setActiveTab('summarize')}>
            Summarize
          </button>
          <button className={tabClass('qa')} onClick={() => setActiveTab('qa')}>
            Q&A
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {!aiEnabled ? (
          <CenteredState
            icon={<IconSparkles size={24} className="text-text-placeholder" />}
            title="AI tools are not enabled"
            subtitle="Enable on-device AI tools to proofread and summarize your writing. Your text never leaves your device."
          >
            <button className={actionBtnClass} onClick={onNavigateSettings}>
              Go to Settings
            </button>
          </CenteredState>
        ) : activeTab === 'proofread' ? (
          <ProofreaderTab
            getEditorText={getEditorText}
            applyCorrection={applyCorrection}
            highlightTextRange={highlightTextRange}
            clearHighlight={clearHighlight}
            backend={aiBackend}
          />
        ) : activeTab === 'summarize' ? (
          <SummarizerTab getEditorText={getEditorText} backend={aiBackend} />
        ) : (
          <QATab getEditorText={getEditorText} backend={aiBackend} />
        )}
      </div>
    </>
  )
}

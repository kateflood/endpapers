import { useState } from 'react'
import type { AIBackend } from '@endpapers/types'
import { IconSparkles, IconClose } from '../icons'
import { actionBtnClass, CenteredState } from './shared'
import ProofreaderTab from './ProofreaderTab'
import SummarizerTab from './SummarizerTab'
import QATab from './QATab'

type AITab = 'proofread' | 'summarize' | 'qa'

interface AIPanelProps {
  getEditorText: () => string
  onClose: () => void
  aiEnabled: boolean
  aiBackend: AIBackend
  onNavigateSettings: () => void
  applyCorrection: (startIndex: number, endIndex: number, replacement: string) => void
  highlightTextRange: (startIndex: number, endIndex: number) => void
  clearHighlight: () => void
}

export default function AIPanel({
  getEditorText, onClose, aiEnabled, aiBackend, onNavigateSettings, applyCorrection, highlightTextRange, clearHighlight,
}: AIPanelProps) {
  const [activeTab, setActiveTab] = useState<AITab>('proofread')

  const tabClass = (tab: AITab) =>
    `px-2 py-0.5 rounded-sm text-[0.75rem] transition-colors cursor-pointer ${
      activeTab === tab
        ? 'bg-accent/10 text-accent font-medium'
        : 'text-text-secondary hover:text-text'
    }`

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 h-12 border-b border-border shrink-0 gap-2">
        <IconSparkles size={14} className="text-accent shrink-0" />
        <span className="text-[0.9375rem] font-medium text-text">AI Tools</span>
        <div className="flex-1" />
        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer shrink-0"
          onClick={onClose}
          aria-label="Close"
        >
          <IconClose size={14} />
        </button>
      </div>

      {/* Tab bar */}
      {aiEnabled && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
    </aside>
  )
}

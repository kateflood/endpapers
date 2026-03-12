import type { ProofCorrection } from '../../ai/types'
import { IconCheckCircle, IconClose } from '../shared/icons'

export type CorrectionStatus = 'pending' | 'accepted' | 'skipped'

export interface TrackedCorrection {
  correction: ProofCorrection
  originalText: string
  status: CorrectionStatus
}

export function CorrectionCard({
  tracked, isActive, onClick, onAccept, onSkip,
}: {
  tracked: TrackedCorrection
  isActive: boolean
  onClick: () => void
  onAccept: () => void
  onSkip: () => void
}) {
  if (tracked.status === 'accepted') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm opacity-40">
        <IconCheckCircle size={12} className="text-accent shrink-0" />
        <span className="text-[0.75rem] text-text-secondary line-through truncate">
          {tracked.originalText}
        </span>
      </div>
    )
  }

  if (tracked.status === 'skipped') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-sm opacity-30">
        <IconClose size={12} className="text-text-placeholder shrink-0" />
        <span className="text-[0.75rem] text-text-placeholder truncate">
          {tracked.originalText}
        </span>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-md border cursor-pointer transition-all ${
        isActive
          ? 'border-accent/30 shadow-sm bg-surface'
          : 'border-border hover:border-accent/20 hover:shadow-sm bg-surface'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
        <span className="text-[0.75rem] text-text-secondary truncate">
          &ldquo;{tracked.originalText.slice(0, 30)}{tracked.originalText.length > 30 ? '…' : ''}&rdquo;
        </span>
      </div>

      {/* Expanded diff */}
      {isActive && (
        <>
          <div className="px-3 pb-2 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[0.75rem] text-danger font-medium w-3 shrink-0">&ndash;</span>
              <span className="text-[0.75rem] text-text-secondary leading-relaxed line-through">
                {tracked.originalText}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[0.75rem] text-accent font-medium w-3 shrink-0">+</span>
              <span className="text-[0.75rem] text-text leading-relaxed font-medium">
                {tracked.correction.correction}
              </span>
            </div>
          </div>
          <div className="flex gap-2 px-3 pb-3">
            <button
              onClick={e => { e.stopPropagation(); onAccept() }}
              className="flex-1 h-7 rounded-sm text-[0.75rem] font-medium text-white bg-accent hover:opacity-[0.82] transition-opacity cursor-pointer"
            >
              Accept
            </button>
            <button
              onClick={e => { e.stopPropagation(); onSkip() }}
              className="flex-1 h-7 rounded-sm text-[0.75rem] font-medium text-text-secondary bg-bg border border-border hover:bg-hover transition-colors cursor-pointer"
            >
              Skip
            </button>
          </div>
        </>
      )}
    </div>
  )
}

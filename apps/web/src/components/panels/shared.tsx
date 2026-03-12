import type { ProviderAvailability } from '../../ai/types'
import { IconAlertCircle } from '../shared/icons'

export type ToolState = 'idle' | 'downloading' | 'running' | 'results'

export const actionBtnClass = 'w-full h-8 rounded-sm text-[0.8125rem] font-medium bg-accent text-white hover:opacity-[0.82] transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2'
export const cancelBtnClass = 'text-[0.8125rem] text-text-secondary hover:text-text cursor-pointer transition-colors'

export function DownloadProgressBar({ progress }: { progress: number | null }) {
  if (progress === null) return null
  return (
    <div className="w-full space-y-1.5">
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-[0.75rem] text-text-secondary">
        <span>{Math.round(progress * 100)}%</span>
      </div>
    </div>
  )
}

export function CenteredState({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-5">
      <div className="w-14 h-14 rounded-2xl bg-hover flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-[0.9375rem] font-medium text-text mb-1">{title}</p>
        <p className="text-[0.8125rem] text-text-secondary leading-relaxed">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

export function AvailabilityBadge({ availability }: { availability: ProviderAvailability | 'checking' }) {
  if (availability === 'checking') {
    return <span className="text-[0.6875rem] text-text-placeholder">Checking…</span>
  }
  if (availability === 'unavailable') {
    return (
      <span className="flex items-center gap-1 text-[0.6875rem] text-text-placeholder">
        <IconAlertCircle size={11} /> Not available
      </span>
    )
  }
  if (availability === 'downloadable') {
    return <span className="text-[0.6875rem] text-accent">Model will download on first use</span>
  }
  return null
}

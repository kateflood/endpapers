import type { ReactNode } from 'react'
import { IconClose } from './icons'

interface Props {
  title: string
  width?: string
  onClose: () => void
  children: ReactNode
}

export default function Dialog({ title, width = 'max-w-[400px]', onClose, children }: Props) {
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={handleBackdropClick}
    >
      <div className={`${width} w-full bg-surface rounded-md shadow-xl border border-border flex flex-col overflow-hidden`}>
        <div className="flex items-center px-4 h-12 border-b border-border shrink-0 gap-2">
          <span className="flex-1 text-[0.9375rem] font-medium text-text">{title}</span>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <IconClose size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import { IconClose } from './icons'

interface CardHeaderProps {
  title: string
  onClose: () => void
  icon?: ReactNode
  children?: ReactNode
}

export function CardHeader({ title, onClose, icon, children }: CardHeaderProps) {
  return (
    <div className="flex items-center px-4 h-12 shrink-0 gap-2">
      {icon}
      <span className="text-[0.9375rem] font-medium text-text">{title}</span>
      <div className="flex-1" />
      {children}
      <button
        type="button"
        className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer shrink-0"
        onClick={onClose}
        aria-label="Close"
      >
        <IconClose size={14} />
      </button>
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-bg rounded-lg border border-border flex flex-col overflow-hidden  ${className} pb-5`.trim()}>
      {children}
    </div>
  )
}

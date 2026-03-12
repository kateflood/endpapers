import type { ReactNode } from 'react'

interface ToolbarButtonProps {
  icon: ReactNode
  title: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}

export default function ToolbarButton({ icon, title, onClick, active = false, disabled = false }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-sm transition-colors shrink-0 ${
        disabled
          ? 'text-text-placeholder cursor-default'
          : active
            ? 'bg-active text-text cursor-pointer'
            : 'text-text-secondary hover:bg-hover hover:text-text cursor-pointer'
      }`}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}

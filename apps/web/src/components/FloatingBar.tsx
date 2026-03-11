import type { ReactNode } from 'react'

interface FloatingBarProps {
  children: ReactNode
  className?: string
}

export default function FloatingBar({ children, className = '' }: FloatingBarProps) {
  return (
    <div className={`rounded-md bg-surface/80 backdrop-blur-sm shadow-sm shrink-0 ${className}`.trim()}>
      {children}
    </div>
  )
}

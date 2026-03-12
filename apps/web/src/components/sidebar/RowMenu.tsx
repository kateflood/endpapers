import { useState, useRef, useEffect } from 'react'

export interface RowMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

interface Props {
  items: RowMenuItem[]
  label?: string
}

export default function RowMenu({ items, label = 'Options' }: Props) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer text-[0.75rem] leading-none"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={label}
      >
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-0.5 z-50 bg-surface border border-border rounded-md shadow-[0_4px_16px_rgba(0,0,0,0.1)] py-1 min-w-[160px]">
          {items.map((item, i) => (
            <button
              key={i}
              className={`w-full text-left px-3 py-1.5 text-[0.8125rem] hover:bg-hover cursor-pointer ${item.variant === 'danger' ? 'text-danger' : 'text-text'}`}
              onClick={e => { e.stopPropagation(); setOpen(false); item.onClick() }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

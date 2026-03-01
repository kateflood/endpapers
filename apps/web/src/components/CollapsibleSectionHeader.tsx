import { IconChevronRight } from './icons'

interface HeaderAction {
  label: string
  onClick: () => void
  title?: string
}

interface Props {
  label: string
  isCollapsed: boolean
  onToggle: () => void
  onLabelClick?: () => void
  actions: HeaderAction[]
}

export default function CollapsibleSectionHeader({
  label,
  isCollapsed,
  onToggle,
  onLabelClick,
  actions,
}: Props) {
  return (
    <div className="flex items-center px-3 h-8 shrink-0 gap-1">
      <button
        className="w-5 h-5 flex items-center justify-center shrink-0 text-text-placeholder -ml-1"
        onClick={onToggle}
      >
        <IconChevronRight
          size={12}
          className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
        />
      </button>
      <span
        className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary flex-1 cursor-pointer"
        onClick={onLabelClick ?? onToggle}
      >
        {label}
      </span>
      {actions.map(action => (
        <button
          key={action.label}
          className="h-6 px-1.5 rounded-sm text-[0.75rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
          onClick={e => { e.stopPropagation(); action.onClick() }}
          title={action.title}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

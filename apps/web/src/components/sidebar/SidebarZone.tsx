import type { ReactNode } from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { LucideIcon } from 'lucide-react'
import CollapsibleSectionHeader from './CollapsibleSectionHeader'

interface HeaderAction {
  icon: LucideIcon
  onClick: () => void
  title: string
}

interface SidebarZoneProps {
  label: string
  isCollapsed: boolean
  onToggle: () => void
  actions: HeaderAction[]
  itemIds: string[]
  emptyMessage: string
  isEmpty: boolean
  children: ReactNode
  className?: string
}

export default function SidebarZone({
  label,
  isCollapsed,
  onToggle,
  actions,
  itemIds,
  emptyMessage,
  isEmpty,
  children,
  className = '',
}: SidebarZoneProps) {
  return (
    <div className={`py-2 ${className}`.trim()}>
      <CollapsibleSectionHeader
        label={label}
        isCollapsed={isCollapsed}
        onToggle={onToggle}
        actions={actions}
      />
      {!isCollapsed && (
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {isEmpty && (
            <p className="px-4 py-2 text-[0.8125rem] text-text-placeholder">{emptyMessage}</p>
          )}
          {children}
        </SortableContext>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RowMenuItem } from './RowMenu'
import { IconChevronRight } from './icons'
import DragHandle from './DragHandle'
import RowMenu from './RowMenu'
import DeleteConfirmation from './DeleteConfirmation'

interface Props {
  id: string
  title: string
  isCollapsed: boolean
  childIds: string[]
  childCount: number
  childLabel?: string
  onToggleCollapse: () => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onAddChild: (groupId: string) => void
  addChildLabel?: string
  children: React.ReactNode
}

export default function SortableGroupItem({
  id,
  title,
  isCollapsed,
  childIds,
  childCount,
  childLabel = 'item',
  onToggleCollapse,
  onRename,
  onDelete,
  onAddChild,
  addChildLabel = 'Add item',
  children,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEditing() {
    setDraft(title)
    setEditing(true)
  }

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) onRename(id, trimmed)
    else setDraft(title)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      setDraft(title)
      setEditing(false)
    }
  }

  function handleDelete() {
    if (childCount === 0) onDelete(id)
    else setConfirmingDelete(true)
  }

  const menuItems: RowMenuItem[] = [
    { label: 'Rename', onClick: startEditing },
    { label: addChildLabel, onClick: () => onAddChild(id) },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' as const },
  ]

  return (
    <div ref={setNodeRef} style={style}>
      <div className="group relative flex items-center h-8 gap-1 pl-2 pr-2 cursor-pointer select-none hover:bg-hover">
        <DragHandle attributes={attributes} listeners={listeners} />

        <button
          className="shrink-0 w-4 h-4 flex items-center justify-center text-text-secondary cursor-pointer"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
        >
          <IconChevronRight size={12} className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
        </button>

        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 min-w-0 bg-surface border border-accent rounded-sm px-1 text-[0.8125rem] font-medium text-text outline-none"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span
            className="flex-1 min-w-0 truncate text-[0.8125rem] font-medium text-text leading-none"
            onClick={onToggleCollapse}
            onDoubleClick={e => { e.stopPropagation(); startEditing() }}
          >
            {title || 'Group'}
          </span>
        )}

        {!editing && <RowMenu items={menuItems} label="Group options" />}
      </div>

      {confirmingDelete && (
        <DeleteConfirmation
          name={title || 'Group'}
          detail={`and its ${childCount} ${childLabel}${childCount !== 1 ? 's' : ''}`}
          onConfirm={() => { setConfirmingDelete(false); onDelete(id) }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {!isCollapsed && (
        <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { RowMenuItem } from './RowMenu'
import DragHandle from './DragHandle'
import RowMenu from './RowMenu'
import DeleteConfirmation from '../dialogs/DeleteConfirmation'

interface Props {
  id: string
  title: string
  isActive: boolean
  indented?: boolean
  secondaryText?: string
  emptyTitlePlaceholder?: React.ReactNode
  onSelect: (id: string) => void
  onInlineRename?: (id: string, title: string) => void
  onRename?: (id: string) => void
  onDelete: (id: string) => void
  confirmDelete?: boolean
  extraMenuItems?: RowMenuItem[]
  menuLabel?: string
  baseIndent?: string
  nestedIndent?: string
  dimWhenInactive?: boolean
}

export default function SortableListItem({
  id,
  title,
  isActive,
  indented = false,
  secondaryText,
  emptyTitlePlaceholder,
  onSelect,
  onInlineRename,
  onRename,
  onDelete,
  confirmDelete = false,
  extraMenuItems,
  menuLabel = 'Options',
  baseIndent = 'pl-2',
  nestedIndent = 'pl-7',
  dimWhenInactive = false,
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
    if (trimmed && trimmed !== title) onInlineRename?.(id, trimmed)
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
    if (confirmDelete) setConfirmingDelete(true)
    else onDelete(id)
  }

  const menuItems: RowMenuItem[] = [
    ...(onInlineRename
      ? [{ label: 'Rename', onClick: startEditing }]
      : onRename
        ? [{ label: 'Rename', onClick: () => onRename(id) }]
        : []),
    ...(extraMenuItems ?? []),
    { label: 'Delete', onClick: handleDelete, variant: 'danger' as const },
  ]

  const paddingLeft = indented ? nestedIndent : baseIndent

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group relative flex items-center h-7 gap-1 ${paddingLeft} pr-2 cursor-pointer select-none text-[0.8125rem] ${
          isActive
            ? 'text-text font-medium'
            : dimWhenInactive
              ? 'text-text-secondary hover:bg-hover hover:text-text'
              : 'text-text hover:bg-hover'
        }`}
        onClick={() => { if (!editing) onSelect(id) }}
        onDoubleClick={onInlineRename ? () => startEditing() : undefined}
      >
        <DragHandle attributes={attributes} listeners={listeners} />

        {isActive && !editing && (
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
        )}

        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 min-w-0 bg-surface border border-accent rounded-sm px-1 text-[0.8125rem] text-text outline-none"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 min-w-0 truncate leading-none">
            {title || emptyTitlePlaceholder}
          </span>
        )}

        {secondaryText && !editing && (
          <span className="shrink-0 text-[0.6875rem] text-text-placeholder truncate max-w-[5rem]">
            {secondaryText}
          </span>
        )}

        {!editing && <RowMenu items={menuItems} label={menuLabel} />}
      </div>

      {confirmingDelete && (
        <DeleteConfirmation
          name={title}
          onConfirm={() => { setConfirmingDelete(false); onDelete(id) }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

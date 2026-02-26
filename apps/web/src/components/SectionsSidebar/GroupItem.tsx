import { useState, useRef, useEffect } from 'react'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SectionManifestEntry } from '@endpapers/types'
import DragHandle from '../DragHandle'
import RowMenu from '../RowMenu'
import DeleteConfirmation from '../DeleteConfirmation'
import SectionItem from './SectionItem'
import { IconChevronRight } from '../icons'

interface Props {
  group: SectionManifestEntry
  isCollapsed: boolean
  activeSectionId: string | null
  onToggleCollapse: (id: string) => void
  onSelectSection: (id: string) => void
  onRenameSection: (id: string, title: string) => void
  onDeleteSection: (id: string) => void
  onRenameGroup: (id: string, title: string) => void
  onDeleteGroup: (id: string) => void
  onAddSectionInGroup: (groupId: string) => void
}

export default function GroupItem({
  group,
  isCollapsed,
  activeSectionId,
  onToggleCollapse,
  onSelectSection,
  onRenameSection,
  onDeleteSection,
  onRenameGroup,
  onDeleteGroup,
  onAddSectionInGroup,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(group.title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const children = group.children ?? []

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEditing() {
    setDraft(group.title)
    setEditing(true)
  }

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== group.title) onRenameGroup(group.id, trimmed)
    else setDraft(group.title)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      setDraft(group.title)
      setEditing(false)
    }
  }

  function handleDeleteGroup() {
    if (children.length === 0) {
      onDeleteGroup(group.id)
    } else {
      setConfirmingDelete(true)
    }
  }

  const menuItems = [
    { label: 'Rename', onClick: startEditing },
    { label: 'Add section inside', onClick: () => onAddSectionInGroup(group.id) },
    { label: 'Delete', onClick: handleDeleteGroup, variant: 'danger' as const },
  ]

  return (
    <div ref={setNodeRef} style={style}>
      {/* Group header row */}
      <div className="group relative flex items-center h-8 gap-1 pl-2 pr-2 cursor-pointer select-none hover:bg-hover">
        <DragHandle attributes={attributes} listeners={listeners} />

        {/* Chevron */}
        <button
          className="shrink-0 w-4 h-4 flex items-center justify-center text-text-secondary cursor-pointer"
          onClick={() => onToggleCollapse(group.id)}
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
            onClick={() => onToggleCollapse(group.id)}
            onDoubleClick={e => { e.stopPropagation(); startEditing() }}
          >
            {group.title}
          </span>
        )}

        {!editing && <RowMenu items={menuItems} label="Group options" />}
      </div>

      {/* Inline delete confirmation */}
      {confirmingDelete && (
        <DeleteConfirmation
          name={group.title}
          detail={`and its ${children.length} section${children.length !== 1 ? 's' : ''}`}
          onConfirm={() => { setConfirmingDelete(false); onDeleteGroup(group.id) }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {/* Children */}
      {!isCollapsed && (
        <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {children.map(child => (
            <SectionItem
              key={child.id}
              section={child}
              isActive={activeSectionId === child.id}
              indented
              onSelect={onSelectSection}
              onRename={onRenameSection}
              onDelete={onDeleteSection}
            />
          ))}
        </SortableContext>
      )}
    </div>
  )
}

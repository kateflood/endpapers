import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SectionManifestEntry } from '@endpapers/types'
import DragHandle from '../DragHandle'
import RowMenu from '../RowMenu'
import DeleteConfirmation from '../DeleteConfirmation'

interface Props {
  section: SectionManifestEntry
  isActive: boolean
  indented?: boolean
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

export default function SectionItem({
  section,
  isActive,
  indented = false,
  onSelect,
  onRename,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(section.title)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
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
    setDraft(section.title)
    setEditing(true)
  }

  function commitRename() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== section.title) onRename(section.id, trimmed)
    else setDraft(section.title)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') {
      setDraft(section.title)
      setEditing(false)
    }
  }

  const menuItems = [
    { label: 'Rename', onClick: startEditing },
    { label: 'Delete', onClick: () => setConfirmingDelete(true), variant: 'danger' as const },
  ]

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group relative flex items-center h-7 gap-1 ${indented ? 'pl-7' : 'pl-2'} pr-2 cursor-pointer select-none ${isActive ? 'bg-black/[0.06]' : 'hover:bg-black/[0.03]'}`}
        onClick={() => { if (!editing) onSelect(section.id) }}
        onDoubleClick={() => startEditing()}
      >
        <DragHandle attributes={attributes} listeners={listeners} />

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
          <span className="flex-1 min-w-0 truncate text-[0.8125rem] text-text leading-none">
            {section.title}
          </span>
        )}

        {!editing && <RowMenu items={menuItems} label="Section options" />}
      </div>

      {confirmingDelete && (
        <DeleteConfirmation
          name={section.title}
          onConfirm={() => { setConfirmingDelete(false); onDelete(section.id) }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

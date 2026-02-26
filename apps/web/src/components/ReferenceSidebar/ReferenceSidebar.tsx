import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReferenceCollection, ReferenceItem, ReferenceManifestEntry } from '@endpapers/types'
import { generateId } from '@endpapers/utils'
import { IconChevronRight, IconGrip } from '../icons'
import DragHandle from '../DragHandle'
import RowMenu from '../RowMenu'
import DeleteConfirmation from '../DeleteConfirmation'

// ── Secondary info per type ─────────────────────────────────────────────────

const SECONDARY_FIELD: Record<string, string> = {
  character: 'role',
  timeline: 'date',
  research: 'source',
  scenes: 'setting',
}

// ── Sortable item row ────────────────────────────────────────────────────────

function SortableItemRow({ item, isSelected, onSelect, onRename, onDelete, indent }: {
  item: ReferenceItem
  isSelected: boolean
  onSelect: (id: string) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  indent?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const secondaryKey = SECONDARY_FIELD[item.type]
  const secondaryValue = secondaryKey ? item.fields[secondaryKey] : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 ${indent ? 'pl-9' : 'pl-5'} pr-1 h-7 cursor-pointer transition-colors text-[0.8125rem] ${
        isSelected
          ? 'text-text bg-active'
          : 'text-text-secondary hover:bg-hover hover:text-text'
      }`}
      onClick={() => onSelect(item.id)}
    >
      <DragHandle attributes={attributes} listeners={listeners} />
      <span className="flex-1 min-w-0 truncate">
        {item.name || <span className="text-text-placeholder italic">Untitled</span>}
      </span>
      {secondaryValue && (
        <span className="shrink-0 text-[0.6875rem] text-text-placeholder truncate max-w-[5rem]">
          {secondaryValue}
        </span>
      )}
      <RowMenu items={[
        { label: 'Rename', onClick: () => onRename(item.id) },
        { label: 'Delete', onClick: () => onDelete(item.id), variant: 'danger' },
      ]} />
    </div>
  )
}

// ── Sortable group row ───────────────────────────────────────────────────────

function SortableGroupRow({ entry, items, selectedItemId, onSelectItem, onRenameItem, onDeleteItem, isCollapsed, onToggle, onRename, onDeleteGroup, onAddItemInGroup }: {
  entry: ReferenceManifestEntry
  items: ReferenceItem[]
  selectedItemId: string | null
  onSelectItem: (id: string) => void
  onRenameItem: (id: string) => void
  onDeleteItem: (id: string) => void
  isCollapsed: boolean
  onToggle: () => void
  onRename: (id: string, name: string) => void
  onDeleteGroup: (id: string) => void
  onAddItemInGroup: (groupId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(entry.title ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const children = entry.children ?? []
  const childItems = children
    .map(c => items.find(i => i.id === c.id))
    .filter((i): i is ReferenceItem => i != null)

  function startEditing() {
    setEditName(entry.title ?? '')
    setIsEditing(true)
  }

  function commitEdit() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== entry.title) {
      onRename(entry.id, trimmed)
    }
    setIsEditing(false)
  }

  function handleDeleteGroup() {
    if (children.length === 0) {
      onDeleteGroup(entry.id)
    } else {
      setConfirmingDelete(true)
    }
  }

  const menuItems = [
    { label: 'Rename', onClick: startEditing },
    { label: 'Add item', onClick: () => onAddItemInGroup(entry.id) },
    { label: 'Delete', onClick: handleDeleteGroup, variant: 'danger' as const },
  ]

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`group flex items-center px-2 h-8 cursor-pointer transition-colors hover:bg-hover`}
      >
        <DragHandle attributes={attributes} listeners={listeners} />
        <button
          className="w-5 h-5 flex items-center justify-center shrink-0 text-text-placeholder ml-1"
          onClick={onToggle}
        >
          <IconChevronRight
            size={12}
            className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
        </button>
        {isEditing ? (
          <input
            className="flex-1 min-w-0 bg-surface border border-accent rounded-sm px-1 text-[0.8125rem] font-medium text-text outline-none"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') { setEditName(entry.title ?? ''); setIsEditing(false) }
            }}
            onClick={e => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className="flex-1 min-w-0 truncate text-[0.8125rem] font-medium text-text leading-none"
            onClick={onToggle}
            onDoubleClick={e => { e.stopPropagation(); startEditing() }}
          >
            {entry.title || 'Group'}
          </span>
        )}
        {!isEditing && <RowMenu items={menuItems} label="Group options" />}
      </div>

      {confirmingDelete && (
        <DeleteConfirmation
          name={entry.title || 'Group'}
          detail={`and its ${children.length} item${children.length !== 1 ? 's' : ''}`}
          onConfirm={() => { setConfirmingDelete(false); onDeleteGroup(entry.id) }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {!isCollapsed && (
        <SortableContext items={childItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {childItems.map(item => (
            <SortableItemRow
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={onSelectItem}
              onRename={onRenameItem}
              onDelete={onDeleteItem}
              indent
            />
          ))}
        </SortableContext>
      )}
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  collections: ReferenceCollection[]
  items: ReferenceItem[]
  manifest: Record<string, ReferenceManifestEntry[]>
  activeTab: 'board' | 'grid'
  selectedItemId: string | null
  onSelectItem: (id: string) => void
  onRenameItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onAdd: (type: string) => void
  onAddItemInGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onFitType: (type: string) => void
  onFilterType: (type: string | null) => void
  onManifestUpdate: (manifest: Record<string, ReferenceManifestEntry[]>) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ReferenceSidebar({
  collections,
  items,
  manifest,
  activeTab,
  selectedItemId,
  onSelectItem,
  onRenameItem,
  onDeleteItem,
  onAdd,
  onAddItemInGroup,
  onDeleteGroup,
  onFitType,
  onFilterType,
  onManifestUpdate,
}: Props) {
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleTypeClick(type: string) {
    if (activeTab === 'board') onFitType(type)
    else onFilterType(type)
  }

  function toggleType(type: string) {
    setCollapsedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  function toggleGroup(id: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Group management ──────────────────────────────────────────────────

  const handleGroupRename = useCallback((groupId: string, name: string) => {
    const updated = { ...manifest }
    for (const type of Object.keys(updated)) {
      updated[type] = updated[type].map(e =>
        e.id === groupId ? { ...e, title: name } : e,
      )
    }
    onManifestUpdate(updated)
  }, [manifest, onManifestUpdate])



  const handleCreateGroup = useCallback((type: string) => {
    const groupId = generateId()
    const updated = { ...manifest }
    if (!updated[type]) updated[type] = []
    updated[type] = [...updated[type], { id: groupId, type: 'group' as const, title: 'New Group', children: [] }]
    onManifestUpdate(updated)
  }, [manifest, onManifestUpdate])

  // ── DnD handlers ──────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedId = active.id as string
    const overId = over.id as string

    // Find which collection type both belong to and reorder within it
    for (const type of Object.keys(manifest)) {
      const entries = manifest[type]
      const flatIds = flattenEntryIds(entries)

      const activeIdx = flatIds.indexOf(draggedId)
      const overIdx = flatIds.indexOf(overId)
      if (activeIdx === -1 || overIdx === -1) continue

      // Both are in the same collection — reorder
      const updated = { ...manifest }
      updated[type] = reorderEntries(entries, draggedId, overId)
      onManifestUpdate(updated)
      return
    }
  }

  const activeItem = activeId ? items.find(i => i.id === activeId) : null

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-2">
        {/* Collections with items */}
        {collections.map((col, colIndex) => {
          const typeEntries = manifest[col.type] ?? []
          const isCollapsed = collapsedTypes.has(col.type)

          // Build sortable IDs for this collection (items + groups)
          const sortableIds = flattenEntryIds(typeEntries)

          return (
            <div key={col.type}>
              {colIndex > 0 && <div className="border-t border-border my-1" />}
              {/* Collection header */}
              <div className="flex items-center px-3 h-8 shrink-0 gap-1">
                <button
                  className="w-5 h-5 flex items-center justify-center shrink-0 text-text-placeholder -ml-1"
                  onClick={() => toggleType(col.type)}
                >
                  <IconChevronRight
                    size={12}
                    className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  />
                </button>
                <span
                  className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary flex-1 cursor-pointer"
                  onClick={() => handleTypeClick(col.type)}
                >
                  {col.label}
                </span>
                <button
                  className="h-6 px-1.5 rounded-sm text-[0.75rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
                  onClick={e => { e.stopPropagation(); onAdd(col.type) }}
                  title={`Add ${col.label.replace(/s$/, '').toLowerCase()}`}
                >
                  + Item
                </button>
                <button
                  className="h-6 px-1.5 rounded-sm text-[0.75rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
                  onClick={e => { e.stopPropagation(); handleCreateGroup(col.type) }}
                  title={`Add group to ${col.label.toLowerCase()}`}
                >
                  + Group
                </button>
              </div>

              {/* Items (manifest-ordered) */}
              {!isCollapsed && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                    {typeEntries.map(entry => {
                      if (entry.type === 'group') {
                        return (
                          <SortableGroupRow
                            key={entry.id}
                            entry={entry}
                            items={items}
                            selectedItemId={selectedItemId}
                            onSelectItem={onSelectItem}
                            onRenameItem={onRenameItem}
                            onDeleteItem={onDeleteItem}
                            isCollapsed={collapsedGroups.has(entry.id)}
                            onToggle={() => toggleGroup(entry.id)}
                            onRename={handleGroupRename}
                            onDeleteGroup={onDeleteGroup}
                            onAddItemInGroup={onAddItemInGroup}
                          />
                        )
                      }
                      const item = items.find(i => i.id === entry.id)
                      if (!item) return null
                      return (
                        <SortableItemRow
                          key={item.id}
                          item={item}
                          isSelected={selectedItemId === item.id}
                          onSelect={onSelectItem}
                          onRename={onRenameItem}
                          onDelete={onDeleteItem}
                        />
                      )
                    })}
                  </SortableContext>
                  <DragOverlay>
                    {activeItem ? (
                      <div className="flex items-center gap-1 pl-5 pr-3 h-7 bg-surface shadow-md rounded-sm text-[0.8125rem] text-text truncate border border-border">
                        <IconGrip size={12} className="text-text-placeholder" />
                        <span className="flex-1 truncate">
                          {activeItem.name || 'Untitled'}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}

            </div>
          )
        })}
      </div>
    </aside>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenEntryIds(entries: ReferenceManifestEntry[]): string[] {
  const ids: string[] = []
  for (const entry of entries) {
    ids.push(entry.id)
    if (entry.type === 'group' && entry.children) {
      for (const child of entry.children) {
        ids.push(child.id)
      }
    }
  }
  return ids
}

function reorderEntries(
  entries: ReferenceManifestEntry[],
  draggedId: string,
  overId: string,
): ReferenceManifestEntry[] {
  // Simple case: both are top-level entries
  const draggedTopIdx = entries.findIndex(e => e.id === draggedId)
  const overTopIdx = entries.findIndex(e => e.id === overId)

  if (draggedTopIdx !== -1 && overTopIdx !== -1) {
    return arrayMove(entries, draggedTopIdx, overTopIdx)
  }

  // More complex: item is inside a group or being moved into/out of one
  // For now, handle the simple case of top-level reorder and same-group reorder
  for (const entry of entries) {
    if (entry.type === 'group' && entry.children) {
      const draggedChildIdx = entry.children.findIndex(c => c.id === draggedId)
      const overChildIdx = entry.children.findIndex(c => c.id === overId)
      if (draggedChildIdx !== -1 && overChildIdx !== -1) {
        return entries.map(e =>
          e.id === entry.id
            ? { ...e, children: arrayMove(e.children!, draggedChildIdx, overChildIdx) }
            : e,
        )
      }
    }
  }

  return entries
}

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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import type { ReferenceCollection, ReferenceItem, ReferenceManifestEntry } from '@endpapers/types'
import { generateId } from '@endpapers/utils'
import { IconGrip, IconPlus, IconFolderOpen } from '../icons'
import SortableListItem from '../SortableListItem'
import SortableGroupItem from '../SortableGroupItem'
import CollapsibleSectionHeader from '../CollapsibleSectionHeader'

// ── Secondary info per type ─────────────────────────────────────────────────

const SECONDARY_FIELD: Record<string, string> = {
  character: 'role',
  timeline: 'date',
  research: 'source',
  scenes: 'setting',
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  collections: ReferenceCollection[]
  items: ReferenceItem[]
  manifest: Record<string, ReferenceManifestEntry[]>
  activeTab: 'board' | 'grid'
  selectedItemId: string | null
  onSelectItem: (id: string) => void
  onRenameItem: (id: string, name: string) => void
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

  // ── Helpers for rendering items ──────────────────────────────────────

  function getSecondaryText(item: ReferenceItem): string | undefined {
    const key = SECONDARY_FIELD[item.type]
    return key ? item.fields[key] : undefined
  }

  function renderItem(item: ReferenceItem, indent?: boolean) {
    return (
      <SortableListItem
        key={item.id}
        id={item.id}
        title={item.name}
        isActive={selectedItemId === item.id}
        indented={indent}
        secondaryText={getSecondaryText(item)}
        emptyTitlePlaceholder={<span className="text-text-placeholder italic">Untitled</span>}
        onSelect={onSelectItem}
        onInlineRename={onRenameItem}
        onDelete={onDeleteItem}
        baseIndent="pl-5"
        nestedIndent="pl-9"
        dimWhenInactive
      />
    )
  }

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto py-2">
        {collections.map((col, colIndex) => {
          const typeEntries = manifest[col.type] ?? []
          const isCollapsed = collapsedTypes.has(col.type)
          const sortableIds = flattenEntryIds(typeEntries)

          return (
            <div key={col.type}>
              {colIndex > 0 && <div className="border-t border-border my-1" />}
              <CollapsibleSectionHeader
                label={col.label}
                isCollapsed={isCollapsed}
                onToggle={() => toggleType(col.type)}
                onLabelClick={() => handleTypeClick(col.type)}
                actions={[
                  { icon: IconPlus, onClick: () => onAdd(col.type), title: `Add ${col.label.replace(/s$/, '').toLowerCase()}` },
                  { icon: IconFolderOpen, onClick: () => handleCreateGroup(col.type), title: `Add group` },
                ]}
              />

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
                        const children = entry.children ?? []
                        const childItems = children
                          .map(c => items.find(i => i.id === c.id))
                          .filter((i): i is ReferenceItem => i != null)
                        return (
                          <SortableGroupItem
                            key={entry.id}
                            id={entry.id}
                            title={entry.title ?? ''}
                            isCollapsed={collapsedGroups.has(entry.id)}
                            childIds={childItems.map(i => i.id)}
                            childCount={children.length}
                            childLabel="item"
                            onToggleCollapse={() => toggleGroup(entry.id)}
                            onRename={handleGroupRename}
                            onDelete={onDeleteGroup}
                            onAddChild={onAddItemInGroup}
                          >
                            {childItems.map(item => renderItem(item, true))}
                          </SortableGroupItem>
                        )
                      }
                      const item = items.find(i => i.id === entry.id)
                      if (!item) return null
                      return renderItem(item)
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

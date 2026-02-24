import type { ReferenceItem, ReferenceManifest, ReferenceManifestEntry } from '@endpapers/types'
import type { ReferenceActions } from '../ReferenceBoard/ReferenceBoardView'
import ReferenceItemCard from '../ReferenceItemCard/ReferenceItemCard'

interface Props {
  items: ReferenceItem[]
  collections: ReferenceManifest
  orderManifest: Record<string, ReferenceManifestEntry[]>
  filterType: string | null
  actions: ReferenceActions
  selectedItemId: string | null
  onSelectItem: (id: string | null) => void
}

export default function ReferenceGridView({
  items,
  collections,
  orderManifest,
  filterType,
  actions,
  selectedItemId,
  onSelectItem,
}: Props) {
  function handleToggle(id: string) {
    if (selectedItemId === id) {
      const item = items.find(n => n.id === id)
      if (item && !item.name) {
        actions.deleteItem(id)
      }
      onSelectItem(null)
    } else {
      onSelectItem(id)
    }
  }

  function renderCard(item: ReferenceItem) {
    const isExpanded = selectedItemId === item.id
    return (
      <div key={item.id} className={isExpanded ? 'col-span-full' : ''}>
        <ReferenceItemCard
          item={item}
          collection={collections.collections.find(c => c.type === item.type)}
          isExpanded={isExpanded}
          variant="grid"
          onToggleExpand={() => handleToggle(item.id)}
          onSave={actions.saveItem}
          onDelete={(id) => { actions.deleteItem(id); onSelectItem(null) }}
        />
      </div>
    )
  }

  // Order items by manifest within each collection type
  function getOrderedItems(type: string): ReferenceItem[] {
    const entries = orderManifest[type] ?? []
    const typeItems = items.filter(i => i.type === type)
    const itemMap = new Map(typeItems.map(i => [i.id, i]))
    const ordered: ReferenceItem[] = []
    for (const entry of entries) {
      if (entry.type === 'item') {
        const item = itemMap.get(entry.id)
        if (item) ordered.push(item)
      } else if (entry.type === 'group' && entry.children) {
        for (const child of entry.children) {
          const item = itemMap.get(child.id)
          if (item) ordered.push(item)
        }
      }
    }
    // Add any items not in manifest (shouldn't happen, but safety)
    for (const item of typeItems) {
      if (!ordered.find(o => o.id === item.id)) ordered.push(item)
    }
    return ordered
  }

  // Build sections with group sub-headings
  function renderTypeSection(type: string) {
    const entries = orderManifest[type] ?? []
    const col = collections.collections.find(c => c.type === type)
    if (!col) return null
    const typeItems = items.filter(i => i.type === type)
    if (typeItems.length === 0) return null
    const itemMap = new Map(typeItems.map(i => [i.id, i]))

    const sections: React.ReactNode[] = []
    let currentBatch: ReferenceItem[] = []

    function flushBatch() {
      if (currentBatch.length === 0) return
      sections.push(
        <div key={`batch-${sections.length}`} className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mb-4">
          {currentBatch.map(item => renderCard(item))}
        </div>,
      )
      currentBatch = []
    }

    for (const entry of entries) {
      if (entry.type === 'item') {
        const item = itemMap.get(entry.id)
        if (item) currentBatch.push(item)
      } else if (entry.type === 'group' && entry.children) {
        flushBatch()
        const groupItems = entry.children
          .map(c => itemMap.get(c.id))
          .filter((i): i is ReferenceItem => i != null)
        if (groupItems.length > 0) {
          sections.push(
            <div key={entry.id}>
              <h4 className="text-[0.75rem] font-medium text-text-placeholder mb-2 mt-2">
                {entry.title || 'Group'}
              </h4>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mb-4">
                {groupItems.map(item => renderCard(item))}
              </div>
            </div>,
          )
        }
      }
    }
    flushBatch()

    return (
      <div key={col.type} className="mb-8">
        <h3 className="text-[0.8125rem] font-semibold text-text-secondary uppercase tracking-wider mb-3">
          {col.label}
        </h3>
        {sections}
      </div>
    )
  }

  // Filtered mode: single type, manifest-ordered
  if (filterType) {
    const ordered = getOrderedItems(filterType)
    if (ordered.length === 0) {
      return (
        <main className="flex-1 overflow-y-auto bg-bg">
          <div className="h-full flex items-center justify-center">
            <p className="text-[0.9375rem] text-text-secondary">No items of this type yet</p>
          </div>
        </main>
      )
    }
    return (
      <main className="flex-1 overflow-y-auto bg-bg p-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {ordered.map(item => renderCard(item))}
        </div>
      </main>
    )
  }

  // All types
  if (items.length === 0) {
    return (
      <main className="flex-1 overflow-y-auto bg-bg">
        <div className="h-full flex items-center justify-center">
          <p className="text-[0.9375rem] text-text-secondary">No items yet</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto bg-bg p-6">
      {collections.collections.map(col => renderTypeSection(col.type))}
    </main>
  )
}

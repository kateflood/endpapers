import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { generateId } from '@endpapers/utils'
import type { SectionManifestEntry } from '@endpapers/types'
import { useProject } from '../../contexts/ProjectContext'
import { createSectionFile, deleteSectionFile } from '../../fs/projectFs'
import { IconChevronRight } from '../icons'
import SectionItem from './SectionItem'
import GroupItem from './GroupItem'

// ---------------------------------------------------------------------------
// Pure section-manifest helpers
// ---------------------------------------------------------------------------

function removeById(
  sections: SectionManifestEntry[],
  id: string,
): { sections: SectionManifestEntry[]; removed: SectionManifestEntry | null } {
  let removed: SectionManifestEntry | null = null
  const result = sections
    .map(entry => {
      if (entry.id === id) {
        removed = entry
        return null
      }
      if (entry.type === 'group' && entry.children) {
        const childIdx = entry.children.findIndex(c => c.id === id)
        if (childIdx !== -1) {
          removed = entry.children[childIdx]
          return { ...entry, children: entry.children.filter(c => c.id !== id) }
        }
      }
      return entry
    })
    .filter((e): e is SectionManifestEntry => e !== null)
  return { sections: result, removed }
}

function updateTitle(
  sections: SectionManifestEntry[],
  id: string,
  title: string,
): SectionManifestEntry[] {
  return sections.map(entry => {
    if (entry.id === id) return { ...entry, title }
    if (entry.type === 'group' && entry.children) {
      return { ...entry, children: entry.children.map(c => (c.id === id ? { ...c, title } : c)) }
    }
    return entry
  })
}

function insertAtEnd(
  sections: SectionManifestEntry[],
  entry: SectionManifestEntry,
): SectionManifestEntry[] {
  return [...sections, entry]
}

function insertInGroup(
  sections: SectionManifestEntry[],
  groupId: string,
  entry: SectionManifestEntry,
): SectionManifestEntry[] {
  return sections.map(s =>
    s.id === groupId && s.type === 'group'
      ? { ...s, children: [...(s.children ?? []), entry] }
      : s,
  )
}

function insertAfterActive(
  sections: SectionManifestEntry[],
  entry: SectionManifestEntry,
  activeSectionId: string | null,
): SectionManifestEntry[] {
  if (!activeSectionId) return insertAtEnd(sections, entry)

  for (const s of sections) {
    if (s.type === 'group' && s.children?.some(c => c.id === activeSectionId)) {
      const children = s.children ?? []
      const idx = children.findIndex(c => c.id === activeSectionId)
      const newChildren = [...children.slice(0, idx + 1), entry, ...children.slice(idx + 1)]
      return sections.map(item => (item.id === s.id ? { ...item, children: newChildren } : item))
    }
  }

  const idx = sections.findIndex(s => s.id === activeSectionId)
  if (idx === -1) return insertAtEnd(sections, entry)
  return [...sections.slice(0, idx + 1), entry, ...sections.slice(idx + 1)]
}

// ---------------------------------------------------------------------------
// Location helpers for four-zone DnD
// ---------------------------------------------------------------------------

type Zone = 'draft' | 'drawer' | 'front' | 'back'
type ItemLocation = { zone: Zone; container: 'root' | string }

function findLocation(
  draft: SectionManifestEntry[],
  drawer: SectionManifestEntry[],
  front: SectionManifestEntry[],
  back: SectionManifestEntry[],
  id: string,
): ItemLocation | null {
  for (const entry of draft) {
    if (entry.id === id) return { zone: 'draft', container: 'root' }
    if (entry.type === 'group' && entry.children?.some(c => c.id === id))
      return { zone: 'draft', container: entry.id }
  }
  for (const entry of drawer) {
    if (entry.id === id) return { zone: 'drawer', container: 'root' }
    if (entry.type === 'group' && entry.children?.some(c => c.id === id))
      return { zone: 'drawer', container: entry.id }
  }
  for (const entry of front) {
    if (entry.id === id) return { zone: 'front', container: 'root' }
  }
  for (const entry of back) {
    if (entry.id === id) return { zone: 'back', container: 'root' }
  }
  return null
}

function findItemZone(
  draft: SectionManifestEntry[],
  drawer: SectionManifestEntry[],
  front: SectionManifestEntry[],
  back: SectionManifestEntry[],
  id: string,
): Zone | null {
  const loc = findLocation(draft, drawer, front, back, id)
  return loc?.zone ?? null
}

function getZoneArray(
  zone: Zone,
  sections: SectionManifestEntry[],
  extras: SectionManifestEntry[],
  front: SectionManifestEntry[],
  back: SectionManifestEntry[],
): SectionManifestEntry[] {
  if (zone === 'draft') return sections
  if (zone === 'drawer') return extras
  if (zone === 'front') return front
  return back
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SectionsSidebar() {
  const {
    project, handle, activeSectionId, setActiveSectionId,
    updateSections, updateExtras, updateBothManifests,
    updateFrontMatter, updateBackMatter, updateAllManifests,
  } = useProject()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [collapsedZones, setCollapsedZones] = useState<Set<Zone>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!project || !handle) return null

  const sections = project.sections
  const extras = project.extras ?? []
  const front = project.frontMatter ?? []
  const back = project.backMatter ?? []

  const draftTopLevelIds = sections.map(s => s.id)
  const drawerTopLevelIds = extras.map(s => s.id)
  const frontTopLevelIds = front.map(s => s.id)
  const backTopLevelIds = back.map(s => s.id)

  async function saveZone(zone: Zone, arr: SectionManifestEntry[]) {
    if (zone === 'draft') await updateSections(arr)
    else if (zone === 'drawer') await updateExtras(arr)
    else if (zone === 'front') await updateFrontMatter(arr)
    else await updateBackMatter(arr)
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async function handleAddSection(zone: Zone) {
    const arr = getZoneArray(zone, sections, extras, front, back)
    const id = generateId()
    const filename = id + '.md'
    await createSectionFile(handle!, filename)
    const entry: SectionManifestEntry = { id, title: 'Untitled Section', type: 'section', file: filename }
    const next = zone === 'draft'
      ? insertAfterActive(arr, entry, activeSectionId)
      : insertAtEnd(arr, entry)
    await saveZone(zone, next)
    setActiveSectionId(id)
  }

  async function handleAddGroup(zone: 'draft' | 'drawer') {
    const arr = zone === 'draft' ? sections : extras
    const id = generateId()
    const entry: SectionManifestEntry = { id, title: 'Untitled Group', type: 'group', children: [] }
    const next = insertAtEnd(arr, entry)
    if (zone === 'draft') await updateSections(next)
    else await updateExtras(next)
  }

  async function handleAddSectionInGroup(groupId: string) {
    const zone = findItemZone(sections, extras, front, back, groupId)
    if (zone !== 'draft' && zone !== 'drawer') return
    const arr = zone === 'draft' ? sections : extras
    const id = generateId()
    const filename = id + '.md'
    await createSectionFile(handle!, filename)
    const entry: SectionManifestEntry = { id, title: 'Untitled Section', type: 'section', file: filename }
    const next = insertInGroup(arr, groupId, entry)
    await saveZone(zone, next)
    setActiveSectionId(id)
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.delete(groupId)
      return next
    })
  }

  async function handleRenameSection(id: string, title: string) {
    const zone = findItemZone(sections, extras, front, back, id)
    if (!zone) return
    await saveZone(zone, updateTitle(getZoneArray(zone, sections, extras, front, back), id, title))
  }

  async function handleRenameGroup(id: string, title: string) {
    const zone = findItemZone(sections, extras, front, back, id)
    if (!zone) return
    await saveZone(zone, updateTitle(getZoneArray(zone, sections, extras, front, back), id, title))
  }

  async function handleDeleteSection(id: string) {
    const zone = findItemZone(sections, extras, front, back, id)
    if (!zone) return
    const arr = getZoneArray(zone, sections, extras, front, back)
    const entry = arr.flatMap(s => (s.type === 'group' ? (s.children ?? []) : [s])).find(s => s.id === id)
    const { sections: next } = removeById(arr, id)
    if (entry?.file) {
      try { await deleteSectionFile(handle!, entry.file) } catch { /* file may not exist */ }
    }
    await saveZone(zone, next)
    if (activeSectionId === id) setActiveSectionId(null)
  }

  async function handleDeleteGroup(id: string) {
    const zone = findItemZone(sections, extras, front, back, id)
    if (!zone) return
    const arr = getZoneArray(zone, sections, extras, front, back)
    const group = arr.find(s => s.id === id)
    const { sections: next } = removeById(arr, id)
    if (group?.children) {
      for (const child of group.children) {
        if (child.file) {
          try { await deleteSectionFile(handle!, child.file) } catch { /* file may not exist */ }
        }
        if (activeSectionId === child.id) setActiveSectionId(null)
      }
    }
    await saveZone(zone, next)
  }

  // -------------------------------------------------------------------------
  // Drag-and-drop
  // -------------------------------------------------------------------------

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    const activeLoc = findLocation(sections, extras, front, back, activeId)
    const overLoc = findLocation(sections, extras, front, back, overId)
    if (!activeLoc || !overLoc) return

    // Guard: groups can't be dragged into front/back matter zones
    const activeEntry = sections.concat(extras).find(s => s.id === activeId)
    if (activeEntry?.type === 'group' && (overLoc.zone === 'front' || overLoc.zone === 'back')) return

    const sameZone = activeLoc.zone === overLoc.zone

    if (sameZone) {
      const arr = getZoneArray(activeLoc.zone, sections, extras, front, back)

      if (activeLoc.container === overLoc.container) {
        if (activeLoc.container === 'root') {
          const oldIndex = arr.findIndex(s => s.id === activeId)
          const newIndex = arr.findIndex(s => s.id === overId)
          await saveZone(activeLoc.zone, arrayMove(arr, oldIndex, newIndex))
        } else {
          await saveZone(activeLoc.zone, arr.map(s => {
            if (s.id !== activeLoc.container || s.type !== 'group') return s
            const children = s.children ?? []
            const oldIndex = children.findIndex(c => c.id === activeId)
            const newIndex = children.findIndex(c => c.id === overId)
            return { ...s, children: arrayMove(children, oldIndex, newIndex) }
          }))
        }
      } else {
        // Cross-container in same zone
        const { sections: withoutActive, removed } = removeById(arr, activeId)
        if (!removed) return
        if (overLoc.container === 'root') {
          const overIndex = withoutActive.findIndex(s => s.id === overId)
          const insertion = overIndex === -1
            ? [...withoutActive, removed]
            : [...withoutActive.slice(0, overIndex + 1), removed, ...withoutActive.slice(overIndex + 1)]
          await saveZone(activeLoc.zone, insertion)
        } else {
          await saveZone(activeLoc.zone, withoutActive.map(s => {
            if (s.id !== overLoc.container || s.type !== 'group') return s
            const children = s.children ?? []
            const overIndex = children.findIndex(c => c.id === overId)
            const newChildren = overIndex === -1
              ? [...children, removed]
              : [...children.slice(0, overIndex + 1), removed, ...children.slice(overIndex + 1)]
            return { ...s, children: newChildren }
          }))
        }
      }
    } else {
      // Cross-zone move
      const sourceArr = getZoneArray(activeLoc.zone, sections, extras, front, back)
      const targetArr = getZoneArray(overLoc.zone, sections, extras, front, back)

      const { sections: newSource, removed } = removeById(sourceArr, activeId)
      if (!removed) return

      let newTarget: SectionManifestEntry[]
      if (overLoc.container === 'root') {
        const overIndex = targetArr.findIndex(s => s.id === overId)
        newTarget = overIndex === -1
          ? [...targetArr, removed]
          : [...targetArr.slice(0, overIndex + 1), removed, ...targetArr.slice(overIndex + 1)]
      } else {
        newTarget = targetArr.map(s => {
          if (s.id !== overLoc.container || s.type !== 'group') return s
          const children = s.children ?? []
          const overIndex = children.findIndex(c => c.id === overId)
          const newChildren = overIndex === -1
            ? [...children, removed]
            : [...children.slice(0, overIndex + 1), removed, ...children.slice(overIndex + 1)]
          return { ...s, children: newChildren }
        })
      }

      const newSections = activeLoc.zone === 'draft' ? newSource : overLoc.zone === 'draft' ? newTarget : sections
      const newExtras = activeLoc.zone === 'drawer' ? newSource : overLoc.zone === 'drawer' ? newTarget : extras
      const newFront = activeLoc.zone === 'front' ? newSource : overLoc.zone === 'front' ? newTarget : front
      const newBack = activeLoc.zone === 'back' ? newSource : overLoc.zone === 'back' ? newTarget : back

      const onlyDraftDrawer = (activeLoc.zone === 'draft' || activeLoc.zone === 'drawer') &&
        (overLoc.zone === 'draft' || overLoc.zone === 'drawer')
      if (onlyDraftDrawer) {
        await updateBothManifests(newSections, newExtras)
      } else {
        await updateAllManifests(newSections, newExtras, newFront, newBack)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Zone label row
  // -------------------------------------------------------------------------

  function toggleZone(zone: Zone) {
    setCollapsedZones(prev => {
      const next = new Set(prev)
      if (next.has(zone)) next.delete(zone)
      else next.add(zone)
      return next
    })
  }

  function ZoneHeader({ label, zone, allowGroups = false }: { label: string; zone: Zone; allowGroups?: boolean }) {
    const isCollapsed = collapsedZones.has(zone)
    return (
      <div className="flex items-center px-3 h-8 shrink-0 gap-1">
        <button
          className="w-5 h-5 flex items-center justify-center shrink-0 text-text-placeholder -ml-1"
          onClick={() => toggleZone(zone)}
        >
          <IconChevronRight
            size={12}
            className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
          />
        </button>
        <span
          className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary flex-1 cursor-pointer"
          onClick={() => toggleZone(zone)}
        >
          {label}
        </span>
        <button
          className="h-6 px-1.5 rounded-sm text-[0.75rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
          onClick={() => { void handleAddSection(zone) }}
          title={`Add section to ${label}`}
        >
          + Section
        </button>
        {allowGroups && (
          <button
            className="h-6 px-1.5 rounded-sm text-[0.75rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
            onClick={() => { void handleAddGroup(zone as 'draft' | 'drawer') }}
            title={`Add group to ${label}`}
          >
            + Group
          </button>
        )}
      </div>
    )
  }

  function renderEntry(entry: SectionManifestEntry) {
    return entry.type === 'group' ? (
      <GroupItem
        key={entry.id}
        group={entry}
        isCollapsed={collapsedGroups.has(entry.id)}
        activeSectionId={activeSectionId}
        onToggleCollapse={id =>
          setCollapsedGroups(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
          })
        }
        onSelectSection={setActiveSectionId}
        onRenameSection={handleRenameSection}
        onDeleteSection={handleDeleteSection}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onAddSectionInGroup={handleAddSectionInGroup}
      />
    ) : (
      <SectionItem
        key={entry.id}
        section={entry}
        isActive={activeSectionId === entry.id}
        onSelect={setActiveSectionId}
        onRename={handleRenameSection}
        onDelete={handleDeleteSection}
      />
    )
  }

  function renderSection(entry: SectionManifestEntry) {
    return (
      <SectionItem
        key={entry.id}
        section={entry}
        isActive={activeSectionId === entry.id}
        onSelect={setActiveSectionId}
        onRename={handleRenameSection}
        onDelete={handleDeleteSection}
      />
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => { void handleDragEnd(event) }}>
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Project title + subtitle */}
        {(project.title || project.subtitle) && (
          <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            {project.title && (
              <div className="text-[0.875rem] font-semibold text-text truncate leading-snug">
                {project.title}
              </div>
            )}
            {project.subtitle && (
              <div className="text-[0.75rem] text-text-secondary mt-1 truncate leading-snug">
                {project.subtitle}
              </div>
            )}
          </div>
        )}

        {/* Single scrollable area */}
        <div className="flex-1 overflow-y-auto">

          {/* Draft zone */}
          <div className="py-1">
            <ZoneHeader label="Draft" zone="draft" allowGroups />
            {!collapsedZones.has('draft') && (
              <SortableContext items={draftTopLevelIds} strategy={verticalListSortingStrategy}>
                {sections.length === 0 && (
                  <p className="px-4 py-2 text-[0.8125rem] text-text-placeholder">No sections yet.</p>
                )}
                {sections.map(renderEntry)}
              </SortableContext>
            )}
          </div>

          {/* Drawer zone */}
          <div className="border-t border-border py-1">
            <ZoneHeader label="Drawer" zone="drawer" allowGroups />
            {!collapsedZones.has('drawer') && (
              <SortableContext items={drawerTopLevelIds} strategy={verticalListSortingStrategy}>
                {extras.length === 0 && (
                  <p className="px-4 py-2 text-[0.8125rem] text-text-placeholder">Drag sections here to set aside.</p>
                )}
                {extras.map(renderEntry)}
              </SortableContext>
            )}
          </div>

          {/* Front matter zone */}
          <div className="border-t border-border py-1">
            <ZoneHeader label="Front matter" zone="front" />
            {!collapsedZones.has('front') && (
              <SortableContext items={frontTopLevelIds} strategy={verticalListSortingStrategy}>
                {front.length === 0 && (
                  <p className="px-4 py-2 text-[0.8125rem] text-text-placeholder">Add front matter sections here.</p>
                )}
                {front.map(renderSection)}
              </SortableContext>
            )}
          </div>

          {/* Back matter zone */}
          <div className="border-t border-border py-1">
            <ZoneHeader label="Back matter" zone="back" />
            {!collapsedZones.has('back') && (
              <SortableContext items={backTopLevelIds} strategy={verticalListSortingStrategy}>
                {back.length === 0 && (
                  <p className="px-4 py-2 text-[0.8125rem] text-text-placeholder">Add back matter sections here.</p>
                )}
                {back.map(renderSection)}
              </SortableContext>
            )}
          </div>

        </div>

      </div>
    </DndContext>
  )
}

import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactFlowInstance } from '@xyflow/react'
import type { ReferenceItem, ReferenceManifest, ReferenceGraph, ReferenceManifestEntry } from '@endpapers/types'
import { generateId, todayISODate } from '@endpapers/utils'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { IconArrowLeft } from '../../components/icons'
import {
  readReferenceCollections,
  readAllReferenceItems,
  readReferenceGraph,
  readReferenceManifest,
  writeReferenceItem,
  deleteReferenceItem,
  writeReferenceGraph,
  writeReferenceManifest,
} from '../../fs/projectFs'
import ReferenceBoardView from '../../components/ReferenceBoard/ReferenceBoardView'
import type { ReferenceActions } from '../../components/ReferenceBoard/ReferenceBoardView'
import ReferenceGridView from '../../components/ReferenceGridView/ReferenceGridView'
import ReferenceSidebar from '../../components/ReferenceSidebar/ReferenceSidebar'

function viewportCenter(
  rfInstance: ReactFlowInstance | null,
  existing: ReferenceItem[],
): { x: number; y: number } {
  if (rfInstance) {
    const vp = rfInstance.getViewport()
    // Estimate center of the visible board area
    const cx = Math.round((-vp.x + window.innerWidth * 0.55) / vp.zoom)
    const cy = Math.round((-vp.y + window.innerHeight * 0.45) / vp.zoom)
    // Small offset so consecutive items don't stack exactly
    const offset = (existing.length % 5) * 30
    return { x: cx + offset, y: cy + offset }
  }
  // Fallback: grid layout when board isn't mounted
  const n = existing.length
  return { x: 40 + (n % 5) * 216, y: 40 + Math.floor(n / 5) * 184 }
}

export default function ReferenceScreen() {
  const navigate = useNavigate()
  const { project, handle } = useProject()
  const { showToast } = useToast()

  function safeSave(p: Promise<void>) {
    p.catch(() => showToast('Failed to save reference data.', 'error'))
  }

  // ── Core data state ─────────────────────────────────────────────────────

  const [collections, setCollections] = useState<ReferenceManifest | null>(null)
  const [items, setItems] = useState<ReferenceItem[]>([])
  const [graph, setGraph] = useState<ReferenceGraph>({ edges: [], annotations: [] })
  const [manifest, setManifest] = useState<Record<string, ReferenceManifestEntry[]>>({})

  // ── UI state ────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<'board' | 'grid'>('board')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // ── Refs ────────────────────────────────────────────────────────────────

  const itemsRef = useRef<ReferenceItem[]>([])
  const graphRef = useRef<ReferenceGraph>({ edges: [], annotations: [] })
  const manifestRef = useRef<Record<string, ReferenceManifestEntry[]>>({})
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null)
  itemsRef.current = items
  graphRef.current = graph
  manifestRef.current = manifest
  handleRef.current = handle

  // ── Redirect if no project ──────────────────────────────────────────────

  useEffect(() => {
    if (!project) navigate('/', { replace: true })
  }, [project, navigate])

  // ── Load data ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!handle) return
    void Promise.all([
      readReferenceCollections(handle),
      readAllReferenceItems(handle),
      readReferenceGraph(handle),
    ]).then(async ([col, loadedItems, g]) => {
      setCollections(col)
      setItems(loadedItems)
      setGraph(g)
      const m = await readReferenceManifest(handle, loadedItems)
      setManifest(m)
    })
  }, [handle])

  // ── Actions (shared across both views) ──────────────────────────────────

  const actions: ReferenceActions = {
    addItem(type: string): ReferenceItem {
      const sameType = itemsRef.current.filter(n => n.type === type)
      const col = collections?.collections.find(c => c.type === type)
      const emptyFields = Object.fromEntries((col?.fields ?? []).map(f => [f.key, '']))
      const newItem: ReferenceItem = {
        id: generateId(),
        type,
        name: '',
        fields: emptyFields,
        position: viewportCenter(rfInstanceRef.current, sameType),
        createdAt: todayISODate(),
        updatedAt: todayISODate(),
      }
      setItems(prev => [...prev, newItem])
      // Add to manifest
      const updatedManifest = { ...manifestRef.current }
      if (!updatedManifest[type]) updatedManifest[type] = []
      updatedManifest[type] = [...updatedManifest[type], { id: newItem.id, type: 'item' }]
      manifestRef.current = updatedManifest
      setManifest(updatedManifest)
      if (handleRef.current) {
        safeSave(writeReferenceItem(handleRef.current, newItem))
        safeSave(writeReferenceManifest(handleRef.current, updatedManifest))
      }
      return newItem
    },

    saveItem(updated: ReferenceItem) {
      setItems(prev => prev.map(n => n.id === updated.id ? updated : n))
      if (handleRef.current) safeSave(writeReferenceItem(handleRef.current, updated))
    },

    deleteItem(id: string) {
      setItems(prev => prev.filter(n => n.id !== id))
      // Remove from manifest
      const updatedManifest = removeFromManifest(manifestRef.current, id)
      manifestRef.current = updatedManifest
      setManifest(updatedManifest)
      // Remove edges
      const updatedGraph: ReferenceGraph = {
        ...graphRef.current,
        edges: graphRef.current.edges.filter(e => e.source !== id && e.target !== id),
      }
      graphRef.current = updatedGraph
      setGraph(updatedGraph)
      if (handleRef.current) {
        safeSave(deleteReferenceItem(handleRef.current, id))
        safeSave(writeReferenceGraph(handleRef.current, updatedGraph))
        safeSave(writeReferenceManifest(handleRef.current, updatedManifest))
      }
    },

    updateGraph(updatedGraph: ReferenceGraph) {
      graphRef.current = updatedGraph
      setGraph(updatedGraph)
      if (handleRef.current) safeSave(writeReferenceGraph(handleRef.current, updatedGraph))
    },
  }

  // ── Manifest update handler ─────────────────────────────────────────────

  const handleManifestUpdate = useCallback((updated: Record<string, ReferenceManifestEntry[]>) => {
    manifestRef.current = updated
    setManifest(updated)
    if (handleRef.current) safeSave(writeReferenceManifest(handleRef.current, updated))
  }, [])

  // ── Sidebar navigation ─────────────────────────────────────────────────

  const handleFitType = useCallback((type: string) => {
    const ids = itemsRef.current.filter(n => n.type === type).map(n => ({ id: n.id }))
    if (ids.length > 0) rfInstanceRef.current?.fitView({ nodes: ids, padding: 0.2, duration: 300 })
  }, [])

  const handleSelectItem = useCallback((id: string | null) => {
    setSelectedItemId(id)
  }, [])

  // ── Group actions ──────────────────────────────────────────────────────

  const handleDeleteGroup = useCallback((groupId: string) => {
    const m = manifestRef.current
    for (const type of Object.keys(m)) {
      const entries = m[type]
      const groupIdx = entries.findIndex(e => e.id === groupId && e.type === 'group')
      if (groupIdx === -1) continue
      const group = entries[groupIdx]
      // Delete child items
      for (const child of group.children ?? []) {
        actions.deleteItem(child.id)
      }
      // Remove the group from manifest
      const updated = { ...manifestRef.current }
      updated[type] = [
        ...updated[type].slice(0, groupIdx),
        ...updated[type].slice(groupIdx + 1),
      ]
      handleManifestUpdate(updated)
      break
    }
    setSelectedItemId(null)
  }, [actions, handleManifestUpdate])

  const handleAddItemInGroup = useCallback((groupId: string) => {
    const m = manifestRef.current
    for (const type of Object.keys(m)) {
      const group = m[type].find(e => e.id === groupId && e.type === 'group')
      if (!group) continue
      const newItem = actions.addItem(type)
      // Move the new item from top-level into the group's children
      const updated = { ...manifestRef.current }
      // Remove it from top-level (addItem appended it there)
      updated[type] = updated[type].filter(e => e.id !== newItem.id)
      // Add it as a child of the group
      updated[type] = updated[type].map(e =>
        e.id === groupId
          ? { ...e, children: [...(e.children ?? []), { id: newItem.id, type: 'item' as const }] }
          : e,
      )
      handleManifestUpdate(updated)
      setSelectedItemId(newItem.id)
      break
    }
  }, [actions, handleManifestUpdate])

  // ── Render ─────────────────────────────────────────────────────────────

  if (!project || !collections) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-[0.9375rem] text-text-placeholder">Loading…</p>
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-bg text-text${project?.settings?.darkMode ? ' dark' : ''}`}>
      {/* Header */}
      <header className="flex items-center px-4 h-12 border-b border-border bg-surface shrink-0 gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
          onClick={() => navigate('/editor')}
          aria-label="Back to editor"
        >
          <IconArrowLeft size={16} />
        </button>
        <span className="text-[0.9375rem] font-medium text-text truncate">
          Reference
        </span>

        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            className={`px-3 h-7 rounded-sm text-[0.8125rem] transition-colors cursor-pointer ${
              activeTab === 'board'
                ? 'text-text bg-active'
                : 'text-text-secondary hover:text-text hover:bg-hover'
            }`}
            onClick={() => setActiveTab('board')}
          >
            Board
          </button>
          <button
            className={`px-3 h-7 rounded-sm text-[0.8125rem] transition-colors cursor-pointer ${
              activeTab === 'grid'
                ? 'text-text bg-active'
                : 'text-text-secondary hover:text-text hover:bg-hover'
            }`}
            onClick={() => setActiveTab('grid')}
          >
            Grid
          </button>
        </div>

      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <ReferenceSidebar
          collections={collections.collections}
          items={items}
          manifest={manifest}
          activeTab={activeTab}
          selectedItemId={selectedItemId}
          onSelectItem={handleSelectItem}
          onRenameItem={(id) => setSelectedItemId(id)}
          onDeleteItem={(id) => { actions.deleteItem(id); setSelectedItemId(null) }}
          onAdd={(type) => {
            const newItem = actions.addItem(type)
            setSelectedItemId(newItem.id)
          }}
          onAddItemInGroup={handleAddItemInGroup}
          onDeleteGroup={handleDeleteGroup}
          onFitType={handleFitType}
          onFilterType={setFilterType}
          onManifestUpdate={handleManifestUpdate}
        />

        {activeTab === 'board' ? (
          <ReferenceBoardView
            items={items}
            graph={graph}
            manifest={collections}
            actions={actions}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
            rfInstanceRef={rfInstanceRef}
          />
        ) : (
          <ReferenceGridView
            items={items}
            collections={collections}
            orderManifest={manifest}
            filterType={filterType}
            actions={actions}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
          />
        )}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────

function removeFromManifest(
  manifest: Record<string, ReferenceManifestEntry[]>,
  itemId: string,
): Record<string, ReferenceManifestEntry[]> {
  const updated: Record<string, ReferenceManifestEntry[]> = {}
  for (const [type, entries] of Object.entries(manifest)) {
    updated[type] = entries
      .filter(e => e.id !== itemId)
      .map(e => {
        if (e.type === 'group' && e.children) {
          return { ...e, children: e.children.filter(c => c.id !== itemId) }
        }
        return e
      })
  }
  return updated
}

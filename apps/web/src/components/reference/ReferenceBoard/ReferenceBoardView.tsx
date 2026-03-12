import { useEffect, useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionMode,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { ReferenceItem, ReferenceManifest, ReferenceGraph, BoardAnnotation } from '@endpapers/types'
import { generateId } from '@endpapers/utils'
import ReferenceItemCard from '../ReferenceItemCard'
import type { ReferenceItemCardProps } from '../ReferenceItemCard'
import ReferenceEdgeComponent from './ReferenceEdge'
import RectangleNode from './RectangleNode'
import AnnotationNode from './AnnotationNode'
import { IconSquare, IconStickyNote, IconSearch, IconClose } from '../../shared/icons'

// ── Node wrapper for ReactFlow ────────────────────────────────────────────

import type { NodeProps } from '@xyflow/react'

type BoardCardData = {
  item: ReferenceItem
  collection: ReferenceItemCardProps['collection']
  isExpanded: boolean
  isNew: boolean
  onSave: (updated: ReferenceItem) => void
  onDelete: (id: string) => void
  onCollapse: () => void
}

type BoardCardNode = Node<BoardCardData>

function BoardCardWrapper({ data, selected }: NodeProps<BoardCardNode>) {
  return (
    <ReferenceItemCard
      item={data.item}
      collection={data.collection}
      isExpanded={data.isExpanded}
      isNew={data.isNew}
      variant="board"
      selected={selected}
      onToggleExpand={data.onCollapse}
      onSave={data.onSave}
      onDelete={data.onDelete}
    />
  )
}

// ── Constants ─────────────────────────────────────────────────────────────

const NODE_TYPES: NodeTypes = {
  refCard: BoardCardWrapper as NodeTypes[string],
  rectangle: RectangleNode as NodeTypes[string],
  annotation: AnnotationNode as NodeTypes[string],
}

const EDGE_TYPES: EdgeTypes = {
  refEdge: ReferenceEdgeComponent as EdgeTypes[string],
}

const EDGE_DEFAULTS = {
  type: 'refEdge' as const,
  style: { stroke: 'var(--color-border)', strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-border)', width: 12, height: 12 },
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildRfEdges(
  graph: ReferenceGraph,
  items: ReferenceItem[],
  onLabelSave: (edgeId: string, label: string) => void,
  onDelete: (edgeId: string) => void,
): Edge[] {
  return graph.edges.map(e => ({
    ...e,
    ...EDGE_DEFAULTS,
    data: {
      label: e.label,
      sourceName: items.find(n => n.id === e.source)?.name ?? '',
      targetName: items.find(n => n.id === e.target)?.name ?? '',
      onLabelSave,
      onDelete,
    },
  }))
}

// ── Actions interface ─────────────────────────────────────────────────────

export interface ReferenceActions {
  addItem: (type: string) => ReferenceItem
  saveItem: (updated: ReferenceItem) => void
  deleteItem: (id: string) => void
  updateGraph: (graph: ReferenceGraph) => void
}

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  items: ReferenceItem[]
  graph: ReferenceGraph
  manifest: ReferenceManifest
  actions: ReferenceActions
  selectedItemId: string | null
  onSelectItem: (id: string | null) => void
  rfInstanceRef: React.MutableRefObject<ReactFlowInstance | null>
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ReferenceBoardView({
  items,
  graph,
  manifest,
  actions,
  selectedItemId,
  onSelectItem,
  rfInstanceRef,
}: Props) {
  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState<Edge>([])
  const [, setSelectedNodes] = useState<Node[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const itemsRef = useRef(items)
  const graphRef = useRef(graph)
  const actionsRef = useRef(actions)
  const newItemIdRef = useRef<string | null>(null)
  const edgeLabelSaveRef = useRef<(edgeId: string, label: string) => void>(() => {})
  const edgeDeleteRef = useRef<(edgeId: string) => void>(() => {})
  itemsRef.current = items
  graphRef.current = graph
  actionsRef.current = actions

  // ── Stable save/delete callbacks for node data ──────────────────────────

  const handleItemSaveRef = useRef<(updated: ReferenceItem) => void>(() => {})
  handleItemSaveRef.current = (updated: ReferenceItem) => {
    actionsRef.current.saveItem(updated)
    setRfNodes(prev => prev.map(n =>
      n.id === updated.id ? { ...n, data: { ...n.data, item: updated } } : n,
    ))
  }

  const handleItemDeleteRef = useRef<(id: string) => void>(() => {})
  handleItemDeleteRef.current = (id: string) => {
    if (id === newItemIdRef.current) newItemIdRef.current = null
    actionsRef.current.deleteItem(id)
    setRfNodes(prev => prev.filter(n => n.id !== id))
    setRfEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    onSelectItem(null)
  }

  const handleCollapseRef = useRef<() => void>(() => {})
  handleCollapseRef.current = () => {
    if (newItemIdRef.current) {
      const newItem = itemsRef.current.find(n => n.id === newItemIdRef.current)
      if (newItem && !newItem.name) {
        handleItemDeleteRef.current(newItemIdRef.current)
        return
      }
      newItemIdRef.current = null
    }
    onSelectItem(null)
  }

  // ── Annotation callbacks (via refs for stability) ──────────────────────

  const annotationTextChangeRef = useRef<(id: string, text: string) => void>(() => {})
  annotationTextChangeRef.current = (id: string, text: string) => {
    const updatedGraph: ReferenceGraph = {
      ...graphRef.current,
      annotations: graphRef.current.annotations.map(a =>
        a.id === id ? { ...a, text } : a,
      ),
    }
    actionsRef.current.updateGraph(updatedGraph)
    setRfNodes(prev => prev.map(n =>
      n.id === id ? { ...n, data: { ...n.data, text } } : n,
    ))
  }

  const annotationDeleteRef = useRef<(id: string) => void>(() => {})
  annotationDeleteRef.current = (id: string) => {
    const updatedGraph: ReferenceGraph = {
      ...graphRef.current,
      annotations: graphRef.current.annotations.filter(a => a.id !== id),
    }
    actionsRef.current.updateGraph(updatedGraph)
    setRfNodes(prev => prev.filter(n => n.id !== id))
  }

  // ── Build RF nodes from data ────────────────────────────────────────────

  function buildRfNodes(): Node[] {
    const itemNodes: Node[] = items.map(n => ({
      id: n.id,
      type: 'refCard' as const,
      position: n.position,
      data: {
        item: n,
        collection: manifest.collections.find(c => c.type === n.type),
        isExpanded: selectedItemId === n.id,
        isNew: newItemIdRef.current === n.id,
        onSave: handleItemSaveRef.current,
        onDelete: handleItemDeleteRef.current,
        onCollapse: handleCollapseRef.current,
      },
      deletable: false,
    }))

    const annotationNodes: Node[] = graph.annotations.map(a => ({
      id: a.id,
      type: a.kind === 'rectangle' ? 'rectangle' as const : 'annotation' as const,
      position: a.position,
      ...(a.kind === 'rectangle' && a.size ? { style: { width: a.size.width, height: a.size.height } } : {}),
      data: {
        text: a.text,
        color: a.color ?? (a.kind === 'rectangle' ? 'gray' : 'yellow'),
        onTextChange: annotationTextChangeRef.current,
        onDelete: annotationDeleteRef.current,
      },
      deletable: false,
    }))

    return [...annotationNodes, ...itemNodes]
  }

  // ── Initial build ───────────────────────────────────────────────────────

  useEffect(() => {
    setRfNodes(buildRfNodes())
    setRfEdges(buildRfEdges(graph, items, edgeLabelSaveRef.current, edgeDeleteRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Update node data when selectedItemId or items change ────────────────

  useEffect(() => {
    setRfNodes(prev => {
      const itemIds = new Set(items.map(i => i.id))
      const existingRefIds = new Set(prev.filter(n => n.type === 'refCard').map(n => n.id))

      // Update existing nodes + remove deleted items
      let next = prev
        .filter(n => n.type !== 'refCard' || itemIds.has(n.id))
        .map(n => {
          if (n.type !== 'refCard') return n
          const item = items.find(i => i.id === n.id)
          if (!item) return n
          return {
            ...n,
            data: {
              ...n.data,
              item,
              isExpanded: selectedItemId === n.id,
              isNew: newItemIdRef.current === n.id,
              onSave: handleItemSaveRef.current,
              onDelete: handleItemDeleteRef.current,
              onCollapse: handleCollapseRef.current,
            },
          }
        })

      // Add nodes for new items
      for (const item of items) {
        if (!existingRefIds.has(item.id)) {
          next = [...next, {
            id: item.id,
            type: 'refCard' as const,
            position: item.position,
            data: {
              item,
              collection: manifest.collections.find(c => c.type === item.type),
              isExpanded: selectedItemId === item.id,
              isNew: newItemIdRef.current === item.id,
              onSave: handleItemSaveRef.current,
              onDelete: handleItemDeleteRef.current,
              onCollapse: handleCollapseRef.current,
            },
            deletable: false,
          }]
        }
      }

      return next
    })
  }, [selectedItemId, items, manifest, setRfNodes])

  // ── Sync annotation nodes when graph changes ───────────────────────────

  useEffect(() => {
    setRfNodes(prev => {
      const annotationIds = new Set(graph.annotations.map(a => a.id))
      // Remove annotation nodes that no longer exist
      let next = prev.filter(n => (n.type !== 'rectangle' && n.type !== 'annotation') || annotationIds.has(n.id))
      // Update data on existing annotation nodes
      next = next.map(n => {
        if (n.type !== 'rectangle' && n.type !== 'annotation') return n
        const ann = graph.annotations.find(a => a.id === n.id)
        if (!ann) return n
        return {
          ...n,
          data: {
            ...n.data,
            text: ann.text,
            color: ann.color ?? (ann.kind === 'rectangle' ? 'gray' : 'yellow'),
            onTextChange: annotationTextChangeRef.current,
            onDelete: annotationDeleteRef.current,
          },
        }
      })
      return next
    })
  }, [graph.annotations, setRfNodes])

  // ── Edge callbacks ──────────────────────────────────────────────────────

  edgeLabelSaveRef.current = (edgeId: string, label: string) => {
    const graphEdge = graphRef.current.edges.find(e => e.id === edgeId)
    if (!graphEdge) return
    const updated = { ...graphEdge, label: label || undefined }
    const updatedGraph: ReferenceGraph = {
      ...graphRef.current,
      edges: graphRef.current.edges.map(e => e.id === edgeId ? updated : e),
    }
    actionsRef.current.updateGraph(updatedGraph)
    setRfEdges(prev => prev.map(e =>
      e.id === edgeId ? { ...e, data: { ...e.data, label: label || undefined } } : e,
    ))
  }

  edgeDeleteRef.current = (edgeId: string) => {
    setRfEdges(prev => prev.filter(e => e.id !== edgeId))
    const updatedGraph: ReferenceGraph = {
      ...graphRef.current,
      edges: graphRef.current.edges.filter(e => e.id !== edgeId),
    }
    actionsRef.current.updateGraph(updatedGraph)
  }

  // ── Edge connection ─────────────────────────────────────────────────────

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    const edge: Edge = {
      id: generateId(),
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      ...EDGE_DEFAULTS,
      data: {
        sourceName: itemsRef.current.find(n => n.id === connection.source)?.name ?? '',
        targetName: itemsRef.current.find(n => n.id === connection.target)?.name ?? '',
        onLabelSave: edgeLabelSaveRef.current,
        onDelete: edgeDeleteRef.current,
      },
    }
    setRfEdges(prev => addEdge(edge, prev))
    const updatedGraph: ReferenceGraph = {
      ...graphRef.current,
      edges: [...graphRef.current.edges, {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
      }],
    }
    actionsRef.current.updateGraph(updatedGraph)
  }, [setRfEdges])

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    const deletedIds = new Set(deleted.map(e => e.id))
    const updatedGraph: ReferenceGraph = {
      ...graphRef.current,
      edges: graphRef.current.edges.filter(e => !deletedIds.has(e.id)),
    }
    actionsRef.current.updateGraph(updatedGraph)
  }, [])

  // ── Node drag ───────────────────────────────────────────────────────────

  const handleDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const pos = { x: Math.round(node.position.x), y: Math.round(node.position.y) }
    if (node.type === 'rectangle' || node.type === 'annotation') {
      // Update annotation position in graph
      const updatedGraph: ReferenceGraph = {
        ...graphRef.current,
        annotations: graphRef.current.annotations.map(a =>
          a.id === node.id ? { ...a, position: pos } : a,
        ),
      }
      actionsRef.current.updateGraph(updatedGraph)
    } else {
      const refItem = itemsRef.current.find(n => n.id === node.id)
      if (!refItem) return
      actionsRef.current.saveItem({ ...refItem, position: pos })
    }
  }, [])

  // ── Selection ──────────────────────────────────────────────────────────

  const handleSelectionChange = useCallback(({ nodes }: OnSelectionChangeParams) => {
    setSelectedNodes(nodes)
  }, [])

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === 'rectangle' || node.type === 'annotation') return
    onSelectItem(node.id)
  }, [onSelectItem])

  const handlePaneClick = useCallback(() => {
    handleCollapseRef.current()
  }, [])

  // ── Add item (board-specific: creates RF node + auto-selects) ──────────

  function handleAdd(type: string) {
    const newItem = actionsRef.current.addItem(type)
    newItemIdRef.current = newItem.id
    const col = manifest.collections.find(c => c.type === type)
    const newNode: Node = {
      id: newItem.id,
      type: 'refCard',
      position: newItem.position,
      data: {
        item: newItem,
        collection: col,
        isExpanded: true,
        isNew: true,
        onSave: handleItemSaveRef.current,
        onDelete: handleItemDeleteRef.current,
        onCollapse: handleCollapseRef.current,
      },
      deletable: false,
    }
    setRfNodes(prev => [...prev, newNode])
    onSelectItem(newItem.id)
  }

  // ── Add annotation / rectangle ─────────────────────────────────────────

  function handleAddAnnotation(kind: BoardAnnotation['kind']) {
    const viewport = rfInstanceRef.current?.getViewport()
    const x = viewport ? Math.round(-viewport.x / viewport.zoom + 200) : 100
    const y = viewport ? Math.round(-viewport.y / viewport.zoom + 200) : 100
    const annotation: BoardAnnotation = {
      id: generateId(),
      kind,
      position: { x, y },
      text: '',
      color: kind === 'rectangle' ? 'gray' : 'yellow',
      ...(kind === 'rectangle' ? { size: { width: 300, height: 200 } } : {}),
    }
    const updatedGraph: ReferenceGraph = {
      ...graphRef.current,
      annotations: [...graphRef.current.annotations, annotation],
    }
    actionsRef.current.updateGraph(updatedGraph)
    const newNode: Node = {
      id: annotation.id,
      type: kind === 'rectangle' ? 'rectangle' : 'annotation',
      position: annotation.position,
      ...(kind === 'rectangle' ? { style: { width: 300, height: 200 } } : {}),
      data: {
        text: '',
        color: annotation.color,
        onTextChange: annotationTextChangeRef.current,
        onDelete: annotationDeleteRef.current,
      },
      deletable: false,
    }
    setRfNodes(prev => [newNode, ...prev])
  }

  // ── Handle nodes change (includes rectangle resize) ───────────────────

  const handleNodesChange = useCallback((changes: Parameters<typeof onRfNodesChange>[0]) => {
    onRfNodesChange(changes)
    for (const change of changes) {
      if (change.type === 'dimensions' && !change.resizing && change.dimensions) {
        const ann = graphRef.current.annotations.find(a => a.id === change.id)
        if (!ann || ann.kind !== 'rectangle') continue
        const size = {
          width: Math.round(change.dimensions.width),
          height: Math.round(change.dimensions.height),
        }
        const updatedGraph: ReferenceGraph = {
          ...graphRef.current,
          annotations: graphRef.current.annotations.map(a =>
            a.id === change.id ? { ...a, size } : a,
          ),
        }
        actionsRef.current.updateGraph(updatedGraph)
      }
    }
  }, [onRfNodesChange])

  const isEmpty = items.length === 0 && graph.annotations.length === 0

  // ── Search filtering (dim non-matching nodes) ──────────────────────────

  const query = searchQuery.trim().toLowerCase()
  const displayNodes = query
    ? rfNodes.map(n => {
        if (n.type === 'refCard') {
          const item = items.find(i => i.id === n.id)
          const matches = item
            ? item.name.toLowerCase().includes(query) ||
              Object.values(item.fields).some(v => v.toLowerCase().includes(query))
            : false
          return matches ? n : { ...n, style: { ...n.style, opacity: 0.2 } }
        }
        if (n.type === 'annotation' || n.type === 'rectangle') {
          const ann = graph.annotations.find(a => a.id === n.id)
          const matches = ann ? ann.text.toLowerCase().includes(query) : false
          return matches ? n : { ...n, style: { ...n.style, opacity: 0.2 } }
        }
        return n
      })
    : rfNodes

  return (
    <main className="flex-1 overflow-hidden bg-bg relative">
      {/* Board toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-surface border border-border rounded-md shadow-sm px-1 py-1">
        <div className="flex items-center gap-1 px-1">
          <IconSearch size={12} className="text-text-placeholder" />
          <input
            className="w-28 h-6 text-[0.75rem] text-text bg-transparent outline-none placeholder:text-text-placeholder"
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setSearchQuery('') }}
          />
          {searchQuery && (
            <button
              className="w-4 h-4 flex items-center justify-center text-text-placeholder hover:text-text cursor-pointer"
              onClick={() => setSearchQuery('')}
            >
              <IconClose size={10} />
            </button>
          )}
        </div>
        <div className="w-px h-5 bg-border" />
        <button
          className="flex items-center gap-1 px-2 h-7 rounded-sm text-[0.75rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
          onClick={() => handleAddAnnotation('rectangle')}
          title="Add rectangle"
        >
          <IconSquare size={14} />
        </button>
        <button
          className="flex items-center gap-1 px-2 h-7 rounded-sm text-[0.75rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
          onClick={() => handleAddAnnotation('annotation')}
          title="Add note"
        >
          <IconStickyNote size={14} />
        </button>
      </div>

      {isEmpty ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-[0.9375rem] text-text-secondary mb-3">No items yet</p>
            <button
              className="text-[0.8125rem] text-accent hover:underline cursor-pointer"
              onClick={() => {
                if (manifest.collections.length > 0) handleAdd(manifest.collections[0].type)
              }}
            >
              Add your first item
            </button>
          </div>
        </div>
      ) : (
        <ReactFlow
          nodes={displayNodes}
          edges={rfEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onRfEdgesChange}
          onConnect={handleConnect}
          onEdgesDelete={handleEdgesDelete}
          onNodeDragStop={handleDragStop}
          onSelectionChange={handleSelectionChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onInit={inst => { rfInstanceRef.current = inst }}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          defaultEdgeOptions={EDGE_DEFAULTS}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode="Delete"
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color="var(--color-border)" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
            style={{ width: 150, height: 100 }}
          />
        </ReactFlow>
      )}
    </main>
  )
}

export { type Props as ReferenceBoardViewProps }

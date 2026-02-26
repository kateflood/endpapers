import { memo, useState } from 'react'
import {
  BaseEdge,
  EdgeToolbar,
  getSmoothStepPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'

export type ReferenceEdgeData = {
  label?: string
  sourceName?: string
  targetName?: string
  onLabelSave?: (edgeId: string, label: string) => void
  onDelete?: (edgeId: string) => void
}

export type ReferenceEdgeType = Edge<ReferenceEdgeData>

function ReferenceEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  markerEnd,
}: EdgeProps<ReferenceEdgeType>) {
  const [edgePath, centerX, centerY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const [label, setLabel] = useState(data?.label ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleBlur() {
    const trimmed = label.trim()
    if (trimmed !== (data?.label ?? '')) {
      data?.onLabelSave?.(id, trimmed)
    }
  }

  function handleDelete() {
    data?.onDelete?.(id)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          ...(selected ? { stroke: 'var(--color-accent)', strokeWidth: 2.5 } : {}),
        }}
        markerEnd={markerEnd}
      />

      {/* Always-visible label on the edge */}
      {data?.label && (
        <EdgeToolbar edgeId={id} x={centerX} y={centerY} isVisible>
          <span
            className="text-[0.6875rem] text-text-secondary bg-bg px-1.5 py-0.5 rounded-sm border border-border pointer-events-none select-none"
          >
            {data.label}
          </span>
        </EdgeToolbar>
      )}

      {/* Toolbar on select */}
      <EdgeToolbar edgeId={id} x={centerX} y={centerY - 28} isVisible={!!selected}>
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-md shadow-lg px-2 py-1.5 pointer-events-auto">
          <input
            type="text"
            className="w-28 text-[0.75rem] text-text bg-bg border border-border rounded-sm px-1.5 py-0.5 outline-none focus:border-accent"
            placeholder="Label…"
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            onClick={e => e.stopPropagation()}
          />
          {confirmDelete ? (
            <>
              <button
                className="text-[0.6875rem] px-1.5 py-0.5 rounded-sm bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                onClick={e => { e.stopPropagation(); handleDelete() }}
              >
                Delete
              </button>
              <button
                className="text-[0.6875rem] px-1.5 py-0.5 rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
                onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="text-[0.6875rem] px-1.5 py-0.5 rounded-sm text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
              title="Delete connection"
            >
              Delete
            </button>
          )}
        </div>
      </EdgeToolbar>
    </>
  )
}

export default memo(ReferenceEdgeComponent)

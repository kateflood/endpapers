import { memo, useState, useRef, useEffect } from 'react'
import { NodeResizer } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'

type RectangleData = {
  text: string
  color: string
  onTextChange: (id: string, text: string) => void
  onDelete: (id: string) => void
}

export type RectangleNodeType = Node<RectangleData>

const COLORS: Record<string, { bg: string; border: string }> = {
  gray:   { bg: 'rgba(0,0,0,0.04)',  border: 'rgba(0,0,0,0.12)' },
  blue:   { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.3)' },
  green:  { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.3)' },
  amber:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.3)' },
  red:    { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.3)' },
  purple: { bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.3)' },
}

function RectangleNode({ id, data, selected }: NodeProps<RectangleNodeType>) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setText(data.text) }, [data.text])

  const palette = COLORS[data.color] ?? COLORS.gray

  function commitEdit() {
    setIsEditing(false)
    if (text !== data.text) data.onTextChange(id, text)
  }

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={60}
        lineStyle={{ stroke: 'var(--color-accent)', strokeWidth: 1 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-accent)', border: 'none' }}
      />
      <div
        className="w-full h-full rounded-lg border-2 relative"
        style={{ background: palette.bg, borderColor: selected ? 'var(--color-accent)' : palette.border }}
      >
        <div className="absolute top-2 left-3 right-3">
          {isEditing ? (
            <input
              ref={inputRef}
              className="text-[0.75rem] font-semibold text-text-secondary bg-transparent outline-none w-full"
              value={text}
              onChange={e => setText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              autoFocus
            />
          ) : (
            <span
              className="text-[0.75rem] font-semibold text-text-secondary block truncate cursor-text"
              onDoubleClick={() => setIsEditing(true)}
            >
              {data.text || 'Label'}
            </span>
          )}
        </div>
        {selected && (
          <button
            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-[0.625rem] text-text-placeholder hover:text-danger transition-colors cursor-pointer"
            onClick={() => data.onDelete(id)}
            title="Delete"
          >
            ×
          </button>
        )}
      </div>
    </>
  )
}

export default memo(RectangleNode)

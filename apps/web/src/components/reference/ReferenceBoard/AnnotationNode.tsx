import { memo, useState, useRef, useEffect } from 'react'
import type { Node, NodeProps } from '@xyflow/react'

type AnnotationData = {
  text: string
  color: string
  onTextChange: (id: string, text: string) => void
  onDelete: (id: string) => void
}

export type AnnotationNodeType = Node<AnnotationData>

const BG_COLORS: Record<string, string> = {
  yellow: '#fef9c3',
  blue:   '#dbeafe',
  green:  '#dcfce7',
  pink:   '#fce7f3',
  purple: '#f3e8ff',
  gray:   '#f3f4f6',
}

function AnnotationNode({ id, data, selected }: NodeProps<AnnotationNodeType>) {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setText(data.text) }, [data.text])

  const bg = BG_COLORS[data.color] ?? BG_COLORS.yellow

  function commitEdit() {
    setIsEditing(false)
    if (text !== data.text) data.onTextChange(id, text)
  }

  return (
    <div
      className={`min-w-[140px] max-w-[240px] rounded-md shadow-sm border transition-colors ${
        selected ? 'border-accent' : 'border-transparent'
      }`}
      style={{ background: bg }}
    >
      <div className="p-3 relative">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="text-[0.8125rem] text-text bg-transparent outline-none w-full resize-none"
            value={text}
            rows={3}
            onChange={e => setText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Escape') { e.currentTarget.blur() }
            }}
            autoFocus
          />
        ) : (
          <p
            className="text-[0.8125rem] text-text whitespace-pre-wrap cursor-text min-h-[1.25em]"
            onDoubleClick={() => setIsEditing(true)}
          >
            {data.text || 'Note...'}
          </p>
        )}
        {selected && (
          <button
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[0.625rem] text-text-placeholder hover:text-danger transition-colors cursor-pointer"
            onClick={() => data.onDelete(id)}
            title="Delete"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export default memo(AnnotationNode)

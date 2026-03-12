import type { DraggableAttributes } from '@dnd-kit/core'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { IconGrip } from '../shared/icons'

interface Props {
  attributes: DraggableAttributes
  listeners: SyntheticListenerMap | undefined
}

export default function DragHandle({ attributes, listeners }: Props) {
  return (
    <span
      className="shrink-0 w-4 h-4 flex items-center justify-center text-text-placeholder opacity-0 group-hover/item:opacity-100 cursor-grab active:cursor-grabbing touch-none"
      {...attributes}
      {...listeners}
      onClick={e => e.stopPropagation()}
    >
      <IconGrip size={12} />
    </span>
  )
}

import { memo, useState, useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { ReferenceItem, ReferenceCollection } from '@endpapers/types'
import { todayISODate } from '@endpapers/utils'
import { TYPE_COLORS } from './referenceConstants'
import { IconClose } from '../icons'

const HANDLE_STYLE: React.CSSProperties = {
  width: 8,
  height: 8,
  background: 'var(--color-border)',
  border: '1.5px solid var(--color-surface)',
}

export interface ReferenceItemCardProps {
  item: ReferenceItem
  collection: ReferenceCollection | undefined
  isExpanded: boolean
  isNew?: boolean
  variant: 'board' | 'grid'
  selected?: boolean
  onToggleExpand?: () => void
  onSave: (updated: ReferenceItem) => void
  onDelete: (id: string) => void
}

function ReferenceItemCard({
  item,
  collection,
  isExpanded,
  isNew,
  variant,
  selected,
  onToggleExpand,
  onSave,
  onDelete,
}: ReferenceItemCardProps) {
  const [name, setName] = useState(item.name)
  const [fields, setFields] = useState<Record<string, string>>(item.fields)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setName(item.name)
    setFields(item.fields)
    setConfirmDelete(false)
  }, [item.id, item.name, item.fields])

  const saveRef = useRef<() => void>(() => {})
  saveRef.current = () => {
    onSave({ ...item, name: name.trim() || 'Untitled', fields, updatedAt: todayISODate() })
  }

  function handleBlur() {
    saveRef.current()
  }

  function handleFieldChange(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  const typeColor = TYPE_COLORS[item.type] ?? 'bg-gray-100 text-gray-700'
  const previewField = collection?.fields.find(f => item.fields[f.key])
  const preview = previewField ? item.fields[previewField.key] : ''

  const handles = variant === 'board' && (
    <>
      <Handle id="top"    type="source" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle id="right"  type="source" position={Position.Right}  style={HANDLE_STYLE} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle id="left"   type="source" position={Position.Left}   style={HANDLE_STYLE} />
    </>
  )

  // ── Expanded (inline editing) ───────────────────────────────────────────

  if (isExpanded) {
    return (
      <>
        {handles}
        <div
          className={`bg-surface rounded-md border border-accent shadow-md select-none ${
            variant === 'board' ? 'w-72' : 'col-span-full'
          }`}
        >
          <div className="px-4 pt-3 pb-3">
            {/* Header: type badge + collapse */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[0.625rem] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${typeColor}`}>
                {collection?.label.replace(/s$/, '') ?? item.type}
              </span>
              <button
                className="w-6 h-6 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
                onClick={e => { e.stopPropagation(); onToggleExpand?.() }}
                aria-label="Collapse"
              >
                <IconClose size={12} />
              </button>
            </div>

            {/* Name */}
            <input
              type="text"
              className="w-full text-[0.9375rem] font-medium text-text bg-transparent outline-none border-b border-transparent focus:border-accent pb-1 mb-3 placeholder:text-text-placeholder"
              placeholder="Untitled"
              autoFocus={isNew}
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              onClick={e => e.stopPropagation()}
            />

            {/* Fields */}
            <div className="flex flex-col gap-3">
              {collection?.fields.map(field => (
                <div key={field.key} className="flex flex-col gap-1">
                  <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
                    {field.label}
                  </label>
                  {field.inputType === 'textarea' ? (
                    <textarea
                      className="w-full text-[0.8125rem] text-text bg-bg border border-border rounded-sm px-2 py-1.5 outline-none focus:border-accent resize-y leading-snug"
                      rows={3}
                      value={fields[field.key] ?? ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      onBlur={handleBlur}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <input
                      type="text"
                      className="w-full text-[0.8125rem] text-text bg-bg border border-border rounded-sm px-2 py-1.5 outline-none focus:border-accent"
                      value={fields[field.key] ?? ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      onBlur={handleBlur}
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Delete */}
            <div className="mt-3 pt-3 border-t border-border">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[0.75rem] text-text-secondary flex-1">Delete?</span>
                  <button
                    className="text-[0.75rem] px-2.5 h-7 rounded-sm bg-danger text-white hover:opacity-80 transition-colors cursor-pointer"
                    onClick={e => { e.stopPropagation(); onDelete(item.id) }}
                  >
                    Delete
                  </button>
                  <button
                    className="text-[0.75rem] px-2.5 h-7 rounded-sm text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
                    onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="text-[0.75rem] text-text-placeholder hover:text-danger transition-colors cursor-pointer"
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                >
                  Delete item
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Collapsed (display) ─────────────────────────────────────────────────

  return (
    <>
      {handles}
      <div
        className={`bg-surface rounded-md border transition-shadow select-none ${
          variant === 'board' ? 'w-48' : 'w-full'
        } ${
          selected ? 'border-accent shadow-md' : 'border-border shadow-sm hover:shadow-md'
        } ${
          variant === 'grid' ? 'cursor-pointer' : ''
        }`}
        onClick={variant === 'grid' ? onToggleExpand : undefined}
      >
        <div className="px-3 pt-3 pb-2.5">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-[0.8125rem] font-medium text-text leading-snug line-clamp-2">
              {item.name || <span className="text-text-placeholder italic">Untitled</span>}
            </span>
            <span className={`shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${typeColor}`}>
              {collection?.label.replace(/s$/, '') ?? item.type}
            </span>
          </div>
          {preview && (
            <p className="text-[0.75rem] text-text-secondary line-clamp-3 leading-snug">
              {preview}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export default memo(ReferenceItemCard)

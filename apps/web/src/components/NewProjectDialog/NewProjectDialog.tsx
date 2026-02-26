import { useState, useEffect, useRef } from 'react'
import type { ProjectType } from '@endpapers/types'
import Button from '../Button/Button'
import Dialog from '../Dialog'

export const PROJECT_TYPES: { label: string; value: ProjectType }[] = [
  { label: 'Fiction', value: 'fiction' },
  { label: 'Non-fiction', value: 'non-fiction' },
  { label: 'Stories', value: 'stories' },
  { label: 'Essays', value: 'essays' },
  { label: 'Articles', value: 'article' },
  { label: 'Scripts', value: 'script' },
  { label: 'Custom', value: 'custom' },
]

interface Props {
  onConfirm: (title: string, type: ProjectType, customTypeLabel?: string) => void
  onCancel: () => void
}

export default function NewProjectDialog({ onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('fiction')
  const [customLabel, setCustomLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (trimmed) onConfirm(trimmed, projectType, projectType === 'custom' ? customLabel.trim() || undefined : undefined)
  }

  return (
    <Dialog title="New project" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="p-6 pt-5">
        <input
          ref={inputRef}
          className="w-full px-3 py-2.5 font-sans text-[0.9375rem] text-text bg-bg border border-border rounded-sm outline-none transition-colors focus:border-accent placeholder:text-text-placeholder mb-4"
          type="text"
          placeholder="Project title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <div className="mb-4">
          <label className="block text-[0.8125rem] text-text-secondary mb-1.5">Project type</label>
          <select
            className="w-full h-9 px-3 rounded-sm text-[0.9375rem] text-text bg-bg border border-border outline-none cursor-pointer focus:border-accent"
            value={projectType}
            onChange={e => setProjectType(e.target.value as ProjectType)}
          >
            {PROJECT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {projectType === 'custom' && (
          <input
            className="w-full px-3 py-2.5 font-sans text-[0.9375rem] text-text bg-bg border border-border rounded-sm outline-none transition-colors focus:border-accent placeholder:text-text-placeholder mb-4"
            type="text"
            placeholder="Custom type label (e.g. Screenplay)"
            value={customLabel}
            onChange={e => setCustomLabel(e.target.value)}
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!title.trim()}>
            Choose folder
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

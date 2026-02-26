import { useState, useEffect, useRef } from 'react'
import type { ProjectType } from '@endpapers/types'
import type { TemplateOptions } from '../../fs/projectFs'
import { pickDirectory, validateProjectDirectory } from '../../fs/projectFs'
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

const TEMPLATE_PARTS: { key: keyof TemplateOptions; label: string }[] = [
  { key: 'sections', label: 'Sections (content)' },
  { key: 'frontMatter', label: 'Front matter' },
  { key: 'backMatter', label: 'Back matter' },
  { key: 'extras', label: 'Drawer sections' },
  { key: 'reference', label: 'Reference board' },
  { key: 'settings', label: 'Settings' },
  { key: 'goals', label: 'Writing goals' },
]

interface Props {
  onConfirm: (
    title: string,
    type: ProjectType,
    customTypeLabel?: string,
    template?: { sourceHandle: FileSystemDirectoryHandle; options: TemplateOptions },
  ) => void
  onCancel: () => void
}

export default function NewProjectDialog({ onConfirm, onCancel }: Props) {
  const [title, setTitle] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('fiction')
  const [customLabel, setCustomLabel] = useState('')
  const [useTemplate, setUseTemplate] = useState(false)
  const [sourceHandle, setSourceHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [templateOptions, setTemplateOptions] = useState<TemplateOptions>({
    sections: true,
    frontMatter: true,
    backMatter: true,
    extras: true,
    reference: true,
    settings: true,
    goals: true,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const custom = projectType === 'custom' ? customLabel.trim() || undefined : undefined
    if (useTemplate && sourceHandle) {
      onConfirm(trimmed, projectType, custom, { sourceHandle, options: templateOptions })
    } else {
      onConfirm(trimmed, projectType, custom)
    }
  }

  async function handlePickSource() {
    setSourceError(null)
    const handle = await pickDirectory()
    if (!handle) return
    const valid = await validateProjectDirectory(handle)
    if (!valid) {
      setSourceError('This folder is not an Endpapers project.')
      return
    }
    setSourceHandle(handle)
  }

  function toggleOption(key: keyof TemplateOptions) {
    setTemplateOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const canSubmit = title.trim() && (!useTemplate || sourceHandle)

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

        {/* Template toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none mb-4">
          <input
            type="checkbox"
            checked={useTemplate}
            onChange={e => {
              setUseTemplate(e.target.checked)
              if (!e.target.checked) {
                setSourceHandle(null)
                setSourceError(null)
              }
            }}
            className="cursor-pointer"
          />
          <span className="text-[0.8125rem] text-text">Use existing project as template</span>
        </label>

        {useTemplate && (
          <div className="mb-4 pl-5 border-l-2 border-border">
            {/* Source picker */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                className="px-3 h-8 rounded-sm text-[0.8125rem] border border-border text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer shrink-0"
                onClick={() => { void handlePickSource() }}
              >
                {sourceHandle ? 'Change source…' : 'Choose source project…'}
              </button>
              {sourceHandle && (
                <span className="text-[0.8125rem] text-text truncate">{sourceHandle.name}</span>
              )}
            </div>
            {sourceError && (
              <p className="text-[0.8125rem] text-red-500 mb-3">{sourceError}</p>
            )}

            {/* Part checkboxes */}
            {sourceHandle && (
              <div className="flex flex-col gap-1">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-0.5">
                  Copy from source
                </span>
                {TEMPLATE_PARTS.map(part => (
                  <label key={part.key} className="flex items-center gap-2 cursor-pointer select-none py-0.5">
                    <input
                      type="checkbox"
                      checked={templateOptions[part.key]}
                      onChange={() => toggleOption(part.key)}
                      className="cursor-pointer"
                    />
                    <span className="text-[0.8125rem] text-text">{part.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!canSubmit}>
            Choose folder
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

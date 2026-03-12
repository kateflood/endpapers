import { useState } from 'react'
import type { ProjectType } from '@endpapers/types'
import type { TemplateOptions } from '../../fs/projectFs'
import { pickDirectory, validateProjectDirectory } from '../../fs/projectFs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

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
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            autoFocus
            type="text"
            placeholder="Project title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="h-9"
          />

          <div className="flex flex-col gap-1.5">
            <Label>Project type</Label>
            <Select value={projectType} onValueChange={v => setProjectType(v as ProjectType)}>
              <SelectTrigger className="w-full h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {projectType === 'custom' && (
            <Input
              type="text"
              placeholder="Custom type label (e.g. Screenplay)"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              className="h-9"
            />
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="use-template"
              checked={useTemplate}
              onCheckedChange={(checked) => {
                const isChecked = checked === true
                setUseTemplate(isChecked)
                if (!isChecked) {
                  setSourceHandle(null)
                  setSourceError(null)
                }
              }}
            />
            <Label htmlFor="use-template" className="cursor-pointer font-normal">
              Use existing project as template
            </Label>
          </div>

          {useTemplate && (
            <div className="pl-5 border-l-2 border-border flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { void handlePickSource() }}
                  className="shrink-0"
                >
                  {sourceHandle ? 'Change source…' : 'Choose source project…'}
                </Button>
                {sourceHandle && (
                  <span className="text-[0.8125rem] text-text truncate">{sourceHandle.name}</span>
                )}
              </div>
              {sourceError && (
                <p className="text-[0.8125rem] text-destructive">{sourceError}</p>
              )}
              {sourceHandle && (
                <div className="flex flex-col gap-1">
                  <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Copy from source
                  </span>
                  {TEMPLATE_PARTS.map(part => (
                    <label key={part.key} className="flex items-center gap-2 cursor-pointer select-none py-0.5">
                      <Checkbox
                        checked={templateOptions[part.key]}
                        onCheckedChange={() => toggleOption(part.key)}
                      />
                      <span className="text-[0.8125rem] text-text">{part.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Choose folder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

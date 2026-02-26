import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../../contexts/ProjectContext'
import type { ProjectSettings, AuthorInfo } from '@endpapers/types'
import { FONTS, FONT_SIZES } from '../../components/RichTextEditor/EditorToolbar'
import { IconArrowLeft } from '../../components/icons'
import ImportDialog from '../../components/ImportDialog/ImportDialog'
import ExportDialog from '../../components/ExportDialog/ExportDialog'

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { project, handle, updateSettings, updateProjectMeta } = useProject()
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    if (!project) navigate('/', { replace: true })
  }, [project, navigate])

  if (!project) return null

  const authorInfo: AuthorInfo = project.authorInfo ?? {}

  const settings: ProjectSettings = {
    spellCheck: true,
    paperMode: true,
    font: 'Inter, sans-serif',
    fontSize: 16,
    wordsPerPage: 250,
    showWordCount: true,
    ...project.settings,
  }

  async function handleUpdate(patch: Partial<ProjectSettings>) {
    await updateSettings({ ...settings, ...patch })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex items-center px-4 h-12 border-b border-border bg-surface shrink-0 gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-sm text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
          onClick={() => navigate('/editor')}
          aria-label="Back to editor"
        >
          <IconArrowLeft size={16} />
        </button>
        <span className="text-[0.9375rem] font-medium text-text">Settings</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[560px] mx-auto px-6 py-8 flex flex-col gap-8">

          <section>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-1">Project</h2>
            <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
              <SettingReadOnlyRow
                label="Project name"
                value={handle?.name ?? ''}
              />
              <SettingTextRow
                label="Title"
                value={project.title}
                onSave={v => updateProjectMeta({ title: v || project.title })}
              />
              <SettingTextRow
                label="Subtitle"
                value={project.subtitle ?? ''}
                placeholder="Optional"
                onSave={v => updateProjectMeta({ subtitle: v || undefined })}
              />
            </div>
          </section>

          <section>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-1">Author</h2>
            <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
              <SettingTextRow
                label="First name"
                value={authorInfo.firstName ?? ''}
                onSave={v => updateProjectMeta({ authorInfo: { ...authorInfo, firstName: v || undefined } })}
              />
              <SettingTextRow
                label="Last name"
                value={authorInfo.lastName ?? ''}
                onSave={v => updateProjectMeta({ authorInfo: { ...authorInfo, lastName: v || undefined } })}
              />
              <SettingTextRow
                label="Phone"
                value={authorInfo.phone ?? ''}
                onSave={v => updateProjectMeta({ authorInfo: { ...authorInfo, phone: v || undefined } })}
              />
              <SettingTextRow
                label="Email"
                value={authorInfo.email ?? ''}
                onSave={v => updateProjectMeta({ authorInfo: { ...authorInfo, email: v || undefined } })}
              />
            </div>
          </section>

          <section>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-1">Editor</h2>
            <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
              <SettingSelectRow
                label="Default font"
                description="Font used when you open a project."
                value={settings.font}
                options={FONTS.map(f => ({ label: f.label, value: f.value }))}
                onChange={v => handleUpdate({ font: v })}
              />
              <SettingSelectRow
                label="Default font size"
                description="Text size used when you open a project."
                value={String(settings.fontSize)}
                options={FONT_SIZES.map(s => ({ label: String(s), value: String(s) }))}
                onChange={v => handleUpdate({ fontSize: Number(v) })}
              />
              <SettingSelectRow
                label="Words per page"
                description="Used to estimate page count from word count."
                value={String(settings.wordsPerPage)}
                options={[150, 200, 250, 300, 350].map(n => ({ label: String(n), value: String(n) }))}
                onChange={v => handleUpdate({ wordsPerPage: Number(v) })}
              />
              <SettingRow
                label="Paper mode"
                description="Display the editor as a white page with margins."
                checked={settings.paperMode}
                onChange={v => handleUpdate({ paperMode: v })}
              />
              <SettingRow
                label="Spell check"
                description="Underline misspelled words while writing."
                checked={settings.spellCheck}
                onChange={v => handleUpdate({ spellCheck: v })}
              />
              <SettingRow
                label="Word count"
                description="Show total word and page count in the header."
                checked={settings.showWordCount}
                onChange={v => handleUpdate({ showWordCount: v })}
              />
            </div>
          </section>

          <section>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-1">Import & Export</h2>
            <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
              <div className="flex items-center justify-between px-4 py-3 bg-surface">
                <div>
                  <div className="text-[0.9375rem] text-text">Import sections</div>
                  <div className="text-[0.8125rem] text-text-secondary mt-0.5">Import .txt or .md files as new sections.</div>
                </div>
                <button
                  className="px-3 h-7 rounded-sm text-[0.8125rem] border border-border text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer shrink-0 ml-6"
                  onClick={() => setImportOpen(true)}
                >
                  Import…
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-surface">
                <div>
                  <div className="text-[0.9375rem] text-text">Export project</div>
                  <div className="text-[0.8125rem] text-text-secondary mt-0.5">Plain text, PDF, or standard manuscript format.</div>
                </div>
                <button
                  className="px-3 h-7 rounded-sm text-[0.8125rem] border border-border text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer shrink-0 ml-6"
                  onClick={() => setExportOpen(true)}
                >
                  Export…
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}
      {exportOpen && <ExportDialog onClose={() => setExportOpen(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row components
// ---------------------------------------------------------------------------

interface SettingRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}

function SettingRow({ label, description, checked, onChange }: SettingRowProps) {
  return (
    <label className="flex items-center justify-between px-4 py-3 bg-surface cursor-pointer hover:bg-black/[0.02] transition-colors">
      <div>
        <div className="text-[0.9375rem] text-text">{label}</div>
        <div className="text-[0.8125rem] text-text-secondary mt-0.5">{description}</div>
      </div>
      <input
        type="checkbox"
        className="w-4 h-4 cursor-pointer accent-accent shrink-0 ml-6"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  )
}

interface SettingSelectRowProps {
  label: string
  description: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}

function SettingSelectRow({ label, description, value, options, onChange }: SettingSelectRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface">
      <div>
        <div className="text-[0.9375rem] text-text">{label}</div>
        <div className="text-[0.8125rem] text-text-secondary mt-0.5">{description}</div>
      </div>
      <select
        className="h-7 px-2 rounded-sm text-[0.8125rem] text-text bg-bg border border-border outline-none cursor-pointer focus:border-accent shrink-0 ml-6"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

interface SettingTextRowProps {
  label: string
  description?: string
  value: string
  placeholder?: string
  onSave: (value: string) => void
}

function SettingTextRow({ label, description, value, placeholder, onSave }: SettingTextRowProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface gap-6">
      <div className="shrink-0">
        <div className="text-[0.9375rem] text-text">{label}</div>
        <div className="text-[0.8125rem] text-text-secondary mt-0.5">{description}</div>
      </div>
      <input
        className="h-7 px-2 rounded-sm text-[0.8125rem] text-text bg-bg border border-border outline-none focus:border-accent w-48 shrink-0"
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(draft) }}
      />
    </div>
  )
}

interface SettingReadOnlyRowProps {
  label: string
  value: string
}

function SettingReadOnlyRow({ label, value }: SettingReadOnlyRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface gap-6">
      <div className="shrink-0">
        <div className="text-[0.9375rem] text-text">{label}</div>
      </div>
      <span className="text-[0.8125rem] text-text-secondary truncate text-right">{value}</span>
    </div>
  )
}

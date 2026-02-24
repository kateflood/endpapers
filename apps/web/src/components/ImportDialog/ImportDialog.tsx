import { useState, useRef } from 'react'
import { marked } from 'marked'
import { generateId } from '@endpapers/utils'
import type { SectionManifestEntry } from '@endpapers/types'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { writeSectionFile } from '../../fs/projectFs'
import Dialog from '../Dialog'

type Zone = 'draft' | 'drawer' | 'front' | 'back'

const ZONE_LABELS: Record<Zone, string> = {
  draft: 'Draft',
  drawer: 'Drawer',
  front: 'Front matter',
  back: 'Back matter',
}

interface LoadedFile {
  name: string
  text: string
  isMd: boolean
}

/** Extract a human-readable title from the first non-empty line of a raw text chunk. */
function chunkTitle(rawText: string, fallback: string): string {
  const firstLine = rawText.split('\n').find(l => l.trim()) ?? ''
  const stripped = firstLine.trim().replace(/^#{1,6}\s+/, '').trim()
  return stripped.slice(0, 50) || fallback
}

/** Convert plain text to TipTap-compatible HTML. */
function txtToHtml(text: string): string {
  return text
    .trim()
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map(p => {
      const escaped = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
      return `<p>${escaped}</p>`
    })
    .join('')
}

/** Split a single file into import-ready sections. */
function parseFile(file: LoadedFile, splitOnPageBreak: boolean, multipleFiles: boolean): Array<{ title: string; html: string }> {
  const rawChunks = splitOnPageBreak
    ? file.text.split('\f').filter(c => c.trim())
    : [file.text]

  const baseName = file.name.replace(/\.[^.]+$/, '')

  return rawChunks.map((chunk, i) => {
    const html = file.isMd
      ? String(marked.parse(chunk.trim()))
      : txtToHtml(chunk)

    let title: string
    if (multipleFiles) {
      // Multiple files: use filename, append _1/_2/... only if this file splits into multiple chunks
      title = rawChunks.length > 1 ? `${baseName}_${i + 1}` : baseName
    } else {
      // Single file: extract title from first line of chunk, fall back to filename
      const fallback = rawChunks.length > 1 ? `${baseName} ${i + 1}` : baseName
      title = chunkTitle(chunk, fallback)
    }

    return { title, html }
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

interface Props {
  onClose: () => void
}

export default function ImportDialog({ onClose }: Props) {
  const { project, handle, setActiveSectionId, updateAllManifests } = useProject()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([])
  const [zone, setZone] = useState<Zone>('draft')
  const [splitOnPageBreak, setSplitOnPageBreak] = useState(false)
  const [importing, setImporting] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const loaded = await Promise.all(
      files.map(async f => ({
        name: f.name,
        text: await readFileAsText(f),
        isMd: f.name.endsWith('.md'),
      }))
    )
    setLoadedFiles(loaded)
    e.target.value = ''
  }

  const preview = loadedFiles.length > 0
    ? loadedFiles.flatMap(f => parseFile(f, splitOnPageBreak, loadedFiles.length > 1))
    : null

  const totalPageBreakSections = loadedFiles.reduce(
    (sum, f) => sum + f.text.split('\f').filter(c => c.trim()).length,
    0
  )
  const anyPageBreaks = totalPageBreakSections > loadedFiles.length

  async function handleImport() {
    if (!project || !handle || !preview || preview.length === 0) return
    setImporting(true)

    try {
      const newEntries: SectionManifestEntry[] = []
      for (const chunk of preview) {
        const id = generateId()
        const filename = `${id}.md`
        await writeSectionFile(handle, filename, chunk.html)
        newEntries.push({ id, title: chunk.title, type: 'section', file: filename })
      }

      const sections = [...(project.sections ?? [])]
      const extras = [...(project.extras ?? [])]
      const front = [...(project.frontMatter ?? [])]
      const back = [...(project.backMatter ?? [])]

      if (zone === 'draft') sections.push(...newEntries)
      else if (zone === 'drawer') extras.push(...newEntries)
      else if (zone === 'front') front.push(...newEntries)
      else back.push(...newEntries)

      await updateAllManifests(sections, extras, front, back)
      setActiveSectionId(newEntries[0].id)
      onClose()
    } catch {
      showToast('Import failed — please try again.', 'error')
    } finally {
      setImporting(false)
    }
  }

  const fileLabel = loadedFiles.length === 0
    ? null
    : loadedFiles.length === 1
      ? loadedFiles[0].name
      : `${loadedFiles.length} files selected`

  return (
    <Dialog title="Import files" width="max-w-[420px]" onClose={onClose}>
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* File picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
            Files
          </label>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[0.875rem] truncate">
              {fileLabel
                ? <span className="text-text">{fileLabel}</span>
                : <span className="text-text-placeholder">No files selected</span>
              }
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              className="px-3 h-7 rounded-sm text-[0.8125rem] border border-border text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose…
            </button>
          </div>
          <p className="text-[0.75rem] text-text-placeholder">Supported formats: .txt, .md</p>
        </div>

        {/* Zone selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
            Add to
          </label>
          <select
            className="h-8 px-2 rounded-sm text-[0.875rem] text-text bg-bg border border-border outline-none focus:border-accent cursor-pointer"
            value={zone}
            onChange={e => setZone(e.target.value as Zone)}
          >
            {(Object.keys(ZONE_LABELS) as Zone[]).map(z => (
              <option key={z} value={z}>{ZONE_LABELS[z]}</option>
            ))}
          </select>
        </div>

        {/* Split on page breaks */}
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 cursor-pointer"
            checked={splitOnPageBreak}
            onChange={e => setSplitOnPageBreak(e.target.checked)}
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-[0.875rem] text-text">Split into sections at page breaks</span>
            {splitOnPageBreak && loadedFiles.length > 0 && (
              anyPageBreaks
                ? <span className="text-[0.75rem] text-text-secondary">{totalPageBreakSections} sections found across {loadedFiles.length} {loadedFiles.length === 1 ? 'file' : 'files'}</span>
                : <span className="text-[0.75rem] text-text-placeholder">No page break characters (␌) found — each file will import as one section</span>
            )}
          </span>
        </label>

        {/* Section preview */}
        {preview && preview.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary">
              {preview.length === 1 ? '1 section' : `${preview.length} sections`}
            </p>
            <div className="max-h-32 overflow-y-auto flex flex-col gap-0.5 rounded-sm bg-bg border border-border px-2 py-1.5">
              {preview.map((s, i) => (
                <span key={i} className="text-[0.8125rem] text-text truncate">{s.title}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
        <button
          className="px-3 h-8 rounded-sm text-[0.8125rem] text-text-secondary hover:text-text hover:bg-black/[0.04] transition-colors cursor-pointer"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-3 h-8 rounded-sm text-[0.8125rem] bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleImport}
          disabled={!preview || preview.length === 0 || importing}
        >
          {importing ? 'Importing…' : 'Import'}
        </button>
      </div>
    </Dialog>
  )
}

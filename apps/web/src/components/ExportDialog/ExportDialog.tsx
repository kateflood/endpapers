import { useState, useEffect } from 'react'
import type { SectionManifestEntry } from '@endpapers/types'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { readSectionFile } from '../../fs/projectFs'
import Dialog from '../Dialog'
import { htmlToPlainText, htmlToMarkdown, escHtml, triggerDownload, buildPrintHtml, buildDocHtml, buildHtmlExport } from './exportHelpers'

// ── Format registry ───────────────────────────────────────────────────────────

type ExportFormat = 'txt' | 'md' | 'html' | 'pdf' | 'doc' | 'manuscript'

const FORMAT_OPTIONS: { value: ExportFormat; label: string; projectOnly?: boolean }[] = [
  { value: 'txt', label: 'Plain text' },
  { value: 'md', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'pdf', label: 'PDF' },
  { value: 'doc', label: 'Word document' },
  { value: 'manuscript', label: 'Standard manuscript', projectOnly: true },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenEntries(entries: SectionManifestEntry[]): SectionManifestEntry[] {
  return entries.flatMap(e => e.type === 'group' ? (e.children ?? []) : [e])
}

function slugify(str: string): string {
  return str.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'export'
}

type SectionZone = 'front' | 'draft' | 'back'

interface SectionData { id: string; title: string; html: string; zone: SectionZone }

async function loadAllSections(
  project: { frontMatter?: SectionManifestEntry[]; sections?: SectionManifestEntry[]; backMatter?: SectionManifestEntry[] },
  handle: FileSystemDirectoryHandle,
): Promise<SectionData[]> {
  const taggedEntries = [
    ...flattenEntries(project.frontMatter ?? []).map(e => ({ entry: e, zone: 'front' as const })),
    ...flattenEntries(project.sections ?? []).map(e => ({ entry: e, zone: 'draft' as const })),
    ...flattenEntries(project.backMatter ?? []).map(e => ({ entry: e, zone: 'back' as const })),
  ].filter(({ entry: e }) => e.type === 'section' && e.file)

  return Promise.all(
    taggedEntries.map(async ({ entry: e, zone }) => ({
      id: e.id,
      title: e.title,
      html: await readSectionFile(handle, e.file!),
      zone,
    }))
  )
}

// ── Manuscript helpers ────────────────────────────────────────────────────────

interface ManuscriptProject {
  title: string
  author: string
  authorInfo?: { firstName?: string; lastName?: string; phone?: string; email?: string }
}

interface ManuscriptMeta {
  displayName: string
  headerLastName: string
  headerTitle: string
  contactLines: string[]
}

function buildManuscriptMeta(sections: SectionData[], project: ManuscriptProject): ManuscriptMeta {
  const authorInfo = project.authorInfo
  const displayName = authorInfo?.firstName || authorInfo?.lastName
    ? [authorInfo.firstName, authorInfo.lastName].filter(Boolean).join(' ')
    : project.author
  const lastName = authorInfo?.lastName ?? project.author.trim().split(/\s+/).pop() ?? project.author

  const wordCount = sections.reduce((acc, s) => {
    return acc + htmlToPlainText(s.html).split(/\s+/).filter(Boolean).length
  }, 0)
  const approxWords = `Approx. ${Math.round(wordCount / 100) * 100} words`

  return {
    displayName,
    headerLastName: lastName.toUpperCase(),
    headerTitle: project.title.toUpperCase().slice(0, 35),
    contactLines: [displayName, authorInfo?.phone, authorInfo?.email, approxWords].filter(Boolean) as string[],
  }
}

// ── Multi-section builders (project scope) ────────────────────────────────────

function buildPlainTextMulti(sections: SectionData[], showTitles: boolean): string {
  return sections
    .map(s => {
      const heading = showTitles && s.zone === 'draft' ? `${s.title}\n\n` : ''
      return `${heading}${htmlToPlainText(s.html)}`
    })
    .join('\n\n\f\n\n')
}

function buildMarkdownMulti(sections: SectionData[], showTitles: boolean): string {
  return sections
    .map(s => {
      const heading = showTitles && s.zone === 'draft' ? `# ${s.title}\n\n` : ''
      return `${heading}${htmlToMarkdown(s.html)}`
    })
    .join('\n\n---\n\n')
}

function buildHtmlMulti(sections: SectionData[], title: string, font: string, fontSize: number, showTitles: boolean): string {
  const sectionsHtml = sections
    .map(s => {
      const heading = showTitles && s.zone === 'draft' ? `<h1>${escHtml(s.title)}</h1>\n` : ''
      return `${heading}${s.html}`
    })
    .join('\n<hr>\n')

  return buildHtmlExport(sectionsHtml, title, font, fontSize)
}

function buildPrintHtmlMulti(sections: SectionData[], title: string, font: string, fontSize: number, showTitles: boolean): string {
  const sectionsHtml = sections
    .map((s, i) => {
      const heading = showTitles && s.zone === 'draft' ? `<h1>${escHtml(s.title)}</h1>\n` : ''
      return `<div class="page${i > 0 ? ' break' : ''}">\n${heading}${s.html}\n</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  @page { margin: 1in; }
  body { font-family: ${escHtml(font)}, serif; font-size: ${fontSize}px; line-height: 1.7; margin: 0; color: #000; }
  * { font-family: ${escHtml(font)}, serif; }
  .page { padding: 1in; border-bottom: 1px solid #ccc; }
  p { margin: 0 0 0.875rem; }
  h1 { text-align: center; text-indent: 0; margin: 0 0 1em; page-break-after: avoid; }
  h2, h3 { text-indent: 0; margin: 0; }
  .break { page-break-before: always; }
  @media print {
    .page { padding: 0; border-bottom: none; }
  }
</style>
</head>
<body>${sectionsHtml}</body>
</html>`
}

function buildDocHtmlMulti(sections: SectionData[], title: string, font: string, fontSize: number, showTitles: boolean): string {
  const fontPt = Math.round(fontSize * 0.75)
  const sectionsHtml = sections
    .map(s => {
      const heading = showTitles && s.zone === 'draft' ? `<h1>${escHtml(s.title)}</h1>\n` : ''
      return `<div class="break">\n${heading}${s.html}\n</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument></xml><![endif]-->
<style>
@page { margin: 1in; }
body { font-family: ${escHtml(font)}, serif; font-size: ${fontPt}pt; color: #000; }
* { font-family: ${escHtml(font)}, serif; }
p { line-height: 1.7; margin: 0 0 0.875em; }
h1 { text-align: center; margin: 0 0 1em; page-break-after: avoid; }
h2, h3 { margin: 0; }
.break { page-break-before: always; mso-break-type: page-break; }
</style>
</head>
<body>
${sectionsHtml}
</body>
</html>`
}

function buildManuscriptHtml(sections: SectionData[], project: ManuscriptProject, showTitles: boolean): string {
  const { displayName, headerLastName, headerTitle, contactLines } = buildManuscriptMeta(sections, project)
  const spacers = Array.from({ length: 10 }, () => '<p class="ni">&nbsp;</p>').join('\n')

  const sectionsHtml = sections
    .map(s => {
      const heading = showTitles && s.zone === 'draft' ? `<h2>${escHtml(s.title)}</h2>\n` : ''
      return `<div class="break">\n${heading}${s.html}\n</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]><xml><w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument></xml><![endif]-->
<style>
@page {
  margin: 1in;
  mso-header-margin: .5in;
  mso-header: h1;
  mso-first-header: h2;
}
body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; }
* { font-family: "Times New Roman", Times, serif !important; font-size: 12pt !important; color: #000 !important; }
p { line-height: 2; margin: 0; text-indent: .5in; }
h1, h2, h3 { line-height: 2; margin: 0; text-align: center; text-indent: 0; }
.ni { text-indent: 0; }
.break { page-break-before: always; mso-break-type: page-break; }
</style>
</head>
<body>
<div style="mso-element:header" id="h1">
  <p style="text-align:right;text-indent:0;margin:0;line-height:1.5">${escHtml(headerLastName)} / ${escHtml(headerTitle)} / <span style="mso-field-code:PAGE \\* MERGEFORMAT "></span></p>
</div>
<div style="mso-element:header" id="h2">
  <p style="text-indent:0;margin:0;line-height:1.5">&nbsp;</p>
</div>
${contactLines.map(line => `<p class="ni" style="text-align:right">${escHtml(line)}</p>`).join('\n')}
${spacers}
<p class="ni" style="text-align:center"><strong>${escHtml(project.title)}</strong></p>
<p class="ni" style="text-align:center">by</p>
<p class="ni" style="text-align:center">${escHtml(displayName)}</p>
${sectionsHtml}
<p class="ni" style="text-align:center">The End</p>
</body>
</html>`
}

// ── Preview builders ──────────────────────────────────────────────────────────

function buildPlainTextPreview(sections: SectionData[], showTitles: boolean): string {
  const plainText = buildPlainTextMulti(sections, showTitles)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: "Courier New", monospace; font-size: 11pt; line-height: 1.6; margin: 1in; color: #000; white-space: pre-wrap; word-wrap: break-word; }
</style>
</head>
<body>${escHtml(plainText)}</body>
</html>`
}

function buildMarkdownPreview(sections: SectionData[], showTitles: boolean): string {
  const md = buildMarkdownMulti(sections, showTitles)
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: "Courier New", monospace; font-size: 11pt; line-height: 1.6; margin: 1in; color: #000; white-space: pre-wrap; word-wrap: break-word; }
</style>
</head>
<body>${escHtml(md)}</body>
</html>`
}

function buildManuscriptPreview(sections: SectionData[], project: ManuscriptProject, showTitles: boolean): string {
  const { displayName, headerLastName, headerTitle, contactLines } = buildManuscriptMeta(sections, project)
  const spacers = Array.from({ length: 10 }, () => '<p class="ni">&nbsp;</p>').join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; margin: 0; }
  * { font-family: "Times New Roman", Times, serif; }
  .page { padding: 1in; border-bottom: 1px solid #ccc; }
  .header { text-align: right; font-size: 10pt; color: #666; margin-bottom: 1em; line-height: 1.5; }
  p { line-height: 2; margin: 0; text-indent: .5in; }
  h1, h2, h3 { line-height: 2; margin: 0; text-align: center; text-indent: 0; }
  .ni { text-indent: 0; }
  .break { border-top: 1px solid #ccc; padding-top: 1in; margin-top: 0; }
</style>
</head>
<body>
<div class="page">
${contactLines.map(line => `<p class="ni" style="text-align:right">${escHtml(line)}</p>`).join('\n')}
${spacers}
<p class="ni" style="text-align:center"><strong>${escHtml(project.title)}</strong></p>
<p class="ni" style="text-align:center">by</p>
<p class="ni" style="text-align:center">${escHtml(displayName)}</p>
</div>
${sections.map(s => {
  const heading = showTitles && s.zone === 'draft' ? `<h2>${escHtml(s.title)}</h2>\n` : ''
  return `<div class="page">
<div class="header">${escHtml(headerLastName)} / ${escHtml(headerTitle)}</div>
${heading}${s.html}
</div>`
}).join('\n')}
<div class="page">
<div class="header">${escHtml(headerLastName)} / ${escHtml(headerTitle)}</div>
<p class="ni" style="text-align:center">The End</p>
</div>
</body>
</html>`
}

// ── Section-scope preview (single section) ────────────────────────────────────

function buildSectionPreview(html: string, format: ExportFormat, title: string, font: string, fontSize: number): string {
  if (format === 'txt') {
    const plain = htmlToPlainText(html)
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: "Courier New", monospace; font-size: 11pt; line-height: 1.6; margin: 1in; color: #000; white-space: pre-wrap; }</style></head><body>${escHtml(plain)}</body></html>`
  }
  if (format === 'md') {
    const md = htmlToMarkdown(html)
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: "Courier New", monospace; font-size: 11pt; line-height: 1.6; margin: 1in; color: #000; white-space: pre-wrap; }</style></head><body>${escHtml(md)}</body></html>`
  }
  // html, pdf, doc all use the styled preview
  return buildPrintHtml(html, title, font, fontSize)
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  sectionContext?: {
    title: string
    html: string
  }
}

export default function ExportDialog({ onClose, sectionContext }: Props) {
  const { project, handle } = useProject()
  const { showToast } = useToast()

  const scope: 'section' | 'project' = sectionContext ? 'section' : 'project'
  const [format, setFormat] = useState<ExportFormat>('txt')
  const [showTitles, setShowTitles] = useState(true)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [step, setStep] = useState<'options' | 'preview'>('options')
  const [sections, setSections] = useState<SectionData[] | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const font = project?.settings?.font ?? 'Georgia'
  const fontSize = project?.settings?.fontSize ?? 18

  // Front matter / back matter entries for checkboxes
  const frontMatterEntries = flattenEntries(project?.frontMatter ?? []).filter(e => e.type === 'section')
  const backMatterEntries = flattenEntries(project?.backMatter ?? []).filter(e => e.type === 'section')

  function toggleExcluded(id: string) {
    setExcludedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleFormats = FORMAT_OPTIONS.filter(f => scope === 'project' || !f.projectOnly)

  // ── Preview builders ──────────────────────────────────────────────────────

  function buildProjectPreview(loaded: SectionData[], fmt: ExportFormat, titles: boolean): string {
    if (fmt === 'txt') return buildPlainTextPreview(loaded, titles)
    if (fmt === 'md') return buildMarkdownPreview(loaded, titles)
    if (fmt === 'manuscript') return buildManuscriptPreview(loaded, { title: project!.title, author: project!.author, authorInfo: project!.authorInfo }, titles)
    if (fmt === 'html') return buildHtmlMulti(loaded, project!.title, font, fontSize, titles)
    // pdf and doc use the same styled preview
    return buildPrintHtmlMulti(loaded, project!.title, font, fontSize, titles)
  }

  // ── Load project sections on preview ──────────────────────────────────────

  useEffect(() => {
    if (step !== 'preview' || scope !== 'project' || !project || !handle) return
    if (sections) {
      const filtered = sections.filter(s => !excludedIds.has(s.id))
      setPreviewHtml(buildProjectPreview(filtered, format, showTitles))
      return
    }
    let cancelled = false
    setLoading(true)

    loadAllSections(project, handle)
      .then(loaded => {
        if (cancelled) return
        setSections(loaded)
        const filtered = loaded.filter(s => !excludedIds.has(s.id))
        setPreviewHtml(buildProjectPreview(filtered, format, showTitles))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          showToast('Failed to load preview.', 'error')
          setStep('options')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, scope, project, handle])

  // Build section-scope preview
  useEffect(() => {
    if (step !== 'preview' || scope !== 'section' || !sectionContext) return
    setPreviewHtml(buildSectionPreview(sectionContext.html, format, sectionContext.title, font, fontSize))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, scope, format, sectionContext])

  // Rebuild project preview when format/options/exclusions change
  useEffect(() => {
    if (step !== 'preview' || scope !== 'project' || !sections) return
    const filtered = sections.filter(s => !excludedIds.has(s.id))
    setPreviewHtml(buildProjectPreview(filtered, format, showTitles))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, showTitles, excludedIds])

  // ── Export handler ────────────────────────────────────────────────────────

  async function handleExport() {
    if (!project) return
    setExporting(true)

    try {
      if (scope === 'section' && sectionContext) {
        exportSection(sectionContext.title, sectionContext.html)
      } else {
        await exportProject()
      }
    } catch {
      showToast('Export failed — please try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  function exportSection(title: string, html: string) {
    const slug = slugify(title)

    if (format === 'txt') {
      triggerDownload(htmlToPlainText(html), `${slug}.txt`, 'text/plain;charset=utf-8')
    } else if (format === 'md') {
      triggerDownload(htmlToMarkdown(html), `${slug}.md`, 'text/plain;charset=utf-8')
    } else if (format === 'html') {
      triggerDownload(buildHtmlExport(html, title, font, fontSize), `${slug}.html`, 'text/html;charset=utf-8')
    } else if (format === 'pdf') {
      const printHtml = buildPrintHtml(html, title, font, fontSize)
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(printHtml)
        win.document.close()
        win.focus()
        setTimeout(() => win.print(), 300)
      }
    } else if (format === 'doc') {
      triggerDownload(buildDocHtml(html, title, font, fontSize), `${slug}.doc`, 'application/msword')
    }
    onClose()
  }

  async function exportProject() {
    if (!project || !handle) return

    const data = sections ?? await loadAllSections(project, handle)
    const filtered = data.filter(s => !excludedIds.has(s.id))
    const slug = slugify(project.title)

    if (format === 'txt') {
      triggerDownload(buildPlainTextMulti(filtered, showTitles), `${slug}.txt`, 'text/plain;charset=utf-8')
    } else if (format === 'md') {
      triggerDownload(buildMarkdownMulti(filtered, showTitles), `${slug}.md`, 'text/plain;charset=utf-8')
    } else if (format === 'html') {
      triggerDownload(buildHtmlMulti(filtered, project.title, font, fontSize, showTitles), `${slug}.html`, 'text/html;charset=utf-8')
    } else if (format === 'pdf') {
      const html = buildPrintHtmlMulti(filtered, project.title, font, fontSize, showTitles)
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        win.focus()
        setTimeout(() => win.print(), 300)
      }
    } else if (format === 'doc') {
      triggerDownload(buildDocHtmlMulti(filtered, project.title, font, fontSize, showTitles), `${slug}.doc`, 'application/msword')
    } else if (format === 'manuscript') {
      const today = new Date().toISOString().slice(0, 10)
      const lastName = project.authorInfo?.lastName ?? project.author.trim().split(/\s+/).pop() ?? project.author
      const filename = `${lastName}_${slug}_${today}.doc`
      triggerDownload(
        buildManuscriptHtml(filtered, { title: project.title, author: project.author, authorInfo: project.authorInfo }, showTitles),
        filename,
        'application/msword',
      )
    }
    onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const dialogWidth = step === 'preview' ? 'max-w-[720px]' : 'max-w-[400px]'
  const labelClass = 'text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-1'
  const selectClass = 'w-full h-9 px-3 rounded-sm text-[0.9375rem] text-text bg-bg border border-border outline-none cursor-pointer focus:border-accent'
  const dialogTitle = scope === 'section' ? `Export "${sectionContext!.title}"` : 'Export project'

  return (
    <Dialog title={dialogTitle} width={dialogWidth} onClose={onClose}>
      {step === 'options' && (
        <>
          <div className="px-4 py-4 flex flex-col gap-4 overflow-y-auto max-h-[65vh]">

            {/* Format dropdown */}
            <div>
              <label className={labelClass}>Format</label>
              <select
                className={selectClass}
                value={format}
                onChange={e => setFormat(e.target.value as ExportFormat)}
              >
                {visibleFormats.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Project-scope options */}
            {scope === 'project' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showTitles}
                    onChange={e => setShowTitles(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span className="text-[0.8125rem] text-text">Include section titles</span>
                </label>

                {/* Front matter */}
                {frontMatterEntries.length > 0 && (
                  <div>
                    <div className={labelClass}>Front matter</div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {frontMatterEntries.map(e => (
                        <label key={e.id} className="flex items-center gap-2 cursor-pointer select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!excludedIds.has(e.id)}
                            onChange={() => toggleExcluded(e.id)}
                            className="cursor-pointer"
                          />
                          <span className="text-[0.8125rem] text-text">{e.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Back matter */}
                {backMatterEntries.length > 0 && (
                  <div>
                    <div className={labelClass}>Back matter</div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {backMatterEntries.map(e => (
                        <label key={e.id} className="flex items-center gap-2 cursor-pointer select-none py-0.5">
                          <input
                            type="checkbox"
                            checked={!excludedIds.has(e.id)}
                            onChange={() => toggleExcluded(e.id)}
                            className="cursor-pointer"
                          />
                          <span className="text-[0.8125rem] text-text">{e.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[0.75rem] text-text-placeholder">
                  Exports front matter, draft, and back matter in order. Drawer sections are excluded.
                </p>
              </>
            )}
          </div>

          <div className="flex items-center px-4 py-3 border-t border-border shrink-0">
            <button
              className="px-3 h-8 rounded-sm text-[0.8125rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
              onClick={() => setStep('preview')}
            >
              Preview
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                className="px-3 h-8 rounded-sm text-[0.8125rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="px-3 h-8 rounded-sm text-[0.8125rem] bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'preview' && (
        <>
          <div className="px-4 py-4 flex-1 min-h-0">
            {previewHtml && !loading ? (
              <iframe
                srcDoc={previewHtml}
                sandbox=""
                className="w-full h-[60vh] border border-border rounded-sm bg-white"
              />
            ) : (
              <div className="flex items-center justify-center h-[60vh] text-[0.9375rem] text-text-secondary">
                Loading preview…
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
            <button
              className="px-3 h-8 rounded-sm text-[0.8125rem] text-text-secondary hover:text-text hover:bg-hover transition-colors cursor-pointer"
              onClick={() => { setStep('options'); setPreviewHtml(null) }}
            >
              Back
            </button>
            <button
              className="px-3 h-8 rounded-sm text-[0.8125rem] bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExport}
              disabled={exporting || loading}
            >
              {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  )
}

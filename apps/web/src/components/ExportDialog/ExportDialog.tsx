import { useState, useEffect } from 'react'
import type { SectionManifestEntry } from '@endpapers/types'
import { useProject } from '../../contexts/ProjectContext'
import { useToast } from '../../contexts/ToastContext'
import { readSectionFile } from '../../fs/projectFs'
import Dialog from '../Dialog'

type ExportFormat = 'txt' | 'pdf' | 'doc' | 'manuscript'

const FORMAT_OPTIONS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'txt', label: 'Plain text', description: '.txt — sections joined with page break characters' },
  { value: 'pdf', label: 'PDF', description: 'Opens a print dialog — save as PDF from there' },
  { value: 'doc', label: 'Word document', description: '.doc — uses your editor font and styling' },
  { value: 'manuscript', label: 'Standard manuscript', description: '.doc — Times New Roman, double-spaced, running header, title page' },
]

function flattenEntries(entries: SectionManifestEntry[]): SectionManifestEntry[] {
  return entries.flatMap(e => e.type === 'group' ? (e.children ?? []) : [e])
}

function htmlToPlainText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').forEach(node => {
    node.after(document.createTextNode('\n'))
  })
  el.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  return (el.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

type SectionZone = 'front' | 'draft' | 'back'

interface SectionData { title: string; html: string; zone: SectionZone }

function buildPlainText(sections: SectionData[], showTitles = true): string {
  return sections
    .map(s => {
      const heading = showTitles && s.zone === 'draft' ? `${s.title}\n\n` : ''
      return `${heading}${htmlToPlainText(s.html)}`
    })
    .join('\n\n\f\n\n')
}

function buildPrintHtml(sections: SectionData[], title: string, font: string, fontSize: number, showTitles = true): string {
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

function buildDocHtml(sections: SectionData[], title: string, font: string, fontSize: number, showTitles = true): string {
  const fontPt = Math.round(fontSize * 0.75) // px to pt
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

function buildManuscriptHtml(sections: SectionData[], project: { title: string; author: string; authorInfo?: { firstName?: string; lastName?: string; phone?: string; email?: string } }, showTitles = true): string {
  const authorInfo = project.authorInfo
  const displayName = authorInfo?.firstName || authorInfo?.lastName
    ? [authorInfo.firstName, authorInfo.lastName].filter(Boolean).join(' ')
    : project.author
  const lastName = authorInfo?.lastName ?? project.author.trim().split(/\s+/).pop() ?? project.author
  const headerLastName = lastName.toUpperCase()
  const headerTitle = project.title.toUpperCase().slice(0, 35)

  const wordCount = sections.reduce((acc, s) => {
    return acc + htmlToPlainText(s.html).split(/\s+/).filter(Boolean).length
  }, 0)
  const approxWords = `Approx. ${Math.round(wordCount / 100) * 100} words`

  // Build title-page contact block
  const contactLines = [
    displayName,
    authorInfo?.phone,
    authorInfo?.email,
    approxWords,
  ].filter(Boolean)

  // ~10 blank lines to push title toward vertical center of title page
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
${contactLines.map(line => `<p class="ni" style="text-align:right">${escHtml(line!)}</p>`).join('\n')}
${spacers}
<p class="ni" style="text-align:center"><strong>${escHtml(project.title)}</strong></p>
<p class="ni" style="text-align:center">by</p>
<p class="ni" style="text-align:center">${escHtml(displayName)}</p>
${sectionsHtml}
<p class="ni" style="text-align:center">The End</p>
</body>
</html>`
}

// ── Preview builders (browser-friendly versions) ─────────────────────────────

function buildPlainTextPreview(sections: SectionData[], showTitles = true): string {
  const plainText = buildPlainText(sections, showTitles)
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

function buildManuscriptPreview(sections: SectionData[], project: { title: string; author: string; authorInfo?: { firstName?: string; lastName?: string; phone?: string; email?: string } }, showTitles = true): string {
  const authorInfo = project.authorInfo
  const displayName = authorInfo?.firstName || authorInfo?.lastName
    ? [authorInfo.firstName, authorInfo.lastName].filter(Boolean).join(' ')
    : project.author
  const lastName = authorInfo?.lastName ?? project.author.trim().split(/\s+/).pop() ?? project.author
  const headerLastName = lastName.toUpperCase()
  const headerTitle = project.title.toUpperCase().slice(0, 35)

  const wordCount = sections.reduce((acc, s) => {
    return acc + htmlToPlainText(s.html).split(/\s+/).filter(Boolean).length
  }, 0)
  const approxWords = `Approx. ${Math.round(wordCount / 100) * 100} words`

  const contactLines = [
    displayName,
    authorInfo?.phone,
    authorInfo?.email,
    approxWords,
  ].filter(Boolean)

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
${contactLines.map(line => `<p class="ni" style="text-align:right">${escHtml(line!)}</p>`).join('\n')}
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

interface Props {
  onClose: () => void
}

export default function ExportDialog({ onClose }: Props) {
  const { project, handle } = useProject()
  const { showToast } = useToast()
  const [format, setFormat] = useState<ExportFormat>('txt')
  const [showTitles, setShowTitles] = useState(true)
  const [step, setStep] = useState<'options' | 'preview'>('options')
  const [sections, setSections] = useState<SectionData[] | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const font = project?.settings?.font ?? 'Georgia'
  const fontSize = project?.settings?.fontSize ?? 18

  function buildPreview(loaded: SectionData[], fmt: ExportFormat): string {
    if (fmt === 'txt') return buildPlainTextPreview(loaded, showTitles)
    if (fmt === 'manuscript') return buildManuscriptPreview(loaded, { title: project!.title, author: project!.author, authorInfo: project!.authorInfo }, showTitles)
    // PDF and doc use the same editor-styled preview
    return buildPrintHtml(loaded, project!.title, font, fontSize, showTitles)
  }

  // Load sections when entering preview step
  useEffect(() => {
    if (step !== 'preview' || !project || !handle) return
    if (sections) {
      // Already loaded — just rebuild preview for current format
      setPreviewHtml(buildPreview(sections, format))
      return
    }
    let cancelled = false
    setLoading(true)

    async function loadSections() {
      const taggedEntries: { entry: SectionManifestEntry; zone: SectionZone }[] = [
        ...flattenEntries(project!.frontMatter ?? []).map(e => ({ entry: e, zone: 'front' as const })),
        ...flattenEntries(project!.sections ?? []).map(e => ({ entry: e, zone: 'draft' as const })),
        ...flattenEntries(project!.backMatter ?? []).map(e => ({ entry: e, zone: 'back' as const })),
      ].filter(({ entry: e }) => e.type === 'section' && e.file)

      const loaded = await Promise.all(
        taggedEntries.map(async ({ entry: e, zone }) => ({
          title: e.title,
          html: await readSectionFile(handle!, e.file!),
          zone,
        }))
      )

      if (cancelled) return
      setSections(loaded)
      setPreviewHtml(buildPreview(loaded, format))
      setLoading(false)
    }

    loadSections().catch(() => {
      if (!cancelled) {
        showToast('Failed to load preview.', 'error')
        setStep('options')
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, project, handle])

  // Rebuild preview when format or options change while on preview step
  useEffect(() => {
    if (step !== 'preview' || !sections) return
    setPreviewHtml(buildPreview(sections, format))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, showTitles])

  async function handleExport() {
    if (!project || !handle) return
    setExporting(true)

    try {
      // Use cached sections if available, otherwise load fresh
      let data = sections
      if (!data) {
        const taggedEntries: { entry: SectionManifestEntry; zone: SectionZone }[] = [
          ...flattenEntries(project.frontMatter ?? []).map(e => ({ entry: e, zone: 'front' as const })),
          ...flattenEntries(project.sections ?? []).map(e => ({ entry: e, zone: 'draft' as const })),
          ...flattenEntries(project.backMatter ?? []).map(e => ({ entry: e, zone: 'back' as const })),
        ].filter(({ entry: e }) => e.type === 'section' && e.file)

        data = await Promise.all(
          taggedEntries.map(async ({ entry: e, zone }) => ({
            title: e.title,
            html: await readSectionFile(handle, e.file!),
            zone,
          }))
        )
      }

      if (format === 'txt') {
        triggerDownload(buildPlainText(data, showTitles), `${project.title}.txt`, 'text/plain;charset=utf-8')
        onClose()
      } else if (format === 'pdf') {
        const html = buildPrintHtml(data, project.title, font, fontSize, showTitles)
        const win = window.open('', '_blank')
        if (win) {
          win.document.write(html)
          win.document.close()
          win.focus()
          setTimeout(() => win.print(), 300)
        }
        onClose()
      } else if (format === 'doc') {
        const titleSlug = project.title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
        triggerDownload(
          buildDocHtml(data, project.title, font, fontSize, showTitles),
          `${titleSlug}.doc`,
          'application/msword',
        )
        onClose()
      } else {
        const today = new Date().toISOString().slice(0, 10)
        const lastName = project.authorInfo?.lastName ?? project.author.trim().split(/\s+/).pop() ?? project.author
        const titleSlug = project.title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
        const filename = `${lastName}_${titleSlug}_${today}.doc`
        triggerDownload(
          buildManuscriptHtml(data, { title: project.title, author: project.author, authorInfo: project.authorInfo }, showTitles),
          filename,
          'application/msword',
        )
        onClose()
      }
    } catch {
      showToast('Export failed — please try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const dialogWidth = step === 'preview' ? 'max-w-[720px]' : 'max-w-[400px]'

  return (
    <Dialog title="Export" width={dialogWidth} onClose={onClose}>
      {step === 'options' && (
        <>
          <div className="px-4 py-4 flex flex-col gap-1">
            <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-secondary mb-1">
              Format
            </label>
            {FORMAT_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer select-none py-1.5">
                <input
                  type="radio"
                  name="export-format"
                  value={opt.value}
                  checked={format === opt.value}
                  onChange={() => setFormat(opt.value)}
                  className="mt-0.5 cursor-pointer"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[0.875rem] text-text">{opt.label}</span>
               </span>
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer select-none mt-2 py-1">
              <input
                type="checkbox"
                checked={showTitles}
                onChange={e => setShowTitles(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-[0.8125rem] text-text">Include section titles</span>
            </label>
            <p className="text-[0.75rem] text-text-placeholder mt-2">
              Exports front matter, draft, and back matter in order. Drawer sections are excluded.
            </p>
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
          {/* Format selector in preview header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
            <span className="text-[0.75rem] text-text-secondary shrink-0">Format:</span>
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`px-2.5 h-7 rounded-sm text-[0.8125rem] transition-colors cursor-pointer ${
                  format === opt.value
                    ? 'text-text bg-active'
                    : 'text-text-secondary hover:text-text hover:bg-hover'
                }`}
                onClick={() => setFormat(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            <div className="w-px h-4 bg-border" />
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTitles}
                onChange={e => setShowTitles(e.target.checked)}
                className="cursor-pointer"
              />
              <span className="text-[0.75rem] text-text-secondary">Section titles</span>
            </label>
          </div>

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

export function htmlToPlainText(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').forEach(node => {
    node.after(document.createTextNode('\n'))
  })
  el.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  return (el.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

export function htmlToMarkdown(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html

  function walkChildren(node: Node): string {
    return Array.from(node.childNodes).map(walk).join('')
  }

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const tag = (node as Element).tagName
    const inner = walkChildren(node)

    switch (tag) {
      case 'H1': return `# ${inner.trim()}\n\n`
      case 'H2': return `## ${inner.trim()}\n\n`
      case 'H3': return `### ${inner.trim()}\n\n`
      case 'P': return `${inner.trim()}\n\n`
      case 'BR': return '\n'
      case 'STRONG':
      case 'B': return `**${inner}**`
      case 'EM':
      case 'I': return `*${inner}*`
      case 'U': return inner // no standard markdown for underline
      case 'S': return `~~${inner}~~`
      case 'CODE': return `\`${inner}\``
      case 'PRE': return `\`\`\`\n${inner.trim()}\n\`\`\`\n\n`
      case 'BLOCKQUOTE': return inner.trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n'
      case 'UL': return walkList(node, false)
      case 'OL': return walkList(node, true)
      case 'LI': return inner.trim()
      case 'IMG': {
        const src = (node as Element).getAttribute('src') ?? ''
        const alt = (node as Element).getAttribute('alt') ?? ''
        return `![${alt}](${src})`
      }
      default: return inner
    }
  }

  function walkList(node: Node, ordered: boolean): string {
    let idx = 1
    const lines: string[] = []
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName === 'LI') {
        const prefix = ordered ? `${idx}. ` : '- '
        lines.push(`${prefix}${walkChildren(child).trim()}`)
        idx++
      }
    }
    return lines.join('\n') + '\n\n'
  }

  return walkChildren(el).replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildPrintHtml(sectionHtml: string, title: string, font: string, fontSize: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  @page { margin: 1in; }
  body { font-family: ${escHtml(font)}, serif; font-size: ${fontSize}px; line-height: 1.7; margin: 0; color: #000; }
  * { font-family: ${escHtml(font)}, serif; }
  .page { padding: 1in; }
  p { margin: 0 0 0.875rem; }
  h1 { text-align: center; text-indent: 0; margin: 0 0 1em; page-break-after: avoid; }
  h2, h3 { text-indent: 0; margin: 0; }
  @media print {
    .page { padding: 0; }
  }
</style>
</head>
<body><div class="page">${sectionHtml}</div></body>
</html>`
}

export function buildDocHtml(sectionHtml: string, title: string, font: string, fontSize: number): string {
  const fontPt = Math.round(fontSize * 0.75)
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
</style>
</head>
<body>
${sectionHtml}
</body>
</html>`
}

export function buildHtmlExport(sectionHtml: string, title: string, font: string, fontSize: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>
  body { font-family: ${escHtml(font)}, serif; font-size: ${fontSize}px; line-height: 1.7; margin: 2em; color: #000; }
  p { margin: 0 0 0.875rem; }
  h1, h2, h3 { margin: 0 0 0.5em; }
</style>
</head>
<body>
${sectionHtml}
</body>
</html>`
}

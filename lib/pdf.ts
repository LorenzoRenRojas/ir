// Client-side PDF export for generated documents.
//
// These are the CUSTOMER'S documents (a capability statement, proposal, etc.)
// that they submit to the government as their own company — so pages are NOT
// IR-branded. IR appears only as a small footer credit, alongside a standing
// legal disclaimer required on anything auto-generated.

const DISCLAIMER = 'DRAFT — review with qualified legal counsel before submission to any government agency.'
const CREDIT = 'Prepared with IR · ir-gov.app'

type Seg = { text: string; bold: boolean; italic: boolean }

// Walk a DOM node into styled inline text segments (bold via <strong>/<b>,
// italic via <em>/<i>).
function collectSegments(node: Node, bold = false, italic = false): Seg[] {
  const out: Seg[] = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ')
      if (text) out.push({ text, bold, italic })
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase()
      const b = bold || tag === 'strong' || tag === 'b'
      const i = italic || tag === 'em' || tag === 'i'
      out.push(...collectSegments(child, b, i))
    }
  })
  return out
}

// Render generated HTML (from the document editor) to a properly formatted,
// paginated PDF — headings, rules, paragraphs, lists, inline bold/italic.
export async function downloadHtmlAsPdf(title: string, html: string, filename: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const margin = 56
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const usableW = pageW - margin * 2
  const footerY = pageH - 34
  const bottom = footerY - 22

  let y = margin
  let pageNum = 1

  const drawFooter = () => {
    doc.setDrawColor(215, 215, 215); doc.setLineWidth(0.5)
    doc.line(margin, footerY - 10, pageW - margin, footerY - 10)
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(135, 135, 135)
    doc.text(doc.splitTextToSize(DISCLAIMER, usableW - 40), margin, footerY)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(165, 165, 165)
    doc.text(String(pageNum), pageW - margin, footerY, { align: 'right' })
    doc.text(CREDIT, margin, footerY + 10)
  }
  const newPage = () => { drawFooter(); doc.addPage(); pageNum++; y = margin }
  const ensure = (h: number) => { if (y + h > bottom) newPage() }

  // Lay out a run of styled segments with word wrap, a base font, and an
  // optional hanging prefix (for list bullets/numbers).
  const paragraph = (
    segs: Seg[],
    o: { family: string; baseBold: boolean; size: number; lineH: number; before: number; after: number; indent?: number; prefix?: string; keep?: number }
  ) => {
    const indent = o.indent ?? 0
    const textX = margin + indent
    doc.setFontSize(o.size); doc.setTextColor(28, 28, 28)
    // `keep` reserves extra space so a heading is never orphaned at the bottom
    // of a page with its following content pushed to the next one.
    ensure(o.before + o.lineH + (o.keep ?? 0))
    y += o.before

    // hanging prefix (bullet / number)
    let startX = textX
    if (o.prefix) {
      doc.setFont(o.family, o.baseBold ? 'bold' : 'normal')
      doc.text(o.prefix, textX, y)
      startX = textX + doc.getTextWidth(o.prefix)
    }
    const lineRight = pageW - margin
    let x = startX

    const words: Seg[] = []
    for (const s of segs) {
      for (const w of s.text.split(' ')) {
        if (w) words.push({ text: w, bold: s.bold, italic: s.italic })
      }
    }
    if (words.length === 0) { y += o.lineH + o.after; return }

    for (const w of words) {
      const style = o.baseBold || w.bold ? (w.italic ? 'bolditalic' : 'bold') : (w.italic ? 'italic' : 'normal')
      doc.setFont(o.family, style)
      const wordW = doc.getTextWidth(w.text)
      const spaceW = doc.getTextWidth(' ')
      if (x + wordW > lineRight && x > startX) {
        y += o.lineH
        if (y > bottom) { newPage(); y += 0 }
        x = startX
      }
      doc.setFont(o.family, style)
      doc.text(w.text, x, y)
      x += wordW + spaceW
    }
    y += o.lineH + o.after
  }

  const root = new DOMParser().parseFromString(html, 'text/html').body

  const renderBlock = (el: Element) => {
    const tag = el.tagName.toLowerCase()
    if (tag === 'hr') {
      ensure(16); y += 8
      doc.setDrawColor(60, 60, 60); doc.setLineWidth(0.7)
      doc.line(margin, y, pageW - margin, y)
      y += 12
      return
    }
    if (tag === 'h1') return paragraph(collectSegments(el), { family: 'helvetica', baseBold: true, size: 17, lineH: 20, before: 4, after: 4, keep: 34 })
    if (tag === 'h2') return paragraph(collectSegments(el), { family: 'helvetica', baseBold: true, size: 12, lineH: 15, before: 16, after: 5, keep: 32 })
    if (tag === 'h3') return paragraph(collectSegments(el), { family: 'helvetica', baseBold: true, size: 11, lineH: 14, before: 11, after: 4, keep: 30 })
    if (tag === 'ul' || tag === 'ol') {
      let n = 1
      el.querySelectorAll(':scope > li').forEach((li) => {
        const prefix = tag === 'ol' ? `${n++}.  ` : '•  '
        paragraph(collectSegments(li), { family: 'times', baseBold: false, size: 11, lineH: 15, before: 1, after: 1, indent: 16, prefix })
      })
      y += 6
      return
    }
    // p, div, or anything else → body paragraph
    paragraph(collectSegments(el), { family: 'times', baseBold: false, size: 11, lineH: 15, before: 0, after: 8 })
  }

  const kids = Array.from(root.children)
  if (kids.length === 0) {
    // Plain-text fallback (legacy docs without HTML structure)
    paragraph([{ text: root.textContent ?? title, bold: false, italic: false }], { family: 'times', baseBold: false, size: 11, lineH: 15, before: 0, after: 8 })
  } else {
    kids.forEach(renderBlock)
  }

  drawFooter()
  doc.save(filename)
}

// Legacy plain-text export (kept for any text-only content). Renders monospace.
export async function downloadTextAsPdf(title: string, content: string, filename: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 54
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const usableW = pageW - margin * 2
  const footerY = pageH - 32

  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.5)
    doc.line(margin, footerY - 10, pageW - margin, footerY - 10)
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6.5); doc.setTextColor(130, 130, 130)
    doc.text(doc.splitTextToSize(DISCLAIMER, usableW - 40), margin, footerY)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160)
    doc.text(String(pageNum), pageW - margin, footerY, { align: 'right' })
    doc.text(CREDIT, margin, footerY + 10)
  }

  doc.setTextColor(20, 20, 20); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  const titleLines = doc.splitTextToSize(title, usableW)
  doc.text(titleLines, margin, margin + 6)
  doc.setDrawColor(20, 20, 20); doc.setLineWidth(1)
  const ruleY = margin + 6 + titleLines.length * 15 + 4
  doc.line(margin, ruleY, pageW - margin, ruleY)

  doc.setFont('courier', 'normal'); doc.setFontSize(8.5)
  const lineHeight = 11
  let y = ruleY + 18
  let pageNum = 1
  for (const line of doc.splitTextToSize(content, usableW) as string[]) {
    if (y > footerY - 24) { drawFooter(pageNum); doc.addPage(); pageNum++; y = margin }
    doc.setTextColor(30, 30, 30); doc.text(line, margin, y); y += lineHeight
  }
  drawFooter(pageNum)
  doc.save(filename)
}

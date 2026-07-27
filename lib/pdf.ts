// Client-side PDF export for generated documents.
//
// These are the CUSTOMER'S documents — a capability statement or proposal they
// submit to the government as their own company. So the page is NOT branded
// with IR: the content carries the company's own identity. IR appears only as
// a small footer credit (subtle, right-audience marketing), alongside a
// standing legal disclaimer required on anything auto-generated.
export async function downloadTextAsPdf(title: string, content: string, filename: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const margin = 54
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const usableW = pageW - margin * 2
  const footerY = pageH - 32

  const DISCLAIMER = 'DRAFT — review with qualified legal counsel before submission to any government agency.'
  const CREDIT = 'Prepared with IR · ir-gov.app'

  // Footer drawn on every page: thin rule, disclaimer (left), page number
  // (right), and a small IR credit line beneath. Kept grey and small so it
  // never competes with the company's own document.
  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.5)
    doc.line(margin, footerY - 10, pageW - margin, footerY - 10)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.setTextColor(130, 130, 130)
    const discLines = doc.splitTextToSize(DISCLAIMER, usableW - 40)
    doc.text(discLines, margin, footerY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text(String(pageNum), pageW - margin, footerY, { align: 'right' })
    doc.text(CREDIT, margin, footerY + 10)
  }

  // Document title (the company's document heading) — no IR mark
  doc.setTextColor(20, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  const titleLines = doc.splitTextToSize(title, usableW)
  doc.text(titleLines, margin, margin + 6)

  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(1)
  const ruleY = margin + 6 + titleLines.length * 15 + 4
  doc.line(margin, ruleY, pageW - margin, ruleY)

  doc.setFont('courier', 'normal')
  doc.setFontSize(8.5)
  const lineHeight = 11
  let y = ruleY + 18
  let pageNum = 1

  const lines: string[] = doc.splitTextToSize(content, usableW)
  for (const line of lines) {
    if (y > footerY - 24) {
      drawFooter(pageNum)
      doc.addPage()
      pageNum++
      y = margin
    }
    doc.setTextColor(30, 30, 30)
    doc.text(line, margin, y)
    y += lineHeight
  }
  drawFooter(pageNum)

  doc.save(filename)
}

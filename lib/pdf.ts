// Client-side PDF export for proposals and capability statements.
// Monospace body on letter-size pages with the IR brand header.
export async function downloadTextAsPdf(title: string, content: string, filename: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const margin = 54
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const usableW = pageW - margin * 2

  // Brand header
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(196, 18, 48)
  doc.setFontSize(14)
  doc.text('IR', margin, margin)
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(7)
  doc.text('GOVCON INTELLIGENCE · IR-GOV.APP', margin + 22, margin)
  doc.setDrawColor(196, 18, 48)
  doc.setLineWidth(1.5)
  doc.line(margin, margin + 8, pageW - margin, margin + 8)

  doc.setTextColor(20, 20, 20)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(title, usableW)
  doc.text(titleLines, margin, margin + 28)

  doc.setFont('courier', 'normal')
  doc.setFontSize(8.5)
  const lineHeight = 11
  let y = margin + 28 + titleLines.length * 14 + 10

  const lines: string[] = doc.splitTextToSize(content, usableW)
  for (const line of lines) {
    if (y > pageH - margin) {
      doc.addPage()
      y = margin
    }
    doc.text(line, margin, y)
    y += lineHeight
  }

  doc.save(filename)
}

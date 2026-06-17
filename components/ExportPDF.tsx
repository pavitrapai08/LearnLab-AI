'use client'

import { useState } from 'react'
import type { RefObject } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportPDFProps {
  targetRef: RefObject<HTMLDivElement | null>
  filename?: string
  label?: string
  title?: string
}

export default function ExportPDF({
  targetRef,
  filename = 'export.pdf',
  label = 'Download PDF',
  title,
}: ExportPDFProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    const el = targetRef.current
    if (!el) return
    setLoading(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()   // 210mm
      const pageH = pdf.internal.pageSize.getHeight()  // 297mm

      // Margins (mm)
      const ml = 12, mr = 12, mt = 22, mb = 16
      const contentW = pageW - ml - mr   // 186mm
      const contentH = pageH - mt - mb   // 259mm

      const imgW = contentW
      const imgH = (canvas.height * contentW) / canvas.width
      const totalPages = Math.ceil(imgH / contentH)

      for (let page = 1; page <= totalPages; page++) {
        const yShift = (page - 1) * contentH

        // 1. Draw image (may bleed into header/footer zones — covered below).
        pdf.addImage(imgData, 'PNG', ml, mt - yShift, imgW, imgH)

        // 2. White bands to mask image bleed into header + footer zones.
        pdf.setFillColor(255, 255, 255)
        pdf.rect(0, 0, pageW, mt, 'F')
        pdf.rect(0, pageH - mb, pageW, mb, 'F')
        // Also mask left and right gutters.
        pdf.rect(0, 0, ml, pageH, 'F')
        pdf.rect(pageW - mr, 0, mr, pageH, 'F')

        // 3. Header.
        pdf.setFontSize(7.5)
        pdf.setTextColor(160, 160, 160)
        pdf.text('LearnLab AI', ml, 8)
        if (title) {
          pdf.setFontSize(10)
          pdf.setTextColor(26, 31, 54)   // brand navy
          pdf.text(title.slice(0, 70), ml, 16)
        }
        pdf.setDrawColor(220, 220, 220)
        pdf.setLineWidth(0.3)
        pdf.line(ml, mt - 2, pageW - mr, mt - 2)

        // 4. Footer.
        const footerLineY = pageH - mb + 2
        pdf.line(ml, footerLineY, pageW - mr, footerLineY)
        pdf.setFontSize(7)
        pdf.setTextColor(160, 160, 160)
        pdf.text('AI-generated — verify with your textbook.', ml, pageH - 5)
        pdf.text(`Page ${page} of ${totalPages}`, pageW - mr, pageH - 5, { align: 'right' })

        if (page < totalPages) pdf.addPage()
      }

      pdf.save(filename)
    } catch (e) {
      console.error('PDF export failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="gap-1.5"
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Download className="h-3.5 w-3.5" />}
      {loading ? 'Exporting…' : label}
    </Button>
  )
}

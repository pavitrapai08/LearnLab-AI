'use client'

import { useState } from 'react'
import type { RefObject } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportPDFProps {
  targetRef: RefObject<HTMLDivElement | null>
  filename?: string
  label?: string
}

export default function ExportPDF({
  targetRef,
  filename = 'export.pdf',
  label = 'Download PDF',
}: ExportPDFProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    const el = targetRef.current
    if (!el) return
    setLoading(true)
    try {
      // Dynamic imports keep jsPDF + html2canvas out of the main bundle.
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      // html2canvas captures the rendered DOM → all scripts (incl. Indic) render via the browser.
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgW = pageW
      const imgH = (canvas.height * pageW) / canvas.width
      let yOffset = 0
      let remaining = imgH

      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, -yOffset, imgW, imgH)
        remaining -= pageH
        if (remaining > 0) {
          pdf.addPage()
          yOffset += pageH
        }
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

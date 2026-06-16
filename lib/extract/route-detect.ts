import type { SourceType } from '@/lib/validation'
import { extractPdfText, isScannedPdf } from './pdf'

export type ExtractionRoute = 'text-pdf' | 'scanned-pdf' | 'docx' | 'image'

export type RouteDetectResult =
  | { route: 'text-pdf'; text: string; numpages: number }
  | { route: 'scanned-pdf'; numpages: number }
  | { route: 'docx' }
  | { route: 'image' }

export async function detectRoute(
  buffer: Buffer,
  sourceType: SourceType,
): Promise<RouteDetectResult> {
  if (sourceType === 'docx') return { route: 'docx' }
  if (sourceType === 'image') return { route: 'image' }

  // PDF: attempt text extraction to detect whether it is scanned.
  const { text, numpages } = await extractPdfText(buffer)
  if (isScannedPdf(text, numpages)) {
    return { route: 'scanned-pdf', numpages }
  }
  return { route: 'text-pdf', text, numpages }
}

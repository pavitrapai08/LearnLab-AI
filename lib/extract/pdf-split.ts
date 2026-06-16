import { PDFDocument } from 'pdf-lib'

export const PAGE_BATCH_SIZE = 5
export const PAGE_CAP = 50

export type PdfChunk = {
  base64: string
  pageStart: number
  pageEnd: number
}

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const doc = await PDFDocument.load(buffer, { updateMetadata: false })
  return doc.getPageCount()
}

export async function splitPdfRange(
  buffer: Buffer,
  pageStart: number,
  pageEnd: number,
): Promise<PdfChunk> {
  const srcDoc = await PDFDocument.load(buffer, { updateMetadata: false })
  const total = srcDoc.getPageCount()
  const start = Math.max(1, pageStart)
  const end = Math.min(pageEnd, total, PAGE_CAP)

  const dstDoc = await PDFDocument.create()
  const indices: number[] = []
  for (let i = start - 1; i < end; i++) indices.push(i)

  const copied = await dstDoc.copyPages(srcDoc, indices)
  copied.forEach(p => dstDoc.addPage(p))

  const bytes = await dstDoc.save()
  return {
    base64: Buffer.from(bytes).toString('base64'),
    pageStart: start,
    pageEnd: end,
  }
}

// Given total pages, return the end of the next batch from pageStart.
export function calcBatchEnd(pageStart: number, totalPages: number): number {
  return Math.min(pageStart + PAGE_BATCH_SIZE - 1, Math.min(totalPages, PAGE_CAP))
}

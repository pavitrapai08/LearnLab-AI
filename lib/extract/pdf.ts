export type PdfExtractResult = { text: string; numpages: number }

export async function extractPdfText(buffer: Buffer): Promise<PdfExtractResult> {
  // Import the lib entry point directly to avoid the test-PDF read that crashes Vercel serverless.
  // pdf-parse is pinned to 1.1.1 in package.json (CLAUDE.md §2).
  // Cast required: TypeScript does not have types for this internal module path.
  const mod = (await import('pdf-parse/lib/pdf-parse.js' as string)) as { default?: (b: Buffer) => Promise<{ text: string; numpages: number }>; (b: Buffer): Promise<{ text: string; numpages: number }> }
  const pdfParse = mod.default ?? mod
  const result = await pdfParse(buffer)
  return { text: result.text ?? '', numpages: result.numpages ?? 0 }
}

// Heuristic: fewer than 30 non-whitespace chars per page on average → file is scanned.
export function isScannedPdf(text: string, numpages: number): boolean {
  const chars = text.replace(/\s+/g, '').length
  return chars < Math.max(50, numpages * 30)
}

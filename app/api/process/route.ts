import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient, getVerifiedUser } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/throttle'
import type { SourceType } from '@/lib/validation'
import { detectRoute } from '@/lib/extract/route-detect'
import { extractDocxText } from '@/lib/extract/docx'
import { extractScannedPdfText } from '@/lib/claude'
import { splitPdfRange, calcBatchEnd, PAGE_CAP } from '@/lib/extract/pdf-split'
import { processImageBuffer } from '@/lib/extract/image'

export const maxDuration = 60

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(req: NextRequest) {
  const user = await getVerifiedUser()
  if (!user) return err('UNAUTHORIZED', 'Not authenticated', 401)
  const uid = user.id

  const { limited } = await checkRateLimit(req, 'process')
  if (limited) return err('RATE_LIMITED', 'Too many requests — please wait a moment', 429)

  let body: {
    storagePath?: string
    pasteText?: string
    sourceType: string
    documentId?: string
    pageStart?: number
    pageEnd?: number
  }
  try {
    body = await req.json()
  } catch {
    return err('BAD_REQUEST', 'Invalid JSON', 400)
  }

  const { storagePath, pasteText, sourceType, documentId, pageStart, pageEnd } = body
  const supabase = createClient()

  // ── Paste ──────────────────────────────────────────────
  if (sourceType === 'paste') {
    const text = pasteText?.trim()
    if (!text) return err('EMPTY_CONTENT', 'No text provided', 400)
    const { data: doc, error } = await supabase
      .from('documents')
      .insert({ session_id: uid, source_type: 'paste', extracted_text: text, pages: 0, pages_done: 0, status: 'ready' })
      .select('id')
      .single()
    if (error || !doc) return err('EXTRACTION_FAILED', 'Could not save document', 500)
    return NextResponse.json({ documentId: doc.id, text, pages: 0, pagesDone: 0, status: 'ready' })
  }

  // ── File upload ─────────────────────────────────────────
  if (!storagePath) return err('BAD_REQUEST', 'storagePath is required', 400)

  // IDOR guard: reject any path not under the verified caller's uid folder.
  if (!storagePath.startsWith(`${uid}/`)) {
    return err('UNAUTHORIZED', 'Access denied', 401)
  }

  const serviceClient = createServiceClient()

  // For subsequent scanned-PDF batches, look up the real storage path from DB (RLS-protected).
  let resolvedPath = storagePath
  if (documentId) {
    const { data: existing } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single()
    if (existing?.storage_path) resolvedPath = existing.storage_path as string
  }

  const { data: blob, error: dlErr } = await serviceClient.storage.from('uploads').download(resolvedPath)
  if (dlErr || !blob) return err('EXTRACTION_FAILED', 'Could not retrieve file', 400)

  const buffer = Buffer.from(await blob.arrayBuffer())
  const srcType = sourceType as SourceType

  try {
    // ── DOCX ───────────────────────────────────────────────
    if (srcType === 'docx') {
      const text = await extractDocxText(buffer)
      if (!text.trim()) return err('EMPTY_CONTENT', 'No text found in document', 400)
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({ session_id: uid, source_type: 'docx', storage_path: storagePath, extracted_text: text, pages: 1, pages_done: 1, status: 'ready' })
        .select('id')
        .single()
      if (error || !doc) return err('EXTRACTION_FAILED', 'Could not save document', 500)
      await serviceClient.storage.from('uploads').remove([storagePath])
      return NextResponse.json({ documentId: doc.id, text, pages: 1, pagesDone: 1, status: 'ready' })
    }

    // ── Image ──────────────────────────────────────────────
    if (srcType === 'image') {
      const mime = storagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'
      const text = await processImageBuffer(buffer, mime as 'image/jpeg' | 'image/png')
      if (!text.trim()) return err('EMPTY_CONTENT', 'No text found in image', 400)
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({ session_id: uid, source_type: 'image', storage_path: storagePath, extracted_text: text, pages: 1, pages_done: 1, status: 'ready' })
        .select('id')
        .single()
      if (error || !doc) return err('EXTRACTION_FAILED', 'Could not save document', 500)
      await serviceClient.storage.from('uploads').remove([storagePath])
      return NextResponse.json({ documentId: doc.id, text, pages: 1, pagesDone: 1, status: 'ready' })
    }

    // ── PDF ────────────────────────────────────────────────
    const route = await detectRoute(buffer, 'pdf')

    if (route.route === 'text-pdf') {
      const text = route.text
      if (!text?.trim()) return err('EMPTY_CONTENT', 'No text found in PDF', 400)
      const pages = Math.min(route.numpages, PAGE_CAP)
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({ session_id: uid, source_type: 'pdf', storage_path: storagePath, extracted_text: text, pages, pages_done: pages, status: 'ready' })
        .select('id')
        .single()
      if (error || !doc) return err('EXTRACTION_FAILED', 'Could not save document', 500)
      await serviceClient.storage.from('uploads').remove([storagePath])
      return NextResponse.json({ documentId: doc.id, text, pages, pagesDone: pages, status: 'ready' })
    }

    // Scanned PDF — one batch at a time (client-driven, TECH_SPEC §6).
    // detectRoute() called with 'pdf' so only text-pdf or scanned-pdf can reach here.
    if (route.route !== 'scanned-pdf') return err('EXTRACTION_FAILED', 'Unexpected extraction route', 500)
    const totalPages = route.numpages
    const pagesTotal = Math.min(totalPages, PAGE_CAP)
    const pStart = pageStart ?? 1
    const pEnd = pageEnd ?? calcBatchEnd(pStart, totalPages)

    const chunk = await splitPdfRange(buffer, pStart, pEnd)
    const batchText = await extractScannedPdfText(chunk.base64)
    const pagesDone = chunk.pageEnd
    const isDone = pagesDone >= pagesTotal
    const status = isDone ? 'ready' : 'processing'

    if (documentId) {
      // Subsequent batch: read existing text, append, update.
      const { data: existing } = await supabase
        .from('documents')
        .select('extracted_text')
        .eq('id', documentId)
        .single()
      const combined = ((existing?.extracted_text as string) ?? '') + '\n' + batchText
      await supabase
        .from('documents')
        .update({ extracted_text: combined, pages_done: pagesDone, status })
        .eq('id', documentId)
      if (isDone) await serviceClient.storage.from('uploads').remove([resolvedPath])
      return NextResponse.json({ documentId, text: batchText, pages: pagesTotal, pagesDone, status })
    }

    // First batch: create document row.
    const { data: doc, error } = await supabase
      .from('documents')
      .insert({
        session_id: uid,
        source_type: 'pdf',
        storage_path: storagePath,
        extracted_text: batchText,
        pages: pagesTotal,
        pages_done: pagesDone,
        status,
      })
      .select('id')
      .single()
    if (error || !doc) return err('EXTRACTION_FAILED', 'Could not save document', 500)
    if (isDone) await serviceClient.storage.from('uploads').remove([storagePath])
    return NextResponse.json({ documentId: doc.id, text: batchText, pages: pagesTotal, pagesDone, status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return err('EXTRACTION_FAILED', `Extraction failed: ${msg}`, 500)
  }
}

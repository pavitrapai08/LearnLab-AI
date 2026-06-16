'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, Camera, ClipboardPaste, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { validateFile, mimeToExtension } from '@/lib/validation'
import { calcBatchEnd, PAGE_CAP } from '@/lib/extract/pdf-split'

type UploadState = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

type Props = {
  onSuccess: (documentId: string, text: string) => void
}

export default function UploadInput({ onSuccess }: Props) {
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)
  const [pasteText, setPasteText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const reset = () => { setState('idle'); setErrorMsg(''); setBatchProgress(null) }

  const processFile = useCallback(async (file: File) => {
    const validation = validateFile({ type: file.type, size: file.size })
    if (!validation.valid) { setErrorMsg(validation.error); setState('error'); return }

    setState('uploading')
    setErrorMsg('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErrorMsg('Session expired — please refresh.'); setState('error'); return }

    const ext = mimeToExtension(file.type)
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('uploads').upload(storagePath, file, { contentType: file.type })
    if (uploadErr) { setErrorMsg('Upload failed. Please try again.'); setState('error'); return }

    setState('processing')
    const sourceType = validation.sourceType

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath, sourceType }),
      })
      const result = await res.json()
      if (!res.ok) { setErrorMsg(result.error?.message ?? 'Processing failed.'); setState('error'); return }

      // Scanned PDF batching
      if (result.status === 'processing') {
        let docId: string = result.documentId
        let allText: string = result.text
        let pagesDone: number = result.pagesDone
        const pagesTotal: number = result.pages

        while (pagesDone < pagesTotal) {
          setBatchProgress({ done: pagesDone, total: pagesTotal })
          const nextStart = pagesDone + 1
          const nextEnd = calcBatchEnd(nextStart, pagesTotal)
          const batchRes = await fetch('/api/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storagePath, sourceType: 'pdf', documentId: docId, pageStart: nextStart, pageEnd: nextEnd }),
          })
          const batchResult = await batchRes.json()
          if (!batchRes.ok) break
          allText += '\n' + (batchResult.text ?? '')
          pagesDone = batchResult.pagesDone
          docId = batchResult.documentId ?? docId
          if (batchResult.status === 'ready') break
        }

        setBatchProgress(null)
        setState('done')
        onSuccess(docId, allText)
        return
      }

      setState('done')
      onSuccess(result.documentId, result.text)
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setState('error')
    }
  }, [onSuccess])

  const handlePasteSubmit = useCallback(async () => {
    const text = pasteText.trim()
    if (!text) { setErrorMsg('Please paste some text first.'); return }
    setState('processing')
    setErrorMsg('')
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'paste', pasteText: text }),
      })
      const result = await res.json()
      if (!res.ok) { setErrorMsg(result.error?.message ?? 'Could not save text.'); setState('error'); return }
      setState('done')
      onSuccess(result.documentId, result.text)
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setState('error')
    }
  }, [pasteText, onSuccess])

  if (state === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-900 dark:bg-green-950">
        <CheckCircle className="h-8 w-8 text-green-600" />
        <p className="font-medium text-green-800 dark:text-green-200">Content loaded!</p>
        <Button variant="outline" size="sm" onClick={reset}>Use different content</Button>
      </div>
    )
  }

  if (state === 'uploading' || state === 'processing') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-muted/40 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {batchProgress ? (
          <>
            <p className="text-sm font-medium">Reading pages {batchProgress.done + 1}–{Math.min(batchProgress.done + 5, batchProgress.total)} of {batchProgress.total}…</p>
            <Progress value={Math.round((batchProgress.done / batchProgress.total) * 100)} className="w-full max-w-xs" />
          </>
        ) : (
          <p className="text-sm font-medium">{state === 'uploading' ? 'Uploading…' : 'Extracting text…'}</p>
        )}
        {batchProgress && batchProgress.total >= PAGE_CAP && (
          <p className="text-xs text-muted-foreground">Large PDF — processing first {PAGE_CAP} pages only.</p>
        )}
      </div>
    )
  }

  return (
    <Tabs defaultValue="file" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="file">Upload file</TabsTrigger>
        <TabsTrigger value="paste">Paste text</TabsTrigger>
      </TabsList>

      <TabsContent value="file">
        <div
          className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Drop a file or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF (20 MB) · DOCX (10 MB) · JPG / PNG (10 MB)</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4" /> Take a photo
          </Button>
        </div>

        {/* Hidden inputs */}
        <input ref={fileRef} type="file" accept=".pdf,.docx,image/jpeg,image/png" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '' }} />
      </TabsContent>

      <TabsContent value="paste">
        <div className="flex flex-col gap-3">
          <Textarea
            placeholder="Paste your study material here…"
            className="min-h-[160px] resize-y"
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
          />
          <Button onClick={handlePasteSubmit} disabled={!pasteText.trim()} className="gap-2">
            <ClipboardPaste className="h-4 w-4" /> Use this text
          </Button>
        </div>
      </TabsContent>

      {(state === 'error' || errorMsg) && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}
    </Tabs>
  )
}

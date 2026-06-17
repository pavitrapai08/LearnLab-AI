'use client'

import { useState, useCallback } from 'react'
import { FileText, RotateCcw, Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UploadInput from '@/components/UploadInput'
import SubjectLanguageBar from '@/components/SubjectLanguageBar'
import type { Subject, Grade, OutputLanguage } from '@/components/SubjectLanguageBar'
import MobileNav from '@/components/MobileNav'
import AiDisclaimer from '@/components/AiDisclaimer'
import type { SummaryData } from '@/lib/claude'

type Step = 'upload' | 'configure' | 'generating' | 'result'

export default function StudentSummariserPage() {
  const [step, setStep] = useState<Step>('upload')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [subject, setSubject] = useState<Subject | ''>('')
  const [grade, setGrade] = useState<Grade | ''>('')
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('English')
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleUploadSuccess = useCallback((docId: string) => {
    setDocumentId(docId)
    setStep('configure')
  }, [])

  const handleGenerate = async () => {
    if (!subject || !grade) { setError('Please select a subject and grade.'); return }
    setError('')
    setStep('generating')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'summary', documentId, subject, grade, outputLanguage }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message ?? 'Generation failed.'); setStep('configure'); return }
      setSummary(data.summary)
      setStep('result')
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('configure')
    }
  }

  const handleCopy = useCallback(() => {
    if (!summary) return
    const text = [
      summary.quickSummary,
      '',
      'Key Points:',
      ...summary.keyPoints.map(p => `• ${p}`),
      '',
      'Key Terms:',
      ...summary.terms.map(t => `${t.term}: ${t.definition}`),
      '',
      'Remember:',
      ...summary.remember.map(r => `• ${r}`),
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [summary])

  const reset = () => {
    setStep('upload'); setDocumentId(null); setSummary(null); setError('')
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav persona="student" />

      <main className="flex-1 px-4 pb-24 pt-6 lg:pl-0 lg:pr-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Chapter Summariser</h1>
          </div>

          {step === 'upload' && (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Upload your study material to get a structured chapter summary.
              </p>
              <UploadInput onSuccess={handleUploadSuccess} />
            </section>
          )}

          {step === 'configure' && (
            <section className="flex flex-col gap-5">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Content loaded. Select subject and grade:
              </p>
              <SubjectLanguageBar
                subject={subject} grade={grade} outputLanguage={outputLanguage}
                onSubjectChange={setSubject} onGradeChange={setGrade} onLanguageChange={setOutputLanguage}
              />
              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button onClick={handleGenerate} size="lg" className="gap-2">
                <FileText className="h-4 w-4" /> Generate summary
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>Use different content</Button>
            </section>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Summarising your content…</p>
              <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
            </div>
          )}

          {step === 'result' && summary && (
            <section className="flex flex-col gap-5">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{outputLanguage} summary</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied
                      ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                      : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                    <RotateCcw className="h-3 w-3" /> New
                  </Button>
                </div>
              </div>

              {/* Quick summary */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  Quick Summary
                </p>
                <p className="text-sm leading-relaxed">{summary.quickSummary}</p>
              </div>

              {/* Key points */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                  Key Points
                </p>
                <ul className="flex flex-col gap-2">
                  {summary.keyPoints.map((pt, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key terms */}
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                  Key Terms
                </p>
                <div className="flex flex-col divide-y divide-border">
                  {summary.terms.map((t, i) => (
                    <div key={i} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                      <span className="text-sm font-semibold">{t.term}</span>
                      <span className="text-sm text-muted-foreground">{t.definition}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remember this */}
              <div className="rounded-2xl border border-emerald-200 bg-[#ECFDF5] p-5 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Remember This
                </p>
                <ul className="flex flex-col gap-2">
                  {summary.remember.map((tip, i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-emerald-900">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <AiDisclaimer />
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

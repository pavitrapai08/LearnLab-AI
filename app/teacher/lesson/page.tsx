'use client'

import { useState, useRef } from 'react'
import { GraduationCap, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SubjectLanguageBar from '@/components/SubjectLanguageBar'
import type { Subject, Grade, OutputLanguage } from '@/components/SubjectLanguageBar'
import MobileNav from '@/components/MobileNav'
import AiDisclaimer from '@/components/AiDisclaimer'
import ExportPDF from '@/components/ExportPDF'
import type { LessonPlanData } from '@/lib/claude-lesson'

type Step = 'configure' | 'generating' | 'result'

const DURATIONS = [30, 40, 45, 60, 75, 90]

export default function TeacherLessonPage() {
  const [step, setStep] = useState<Step>('configure')
  const [subject, setSubject] = useState<Subject | ''>('')
  const [grade, setGrade] = useState<Grade | ''>('')
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('English')
  const [topic, setTopic] = useState('')
  const [durationMin, setDurationMin] = useState('45')
  const [plan, setPlan] = useState<LessonPlanData | null>(null)
  const [error, setError] = useState('')
  const resultRef = useRef<HTMLDivElement>(null)

  const handleGenerate = async () => {
    if (!subject || !grade || !topic.trim()) {
      setError('Please fill in subject, grade, and topic.')
      return
    }
    setError('')
    setStep('generating')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lesson',
          subject,
          grade,
          outputLanguage,
          options: { topic: topic.trim(), durationMin: parseInt(durationMin, 10) },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message ?? 'Generation failed.'); setStep('configure'); return }
      setPlan(data.plan)
      setStep('result')
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('configure')
    }
  }

  const reset = () => { setStep('configure'); setPlan(null); setError('') }

  const pdfFilename = `lesson-${topic.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}-${grade.replace(/\s/g, '')}.pdf`

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav persona="teacher" />

      <main className="flex-1 px-4 pb-24 pt-6 lg:pl-0 lg:pr-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Lesson Plan Generator</h1>
          </div>

          {step === 'configure' && (
            <section className="flex flex-col gap-5">
              <SubjectLanguageBar
                subject={subject} grade={grade} outputLanguage={outputLanguage}
                onSubjectChange={setSubject} onGradeChange={setGrade} onLanguageChange={setOutputLanguage}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="topic" className="text-xs text-muted-foreground">Topic / chapter</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis, Quadratic Equations, The French Revolution"
                  onKeyDown={e => { if (e.key === 'Enter') handleGenerate() }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Duration</Label>
                <Select value={durationMin} onValueChange={setDurationMin}>
                  <SelectTrigger className="h-10 max-w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(n => <SelectItem key={n} value={String(n)}>{n} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button onClick={handleGenerate} size="lg" className="gap-2">
                <GraduationCap className="h-4 w-4" /> Generate lesson plan
              </Button>
            </section>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Creating your lesson plan…</p>
              <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
            </div>
          )}

          {step === 'result' && plan && (
            <section className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{durationMin} min · {subject} · {grade}</p>
                <div className="flex gap-2">
                  <ExportPDF targetRef={resultRef} filename={pdfFilename} label="Export PDF" title={topic} />
                  <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                    <RotateCcw className="h-3 w-3" /> New plan
                  </Button>
                </div>
              </div>

              <div ref={resultRef} className="flex flex-col gap-4 bg-[#F7F8FC] p-1">
                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Topic</p>
                  <p className="text-base font-semibold">{topic}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{subject} · {grade} · {durationMin} min · {outputLanguage}</p>
                </div>

                <PlanSection title="Learning Objectives" items={plan.objectives} accent="blue" />

                <div className="rounded-2xl border bg-white p-5 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Introduction Hook</p>
                  <p className="text-sm leading-relaxed">{plan.intro}</p>
                </div>

                <PlanSection title="Lesson Structure" items={plan.structure} accent="blue" numbered />
                <PlanSection title="Classroom Activities" items={plan.activities} accent="violet" />
                <PlanSection title="Assessment" items={plan.assessment} accent="amber" />
                <PlanSection title="Homework" items={plan.homework} accent="emerald" />

                <AiDisclaimer />
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

function PlanSection({
  title,
  items,
  accent,
  numbered = false,
}: {
  title: string
  items: string[]
  accent: 'blue' | 'violet' | 'amber' | 'emerald'
  numbered?: boolean
}) {
  const styles = {
    blue:    { header: 'text-primary',      dot: 'bg-primary' },
    violet:  { header: 'text-violet-600',   dot: 'bg-violet-500' },
    amber:   { header: 'text-amber-600',    dot: 'bg-amber-500' },
    emerald: { header: 'text-emerald-600',  dot: 'bg-emerald-500' },
  }
  const s = styles[accent]
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className={`mb-3 text-xs font-semibold uppercase tracking-wide ${s.header}`}>{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
            {numbered
              ? (
                <span className={`mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${s.dot}`}>
                  {i + 1}
                </span>
              )
              : <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />}
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

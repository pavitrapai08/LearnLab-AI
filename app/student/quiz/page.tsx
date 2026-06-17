'use client'

import { useState, useCallback, useRef } from 'react'
import { BookOpen, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import UploadInput from '@/components/UploadInput'
import SubjectLanguageBar from '@/components/SubjectLanguageBar'
import type { Subject, Grade, OutputLanguage } from '@/components/SubjectLanguageBar'
import QuizCard from '@/components/QuizCard'
import type { AnswerRecord } from '@/components/QuizCard'
import MobileNav from '@/components/MobileNav'
import AiDisclaimer from '@/components/AiDisclaimer'
import ExportPDF from '@/components/ExportPDF'
import type { QuizQuestion } from '@/lib/claude'
import { createClient } from '@/lib/supabase/client'

type Step = 'upload' | 'configure' | 'generating' | 'quiz' | 'results'

export default function StudentQuizPage() {
  const [step, setStep] = useState<Step>('upload')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [subject, setSubject] = useState<Subject | ''>('')
  const [grade, setGrade] = useState<Grade | ''>('')
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('English')
  const [questionType, setQuestionType] = useState<'MCQ' | 'TF' | 'Short'>('MCQ')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [count, setCount] = useState('10')
  const [quiz, setQuiz] = useState<{ id: string; questions: QuizQuestion[]; questionType: 'MCQ' | 'TF' | 'Short' } | null>(null)
  const [score, setScore] = useState<{ score: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const resultsRef = useRef<HTMLDivElement>(null)

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
        body: JSON.stringify({
          type: 'quiz',
          documentId,
          subject,
          grade,
          outputLanguage,
          options: { questionType, difficulty, count: parseInt(count, 10) },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message ?? 'Generation failed.'); setStep('configure'); return }
      setQuiz({ id: data.quizId, questions: data.questions, questionType: data.questionType ?? questionType })
      setStep('quiz')
    } catch {
      setError('Something went wrong. Please try again.')
      setStep('configure')
    }
  }

  const handleQuizComplete = useCallback(async (s: number, total: number, answers: AnswerRecord[]) => {
    setScore({ score: s, total })
    // Write attempt client-side (RLS applies, CLAUDE.md §5).
    if (quiz?.id) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('quiz_attempts').insert({
          session_id: user.id,
          quiz_id: quiz.id,
          score: s,
          total,
          answers,
        })
        // Upsert daily_activity on quiz completion.
        const today = new Date().toISOString().slice(0, 10)
        await supabase.from('daily_activity').upsert(
          { session_id: user.id, activity_date: today },
          { onConflict: 'session_id,activity_date' },
        )
      }
    }
    setStep('results')
  }, [quiz])

  const reset = () => {
    setStep('upload'); setDocumentId(null); setQuiz(null); setScore(null); setError('')
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Sidebar (desktop) + bottom nav (mobile) */}
      <MobileNav persona="student" />

      {/* Main content */}
      <main className="flex-1 px-4 pb-24 pt-6 lg:pl-0 lg:pr-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Quiz Generator</h1>
          </div>

          {step === 'upload' && (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">Upload your study material to generate a quiz from it.</p>
              <UploadInput onSuccess={handleUploadSuccess} />
            </section>
          )}

          {step === 'configure' && (
            <section className="flex flex-col gap-5">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Content loaded. Configure your quiz:</p>
              <SubjectLanguageBar
                subject={subject} grade={grade} outputLanguage={outputLanguage}
                onSubjectChange={setSubject} onGradeChange={setGrade} onLanguageChange={setOutputLanguage}
              />
              <div className="flex flex-wrap gap-3">
                <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Question type</Label>
                  <Select value={questionType} onValueChange={v => setQuestionType(v as 'MCQ' | 'TF' | 'Short')}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple choice</SelectItem>
                      <SelectItem value="TF">True / False</SelectItem>
                      <SelectItem value="Short">Short answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-[110px] flex-1 flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Difficulty</Label>
                  <Select value={difficulty} onValueChange={v => setDifficulty(v as 'easy' | 'medium' | 'hard')}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-[90px] flex-1 flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Questions</Label>
                  <Select value={count} onValueChange={setCount}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button onClick={handleGenerate} size="lg" className="gap-2">
                <BookOpen className="h-4 w-4" /> Generate quiz
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>Use different content</Button>
            </section>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-medium">Generating your quiz…</p>
              <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
            </div>
          )}

          {step === 'quiz' && quiz && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{quiz.questions.length} questions · {questionType} · {difficulty}</p>
                <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
                  <RotateCcw className="h-3 w-3" /> New quiz
                </Button>
              </div>
              <QuizCard
                quizId={quiz.id}
                questions={quiz.questions}
                questionType={quiz.questionType}
                grade={grade || 'Grade 10'}
                onComplete={handleQuizComplete}
              />
            </section>
          )}

          {step === 'results' && score && (
            <section className="flex flex-col items-center gap-4 py-8">
              <div ref={resultsRef} className="w-full rounded-2xl border bg-card p-8 text-center shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{subject} · {grade} · {questionType} · {difficulty}</p>
                <p className="mt-3 text-4xl font-bold">{score.score} / {score.total}</p>
                <p className="mt-1 text-muted-foreground">{Math.round((score.score / score.total) * 100)}% score</p>
                <AiDisclaimer />
              </div>
              <div className="flex gap-2">
                <ExportPDF targetRef={resultsRef} filename="quiz-results.pdf" label="Download results" title={`Quiz Results — ${subject} · ${grade}`} />
                <Button onClick={reset} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" /> Start over
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

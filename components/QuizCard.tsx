'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizQuestion, GradeItem } from '@/lib/claude'
import AiDisclaimer from '@/components/AiDisclaimer'

export type SelfMark = 'correct' | 'partial' | 'incorrect'

export type AnswerRecord = {
  questionId: string
  response: string
  verdict?: SelfMark
  points: number
}

type Props = {
  quizId: string
  questions: QuizQuestion[]
  questionType: 'MCQ' | 'TF' | 'Short'
  grade: string
  onComplete: (score: number, total: number, answers: AnswerRecord[]) => void
}

const VERDICT_POINTS: Record<SelfMark, number> = { correct: 1, partial: 0.5, incorrect: 0 }

export default function QuizCard({ quizId, questions, questionType, grade, onComplete }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selfMarks, setSelfMarks] = useState<Record<string, SelfMark>>({})
  const [submitted, setSubmitted] = useState(false)
  const [gradingAI, setGradingAI] = useState(false)

  const setAnswer = (id: string, val: string) => setAnswers(prev => ({ ...prev, [id]: val }))
  const setSelfMark = (id: string, mark: SelfMark) => setSelfMarks(prev => ({ ...prev, [id]: mark }))

  const autoScore = (q: QuizQuestion): boolean | null => {
    if (!submitted || questionType === 'Short') return null
    const userAns = (answers[q.id] ?? '').trim().toLowerCase()
    const correct = q.answer.trim().toLowerCase()
    return userAns === correct
  }

  const calcScore = () => {
    if (questionType !== 'Short') {
      return questions.reduce((acc, q) => acc + (autoScore(q) ? 1 : 0), 0)
    }
    return questions.reduce((acc, q) => {
      const mark = selfMarks[q.id]
      return acc + (mark ? VERDICT_POINTS[mark] : 0)
    }, 0)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    if (questionType !== 'Short') {
      // Compute score directly — cannot call autoScore() here because setSubmitted is async
      // and `submitted` is still false in this closure, making autoScore return null.
      const scoreQ = (q: QuizQuestion) =>
        (answers[q.id] ?? '').trim().toLowerCase() === q.answer.trim().toLowerCase()
      const score = questions.reduce((acc, q) => acc + (scoreQ(q) ? 1 : 0), 0)
      const records: AnswerRecord[] = questions.map(q => ({
        questionId: q.id,
        response: answers[q.id] ?? '',
        points: scoreQ(q) ? 1 : 0,
      }))
      onComplete(score, questions.length, records)
    }
  }

  const handleSelfMarkDone = () => {
    const score = calcScore()
    const records: AnswerRecord[] = questions.map(q => ({
      questionId: q.id,
      response: answers[q.id] ?? '',
      verdict: selfMarks[q.id],
      points: VERDICT_POINTS[selfMarks[q.id] ?? 'incorrect'] ?? 0,
    }))
    onComplete(score, questions.length, records)
  }

  const handleGradeWithAI = async () => {
    setGradingAI(true)
    const items: GradeItem[] = questions.map(q => ({
      questionId: q.id,
      question: q.question,
      modelAnswer: q.answer,
      studentAnswer: answers[q.id] ?? '',
    }))
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'grade', grade, subject: '', outputLanguage: 'English', options: { items } }),
      })
      const data = await res.json()
      if (res.ok && data.results) {
        const newMarks: Record<string, SelfMark> = {}
        for (const r of data.results) newMarks[r.questionId] = r.verdict
        setSelfMarks(prev => ({ ...prev, ...newMarks }))
      }
    } finally {
      setGradingAI(false)
    }
  }

  const allAnswered = questions.every(q => (answers[q.id] ?? '').trim() !== '')
  const allMarked = submitted && questionType === 'Short' && questions.every(q => selfMarks[q.id])

  return (
    <div className="flex flex-col gap-6">
      {questions.map((q, idx) => {
        const correct = autoScore(q)
        const mark = selfMarks[q.id]
        return (
          <div key={q.id} className={cn('rounded-xl border p-4', submitted && correct === true && 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30', submitted && correct === false && 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30')}>
            <div className="mb-3 flex items-start gap-2">
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Q{idx + 1}</span>
              <p className="text-sm font-medium leading-relaxed">{q.question}</p>
            </div>

            {/* MCQ / TF options */}
            {(questionType === 'MCQ' || questionType === 'TF') && q.options && (
              <div className="flex flex-col gap-2">
                {q.options.map(opt => {
                  const letter = opt.split('.')[0]?.trim()
                  const isSelected = answers[q.id] === letter
                  const isCorrect = submitted && letter === q.answer
                  const isWrong = submitted && isSelected && letter !== q.answer
                  return (
                    <button
                      key={opt}
                      disabled={submitted}
                      onClick={() => setAnswer(q.id, letter)}
                      className={cn('flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors', isSelected && !submitted && 'border-primary bg-primary/10', isCorrect && 'border-green-500 bg-green-100 dark:bg-green-900/40', isWrong && 'border-red-400 bg-red-100 dark:bg-red-900/40', !isSelected && !submitted && 'hover:bg-muted/50')}
                    >
                      {submitted && isCorrect && <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />}
                      {submitted && isWrong && <XCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      <span>{opt}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Short answer */}
            {questionType === 'Short' && (
              <div className="flex flex-col gap-2">
                <textarea
                  disabled={submitted}
                  placeholder="Your answer…"
                  value={answers[q.id] ?? ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  className="min-h-[72px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                {submitted && (
                  <div className="rounded-lg bg-muted/60 p-3 text-sm">
                    <p className="font-medium text-muted-foreground">Model answer:</p>
                    <p className="mt-1">{q.answer}</p>
                  </div>
                )}
                {submitted && (
                  <div className="flex gap-2">
                    {(['correct', 'partial', 'incorrect'] as SelfMark[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setSelfMark(q.id, m)}
                        className={cn('flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors', mark === m ? (m === 'correct' ? 'border-green-500 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : m === 'partial' ? 'border-yellow-400 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' : 'border-red-400 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300') : 'hover:bg-muted/50')}
                      >
                        {m === 'correct' ? <CheckCircle className="h-3 w-3" /> : m === 'partial' ? <MinusCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            {submitted && q.explanation && (
              <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">{q.explanation}</p>
            )}
          </div>
        )
      })}

      {/* Score summary */}
      {submitted && questionType !== 'Short' && (
        <div className="flex flex-col items-center gap-1 rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-2xl font-bold">{calcScore()} / {questions.length}</p>
          <Badge variant="secondary">{Math.round((calcScore() / questions.length) * 100)}%</Badge>
          <AiDisclaimer />
        </div>
      )}

      {/* Action buttons */}
      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered} size="lg" className="w-full">
          Submit quiz
        </Button>
      )}

      {submitted && questionType === 'Short' && (
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={handleGradeWithAI} disabled={gradingAI} className="gap-2">
            {gradingAI && <Loader2 className="h-4 w-4 animate-spin" />}
            Grade with AI
          </Button>
          <Button onClick={handleSelfMarkDone} disabled={!allMarked} size="lg">
            Done — save score ({calcScore()} / {questions.length})
          </Button>
          {allMarked && <AiDisclaimer />}
        </div>
      )}
    </div>
  )
}

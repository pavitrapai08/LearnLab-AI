'use client'

import { useState, useEffect } from 'react'
import { Calendar, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import MobileNav from '@/components/MobileNav'
import AiDisclaimer from '@/components/AiDisclaimer'
import ProgressChart from '@/components/ProgressChart'
import StreakTracker from '@/components/StreakTracker'
import type { AttemptWithSubject } from '@/components/ProgressChart'
import { SUBJECTS, GRADES } from '@/lib/options'
import type { Grade } from '@/lib/options'
import { calcStreak } from '@/lib/streak'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { StudyPlanData } from '@/lib/claude-plan'

type PlannerStep = 'configure' | 'generating' | 'result'

export default function StudentTrackerPage() {
  // Progress data (loaded on mount)
  const [attempts, setAttempts] = useState<AttemptWithSubject[]>([])
  const [streak, setStreak] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(true)

  // Planner state
  const [plannerStep, setPlannerStep] = useState<PlannerStep>('configure')
  const [examDate, setExamDate] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [grade, setGrade] = useState<Grade | ''>('')
  const [plan, setPlan] = useState<StudyPlanData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingProgress(false); return }

      // Two-query approach: fetch attempts, then their quiz subjects.
      const { data: rawAttempts } = await supabase
        .from('quiz_attempts')
        .select('id, score, total, quiz_id, created_at')
        .eq('session_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (rawAttempts?.length) {
        const quizIds = Array.from(new Set(rawAttempts.map(a => a.quiz_id as string)))
        const { data: quizzes } = await supabase
          .from('quizzes')
          .select('id, subject')
          .in('id', quizIds)
        const subjectMap: Record<string, string> = {}
        for (const q of quizzes ?? []) subjectMap[q.id as string] = q.subject as string

        const mapped: AttemptWithSubject[] = rawAttempts.map(a => ({
          id: a.id as string,
          score: a.score as number,
          total: a.total as number,
          subject: subjectMap[a.quiz_id as string] ?? 'Unknown',
          created_at: a.created_at as string,
        }))
        setAttempts(mapped)
      }

      // Fetch activity dates for streak.
      const { data: activity } = await supabase
        .from('daily_activity')
        .select('activity_date')
        .eq('session_id', user.id)

      if (activity) {
        setStreak(calcStreak(activity.map(r => r.activity_date as string)))
      }

      setLoadingProgress(false)
    }
    load()
  }, [])

  const toggleSubject = (s: string) => {
    setSelectedSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleGeneratePlan = async () => {
    const todayIso = new Date().toISOString().slice(0, 10)
    if (!examDate || examDate <= todayIso) { setError('Please set a future exam date.'); return }
    if (!selectedSubjects.length) { setError('Select at least one subject.'); return }
    if (!grade) { setError('Please select your grade.'); return }
    setError('')
    setPlannerStep('generating')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          subject: selectedSubjects[0],
          grade,
          outputLanguage: 'English',
          options: { examDate, subjects: selectedSubjects },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error?.message ?? 'Generation failed.'); setPlannerStep('configure'); return }
      setPlan(data.plan)
      setPlannerStep('result')
    } catch {
      setError('Something went wrong. Please try again.')
      setPlannerStep('configure')
    }
  }

  const resetPlanner = () => { setPlannerStep('configure'); setPlan(null); setError('') }

  const todayMin = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileNav persona="student" />
      <main className="flex-1 px-4 pb-24 pt-6 lg:pl-0 lg:pr-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Study Planner &amp; Tracker</h1>
          </div>

          <Tabs defaultValue="progress">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="progress" className="flex-1">Progress</TabsTrigger>
              <TabsTrigger value="planner" className="flex-1">Study Planner</TabsTrigger>
            </TabsList>

            {/* ── Progress tab ──────────────────────────────── */}
            <TabsContent value="progress" className="flex flex-col gap-4">
              {loadingProgress ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <StreakTracker streak={streak} />
                  <ProgressChart attempts={attempts} />
                </>
              )}
            </TabsContent>

            {/* ── Planner tab ───────────────────────────────── */}
            <TabsContent value="planner" className="flex flex-col gap-5">
              {plannerStep === 'configure' && (
                <>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="exam-date" className="text-xs text-muted-foreground">Exam date</Label>
                      <input
                        id="exam-date"
                        type="date"
                        value={examDate}
                        min={todayMin}
                        onChange={e => setExamDate(e.target.value)}
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Grade</Label>
                      <Select value={grade} onValueChange={v => setGrade(v as Grade)}>
                        <SelectTrigger className="h-10 w-[150px]"><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-xs text-muted-foreground">
                      Subjects to study
                      {selectedSubjects.length > 0 && (
                        <span className="ml-1 text-primary">({selectedSubjects.length} selected)</span>
                      )}
                    </Label>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Select subjects">
                      {SUBJECTS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSubject(s)}
                          aria-pressed={selectedSubjects.includes(s)}
                          className={cn(
                            'min-h-[36px] rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            selectedSubjects.includes(s)
                              ? 'border-primary bg-primary text-white'
                              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </p>
                  )}
                  <Button onClick={handleGeneratePlan} size="lg" className="gap-2">
                    <Calendar className="h-4 w-4" /> Generate study plan
                  </Button>
                </>
              )}

              {plannerStep === 'generating' && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-medium">Building your study plan…</p>
                  <p className="text-sm text-muted-foreground">This usually takes 10–20 seconds.</p>
                </div>
              )}

              {plannerStep === 'result' && plan && (
                <section className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Exam: {examDate} · {selectedSubjects.join(', ')}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetPlanner} className="gap-1">
                      <RotateCcw className="h-3 w-3" /> New plan
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {plan.schedule.map((day, i) => (
                      <div key={i} className="rounded-xl border bg-white p-4 shadow-sm">
                        <p className="mb-2 text-xs font-semibold text-primary">{formatDate(day.date)}</p>
                        <ul className="flex flex-col gap-1.5">
                          {day.tasks.map((task, j) => (
                            <li key={j} className="flex gap-2 text-sm">
                              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              {task}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <AiDisclaimer />
                </section>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

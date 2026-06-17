import Link from 'next/link'
import { BookOpen, GraduationCap, ChevronRight } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#EEF4FF] via-[#F7F8FC] to-white p-6">
      {/* Logo mark */}
      <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-navy">
        <BookOpen className="h-6 w-6 text-white" />
      </div>

      <h1 className="mb-1 text-[28px] font-bold text-navy">LearnLab AI</h1>
      <p className="mb-10 max-w-xs text-center text-sm text-muted-foreground">
        Turn your study material into quizzes, flashcards, summaries, and more.
      </p>

      {/* Persona cards */}
      <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row">
        {/* Student */}
        <Link
          href="/student/quiz"
          className="group flex flex-1 flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 transition-colors hover:border-primary"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF4FF]">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div>
            <p className="font-semibold text-navy">Student</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Quiz', 'Flashcards', 'Summary', 'Tutor', 'Planner'].map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-[#EEF4FF] px-2.5 py-0.5 text-[11px] font-medium text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>

        {/* Teacher */}
        <Link
          href="/teacher/quiz"
          className="group flex flex-1 flex-col gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-6 transition-colors hover:border-primary"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ECFDF5]">
              <GraduationCap className="h-5 w-5 text-emerald" />
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div>
            <p className="font-semibold text-navy">Teacher</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Quiz Generator', 'Lesson Plan'].map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-medium text-emerald"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground">AI-generated — verify with your textbook.</p>
        <Link
          href="/terms"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Terms &amp; Privacy
        </Link>
      </div>
    </main>
  )
}

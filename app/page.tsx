import Link from 'next/link'
import { BookOpen, GraduationCap, ChevronRight } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0D9A8F] via-[#0C8A9C] to-[#0F6E9A] p-6">
      {/* Logo mark */}
      <div className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
        <BookOpen className="h-6 w-6 text-white" />
      </div>

      <h1 className="mb-1 text-[28px] font-bold text-white drop-shadow-sm">LearnLab AI</h1>
      <p className="mb-10 max-w-xs text-center text-sm text-white/80">
        Turn your study material into quizzes, flashcards, summaries, and more.
      </p>

      {/* Persona cards */}
      <div className="flex w-full max-w-xl flex-col gap-4 sm:flex-row">
        {/* Student */}
        <Link
          href="/student/quiz"
          className="group flex flex-1 flex-col gap-4 rounded-2xl border border-white/15 bg-[#1A1F36]/55 p-6 backdrop-blur-md transition-all hover:border-white/30 hover:bg-[#1A1F36]/65"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <ChevronRight className="h-5 w-5 text-white/40 transition-colors group-hover:text-white/80" />
          </div>
          <div>
            <p className="font-semibold text-white">Student</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Quiz', 'Flashcards', 'Summary', 'Tutor', 'Planner'].map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80"
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
          className="group flex flex-1 flex-col gap-4 rounded-2xl border border-white/15 bg-[#1A1F36]/55 p-6 backdrop-blur-md transition-all hover:border-white/30 hover:bg-[#1A1F36]/65"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <ChevronRight className="h-5 w-5 text-white/40 transition-colors group-hover:text-white/80" />
          </div>
          <div>
            <p className="font-semibold text-white">Teacher</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['Quiz Generator', 'Lesson Plan'].map(tag => (
                <span
                  key={tag}
                  className="rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-xs text-white/60">AI-generated — verify with your textbook.</p>
        <Link
          href="/terms"
          className="text-xs text-white/60 underline underline-offset-2 hover:text-white/90"
        >
          Terms &amp; Privacy
        </Link>
      </div>
    </main>
  )
}

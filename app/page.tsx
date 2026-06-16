import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="mb-1 text-3xl font-bold">LearnLab AI</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Turn your study material into quizzes, flashcards, summaries, and more.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/student/quiz"
            className="rounded-xl border bg-card px-6 py-5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="font-semibold">Student</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quiz · Flashcards · Summary · Tutor · Study Planner
            </p>
          </Link>

          <Link
            href="/teacher/quiz"
            className="rounded-xl border bg-card px-6 py-5 text-left shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="font-semibold">Teacher</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Quiz Generator · Lesson Plan
            </p>
          </Link>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          AI-generated — verify with your textbook.
        </p>
      </div>
    </main>
  )
}

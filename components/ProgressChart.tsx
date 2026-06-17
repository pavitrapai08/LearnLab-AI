'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export type AttemptWithSubject = {
  id: string
  score: number
  total: number
  subject: string
  created_at: string
}

type Props = {
  attempts: AttemptWithSubject[]
}

export default function ProgressChart({ attempts }: Props) {
  if (attempts.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Recent Scores</p>
        <div className="flex flex-col items-center gap-1 py-8 text-center">
          <p className="text-sm text-muted-foreground">No quiz attempts yet.</p>
          <p className="text-xs text-muted-foreground">Complete a quiz to see your progress here.</p>
        </div>
      </div>
    )
  }

  // Last 7 attempts, oldest-first so the line reads left→right chronologically.
  const chartData = [...attempts].slice(0, 7).reverse().map((a, i) => ({
    name: `#${i + 1}`,
    score: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
    subject: a.subject,
  }))

  const weakSubjects = calcWeakSubjects(attempts)

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Recent Scores</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Score']}
              labelFormatter={(label: string) => `Attempt ${label}`}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#4F46E5"
              strokeWidth={2}
              dot={{ r: 4, fill: '#4F46E5' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {weakSubjects.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Needs More Practice
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Weak subjects">
            {weakSubjects.map(s => (
              <li
                key={s}
                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function calcWeakSubjects(attempts: AttemptWithSubject[]): string[] {
  const bySubject: Record<string, { totalPct: number; count: number }> = {}
  for (const a of attempts) {
    const pct = a.total > 0 ? (a.score / a.total) * 100 : 0
    if (!bySubject[a.subject]) bySubject[a.subject] = { totalPct: 0, count: 0 }
    bySubject[a.subject].totalPct += pct
    bySubject[a.subject].count++
  }
  return Object.entries(bySubject)
    .filter(([, d]) => d.count >= 2 && d.totalPct / d.count < 60)
    .map(([subject]) => subject)
}

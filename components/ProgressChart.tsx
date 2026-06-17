'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

export type AttemptWithSubject = {
  id: string
  score: number
  total: number
  subject: string
  created_at: string
}

type SubjectStat = {
  subject: string
  avgPct: number
  count: number
  weak: boolean  // avg < 60% with ≥ 2 attempts → reliable signal
}

type Props = { attempts: AttemptWithSubject[] }

function barColor(pct: number): string {
  if (pct >= 80) return '#22c55e'  // green-500
  if (pct >= 60) return '#f59e0b'  // amber-500
  return '#ef4444'                  // red-500
}

function getSubjectStats(attempts: AttemptWithSubject[]): SubjectStat[] {
  const map: Record<string, { totalPct: number; count: number }> = {}
  for (const a of attempts) {
    const pct = a.total > 0 ? (a.score / a.total) * 100 : 0
    if (!map[a.subject]) map[a.subject] = { totalPct: 0, count: 0 }
    map[a.subject].totalPct += pct
    map[a.subject].count++
  }
  return Object.entries(map)
    .map(([subject, d]) => ({
      subject,
      avgPct: Math.round(d.totalPct / d.count),
      count: d.count,
      weak: d.count >= 2 && d.totalPct / d.count < 60,
    }))
    .sort((a, b) => a.avgPct - b.avgPct) // weakest first → most actionable at top
}

// recharts injects active/payload/label by cloning the element — no better typing available.
type TooltipProps = { active?: boolean; payload?: { payload: unknown }[]; label?: string }

function LineTip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const { score, subject } = payload[0].payload as { score: number; subject: string }
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{subject}</p>
      <p className="text-muted-foreground">{label} · {score}%</p>
    </div>
  )
}

function BarTip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const { subject, avgPct, count } = payload[0].payload as SubjectStat
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{subject}</p>
      <p className="text-muted-foreground">
        Avg: {avgPct}% · {count} attempt{count !== 1 ? 's' : ''}
      </p>
    </div>
  )
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

  // Chronological last-7 for the trend line.
  const recentData = [...attempts].slice(0, 7).reverse().map((a, i) => ({
    name: `#${i + 1}`,
    score: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0,
    subject: a.subject,
  }))

  const subjectStats = getSubjectStats(attempts)
  const weakSubjects = subjectStats.filter(s => s.weak)
  // Enough height for each horizontal bar (36px) plus chart padding.
  const barChartHeight = Math.max(80, subjectStats.length * 36 + 20)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Recent trend ─────────────────────────────────── */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
          Recent Scores
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={recentData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
            <Tooltip content={<LineTip />} />
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

      {/* ── Per-subject breakdown ─────────────────────────── */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
          Score by Subject
        </p>
        <ResponsiveContainer width="100%" height={barChartHeight}>
          <BarChart
            layout="vertical"
            data={subjectStats}
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="subject"
              width={92}
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.length > 13 ? v.slice(0, 12) + '…' : v}
            />
            <Tooltip content={<BarTip />} />
            <Bar dataKey="avgPct" barSize={18} radius={[0, 4, 4, 0]}>
              {subjectStats.map((s, i) => (
                <Cell key={i} fill={barColor(s.avgPct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Colour legend */}
        <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />≥80%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />60–79%
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />&lt;60%
          </span>
        </div>
      </div>

      {/* ── Weak-subject flag (≥ 2 attempts, avg < 60%) ───── */}
      {weakSubjects.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
            Needs More Practice
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Weak subjects">
            {weakSubjects.map(s => (
              <li
                key={s.subject}
                className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800"
              >
                {s.subject} · {s.avgPct}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

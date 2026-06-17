// Pure streak calculation — all logic is UTC-date based with no side effects.

export function calcStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0

  const today = utcToday()
  const yesterday = offsetDate(today, -1)
  const dateSet = new Set(activityDates)

  if (!dateSet.has(today) && !dateSet.has(yesterday)) return 0

  let count = 0
  let current = dateSet.has(today) ? today : yesterday

  while (dateSet.has(current)) {
    count++
    current = offsetDate(current, -1)
  }

  return count
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function offsetDate(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

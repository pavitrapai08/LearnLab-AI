import { describe, it, expect } from 'vitest'
import { calcStreak } from './streak'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function offset(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('calcStreak', () => {
  it('returns 0 for empty activity list', () => {
    expect(calcStreak([])).toBe(0)
  })

  it('returns 1 for today only', () => {
    expect(calcStreak([today()])).toBe(1)
  })

  it('returns 1 for yesterday only (day not over)', () => {
    expect(calcStreak([offset(today(), -1)])).toBe(1)
  })

  it('counts 3 consecutive days ending today', () => {
    const t = today()
    expect(calcStreak([t, offset(t, -1), offset(t, -2)])).toBe(3)
  })

  it('counts consecutive days starting from yesterday when today is absent', () => {
    const t = today()
    expect(calcStreak([offset(t, -1), offset(t, -2), offset(t, -3)])).toBe(3)
  })

  it('stops at a gap — missed yesterday', () => {
    const t = today()
    expect(calcStreak([t, offset(t, -2)])).toBe(1)
  })

  it('returns 0 when last activity was 2+ days ago', () => {
    const t = today()
    expect(calcStreak([offset(t, -2), offset(t, -3)])).toBe(0)
  })

  it('same-day duplicates do not inflate the streak', () => {
    const t = today()
    expect(calcStreak([t, t, t])).toBe(1)
  })

  it('handles unsorted input', () => {
    const t = today()
    expect(calcStreak([offset(t, -2), t, offset(t, -1)])).toBe(3)
  })
})

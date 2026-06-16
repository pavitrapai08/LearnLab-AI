import { describe, it, expect } from 'vitest'
import { isScannedPdf } from './extract/pdf'

// Scoring logic lives in QuizCard (client component) — we test the pure math here.

function autoScore(userAnswer: string, modelAnswer: string): boolean {
  return userAnswer.trim().toLowerCase() === modelAnswer.trim().toLowerCase()
}

const VERDICT_POINTS: Record<string, number> = { correct: 1, partial: 0.5, incorrect: 0 }

function calcScore(
  questionType: 'MCQ' | 'TF' | 'Short',
  answers: { id: string; userAnswer: string; modelAnswer: string; selfMark?: 'correct' | 'partial' | 'incorrect' }[],
): number {
  if (questionType !== 'Short') {
    return answers.reduce((acc, a) => acc + (autoScore(a.userAnswer, a.modelAnswer) ? 1 : 0), 0)
  }
  return answers.reduce((acc, a) => acc + (VERDICT_POINTS[a.selfMark ?? 'incorrect'] ?? 0), 0)
}

describe('MCQ / TF auto-scoring', () => {
  it('scores 2 correct out of 3', () => {
    const answers = [
      { id: 'q1', userAnswer: 'A', modelAnswer: 'A' },
      { id: 'q2', userAnswer: 'B', modelAnswer: 'C' },
      { id: 'q3', userAnswer: 'True', modelAnswer: 'True' },
    ]
    expect(calcScore('MCQ', answers)).toBe(2)
  })

  it('is case-insensitive', () =>
    expect(autoScore('true', 'True')).toBe(true))

  it('scores 0 when all wrong', () => {
    const answers = [
      { id: 'q1', userAnswer: 'D', modelAnswer: 'A' },
      { id: 'q2', userAnswer: 'False', modelAnswer: 'True' },
    ]
    expect(calcScore('TF', answers)).toBe(0)
  })
})

describe('Short-answer self-mark scoring', () => {
  it('scores 1 for correct, 0.5 for partial, 0 for incorrect', () => {
    const answers = [
      { id: 'q1', userAnswer: 'any', modelAnswer: 'model', selfMark: 'correct' as const },
      { id: 'q2', userAnswer: 'any', modelAnswer: 'model', selfMark: 'partial' as const },
      { id: 'q3', userAnswer: 'any', modelAnswer: 'model', selfMark: 'incorrect' as const },
    ]
    expect(calcScore('Short', answers)).toBe(1.5)
  })

  it('scores 0 for all incorrect', () => {
    const answers = [
      { id: 'q1', userAnswer: '', modelAnswer: '', selfMark: 'incorrect' as const },
    ]
    expect(calcScore('Short', answers)).toBe(0)
  })
})

describe('isScannedPdf', () => {
  it('returns true when text is nearly empty relative to page count', () => {
    expect(isScannedPdf('a', 10)).toBe(true)
  })

  it('returns false when text is rich', () => {
    const text = 'a'.repeat(5000)
    expect(isScannedPdf(text, 10)).toBe(false)
  })

  it('edge: zero pages still applies minimum threshold', () => {
    expect(isScannedPdf('', 0)).toBe(true)
  })
})

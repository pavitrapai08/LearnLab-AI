import { describe, it, expect } from 'vitest'
import { stripJsonFences, parseJsonWithRetry } from './claude'

describe('stripJsonFences', () => {
  it('strips ```json fences', () =>
    expect(stripJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}'))

  it('strips plain ``` fences', () =>
    expect(stripJsonFences('```\n{"a":1}\n```')).toBe('{"a":1}'))

  it('leaves clean JSON untouched', () =>
    expect(stripJsonFences('{"a":1}')).toBe('{"a":1}'))

  it('trims surrounding whitespace', () =>
    expect(stripJsonFences('  {"a":1}  ')).toBe('{"a":1}'))
})

describe('parseJsonWithRetry', () => {
  it('parses clean JSON on first try', async () => {
    const result = await parseJsonWithRetry<{ x: number }>(
      '{"x": 42}',
      async () => '',
    )
    expect(result).toEqual({ x: 42 })
  })

  it('parses JSON wrapped in fences on first try', async () => {
    const result = await parseJsonWithRetry<{ x: number }>(
      '```json\n{"x": 99}\n```',
      async () => '',
    )
    expect(result).toEqual({ x: 99 })
  })

  it('falls back to retry when first parse fails', async () => {
    let retried = false
    const result = await parseJsonWithRetry<{ x: number }>(
      'not valid json',
      async () => { retried = true; return '{"x": 7}' },
    )
    expect(retried).toBe(true)
    expect(result).toEqual({ x: 7 })
  })

  it('throws PARSE_FAILED when both attempts fail', async () => {
    await expect(
      parseJsonWithRetry<{ x: number }>('bad', async () => 'also bad'),
    ).rejects.toThrow('PARSE_FAILED')
  })
})

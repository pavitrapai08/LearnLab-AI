import { describe, it, expect } from 'vitest'
import { validateFile, mimeToSourceType, mimeToExtension } from './validation'

const MB = 1024 * 1024

describe('mimeToSourceType', () => {
  it('maps PDF', () => expect(mimeToSourceType('application/pdf')).toBe('pdf'))
  it('maps DOCX', () => expect(mimeToSourceType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx'))
  it('maps JPEG', () => expect(mimeToSourceType('image/jpeg')).toBe('image'))
  it('maps PNG', () => expect(mimeToSourceType('image/png')).toBe('image'))
  it('returns null for unsupported', () => expect(mimeToSourceType('text/html')).toBeNull())
})

describe('mimeToExtension', () => {
  it('returns pdf', () => expect(mimeToExtension('application/pdf')).toBe('pdf'))
  it('returns docx', () => expect(mimeToExtension('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx'))
  it('returns jpg', () => expect(mimeToExtension('image/jpeg')).toBe('jpg'))
  it('returns png', () => expect(mimeToExtension('image/png')).toBe('png'))
  it('returns bin for unknown', () => expect(mimeToExtension('application/octet-stream')).toBe('bin'))
})

describe('validateFile', () => {
  it('accepts a 5 MB PDF', () => {
    const result = validateFile({ type: 'application/pdf', size: 5 * MB })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.sourceType).toBe('pdf')
  })

  it('rejects a 25 MB PDF (over 20 MB limit)', () => {
    const result = validateFile({ type: 'application/pdf', size: 25 * MB })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toMatch(/20 MB/)
  })

  it('accepts a 9 MB DOCX', () => {
    const result = validateFile({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 9 * MB })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.sourceType).toBe('docx')
  })

  it('rejects a 12 MB DOCX (over 10 MB limit)', () => {
    const result = validateFile({ type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 12 * MB })
    expect(result.valid).toBe(false)
  })

  it('accepts a 9 MB JPEG', () => {
    const result = validateFile({ type: 'image/jpeg', size: 9 * MB })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.sourceType).toBe('image')
  })

  it('rejects an unsupported mime type', () => {
    const result = validateFile({ type: 'video/mp4', size: 1 * MB })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toMatch(/Unsupported/)
  })
})

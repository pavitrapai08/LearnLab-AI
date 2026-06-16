export type SourceType = 'pdf' | 'docx' | 'image' | 'paste'

const MB = 1024 * 1024
export const FILE_LIMITS: Record<string, number> = {
  'application/pdf': 20 * MB,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 10 * MB,
  'image/jpeg': 10 * MB,
  'image/png': 10 * MB,
}

export const ACCEPTED_MIME_TYPES = Object.keys(FILE_LIMITS)

export function mimeToSourceType(mime: string): SourceType | null {
  if (mime === 'application/pdf') return 'pdf'
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
  if (mime === 'image/jpeg' || mime === 'image/png') return 'image'
  return null
}

export function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  }
  return map[mime] ?? 'bin'
}

export type ValidationResult =
  | { valid: true; sourceType: SourceType }
  | { valid: false; error: string }

export function validateFile(file: { type: string; size: number }): ValidationResult {
  const sourceType = mimeToSourceType(file.type)
  if (!sourceType) {
    return {
      valid: false,
      error: 'Unsupported file type. Upload a PDF, Word document (.docx), JPG, or PNG.',
    }
  }
  const limit = FILE_LIMITS[file.type]
  if (file.size > limit) {
    const mb = Math.round(limit / MB)
    return { valid: false, error: `File too large — must be under ${mb} MB for this type.` }
  }
  return { valid: true, sourceType }
}

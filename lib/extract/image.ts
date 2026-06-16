import { extractImageText } from '@/lib/claude'

export async function processImageBuffer(
  buffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png',
): Promise<string> {
  const base64 = buffer.toString('base64')
  return extractImageText(base64, mimeType)
}

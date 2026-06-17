import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import type { NextRequest } from 'next/server'

// Per-route hourly limits (requests per IP per UTC hour).
const LIMITS: Record<string, number> = {
  generate: 30,
  process:  20,
  tutor:    40,
}

export async function checkRateLimit(
  req: NextRequest,
  route: 'generate' | 'process' | 'tutor',
): Promise<{ limited: boolean }> {
  const limit = LIMITS[route]

  // Read IP — take the first address in x-forwarded-for (set by Vercel).
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  // Hash the IP for privacy; truncate to 16 hex chars (enough for uniqueness).
  const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 16)

  // Window key = current UTC hour, e.g. "2026-06-17T14"
  const windowKey = new Date().toISOString().slice(0, 13)

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_ip_hash: ipHash,
      p_window_key: windowKey,
    })
    if (error) {
      // Fail-open: if the table/function doesn't exist yet, allow the request.
      console.warn('[throttle] rate limit check failed (fail-open):', error.message)
      return { limited: false }
    }
    return { limited: (data as number) > limit }
  } catch (e) {
    console.warn('[throttle] rate limit threw (fail-open):', e)
    return { limited: false }
  }
}

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Temporary health check — remove or gate before P6 go-live (PHASE_0.md DoD).
export async function GET() {
  const results: Record<string, string> = {}

  // Claude ping
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Reply with the word ok' }],
    })
    const text = (msg.content[0] as { type: string; text: string }).text
    results.claude = text ? 'ok' : 'empty_response'
  } catch (e) {
    results.claude = `error: ${(e as Error).message}`
  }

  // Supabase read round-trip (service role bypasses RLS for the ping)
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('documents').select('id').limit(1)
    results.supabase = error ? `error: ${error.message}` : 'ok'
  } catch (e) {
    results.supabase = `error: ${(e as Error).message}`
  }

  const allOk = Object.values(results).every((v) => v === 'ok')
  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', results },
    { status: allOk ? 200 : 503 },
  )
}

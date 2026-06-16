/**
 * P0 QA — RLS positive + negative tests.
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.
 * Run: npx vitest run lib/supabase/rls.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const skip = !URL || !ANON

describe.skipIf(skip)('Supabase RLS', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let docId: string

  beforeAll(async () => {
    // Two separate anonymous sessions
    clientA = createClient(URL, ANON, { auth: { persistSession: false } })
    clientB = createClient(URL, ANON, { auth: { persistSession: false } })
    await clientA.auth.signInAnonymously()
    await clientB.auth.signInAnonymously()
  })

  afterAll(async () => {
    if (docId) await clientA.from('documents').delete().eq('id', docId)
  })

  it('positive: user A can insert and read back its own document row', async () => {
    const { data: { user } } = await clientA.auth.getUser()
    expect(user).not.toBeNull()

    const { data, error } = await clientA
      .from('documents')
      .insert({ session_id: user!.id, source_type: 'paste', status: 'ready' })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
    docId = data!.id

    const { data: rows } = await clientA.from('documents').select('id').eq('id', docId)
    expect(rows).toHaveLength(1)
  })

  it('negative: user B cannot read user A\'s document row', async () => {
    const { data } = await clientB.from('documents').select('id').eq('id', docId)
    expect(data).toHaveLength(0)
  })
})

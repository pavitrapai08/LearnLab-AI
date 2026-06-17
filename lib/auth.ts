// Client-side auth helpers — import only from 'use client' components.
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

// Signs in anonymously on first visit; no-op if a session already exists.
// Called once on mount by AuthProvider; the session persists in localStorage.
export async function ensureAnonymousSession(): Promise<Session | null> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('[auth] anonymous sign-in failed:', error.message)
    return null
  }
  return data.session
}

// P5: attach an email to the current anonymous user (upgrades in place, uid preserved).
// On confirm the anonymous user becomes a permanent user with the SAME uid — no data migration.
export async function linkEmail(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${window.location.origin}/auth/callback` },
  )
  if (error) throw error
}

// P5: sign in on a second device using OTP sent to the linked email.
// shouldCreateUser:false ensures we only sign into existing accounts (not mint new ones).
export async function signInWithOtp(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

// P5: verify a 6-digit OTP entered by the user after signInWithOtp.
export async function verifyOtp(email: string, token: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}

// P5: sign out the current user (anonymous or linked).
// After this, AuthProvider will call ensureAnonymousSession() on the next mount.
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

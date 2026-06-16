'use client'

import { useEffect } from 'react'
import { ensureAnonymousSession } from '@/lib/auth'

// Ensures an anonymous Supabase session exists on first visit.
// Wraps the entire app; the session persists in localStorage across reloads.
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureAnonymousSession()
  }, [])

  return <>{children}</>
}

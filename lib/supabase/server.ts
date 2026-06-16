import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Cookie-aware server client (anon key, RLS enforced).
// Use in Server Components, Server Actions, and Route Handlers for user-data access.
export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // setAll in Server Components is a no-op (cookies are read-only there)
          }
        },
      },
    },
  )
}

// Service-role client — bypasses RLS.
// Use ONLY for: Storage downloads in /api/process, and genuine system writes.
// Never use for ordinary user-data writes (those go through createClient() under RLS).
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// Returns the verified caller from the request token, or null if unauthenticated.
// Derives identity server-side — never trust a client-supplied uid (CLAUDE.md §5).
export async function getVerifiedUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}


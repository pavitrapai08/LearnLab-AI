import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Handles Supabase magic-link and OTP email redirects.
// Supabase sends users here after clicking a confirmation/sign-in link in their email.
// Two cases:
//   1. PKCE flow: `?code=` → exchangeCodeForSession
//   2. Magic-link / email OTP: `?token_hash=&type=` → verifyOtp
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') ?? 'email'
  const next = url.searchParams.get('next') ?? '/'

  if (code || tokenHash) {
    const cookieStore = cookies()
    const supabase = createServerClient(
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
              // Ignore — cookies are read-only in Server Components; this runs in a Route Handler
            }
          },
        },
      },
    )

    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    } else if (tokenHash) {
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as 'email' | 'signup' | 'recovery' | 'email_change' | 'invite',
      })
    }
  }

  // Redirect to the intended destination (default: home).
  return NextResponse.redirect(new URL(next, request.url))
}

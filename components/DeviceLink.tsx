'use client'

import { useState, useEffect } from 'react'
import {
  Loader2, Smartphone, Mail, CheckCircle, LogOut, Link2, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { linkEmail, signInWithOtp, verifyOtp, signOut } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'

type View = 'status' | 'link-email' | 'link-sent' | 'signin-email' | 'signin-otp'

export default function DeviceLink() {
  const [view, setView] = useState<View>('status')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null)
      setLoadingUser(false)
    })
  }, [])

  const reset = () => { setEmail(''); setOtp(''); setError(''); setView('status') }
  const clearError = () => setError('')

  function resolveAuthError(err: unknown): string {
    const status = (err as { status?: number }).status
    const message = (err instanceof Error ? err.message : (err as { message?: string }).message) ?? ''
    if (status === 429 || /rate.?limit|too many/i.test(message)) {
      return 'Too many email attempts. Please wait a few minutes and try again.'
    }
    return message || 'Something went wrong. Please try again.'
  }

  // ── Path A — link email to current anonymous user ──────────────────────────
  const handleLinkEmail = async () => {
    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return }
    setLoading(true); clearError()
    try {
      await linkEmail(email)
      setView('link-sent')
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : (err as { message?: string }).message ?? '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered')) {
        setError('This email already belongs to another account. Use "I already use LearnLab" to sign in with it instead.')
      } else {
        setError(resolveAuthError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Path B — sign in on this device with an existing linked email ──────────
  const handleSignInEmail = async () => {
    if (!email || !email.includes('@')) { setError('Enter a valid email address.'); return }
    setLoading(true); clearError()
    try {
      await signInWithOtp(email)
      setView('signin-otp')
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : (err as { message?: string }).message ?? '').toLowerCase()
      if (msg.includes('not found') || msg.includes('no user')) {
        setError('No LearnLab account found for this email. Have you linked it on another device?')
      } else {
        setError(resolveAuthError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Verify the 6-digit OTP ─────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError('Enter the full 6-digit code from your email.'); return }
    setLoading(true); clearError()
    try {
      await verifyOtp(email, otp)
      window.location.reload()
    } catch {
      setError('Incorrect or expired code. Request a new one below.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setOtp(''); clearError()
    await handleSignInEmail()
  }

  const handleSignOut = async () => {
    setLoading(true); clearError()
    try {
      await signOut()
      window.location.href = '/'
    } catch {
      setError('Sign-out failed. Please try again.')
      setLoading(false)
    }
  }

  // ── Loading user ───────────────────────────────────────────────────────────
  if (loadingUser) {
    return (
      <div className="flex justify-center py-10" aria-label="Loading sync status">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  // ── STATUS (linked) ────────────────────────────────────────────────────────
  if (view === 'status' && userEmail) {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4"
          aria-label="Sync status: synced"
        >
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-green-900">Synced across your devices</p>
            <p className="mt-0.5 text-xs text-green-700">{userEmail}</p>
            <p className="mt-1 text-xs text-green-600">
              Any data you create is available on every device signed in with this email.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start"
          onClick={handleSignOut}
          disabled={loading}
          aria-label="Sign out of this device"
        >
          {loading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <LogOut className="h-3 w-3" />}
          Sign out of this device
        </Button>
        {error && <ErrorBox message={error} />}
      </div>
    )
  }

  // ── STATUS (anonymous) ─────────────────────────────────────────────────────
  if (view === 'status') {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm"
          aria-label="Sync status: device only"
        >
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Saved to the cloud</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your quizzes, decks, and scores are here when you return on this device.
              Link an email to access them on any device — no password needed.
            </p>
          </div>
        </div>

        <Button onClick={() => { clearError(); setView('link-email') }} className="gap-2">
          <Link2 className="h-4 w-4" /> Use on another device
        </Button>

        <button
          type="button"
          onClick={() => { clearError(); setView('signin-email') }}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          I already use LearnLab on another device
        </button>
      </div>
    )
  }

  // ── LINK EMAIL ─────────────────────────────────────────────────────────────
  if (view === 'link-email') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Link an email address</p>
        <p className="text-xs text-muted-foreground">
          We&apos;ll send a confirmation link. Your existing progress is preserved — the link only
          adds a way to reach your data from another device.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="link-email-input" className="text-xs text-muted-foreground">
            Email address
          </Label>
          <Input
            id="link-email-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleLinkEmail()}
            placeholder="you@example.com"
            autoFocus
            autoComplete="email"
          />
        </div>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
            {error.includes('already belongs') && (
              <button
                type="button"
                onClick={() => { clearError(); setView('signin-email') }}
                className="mt-1 text-xs underline text-destructive hover:text-destructive/80"
              >
                Sign in with this email instead →
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={handleLinkEmail} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send confirmation
          </Button>
          <Button variant="ghost" onClick={reset} disabled={loading}>Cancel</Button>
        </div>
      </div>
    )
  }

  // ── LINK SENT ──────────────────────────────────────────────────────────────
  if (view === 'link-sent') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Mail className="h-9 w-9 text-primary" aria-hidden="true" />
        <p className="font-semibold">Check your inbox</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate
          cross-device sync — your existing progress won&apos;t be affected.
        </p>
        <p className="text-xs text-muted-foreground">
          The link expires after 24 hours. Your data stays on this device in the meantime.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    )
  }

  // ── SIGN IN WITH EMAIL ─────────────────────────────────────────────────────
  if (view === 'signin-email') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Sign in with your email</p>
        <p className="text-xs text-muted-foreground">
          Enter the email you linked on another device. We&apos;ll send a 6-digit code.
        </p>
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
          role="note"
          aria-label="Note about current data"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-xs text-amber-800">
            Any anonymous data on this device won&apos;t carry over. Sign in to access your data
            from the other device.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-email-input" className="text-xs text-muted-foreground">
            Email address
          </Label>
          <Input
            id="signin-email-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && handleSignInEmail()}
            placeholder="you@example.com"
            autoFocus
            autoComplete="email"
          />
        </div>
        {error && <ErrorBox message={error} />}
        <div className="flex gap-2">
          <Button onClick={handleSignInEmail} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send code
          </Button>
          <Button variant="ghost" onClick={reset} disabled={loading}>Cancel</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account on another device?{' '}
          <button
            type="button"
            onClick={() => { clearError(); setView('link-email') }}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Link this device instead
          </button>
        </p>
      </div>
    )
  }

  // ── OTP ENTRY ──────────────────────────────────────────────────────────────
  if (view === 'signin-otp') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            Code sent to <strong>{email}</strong>. You can also click the magic link in the
            email to sign in automatically.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otp-input" className="text-xs text-muted-foreground">
            6-digit code
          </Label>
          <Input
            id="otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && !loading && handleVerifyOtp()}
            placeholder="123456"
            autoFocus
            autoComplete="one-time-code"
            className="text-center font-mono tracking-[0.4em]"
            aria-label="One-time password"
          />
        </div>
        {error && <ErrorBox message={error} />}
        <div className="flex gap-2">
          <Button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length < 6}
            className="gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <Button variant="ghost" onClick={reset} disabled={loading}>Cancel</Button>
        </div>
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={loading}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        >
          Resend code
        </button>
      </div>
    )
  }

  return null
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2"
      role="alert"
    >
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}

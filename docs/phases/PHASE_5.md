# Phase 5 — Cross-device sync (optional email magic-link / OTP)

**Status:** 🟡 In progress · **Started:** 2026-06-17

**Objective:** let a user reach their data on a second device by attaching an email to their existing anonymous user — real two-way sync, no full login, no hand-rolled auth. See `TECH_SPEC.md §3.4`.

---

## Supabase Auth setup (must be confirmed before QA)

1. **Supabase Dashboard → Authentication → URL Configuration:**
   - **Site URL** must be the production Vercel domain (e.g. `https://learnlab.vercel.app`)
   - **Redirect URLs** must include both the production domain and all preview domain patterns:
     - `https://learnlab.vercel.app/**`
     - `https://learnlab-*.vercel.app/**` (or the specific preview URL)
   - If these point to `localhost`, magic links work locally and **fail in production**.
2. **Email OTP / Confirmations** are enabled by default in Supabase Auth — verify the email templates in Dashboard → Auth → Email Templates look reasonable.

---

## Tasks

- [x] 1. `lib/auth.ts` — `linkEmail(email)`: `supabase.auth.updateUser({ email }, { emailRedirectTo })` (upgrades anon user in place, uid preserved); `signInWithOtp(email)`: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo } })` (sign in on another device, refuse to create new users); `verifyOtp(email, token)`: `supabase.auth.verifyOtp({ email, token, type: 'email' })`; `signOut()`: `supabase.auth.signOut()`.
- [x] 2. `app/auth/callback/route.ts` — handles Supabase redirects after a magic link or email confirmation is clicked. Two cases: `?code=` → `exchangeCodeForSession` (PKCE); `?token_hash=&type=` → `verifyOtp` (magic link / email change). Redirects to `?next` (default `/`).
- [x] 3. `components/DeviceLink.tsx` — full state machine with 5 views:
   - **`status` (unlinked):** "Saved to the cloud · on this device" copy + "Use on another device" button + "I already use LearnLab" link.
   - **`status` (linked):** "Synced across your devices · {email}" + Sign out button.
   - **`link-email`:** email input → `linkEmail()` → `link-sent`. Error handling: email already belongs to another account → show "sign in instead" inline link.
   - **`link-sent`:** "Check your inbox" with expiry note. Cancel resets to status.
   - **`signin-email`:** warning note that anonymous data won't carry over + email input → `signInWithOtp()` → `signin-otp`. Error handling: no account found for email.
   - **`signin-otp`:** 6-digit numeric input (`inputMode="numeric"`, `autoComplete="one-time-code"`) → `verifyOtp()` → `window.location.reload()`. Resend button calls `signInWithOtp` again.
- [x] 4. `app/account/page.tsx` — "Sync & Account" page hosting `DeviceLink`. Accessible from nav for both personas. Includes privacy note (no PII unless email is linked).
- [x] 5. `components/MobileNav.tsx` — "Account" nav item (UserCircle icon) added to both `STUDENT_NAV` (6 items) and `TEACHER_NAV` (3 items), pointing to `/account`.
- [x] 6. `npm run build` — clean, 17 routes (added `/account`, `/auth/callback`).

---

## Acceptance criteria

- [ ] A user can link an email on device A without losing any existing data (same `uid`).
- [ ] Signing in with that email on device B shows **all** of device A's quizzes, decks, summaries, scores, and streak.
- [ ] New data created on device B appears on device A after refresh (two-way).
- [ ] Users who never link an email are unaffected and keep a per-device session.

---

## QA checks (all **[YOU]** unless noted)

- [ ] **[YOU]** *Real sync (most important):* study in browser A, link an email, sign in on a **different browser/device** with that email → existing data appears.
- [ ] **[CC]** *No data loss on link:* linking an email preserves the current session's data (uid unchanged) — `auth.uid()` is identical before and after `updateUser({ email })`.
- [ ] **[CC]** *RLS still holds:* a user who has NOT been given the email/OTP cannot read another user's rows.
- [ ] **[YOU]** *Deploy-only failure (critical):* trigger a magic link on the **deployed preview URL** and confirm it redirects back to the deployed app, **not** `localhost`.
- [ ] **[YOU]** *Edge cases:* expired/wrong OTP → "Incorrect or expired code" + Resend button; unconfirmed email → "Check your inbox" pending state; email already registered → "already belongs to another account, sign in instead" inline link.
- [ ] **[YOU]** *No PII without opt-in:* a user who never links shows "Saved to the cloud" copy; `auth.users.email` is null; Terms reflects no PII unless cross-device is enabled.
- [ ] **[YOU]** *Responsive:* Account page / DeviceLink UI at 375px; verify 768/1280.

---

## Deviations / decisions

- **`shouldCreateUser: false`** in `signInWithOtp` — prevents a new account being minted if a user mistypes or enters an unregistered email on the sign-in path. Supabase returns an error in this case which we surface as "No LearnLab account found for this email."
- **`emailRedirectTo` set at call time** using `window.location.origin + '/auth/callback'`. This dynamically adapts to the domain (localhost / preview / production) without needing a hard-coded env var — as long as Supabase's Redirect URLs whitelist the production and preview domains.
- **Auth callback handles both PKCE and magic-link flows** — `?code=` for PKCE, `?token_hash=&type=` for magic links and email changes. Both produce a valid Supabase session via `@supabase/ssr`.
- **Account page uses student MobileNav** — teacher personas also access `/account` and will see the student nav; acceptable for a portfolio app where the account settings are persona-agnostic.
- **Signed-out state** — after `signOut()`, the browser redirects to `/` where `AuthProvider` calls `ensureAnonymousSession()`, starting a fresh anonymous session. The previous linked session data is no longer accessible on this device.

---

## Files created / modified

- `lib/auth.ts` — added `signOut`, `verifyOtp`; updated `linkEmail`, `signInWithOtp` with `emailRedirectTo` and `shouldCreateUser:false`
- `app/auth/callback/route.ts` — new
- `components/DeviceLink.tsx` — implemented (was null stub)
- `app/account/page.tsx` — new
- `components/MobileNav.tsx` — Account nav item added to both personas

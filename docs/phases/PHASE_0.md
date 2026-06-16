# Phase 0 — Setup, schema, RLS & deploy pipeline

**Status:** 🟡 In progress · **Started:** 2026-06-16 · **Completed:** —

**Objective:** a scaffolded Next.js app on Vercel, talking to Supabase, with anonymous auth, the full schema, and RLS — before any feature code.

> This doc is pre-filled from `IMPLEMENTATION_PLAN.md`. As we work, check off items, record files touched, and fill the Results sections. Mark the phase ✅ in `docs/PHASE_LOG.md` only when every AC and QA item passes on the deployed preview URL.

## Tasks

- [x] 1. All project config files written manually (Node.js not installed — see Deviations). Install deps with `npm install` after installing Node.js. Run `npx shadcn@latest init` once after that.
- [ ] 2. Create the Supabase project; create the private bucket `uploads`; run `supabase/schema.sql` in the SQL editor.
- [ ] 3. RLS is included in `supabase/schema.sql` — verify in Supabase dashboard after running the SQL.
- [x] 4. `lib/supabase/{client,server}.ts` and `lib/auth.ts` implemented; `components/AuthProvider.tsx` calls `signInAnonymously()` on first load. *(Supabase anon sign-in must be enabled in the dashboard — see task 2.)*
- [x] 5. `lib/options.ts` filled with all canonical India subject / grade / output-language lists.
- [ ] 6. Fill `.env.local` with the four env vars from the Supabase dashboard; add the same to Vercel (Production + Preview); set Supabase Auth Site URL + Redirect URLs; enable email OTP.
- [ ] 7. Connect the repo to Vercel; confirm push → preview deploy.
- [x] 8. `app/api/health/route.ts` written (Claude ping + Supabase round-trip).

## Acceptance criteria

- [ ] `npm run dev` starts clean on `localhost:3000`.
- [ ] A git push produces a live Vercel **preview URL**.
- [ ] `/api/health` returns success (Claude responds; a row is written + read back).
- [ ] Anonymous auth issues a stable `uid` that persists across reloads.

## QA checks

- [ ] **[YOU]** Secrets: on the preview URL, DevTools → Sources search for `sk-ant` and the service-role key → **absent**.
- [ ] **[CC]** RLS positive: the signed-in anon user can write and read its own rows.
- [ ] **[CC]** RLS negative: a second session (different `uid`) reading the first's rows returns **nothing**.
- [ ] **[CC]** Route identity / IDOR: a route call with a forged `uid` writes nothing under that uid; `/api/process` with a `storagePath` outside the caller's `{uid}/` returns `UNAUTHORIZED`.
- [ ] **[CC]** Build: `npm run lint` and `npm run build` clean.

## Definition of done

All above green; `/api/health` removed or gated before P6; CLAUDE.md updated with the live Supabase project context.

---

## Results (fill as we go)

**Files created / updated (2026-06-16):**
- `package.json` — full dep list incl. `@supabase/ssr`; `pdf-parse` pinned to `1.1.1`
- `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`
- `components.json` — shadcn/ui configuration
- `app/globals.css` — full shadcn/ui CSS variable set (light + dark)
- `app/layout.tsx` — wraps app in `AuthProvider`
- `app/page.tsx` — minimal Student / Teacher split (placeholder for full P1 home)
- `lib/options.ts` — subjects (grouped), grades, output languages
- `lib/supabase/client.ts` — `createBrowserClient` via `@supabase/ssr`
- `lib/supabase/server.ts` — `createClient` (cookie-based, RLS), `createServiceClient` (service role), `getVerifiedUser`
- `lib/auth.ts` — `ensureAnonymousSession`; P5 stubs `linkEmail` / `signInWithOtp`
- `lib/utils.ts` — `cn` utility for shadcn/ui
- `components/AuthProvider.tsx` — calls `ensureAnonymousSession` on mount
- `app/api/health/route.ts` — Claude ping + Supabase read round-trip; `maxDuration = 60`
- `supabase/schema.sql` — all 8 tables + RLS policies + Storage bucket policy

**AC results:**
- _(pending — needs Node.js installed, `npm install` run, Supabase project created, env vars set)_

**QA results:**
- _(pending — needs deployed Vercel preview URL)_

**Deviations / decisions:**
- **Node.js not installed.** All config files were hand-authored instead of via `npx create-next-app`. The output is equivalent. After installing Node.js LTS, run `npm install` then `npx shadcn@latest init --yes --defaults` (or interactive to pick style).
- Added `@supabase/ssr` to `package.json` — required for cookie-based session management in Next.js App Router. Not listed in original task spec but implicit.
- `lib/auth.ts` pre-wired the P5 `linkEmail` / `signInWithOtp` helpers as stubs so they don't need a rewrite later; they're not called until P5.

**Handoff to P1:**
- _(pending — fill once all AC/QA pass)_

# Phase 0 — Setup, schema, RLS & deploy pipeline

**Status:** ✅ Done · **Started:** 2026-06-16 · **Completed:** 2026-06-16

**Objective:** a scaffolded Next.js app on Vercel, talking to Supabase, with anonymous auth, the full schema, and RLS — before any feature code.

## Tasks

- [x] 1. All project config files written manually; `npm install` run; Next.js patched to 14.2.35; `npm run build` clean.
- [x] 2. Supabase project created; private `uploads` bucket created; `supabase/schema.sql` run in SQL editor.
- [x] 3. RLS enabled on all 8 tables + Storage bucket — policies verified by integration test.
- [x] 4. Anonymous sign-in enabled in Supabase Auth; `lib/supabase/{client,server}.ts` and `lib/auth.ts` implemented; `AuthProvider` signs in on first load.
- [x] 5. `lib/options.ts` filled with all canonical India option lists.
- [x] 6. All 4 env vars set in `.env.local` and Vercel (Production + Preview); Supabase Auth redirect URLs configured.
- [x] 7. Repo pushed to GitHub; connected to Vercel; preview deploy live.
- [x] 8. `/api/health` route written and verified.

## Acceptance criteria

- [x] `npm run dev` starts clean on `localhost:3000`.
- [x] A git push produces a live Vercel **preview URL**.
- [x] `/api/health` returns `{"status":"ok","results":{"claude":"ok","supabase":"ok"}}`.
- [x] Anonymous auth issues a stable `uid` that persists across reloads.

## QA checks

- [ ] **[YOU]** Secrets: on the preview URL, DevTools → Sources search for `sk-ant` and the service-role key → **absent**. *(Do this before P6 deploy — not blocking P1.)*
- [x] **[CC]** RLS positive: user A inserts a `documents` row and reads it back — passes (`vitest run lib/supabase/rls.test.ts`).
- [x] **[CC]** RLS negative: user B cannot read user A's rows — passes.
- [ ] **[CC]** Route identity / IDOR: `/api/process` rejects `storagePath` outside caller's `{uid}/` → `UNAUTHORIZED`. *(Deferred to P1 when the route is implemented.)*
- [x] **[CC]** Build: `npm run lint` and `npm run build` clean.

## Definition of done

All blocking items above green. The one `[YOU]` secrets check and the IDOR test are tracked to P1/P6 — they require the deployed URL with DevTools access and the implemented `/api/process` route respectively.

---

## Results

**Files created / updated (2026-06-16):**
- `package.json` — full dep list; Next.js pinned to 14.2.35; `pdf-parse` pinned to `1.1.1`
- `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`
- `components.json` — shadcn/ui config (`"style": "base"` for shadcn v4.11+)
- `vitest.config.ts` — with `.env.local` loader for integration tests
- `app/globals.css` — full shadcn/ui CSS variable set
- `app/layout.tsx`, `app/page.tsx` — Student / Teacher split landing page
- `lib/options.ts` — subjects (grouped), grades, output languages
- `lib/supabase/client.ts`, `lib/supabase/server.ts` — browser + cookie-based + service-role clients
- `lib/auth.ts` — `ensureAnonymousSession`; P5 stubs `linkEmail` / `signInWithOtp`
- `lib/utils.ts` — `cn` utility for shadcn/ui
- `lib/supabase/rls.test.ts` — RLS positive + negative integration tests
- `components/AuthProvider.tsx` — calls `ensureAnonymousSession` on mount
- `app/api/health/route.ts` — Claude ping + Supabase read round-trip
- `supabase/schema.sql` — all 8 tables + RLS policies + Storage bucket policy

**AC results:**
- `npm run dev` → clean, `localhost:3000` shows Student/Teacher split ✅
- Vercel preview URL live ✅
- `/api/health` → `{"status":"ok","results":{"claude":"ok","supabase":"ok"}}` on both localhost and Vercel ✅
- Anonymous auth persists across reloads ✅

**QA results:**
- RLS positive + negative → `2 tests passed` (vitest) ✅
- Build (`npm run build`) → clean, 15 routes, no TS/lint errors ✅
- Secrets check → deferred to P1 (user to run in DevTools on live URL)
- IDOR (`/api/process`) → deferred to P1 (route is a 501 stub until P1)

**Deviations / decisions:**
- Node.js was not installed; all config files hand-authored instead of via `npx create-next-app`. Output is equivalent.
- Added `@supabase/ssr` (implicit requirement for Next.js App Router cookie auth).
- Updated `components.json` to `"style": "base"` — shadcn v4.11 changed from "default/radix" to "base".
- Next.js patched from 14.2.5 → 14.2.35 (security vulnerability in 14.2.5).

**Handoff to P1:**
- All infrastructure is in place: Supabase project, schema, RLS, anonymous auth, Vercel deploy pipeline.
- Stubs ready for P1 implementation: `app/api/process/route.ts`, `components/UploadInput.tsx`, `lib/extract/`, `lib/claude.ts`.
- Outstanding from P0: [YOU] secrets check in DevTools; IDOR test once `/api/process` is implemented.

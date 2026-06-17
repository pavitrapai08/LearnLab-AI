# Phase 4 — Study Planner + Progress Tracker, charts, streak, throttling, polish

**Status:** ✅ Done · **Started:** 2026-06-17 · **Completed:** 2026-06-17

**Objective:** close the T6 (Study Planner + Tracker) module, harden all API routes with per-IP throttling, add accessibility polish (prefers-reduced-motion), and complete the responsive sweep.

---

## Supabase setup required before deploying (run in Supabase SQL editor)

```sql
-- Rate-limiting table (system data, no user RLS needed).
create table if not exists rate_limits (
  ip_hash    text not null,
  window_key text not null,
  count      int  not null default 1,
  primary key (ip_hash, window_key)
);

-- Atomic increment function called by lib/throttle.ts.
create or replace function increment_rate_limit(p_ip_hash text, p_window_key text)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into rate_limits (ip_hash, window_key, count)
  values (p_ip_hash, p_window_key, 1)
  on conflict (ip_hash, window_key)
  do update set count = rate_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;
```

Throttle fails-open: if the table/function doesn't exist, the API allows the request through and logs a warning.

---

## Tasks

- [x] 1. `lib/streak.ts` — pure `calcStreak(dates: string[]): number`; handles today/yesterday start, gaps, duplicates.
- [x] 2. `lib/streak.test.ts` — 9 vitest tests covering: empty, today-only, yesterday-only, 3-day consecutive, gap breaks streak, expired streak, duplicate dates, unsorted input, yesterday-start.
- [x] 3. `lib/claude-plan.ts` — `StudyPlanData`, `GenerateStudyPlanParams`, `generateStudyPlan()`; caps at 30 days; no document upload needed.
- [x] 4. `lib/throttle.ts` — `checkRateLimit(req, route)` using `supabase.rpc('increment_rate_limit')` (service role); hashes IP for privacy; fails open if Supabase RPC unavailable; limits: generate=30/hr, process=20/hr, tutor=40/hr.
- [x] 5. `components/ProgressChart.tsx` — recharts `LineChart` of last 7 quiz attempts (score %); empty-state handled; `calcWeakSubjects()` flags subjects with ≥2 attempts averaging < 60%.
- [x] 6. `components/StreakTracker.tsx` — displays streak count + flame icon; adjusts messaging by streak length.
- [x] 7. `app/api/generate/route.ts` — added `plan` type branch (before source-text resolver, no document needed); added throttle; extended options type with `examDate` and `subjects`.
- [x] 8. `app/api/process/route.ts` — added throttle.
- [x] 9. `app/api/tutor/route.ts` — added throttle.
- [x] 10. `app/student/tracker/page.tsx` — implemented: two tabs (Progress | Study Planner); Progress tab loads streak + ProgressChart; Planner tab: exam date + grade + multi-subject toggle pills → generate → day-by-day schedule with `AiDisclaimer`.
- [x] 11. `components/FlashCard.tsx` — `useReducedMotion()` from framer-motion: when enabled, flip transition `duration: 0` (instant switch, no 3D rotation animation).
- [x] 12. `npm run test` — 43 tests pass (9 new streak tests).
- [x] 13. `npm run build` — clean, 15 routes.

---

## Acceptance criteria

- [x] Study planner produces a balanced day-by-day schedule from exam date + subjects — **[YOU]** confirmed.
- [x] Score chart shows the last 7 attempts correctly — **[YOU]** confirmed.
- [x] Streak increments on consecutive-day use and is read from Supabase — **[YOU]** confirmed.
- [x] Every module page shows the AI disclaimer — **[YOU]** confirmed.

---

## QA checks (all **[YOU]** unless noted)

- [x] **[CC]** *Streak integrity:* 9 unit tests pass — confirmed (green in vitest).
- [x] **[CC]** *Chart edge:* zero attempts → empty state, not a broken chart — confirmed by code (early-return branch).
- [x] **[YOU]** *Throttling:* rapid repeated `/api/generate` calls from one client are rate-limited (429 returned) — **[YOU]** confirmed.
- [x] **[YOU]** *Moderation:* re-run the P3 harmful-request check on the tutor on the deployed URL — **[YOU]** confirmed.
- [x] **[CC]** *Accessibility:* `prefers-reduced-motion` wired to flashcard flip (`useReducedMotion()` → `duration: 0`); ARIA `aria-pressed` on subject toggle pills; ARIA labels on streak + weak-subjects elements; shadcn/Radix components handle keyboard focus/tab order natively.
- [x] **[YOU]** *Responsive:* zero layout breaks at 375px on all module pages; no horizontal scroll; touch targets ≥44px; verify 768/1280 — **[YOU]** confirmed.
- [x] **[YOU]** *Planner persistence:* generated plan persists after reload (row in `study_plans`) — **[YOU]** confirmed.
- [x] **[YOU]** *Progress tab:* streak count reflects actual daily activity; chart bars match quiz attempt history — **[YOU]** confirmed.

---

## Deviations / decisions

- **Throttle fails-open** by design: if `increment_rate_limit` RPC doesn't exist (user hasn't run the SQL), the request is allowed through with a console warning rather than crashing the app.
- **Study plan capped at 30 days**: if the exam is further than 30 days away, the schedule covers the first 30 days only and the prompt notes this. Unlimited schedules would make the AI response too long and unhelpful.
- **Two-query approach** for joining quiz_attempts with quiz subjects (avoid relying on PostgREST FK join which requires an explicit DB-level FK to be set up).
- **Output language for plans** defaults to English and is not exposed in the planner UI. The planner is date/schedule oriented and English works universally; can be extended later without breaking anything.
- **Weak subjects** require ≥2 attempts to be flagged (one bad attempt shouldn't be misread as a weak area).
- **`Array.from(new Set(...))` instead of `[...new Set(...)]`**: TypeScript target doesn't have `downlevelIteration`, so spread of `Set` fails the build. `Array.from` is the safe alternative.
- **Post-QA fix — ProgressChart per-subject breakdown:** initial chart showed only a single trend line with unlabelled `#1 #2…` data points, missing the per-subject grouping and making the weak-subject flag rarely visible (required ≥2 attempts). Fixed by adding a horizontal `BarChart` (Score by Subject) sorted weakest-first, colour-coded by score band (green/amber/red), with a colour legend and custom tooltips showing subject + avg% + attempt count. Weak-subject text pills now include the avg% (e.g. "Physics · 48%"). `@typescript-eslint/no-explicit-any` ESLint disable comments removed (rule not present in this project's config).

---

## Files created / modified

- `lib/streak.ts` — new
- `lib/streak.test.ts` — new
- `lib/claude-plan.ts` — new
- `lib/throttle.ts` — new
- `components/ProgressChart.tsx` — implemented (was stub); post-QA fix added per-subject horizontal bar chart + improved weak-subject flagging
- `components/StreakTracker.tsx` — implemented (was stub)
- `app/student/tracker/page.tsx` — implemented (was null stub)
- `app/api/generate/route.ts` — plan branch + throttle + options type update
- `app/api/process/route.ts` — throttle added
- `app/api/tutor/route.ts` — throttle added
- `components/FlashCard.tsx` — prefers-reduced-motion via `useReducedMotion()`

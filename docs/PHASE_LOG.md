# Phase Log — LearnLab AI

A running record so we both always know **what's covered and what's pending**. We update this at the **end of each phase, before starting the next**.

- **How it works:** each phase has a detail doc at `docs/phases/PHASE_<n>.md` (tasks done, files touched, Acceptance Criteria results, QA `[CC]`/`[YOU]` results, deviations, handoff). This file is the index + status table.
- **The gate:** a phase flips to ✅ Done only when its Acceptance Criteria **and** QA checks pass on the deployed Vercel preview URL — see `IMPLEMENTATION_PLAN.md`.

## Status

| Phase | Title | Status | Date | Detail doc |
|---|---|---|---|---|
| P0 | Setup, schema, RLS & deploy pipeline | ✅ Done | 2026-06-16 | [PHASE_0.md](phases/PHASE_0.md) |
| P1 | Upload → extract + Quiz generator | ✅ Done | 2026-06-17 | [PHASE_1.md](phases/PHASE_1.md) |
| P2 | Flashcards + Summariser + study mode | ✅ Done | 2026-06-17 | [PHASE_2.md](phases/PHASE_2.md) |
| P3 | AI Tutor (streaming) + Lesson plan + PDF export | ✅ Done | 2026-06-17 | [PHASE_3.md](phases/PHASE_3.md) |
| P4 | Planner + tracker, charts, streak, throttling, polish | ✅ Done | 2026-06-17 | [PHASE_4.md](phases/PHASE_4.md) |
| P5 | Cross-device sync (email magic-link / OTP) | ⬜ Not started | — | — |
| P6 | Security pass, final QA & go-live | ⬜ Not started | — | — |

Legend: ⬜ Not started · 🟡 In progress · ✅ Done

## Pre-P0 — completed 2026-06-16

- Reviewed the three spec docs and patched gaps before any code (route identity / no forged uid, single RLS write model, prompt caching, native structured outputs, jsPDF non-Latin fonts, `pdf-parse` serverless pin, storage cleanup, `daily_activity` write trigger, Terms/Privacy page task, accessibility QA, fixed cross-refs, renumbered headings).
- Scaffolded the repo skeleton from `TECH_SPEC.md §13` (this directory). `app/`, `components/`, `lib/` hold `TODO` stubs; each file header notes the phase that implements it.

## ⚠️ P0 sequencing note — `create-next-app` vs the skeleton

P0 task 1 runs `npx create-next-app`, which refuses to run in a directory containing conflicting files (`package.json`, `.gitignore`, `app/page.tsx`, `README.md`, …). Since the skeleton already exists, use the **merge approach**:

1. Run `create-next-app` into a temp folder (e.g. `_cna_tmp`).
2. Copy its generated config + app shell into this repo root: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.*`, `next-env.d.ts`, `.eslintrc*`, `tailwind.config.*`, `postcss.config.*`, `app/layout.tsx`, `app/globals.css`, `app/favicon.ico`, and `public/`.
3. Keep **our** `README.md` and `.gitignore` (don't overwrite with CNA's).
4. Delete `_cna_tmp`. Our `app/api/**`, `app/student/**`, `app/teacher/**`, `components/**`, `lib/**`, and `docs/**` stay as-is.

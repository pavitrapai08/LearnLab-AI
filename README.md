# LearnLab AI

An AI-powered, mobile-first learning platform for teachers and students (India audience). A user uploads a PDF / Word doc / image of a textbook or notes — or pastes text — and the app generates quizzes, flashcards, summaries, lesson plans, a 24/7 tutor, and a study planner. Built as a **portfolio** project.

## Stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Hosting | Vercel (Hobby) |
| Data / Auth / Storage | Supabase (Postgres + anonymous auth + Storage) |
| AI | Claude API (`@anthropic-ai/sdk`), model `claude-sonnet-4-6` |

**Why this stack:** fully managed, zero infra to provision, free-tier friendly, and deploys with a git push. The right fit for a solo portfolio build. (Full rationale + rollback step are finalised in Phase 6.)

## The docs (read these first, every session)

- **[CLAUDE.md](CLAUDE.md)** — standing rules & constraints (always-on context).
- **[TECH_SPEC.md](TECH_SPEC.md)** — architecture, data model, API contracts.
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** — the phased build plan (P0–P6).
- **[docs/PHASE_LOG.md](docs/PHASE_LOG.md)** — running record of what's done each phase.

## Build order

Strictly sequential, **P0 → P6**, one focused session per phase. A phase is done only when its Acceptance Criteria **and** QA checks pass on the deployed Vercel preview URL.

| Phase | Delivers |
|---|---|
| P0 | Setup, schema, RLS & deploy pipeline |
| P1 | Upload → extract pipeline + Quiz generator |
| P2 | Flashcards + Summariser + study mode |
| P3 | AI Tutor (streaming) + Lesson plan + PDF export |
| P4 | Study planner + tracker, charts, streak, throttling, polish |
| P5 | Cross-device sync (optional email magic-link / OTP) |
| P6 | Security pass, final QA & production go-live |

## Setup

> Filled in during **Phase 0**. The repo is currently a scaffolded skeleton — most files under `app/`, `components/`, and `lib/` are stubs marked `TODO`, to be implemented per the phase noted in each file's header comment.

```bash
# (P0) scaffold the Next.js app, install deps, wire Supabase, set env vars
```

### Environment variables

See [.env.local](.env.local) (git-ignored). Set the same four in the Vercel dashboard (Production + Preview):

- `ANTHROPIC_API_KEY` (server only)
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_SUPABASE_URL` (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)

## Rollback

Deploys are git-driven (push → Vercel preview; merge to main → production). **Rollback = promote the previous deployment in the Vercel dashboard.** (Documented in full at P6.)

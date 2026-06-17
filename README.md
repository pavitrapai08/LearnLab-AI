# LearnLab AI

An AI-powered, mobile-first learning platform for teachers and students (India audience). A user uploads a PDF / Word doc / image of a textbook or notes — or pastes text — and the app generates quizzes, flashcards, summaries, lesson plans, a 24/7 AI tutor, and a study planner. Built as a **portfolio project**.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router, TypeScript) | Full-stack in one repo; App Router gives server components and route handlers with no extra config |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first utility CSS + unstyled accessible components — no design-system overhead |
| Hosting | Vercel (Hobby) | Git-push deploys, preview URLs per branch, zero infra to manage |
| Data / Auth / Storage | Supabase (Postgres + anonymous auth + Storage) | One service for the DB, file storage, and auth (including magic-link OTP); anonymous sessions with optional email upgrade |
| AI | `@anthropic-ai/sdk`, model `claude-sonnet-4-6` | Native PDF/image document blocks, structured JSON output, streaming — no extra vision or OCR service |
| File extraction | `pdf-parse` (text PDF), `mammoth` (DOCX), `pdf-lib` (page splitting) | Pure-JS, Vercel-safe, no native binaries |
| Charts / animation / export | `recharts`, `framer-motion`, `jspdf` | Standard, well-maintained, tree-shakeable |
| Tests | `vitest` | Lightweight unit tests for fragile logic only |

**Why no Docker / AWS / containers:** the stack is fully managed. Everything deploys with a `git push` and operates at near-zero cost on free tiers — the right fit for a solo portfolio demo.

---

## The docs (read each session)

- **[CLAUDE.md](CLAUDE.md)** — standing rules & constraints (always-on context for Claude Code sessions).
- **[TECH_SPEC.md](TECH_SPEC.md)** — architecture, data model, API contracts, security spec.
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** — the phased build plan (P0–P6) with QA gates.
- **[docs/PHASE_LOG.md](docs/PHASE_LOG.md)** — running record of what's done each phase.

---

## Setup

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- An [Anthropic](https://console.anthropic.com) API key with a **hard workspace spend limit set in the Console**

### 2. Clone and install

```bash
git clone <repo-url>
cd learnlab-ai
npm install
```

### 3. Environment variables

Create `.env.local` at the project root (git-ignored):

```bash
ANTHROPIC_API_KEY=sk-ant-...          # server only — never NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # server only — never NEXT_PUBLIC_
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Set the same four variables in **Vercel Project → Settings → Environment Variables** for both Production and Preview environments.

### 4. Supabase setup

In the Supabase dashboard:

**Database — run the schema SQL** (from `TECH_SPEC.md §4`):
- Tables: `documents`, `quizzes`, `quiz_attempts`, `flashcard_decks`, `summaries`, `lesson_plans`, `study_plans`, `daily_activity`
- RLS policies: `session_id = auth.uid()` on every table
- Rate-limit helper: `rate_limit_counters` table + `increment_rate_limit` RPC function

**Storage:**
- Create a **private** bucket named `uploads`
- Add Storage RLS: users may only read/write objects under their own `{uid}/` prefix

**Auth:**
- Enable **Anonymous sign-ins**
- Enable **Email OTP** (for cross-device sync)
- Set **Site URL** → your production Vercel domain (e.g. `https://learnlab-ai.vercel.app`)
- Add **Redirect URLs** → `https://learnlab-ai.vercel.app/**` and `https://learnlab-*.vercel.app/**` (preview URLs)

> If these point to `localhost`, magic links work locally and fail in production.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Deploy

```bash
git push origin main   # → triggers Vercel production deploy
```

Push any branch to get a preview URL automatically.

---

## Rollback

Deploys are git-driven. **To roll back production:**

1. Open the [Vercel dashboard](https://vercel.com) → your project → **Deployments**
2. Find the last known-good deployment
3. Click **⋯ → Promote to Production**

This re-serves the previous build instantly with no git revert needed. For a code-level rollback, revert the commit and push.

---

## Project structure

```
app/
  page.tsx                        # Home: Student / Teacher split
  terms/page.tsx                  # Terms of Use & Privacy
  student/{quiz,flashcards,summariser,tutor,tracker}/page.tsx
  teacher/{quiz,lesson}/page.tsx
  account/page.tsx                # Cross-device sync & account
  auth/callback/route.ts          # Supabase auth redirect handler
  api/
    process/route.ts              # Extract text from file or paste
    generate/route.ts             # Quiz / flashcards / summary / lesson / plan / grade
    tutor/route.ts                # Streaming AI tutor
components/
  UploadInput.tsx   SubjectLanguageBar.tsx   QuizCard.tsx
  FlashCard.tsx     ProgressChart.tsx        StreakTracker.tsx
  MobileNav.tsx     ExportPDF.tsx            AiDisclaimer.tsx
  DeviceLink.tsx    AuthProvider.tsx
lib/
  supabase/{client.ts,server.ts}
  auth.ts           claude.ts     claude-lesson.ts   claude-plan.ts
  options.ts        throttle.ts   validation.ts
  extract/{pdf.ts,docx.ts,image.ts,pdf-split.ts,route-detect.ts}
docs/
  PHASE_LOG.md
  phases/PHASE_{0..6}.md
  security-reviews/
```

---

## Security notes

- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only and verified absent from the client bundle before each deploy.
- RLS is enabled on every table and the Storage bucket; cross-session reads are impossible.
- Files are uploaded **directly** browser → Supabase Storage (bypasses the 4.5 MB Vercel function body limit). The API route receives only the storage path and downloads the file server-side.
- All routes derive identity from the verified Supabase access token (`getVerifiedUser()`); client-supplied `uid` values are never trusted.
- Per-IP rate limiting on all `/api/*` routes; Anthropic billing hard cap is the cost backstop.
- See `docs/security-reviews/` for the pre-launch security pass.

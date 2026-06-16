# Phase-wise Implementation Plan — LearnLab AI

**Companion files:** `CLAUDE.md` (standing rules), `TECH_SPEC.md` (architecture & schema).
**How to use:** build one phase per focused session. Start each with `Read @CLAUDE.md, @TECH_SPEC.md, @IMPLEMENTATION_PLAN.md`, scaffold the files before writing logic, and finish a phase only when **both** its Acceptance Criteria and its QA Checks pass — the QA checks on the **deployed Vercel preview URL**, not just localhost.

> **QA is the gate, not a formality.** A phase is done when its QA checks pass on the deployed URL — including the negative and security checks. There is no automated coverage gate; manual QA plus a few targeted `vitest` tests on fragile logic is the verification strategy (see `CLAUDE.md §13`).

**Who runs each QA check — tags used below:**
- **[CC]** — Claude Code can verify this itself while building (pure logic, parsing, validation, scoring, RLS via a script, injection-resistance via prompt design). Confirm it's green.
- **[YOU]** — you verify by hand on a real device against the deployed URL. These exist because they only fail in the live environment and no automated check substitutes for them.

---

## Phase 0 — Setup, schema, RLS & deploy pipeline

**Objective:** a scaffolded Next.js app on Vercel, talking to Supabase, with anonymous auth, the full schema, and RLS — before any feature code.

**Tasks**
1. `npx create-next-app@latest learnlab-ai --typescript --tailwind --app --eslint`; init shadcn/ui; install `@supabase/supabase-js @anthropic-ai/sdk pdf-parse mammoth pdf-lib framer-motion recharts jspdf` and dev dependency `vitest`.
2. Create the Supabase project; create the private bucket `uploads`; create all tables from `TECH_SPEC.md §4`.
3. Enable **RLS on every table and the bucket**; add `session_id = auth.uid()` policies and the per-user Storage folder policy.
4. Enable **anonymous sign-in**; add `lib/supabase/{client,server}.ts` (the server helper verifies the request's access token and exposes `auth.uid()` to routes — see `CLAUDE.md §5`); sign in anonymously on first load.
5. Create `lib/options.ts` with the canonical India subject / grade / output-language lists from `CLAUDE.md §11` (single source for every selector).
6. Add the four env vars to `.env.local` **and** the Vercel dashboard (Production + Preview). In Supabase Auth, set Site URL + Redirect URLs to the production and preview Vercel domains, and enable email OTP.
7. Connect the repo to Vercel; confirm push → preview deploy.
8. Add a temporary `/api/health` route that does a Claude ping and a Supabase read+write round-trip.

**Acceptance criteria**
- `npm run dev` starts clean on `localhost:3000`.
- A git push produces a live Vercel **preview URL**.
- `/api/health` returns success: Claude responds and a row is written + read back from Supabase.
- Anonymous auth issues a stable `uid` that persists across reloads.

**QA checks**
- **[YOU]** *Secrets:* on the preview URL, open DevTools → Sources and search for `sk-ant` and the service-role key → **must be absent**.
- **[CC]** *RLS positive:* the signed-in anon user can write and read its own rows.
- **[CC]** *RLS negative:* a second session (different `uid`) attempting to read the first session's rows returns **nothing** (script two anon sessions and assert isolation).
- **[CC]** *Route identity (no forged uid / IDOR):* a route call supplying another user's `uid` in the body writes nothing under that uid (identity comes from the verified token), and `/api/process` with a `storagePath` outside the caller's `{uid}/` returns `UNAUTHORIZED` — script this with two anon sessions.
- **[CC]** *Build:* `npm run lint` and `npm run build` clean.

**Definition of done:** all above green; `/api/health` removed or gated before P6; CLAUDE.md updated with the live Supabase project context.

---

## Phase 1 — Upload → extract pipeline + Quiz Generator (T1)

**Objective:** the core spine — get real content in (the Vercel-safe way) and produce a textbook-specific quiz from it.

**Tasks**
1. Build `components/UploadInput.tsx` (client): file picker + camera (mobile) + paste tab; **client-side validation** (type/size per `TECH_SPEC §8`); **direct upload to Supabase Storage** (`uploads/{uid}/...`) using the anon key.
2. Build `lib/extract/*` and `/api/process`: server downloads from Storage; text PDF → `pdf-parse`, DOCX → `mammoth`, single image → Claude image block. **Scanned PDF** (empty text) → split the page range with `pdf-lib` and send as a **PDF document block**, processed in **client-driven ~5-page batches** that update `pages_done`/`status`; 50-page cap with user notice; persist `documents`. (See `TECH_SPEC §6`.)
3. Build `components/SubjectLanguageBar.tsx`: subject + output-language selectors, **importing values from `lib/options.ts`** (never hard-coded per page); always visible.
4. Build `/api/generate` (type `quiz`) and `components/QuizCard.tsx`: build prompt, **native structured outputs** (JSON-parse-retry as fallback), persist `quizzes`; take-quiz UI; **scoring** — MCQ/TF auto-scored, **short-answer self-marked** (Correct/Partial/Incorrect → 1/0.5/0) with optional batched **"Grade with AI"** (`type:'grade'`); persist `quiz_attempts` with the `{questionId, response, verdict?, points}` shape.
5. Build the home page (Student/Teacher split) + `components/MobileNav.tsx`.
6. Write `vitest` tests for the fragile logic introduced here: extraction routing, JSON-parse-with-retry, and quiz scoring.

**Acceptance criteria**
- Upload a **text PDF** → quiz generated **from that file's content only**.
- Upload a **photo of a textbook page** → quiz generated correctly.
- Upload a **.docx** → quiz generated from Word content.
- **Paste text** fallback works.
- Output-language selector works: English Biology chapter → quiz in Hindi.
- Topic-name-only input is rejected with a clear message.

**QA checks**
- **[YOU]** *The 4.5 MB blocker (most important):* upload a **12 MB PDF on the deployed preview URL** → it must succeed. (If it 413s, the file is wrongly going through the route body — fix the upload path.)
- **[YOU]** *Timeout / batching:* a large scanned PDF completes without a 504 — it processes in ~5-page batches with visible progress; `maxDuration = 60` is set; each batch finishes under 60s.
- **[CC]** *Negative inputs:* oversized file blocked client-side with the limit named; corrupt/empty file → friendly `EMPTY_CONTENT`/`EXTRACTION_FAILED`, no crash.
- **[CC]** *Storage cleanup:* after a successful extraction the original upload is removed from Storage (or flagged for sweep), honouring the "files discarded" claim and the 1 GB cap (`TECH_SPEC.md §3.1`).
- **[YOU]** *Scanned PDF resume:* closing the tab mid-process leaves a resumable `processing` row; reopening offers to resume from `pages_done`.
- **[CC]** *Quiz scoring:* MCQ/TF auto-score correctly; a short-answer quiz reveals model answers and self-marks to 1/0.5/0; "Grade with AI" pre-fills marks in one call and the user can override; `score` = sum of points.
- **[YOU]** *Options consistency:* the Subject and Output-Language selectors render identical India lists on every page (proves they import `lib/options.ts`).
- **[YOU]** *Persistence:* generated quiz survives a page reload (same device).
- **[CC]** *Security — prompt injection:* uploaded text containing an instruction ("ignore previous instructions and…") does **not** change behaviour.
- **[YOU]** *Responsive:* upload + camera + quiz usable at 375px; verify 768/1280.
- **[CC]** *Unit tests:* extraction routing, JSON-parse-retry, and scoring tests pass.

**Definition of done:** all above; AI disclaimer shown on the quiz output.

---

## Phase 2 — Flashcards (T2) + Summariser (T3) + study mode

**Objective:** two more generators sharing the upload pipeline, plus persistent study interactions.

**Tasks**
1. Build `/api/generate` (types `flashcards`, `summary`) and `components/FlashCard.tsx` with flip animation (framer-motion).
2. Flashcards: self-rating Know it / Almost / No idea persisted per card; focus mode (weak cards only); deck saved to `flashcard_decks`.
3. Summariser: quick summary + key points + key terms + "remember this"; copy-to-clipboard; persist `summaries`.

**Acceptance criteria**
- Upload PDF → flashcards extracted correctly; flip works on mobile tap.
- Self-ratings persist; focus mode shows only weak cards.
- Summary renders quick summary + key points + terms, correctly structured.
- Both respect the output-language selector.

**QA checks**
- **[YOU]** *Persistence:* cards/ratings survive a reload on the same device (Supabase, not in-memory).
- **[YOU]** *Anonymous baseline:* opening the app in a different browser shows a **fresh** session (true sync arrives in Phase 5); copy reads "here when you return on this device," not "all your devices."
- **[CC]** *Empty/edge:* tiny input still yields a valid (small) deck/summary, not an error or hallucinated bulk.
- **[CC]** *Parse failure:* the JSON parse-retry path (tested in P1) covers these generators too.
- **[YOU]** *Responsive:* flip + study mode usable at 375px; verify 768/1280.

**Definition of done:** all above; disclaimers on both outputs.

---

## Phase 3 — AI Tutor (T4, streaming) + Lesson Plan (T5) + PDF export

**Objective:** the streaming chat experience and the teacher deliverable, plus printable export.

**Tasks**
1. Build `/api/tutor` (streaming): system prompt fixes grade level and **forbids harmful content**; "explain differently" re-prompt; "try it yourself first" nudge.
2. Build `/api/generate` (type `lesson`) + the teacher lesson page (objectives/activities/assessment/homework); persist `lesson_plans`.
3. Build `components/ExportPDF.tsx` (jsPDF) for quiz + lesson plan; print-ready.

**Acceptance criteria**
- Ask a question → response **streams** in real time at the selected grade level.
- "Explain differently" produces a genuinely different analogy.
- Lesson plan contains objectives, activities, assessment, homework.
- PDF export downloads and is print-ready.

**QA checks**
- **[YOU]** *Streaming:* tokens appear incrementally (proves no body-size limit hit); long answers don't truncate.
- **[YOU]** *Content safety (most important here — minors):* a harmful/age-inappropriate request is refused; the tutor stays age-appropriate.
- **[CC]** *Grade level:* a Grade-5 explanation is meaningfully simpler than Grade-11 for the same question.
- **[YOU]** *Export (incl. non-Latin):* the PDF opens correctly, matches on-screen content, and works on mobile — **test a Hindi/Tamil export specifically; glyphs must render, not tofu** (jsPDF needs an embedded Noto font or an HTML→canvas path — see `TECH_SPEC.md §7`).
- **[YOU]** *Responsive:* chat input and lesson form usable at 375px; verify 768/1280.

**Definition of done:** all above; disclaimers present.

---

## Phase 4 — Study Planner + Progress Tracker (T6), charts, streak, moderation, polish

**Objective:** close the last module and harden the whole app for safety and responsiveness.

**Tasks**
1. Build `/api/generate` (type `plan`) + the planner page (exam date + subjects → day-by-day schedule); persist `study_plans`.
2. Build `components/ProgressChart.tsx` (recharts) from `quiz_attempts`; weak-subject flags from attempt history.
3. Build `components/StreakTracker.tsx` from `daily_activity` (one row per active day; derive the consecutive streak).
4. Apply the **content moderation guard** across tutor output; add **per-IP throttling** to `/api/*` backed by a real shared store — **Upstash Redis or a Supabase table with an atomic increment** (Vercel functions are stateless, so in-memory counters don't work). Read the client IP from `x-forwarded-for` and accept that CGNAT/mobile shares IPs. The **hard Anthropic spend cap is the real backstop** — risk R2.
5. Ensure the **AI disclaimer** appears on every output; finalize Subject + Output-Language bars on every module page.
6. Full responsive sweep at 375/768/1280 on all module pages.
7. Write a `vitest` test for the streak calculation (consecutive / missed-day / same-day-repeat).

**Acceptance criteria**
- Study planner produces a balanced day-by-day schedule from exam date + subjects.
- Score chart shows the last 7 attempts correctly.
- Streak increments on consecutive-day use and is read from Supabase.
- Every module page shows Subject + Output-Language selectors and the AI disclaimer.

**QA checks**
- **[CC]** *Streak integrity:* unit test — streak persists across reload, a missed day breaks it, a same-day repeat doesn't double-count.
- **[CC]** *Chart edge:* zero attempts → empty state, not a broken chart.
- **[YOU]** *Throttling:* rapid repeated `/api/generate` calls from one client are rate-limited.
- **[YOU]** *Moderation:* re-run the P3 harmful-request check across tutor + generators.
- **[CC]** *Accessibility (§14):* keyboard focus is visible and tab order is sane, `prefers-reduced-motion` disables the flashcard-flip / transition animations, interactive elements carry ARIA labels, and contrast passes — spot-check one page per persona.
- **[YOU]** *Responsive (most important here):* **zero layout breaks at 375px** on all module pages; no horizontal scroll; touch targets ≥44px; verify 768/1280.

**Definition of done:** all six modules feature-complete; disclaimers + selectors everywhere; responsive sweep passed.

---

## Phase 5 — Cross-device sync (optional email magic-link / OTP)

**Objective:** let a user reach their data on a second device by attaching an email to their existing anonymous user — real two-way sync, no full login, no hand-rolled auth. See `TECH_SPEC.md §3.4`.

**Tasks**
1. Build `lib/auth.ts` — helpers wrapping `signInAnonymously`, `updateUser({ email })` (link), `signInWithOtp({ email })` (sign in), and sign-out.
2. Build `components/DeviceLink.tsx` — two paths: "Use on another device" (enter email → link → "check your inbox" pending state) and "I already use LearnLab" (enter email → enter OTP / open magic link → signed in as the same user).
3. Confirm Supabase Auth Site URL + Redirect URLs point to the production and preview Vercel domains (set in P0); review the OTP/confirmation email templates.
4. Cross-device copy: anonymous users see "saved on this device"; linked users see "synced across your devices." Add the opt-in PII note to Terms.
5. Handle the `TECH_SPEC §3.4` edge cases (pending confirmation; wrong/expired OTP + resend; switching into an email that already owns another account → warn first).

**Acceptance criteria**
- A user can link an email on device A without losing any existing data (same `uid`).
- Signing in with that email on device B shows **all** of device A's quizzes, decks, summaries, scores, and streak.
- New data created on device B appears on device A after refresh (two-way).
- Users who never link an email are unaffected and keep a per-device session.

**QA checks**
- **[YOU]** *Real sync (most important here):* study in browser A, link an email, sign in on a **different browser/device** with that email → the existing data appears.
- **[CC]** *No data loss on link:* linking an email preserves the current session's data (uid unchanged) — assert row counts before/after.
- **[CC]** *RLS still holds:* a user who has NOT been given the email/OTP still cannot read another user's rows.
- **[YOU]** *Deploy-only failure (critical):* trigger a magic link on the **deployed preview URL** and confirm it redirects back to the deployed app, **not** `localhost`.
- **[YOU]** *Edge cases:* expired/wrong OTP → friendly error + resend; unconfirmed email → pending state; switching into an existing account → warns first.
- **[YOU]** *No PII without opt-in:* a user who never links an email leaves `auth.users.email` null; copy/Terms reflect "no PII unless you enable cross-device."
- **[YOU]** *Responsive:* the DeviceLink UI works at 375px; verify 768/1280.

**Definition of done:** real cross-device sync verified across two separate browsers on the deployed URL; copy honest for both linked and unlinked users; edge cases handled.

---

## Phase 6 — Security pass, final QA & production go-live

**Objective:** verified, documented, and live.

**Tasks**
1. Walk the security checklist in `TECH_SPEC.md §9`; run one `gitleaks` scan; save findings to `docs/security-reviews/security-review-[date].md`; fix all Critical/High.
2. Build the **Terms of Use / Privacy** page (referenced by R11 and the opt-in-PII stance): derivative-output + AI-disclaimer notes, the "files processed then discarded" statement (must match the actual §3.1 cleanup), and the "no PII unless you enable cross-device" stance. Link it in the footer.
3. Write `README.md`: setup steps, the env vars, a short "why this stack" note, and the rollback step ("promote the previous Vercel deployment").
4. Confirm production env vars in Vercel; confirm Supabase Auth Site/Redirect URLs point to production; remove/gate `/api/health`.
5. Full end-to-end pass across all six modules **and the cross-device flow** on the **production** URL; tag `v1.0.0`.

**Acceptance criteria**
- Security pass complete with zero outstanding Critical/High.
- All six modules work on the live production URL.
- README documents setup + stack rationale + the rollback step.

**QA checks (final gate — re-verify on production, not preview)**
- **[YOU]** *Secrets:* no API key or service-role key in the production client bundle.
- **[CC]** *RLS:* cross-session read still impossible on production.
- **[YOU]** *4.5 MB:* a >4.5 MB upload still succeeds on production.
- **[YOU]** *Cross-device:* link an email and sign in on a second device against the production URL → data appears, and the magic link redirects to production (not localhost).
- **[YOU]** *Streaming + timeout:* tutor streams; no 504 on the heaviest supported file.
- **[YOU]** *Content safety:* harmful request refused; minors-appropriate.
- **[CC]** *Prompt injection:* malicious uploaded text does not alter behaviour.
- **[YOU]** *Responsive:* 375/768/1280 clean across all pages on production.
- **[YOU]** *Disclaimers:* present on every AI output.
- **[CC]** *Build / lint / unit tests:* `npm run lint` and `npm run build` clean; targeted `vitest` tests pass; `gitleaks` clean.
- **[YOU]** *Rollback:* confirm you can promote the previous deployment in the Vercel dashboard.

**Definition of done:** all green; `v1.0.0` tagged; README + security notes committed.

---

## Definition of done — applies to every phase

Built in focused files ≤300 lines · any targeted unit tests for fragile logic pass · `npm run lint` + `npm run build` clean · no secret in the client bundle · relevant RLS in place and verified · the phase's QA checks pass on the Vercel preview/production URL at 375/768/1280 · CLAUDE.md and this plan's outcomes updated · conventional commit per task.

---

## Risk → mitigation ownership

| Risk | Owned by | Verified in |
|---|---|---|
| R1 API key exposure | Server-only secrets, env in Vercel | P0, P6 secret QA |
| R2 API cost spike | Throttling + billing cap | P4 throttling QA |
| R3 AI inaccuracy | Disclaimer on every output | P1–P6 |
| R6 Tutor over-reliance | "Try it yourself first" nudge | P3 |
| R7 Mobile breakage | Mobile-first, 375px sweep | P4, P6 responsive QA |
| R10 Scanned PDF | Read via PDF document block (page batches) | P1 scanned QA |
| R11 Copyright | ToU + derivative output + disclaimer | P6 |
| Prompt injection | Authoritative system prompt | P1, P6 injection QA |
| Child safety | Moderation guard | P3, P4, P6 safety QA |
| False cross-device claim | Real sync via email magic-link; honest copy | P5 sync QA, P6 |

---

## Coverage matrix — proof of no gaps

| Item | P0 | P1 | P2 | P3 | P4 | P5 | P6 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| T1 Quiz | | ✅ | | | | | ✅ |
| T2 Flashcards | | | ✅ | | | | ✅ |
| T3 Summariser | | | ✅ | | | | ✅ |
| T4 Tutor | | | | ✅ | re-test | | ✅ |
| T5 Lesson plan | | | | ✅ | | | ✅ |
| T6 Planner + tracker | | | | | ✅ | | ✅ |
| Upload→extract pipeline | | ✅ | | | | | ✅ |
| Fix: 4.5 MB upload | | ✅ | | | | | ✅ |
| Fix: function timeout | | ✅ | | ✅ | | | ✅ |
| Scanned-PDF page batching | | ✅ | | | | | ✅ |
| Short-answer grading (self-mark + AI) | | ✅ | | | | | ✅ |
| Canonical option lists (lib/options.ts) | ✅ | ✅ | | | | | ✅ |
| Cross-device sync (email link) | | | | | | ✅ | ✅ |
| RLS / data isolation | ✅ | | | | | ✅ | ✅ |
| Secrets server-only | ✅ | | | | | | ✅ |
| Multilingual output | | ✅ | ✅ | ✅ | ✅ | | ✅ |
| Content moderation (minors) | | | | ✅ | ✅ | | ✅ |
| Prompt-injection defence | | ✅ | | | re-test | | ✅ |
| Abuse / cost throttling | | | | | ✅ | | ✅ |
| AI disclaimer everywhere | | ✅ | ✅ | ✅ | ✅ | | ✅ |
| Responsive 375/768/1280 | | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Auth config (redirect URLs) | ✅ | | | | | ✅ | ✅ |
| Targeted unit tests (vitest) | | ✅ | | | ✅ | | ✅ |
| Deploy + rollback | ✅ | | | | | | ✅ |
| Security pass + README + gitleaks | | | | | | | ✅ |
| ToU / Privacy + copyright (R11) | | | | | | | ✅ |
| Accessibility (a11y, §14) | | | | | ✅ | | ✅ |
| Storage cleanup / file discard | | ✅ | | | | | ✅ |

Every module, architecture fix, and identified risk is owned by at least one phase and re-verified at P6 (go-live).

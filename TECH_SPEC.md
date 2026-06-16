# Technical Specification — LearnLab AI

**Version:** 1.0 · **Build type:** Portfolio · **Stack:** Next.js 14 + Vercel + Supabase + Claude API
**Companion files:** `CLAUDE.md` (standing rules), `IMPLEMENTATION_PLAN.md` (phased build).

---

## 1. System overview

LearnLab AI turns a user's own study material into study tools. The user provides content by uploading a file (PDF / DOCX / image) or pasting text, selects a **subject**, **grade**, and **output language**, and the app generates one of six artifacts: a quiz, a flashcard deck, a chapter summary, a lesson plan, tutor answers, or a study plan. All persistent data lives in Supabase under an anonymous user identity. The app is mobile-first and fully responsive.

### 1.1 Personas

- **Student** — quiz, flashcards, summary, tutor, study planner.
- **Teacher** — quiz, lesson plan (and may use the summariser).

The home screen splits Student / Teacher. Both share the same generation engine.

### 1.2 The six modules

| # | Module | Persona | Input | Output |
|---|---|---|---|---|
| T1 | Quiz Generator | Both | file / paste | MCQ / True-False / Short-answer + answer key + per-question explanation |
| T2 | Flashcard Generator + Study Mode | Student | file / paste | Q/A cards, flip study mode, self-rating, focus mode |
| T3 | Chapter Summariser | Both | file / paste | Quick summary, key points, key terms, "remember this" |
| T4 | AI Tutor (24/7) | Student | question text | Streamed grade-level explanation, "explain differently" |
| T5 | Lesson Plan Generator | Teacher | subject/grade/topic/duration | Objectives, activities, assessment, homework |
| T6 | Study Planner + Progress Tracker | Student | exam date + subjects | Day-by-day plan, score history, streak, weak-topic flags |

---

## 2. Architecture

```
                         ┌──────────────────────────────────────┐
                         │  Browser (Next.js client, mobile-1st) │
                         │  - upload UI / paste / camera         │
                         │  - module pages, study mode, charts   │
                         └───────────┬───────────────┬──────────┘
            direct upload (anon key) │               │ fetch (JSON / stream)
            ── bypasses 4.5MB limit ─┤               │
                                     ▼               ▼
                       ┌───────────────────┐   ┌──────────────────────────┐
                       │ Supabase Storage  │   │  Vercel serverless routes │
                       │  bucket: uploads  │   │  /api/process             │
                       │  per-user folders │   │  /api/generate            │
                       └─────────┬─────────┘   │  /api/tutor (stream)      │
                                 │ server-side │  maxDuration = 60         │
                                 │  download   └───────┬───────────┬──────┘
                                 └─────────────────────┤           │
                                                       ▼           ▼
                                          ┌─────────────────┐  ┌──────────────┐
                                          │ Extraction      │  │  Claude API  │
                                          │ pdf-parse/mammoth│ │ sonnet-4-6   │
                                          │ +pdf-lib split   │ │ (PDF + image)│
                                          └─────────────────┘  └──────────────┘
                                 ▲
                                 │ RLS-protected reads/writes (auth.uid)
                       ┌─────────┴─────────┐
                       │ Supabase Postgres │  documents, quizzes, decks, …
                       └───────────────────┘
```

**Identity:** Supabase **anonymous auth**. On first visit the client calls `signInAnonymously()`, producing a persistent anon user with a `uid`. Every row and every storage object is keyed to that `uid` and protected by RLS. For **cross-device sync**, the user may optionally attach an email to this same anonymous user (§3.4); the `uid` is preserved, so no data moves and all RLS keeps working. (Full named OAuth login remains a separate, larger V2 item.)

---

## 3. Critical data flows

### 3.1 Upload → extract (the corrected path)

> This replaces the assessment's "POST the file to `/api/upload`" design, which fails on Vercel for files > 4.5 MB.

1. User selects a file in the browser.
2. **Client validates** type and size against the limits in §8, then uploads **directly to Supabase Storage** (`uploads/{uid}/{uuid}.{ext}`) using the public anon key. This call goes browser → Supabase and never touches a Vercel function, so the 4.5 MB body limit does not apply.
3. Client `POST /api/process` with `{ storagePath, sourceType, pageStart?, pageEnd? }`.
4. Route handler (server) **downloads the file from Storage** using the service role, then:
   - **Text PDF** → `pdf-parse` (one fast call). *Pin a serverless-safe `pdf-parse` version — some releases read a bundled test PDF at import and crash on Vercel with `ENOENT …/test/data/05-versions-space.pdf`; import the library entry point directly or use a maintained fork.*
   - **Scanned/image PDF** (pdf-parse returns empty/near-empty text — **decide this per page, not per file, so partially-scanned PDFs route their image pages and text pages correctly**) → split the requested page range with `pdf-lib` (pure JS, Vercel-safe) and send that chunk to Claude as a **PDF document block** — the API reads scanned PDFs natively (no server-side rasterization, no poppler/canvas). Processed in client-driven page batches (§6).
   - **DOCX** → `mammoth`.
   - **Single image (JPG/PNG)** → send as an **image content block** to Claude (`sonnet-4-6`).
5. Handler stores the extracted text in `documents` and returns `{ documentId, text, pages, status, pagesDone }`.
6. **Large scanned PDFs** use the client-driven page-batch pattern (§6): the client calls `/api/process` once per ~5-page batch, each batch finishes inside the 60s limit, and `status` flips to `ready` on the final batch. The client shows real progress ("reading pages 6–10 of 40").
7. **Cleanup.** Once extraction succeeds and `extracted_text` is persisted, the original upload is deleted from Storage (or flagged for a scheduled sweep). This honours the "files processed then discarded" claim in §9 and keeps usage under the 1 GB free-tier cap; orphaned uploads from abandoned sessions are swept on a TTL.

### 3.2 Generate

`POST /api/generate` with `{ type, text | documentId, subject, grade, outputLanguage, options }`. The handler loads the source text, builds the type-specific prompt, calls Claude, parses the JSON result, persists it to the matching table, and returns it. Quiz/flashcards/summary/lesson/plan all flow through this one route, differentiated by `type`.

### 3.3 Tutor (streaming)

`POST /api/tutor` with `{ messages, gradeLevel }`. Handler streams the Claude response back to the client (no body-size limit on streamed responses). "Explain differently" re-sends the conversation with an instruction to use a new analogy.

### 3.4 Cross-device sync (optional, email magic-link / OTP)

> Delivers real two-way sync without a full login system and without hand-rolling auth. It is **opt-in**; users who never enable it keep a per-device anonymous session.

**Why it's clean:** attaching an email to an anonymous Supabase user *upgrades the same user in place* — the `uid` does not change. Because every row uses `session_id = auth.uid()`, all existing data and RLS policies keep working with **zero migration**, and both devices end up authenticated as the same user, so each sees the other's data.

**Flow**
1. **Enable (device A).** User taps "Use on another device" → enters email → client calls `supabase.auth.updateUser({ email })`. Supabase sends a confirmation; on confirm, the anonymous user becomes a permanent email user with the **same `uid`**.
2. **Sign in (device B).** User taps "I already use LearnLab" → enters the same email → `supabase.auth.signInWithOtp({ email })` → receives a magic link / 6-digit code → on success, device B is authenticated as the **same `uid`** → RLS immediately exposes all of that user's documents, decks, quizzes, etc.
3. Thereafter both devices are the same user; new data on either appears on both after a refresh.

**No new server route or table.** Both calls are client-side Supabase auth using the public anon key. The email lives in `auth.users` (managed by Supabase).

**Edge cases (handle explicitly)**
- *Email belongs to a different existing user (sign-in path)* → `signInWithOtp` signs into **that** account; device B's current anonymous data stays orphaned under its old `uid`. Acceptable for V1; do not attempt a merge. Warn the user before switching.
- *Linking an already-registered email (enable path)* → `updateUser({ email })` fails ("email already registered"); catch it and tell the user the email is already in use, offering the "I already use LearnLab" sign-in path instead of linking. (Distinct from the sign-in collision above.)
- *Email never confirmed* → upgrade not applied; show a "pending — check your inbox" state; data remains on device A only until confirmed.
- *Wrong/expired OTP* → friendly error with a resend option.
- *Lost email access* → unrecoverable, same as any magic link; state this in copy.

**Deploy-critical:** the Supabase Auth **Site URL + Redirect URLs must include the production and preview Vercel URLs** (not `localhost`), or links work locally and break in production (see §12).

---

## 4. Data model (Supabase Postgres)

All tables include `id uuid pk default gen_random_uuid()`, `session_id uuid not null` (= `auth.uid()`), and `created_at timestamptz default now()`. **RLS enabled on every table** with policy `using (session_id = auth.uid())` for select/insert/update/delete.

| Table | Key columns |
|---|---|
| `documents` | `filename text`, `storage_path text`, `source_type text` (`pdf`/`docx`/`image`/`paste`), `extracted_text text`, `pages int`, `pages_done int default 0`, `status text` (`processing`/`ready`/`error`) |
| `quizzes` | `document_id uuid null`, `subject text`, `grade text`, `output_language text`, `question_type text`, `difficulty text`, `questions jsonb` |
| `quiz_attempts` | `quiz_id uuid`, `score numeric`, `total int`, `answers jsonb` (`[{ questionId, response, verdict?, points }]` — MCQ/TF auto-set `points`; short-answer `points` come from self-mark or AI grade) |
| `flashcard_decks` | `document_id uuid null`, `title text`, `output_language text`, `cards jsonb` (`[{front, back, rating}]`) |
| `summaries` | `document_id uuid null`, `output_language text`, `quick_summary text`, `key_points jsonb`, `terms jsonb` (`[{term, definition}]`), `remember jsonb` |
| `lesson_plans` | `subject text`, `grade text`, `topic text`, `duration_min int`, `output_language text`, `content jsonb` (`{objectives, intro, structure, activities, assessment, homework}`) |
| `study_plans` | `exam_date date`, `subjects jsonb`, `schedule jsonb` (`[{date, tasks[]}]`) |
| `daily_activity` | `activity_date date` — unique on `(session_id, activity_date)`; **one row is upserted per UTC day on a meaningful action (a successful generation or a submitted quiz attempt) — not on a mere app open**; streak is derived by counting consecutive dates |

**Storage:** one private bucket `uploads`. Storage RLS: a user may only access objects whose path begins with their `{uid}/`.

**Cross-device adds no table.** Email is held in Supabase-managed `auth.users`. Because the optional email upgrade preserves `auth.uid()`, every policy below is unchanged — a second device that signs in with the same email simply matches the same `auth.uid()`.

**Example RLS (documents):**
```sql
alter table documents enable row level security;
create policy "own rows" on documents
  for all using (session_id = auth.uid()) with check (session_id = auth.uid());
```

---

## 5. API route specifications

> All routes are Next.js App Router route handlers under `app/api/`. All set `export const maxDuration = 60`. All run server-side; secrets never reach the client. All validate input and return typed JSON errors `{ error: { code, message } }`.
>
> **Identity & authorization (every route).** A route derives the user from the **verified Supabase access token** (Authorization header / cookies) — never from a client-supplied `uid`. The `auth.uid()` from that token stamps `session_id` on any server write. Where a route bypasses RLS with the service role (the Storage download in `/api/process`), it must additionally verify the target belongs to the caller — `/api/process` rejects any `storagePath` not under `{uid}/` with `UNAUTHORIZED`. User-data writes that don't require the service role go through the anon client under RLS (see `CLAUDE.md §5`).

### `POST /api/process`
- **Body:** `{ storagePath?: string, pasteText?: string, sourceType: 'pdf'|'docx'|'image'|'paste' }`
- **Behaviour:** extract text per §3.1; persist `documents` row.
- **Returns:** `{ documentId, text, pages, status }`
- **Errors:** `UNSUPPORTED_TYPE`, `FILE_TOO_LARGE` (defensive — primary check is client-side), `EXTRACTION_FAILED`, `EMPTY_CONTENT`.

### `POST /api/generate`
- **Body:** `{ type: 'quiz'|'flashcards'|'summary'|'lesson'|'plan'|'grade', documentId?: string, text?: string, subject: string, grade: string, outputLanguage: string, options?: {...} }`
  - quiz `options`: `{ questionType, difficulty, count }`
  - lesson `options`: `{ topic, durationMin }`
  - plan `options`: `{ examDate, subjects[] }`
  - grade `options`: `{ items: [{ questionId, question, modelAnswer, studentAnswer }] }` → returns `[{ questionId, verdict: 'correct'|'partial'|'incorrect', feedback }]` in **one batched call** (never one call per question)
- **Behaviour:** load source text, build prompt, call Claude with **structured-JSON instruction** (respond with JSON only, no prose/markdown fences), parse safely, persist, return.
- **Returns:** the persisted artifact row (for `grade`, the verdict array — attempt scoring is finalised client-side).
- **Errors:** `NO_CONTENT`, `GENERATION_FAILED`, `PARSE_FAILED` (retry once with a stricter "JSON only" instruction before failing).

### `POST /api/tutor`
- **Body:** `{ messages: [{role, content}], gradeLevel: string }`
- **Behaviour:** stream Claude response; system prompt fixes grade level and forbids harmful content (§9).
- **Returns:** `text/event-stream`.

---

## 6. Claude API integration

- **SDK:** `@anthropic-ai/sdk`, instantiated server-side only with `ANTHROPIC_API_KEY`.
- **Model:** `claude-sonnet-4-6` for all generation and image reading.
- **Reading documents = same Messages API.** There is no separate "Vision endpoint." Images go in as an image content block; **scanned/image PDFs go in as a PDF document block** — the API reads both natively:
  ```ts
  // single image
  { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }
  // scanned-PDF page-range chunk (split with pdf-lib)
  { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
  ```
- **Structured output:** for quiz/flashcards/summary/lesson/plan/grade, use the model's **native structured outputs** — `output_config: { format: { type: 'json_schema', schema } }` (supported on `claude-sonnet-4-6`) — which guarantees schema-valid JSON and all but eliminates parse failures. Constraints to design around: no recursive schemas and no numeric/length bounds (`minimum`/`maxLength` etc.) — enforce those client-side; the first call on a new schema pays a one-time compile (24 h cached); not combinable with citations. Keep a defensive `JSON.parse` try/catch + one stricter-instruction retry (`PARSE_FAILED`) as a fallback for anything that still slips through.
- **Prompt caching (cost control — risk R2):** the same `documents.extracted_text` feeds quiz, flashcards, summary, lesson, and plan as separate calls. Send the document text as a cached prefix (`cache_control: { type: 'ephemeral' }`; minimum cacheable prefix ~2048 tokens on `claude-sonnet-4-6`, which a chapter clears easily) so repeated generations read it at ~10% of input cost. The 5-minute TTL comfortably covers a "generate several artifacts from one upload" session. This is the cheapest, highest-leverage R2 mitigation and complements the hard Anthropic spend cap.
- **Streaming:** tutor uses `stream: true` and pipes chunks to the client.
- **Multilingual:** the prompt states the desired `outputLanguage`; the model produces output in that language regardless of the input language. No translation service needed.
- **Large scanned PDFs — committed approach (client-driven page batches):** because a Hobby function caps at 60s, do **not** rely on a background queue (Hobby has none). Instead the client orchestrates: after the file is in Storage, it calls `/api/process` once per **~5-page batch** with `{ pageStart, pageEnd }`. Each call splits that range with `pdf-lib`, sends it to Claude as a PDF document block, appends the result to `documents.extracted_text`, bumps `pages_done`, and sets `status='ready'` on the final batch. The 50-page cap means ≤10 batches, each well under 60s. The client shows progress. On reopen of a row stuck at `status='processing'`, offer to resume from `pages_done`; on failure set `status='error'` so nothing hangs.

---

## 7. Module functional specs

**T1 Quiz** — Inputs: source text, subject, grade, output language, question type (MCQ/TF/Short), difficulty, count. Output JSON: `[{ question, options?, answer, explanation }]`. UI: take-quiz flow, export to PDF (`jspdf`). Persist quiz + each attempt. Generic topic-only generation is blocked.
**Scoring:** MCQ and True/False are auto-scored on submit (exact match → `points` 1/0). **Short-answer is self-marked** — on submit the model answer + explanation are revealed and the student marks each Correct / Partial / Incorrect → `points` 1 / 0.5 / 0 (same pattern as flashcard self-rating). An optional **"Grade with AI"** button sends all `{question, modelAnswer, studentAnswer}` triples in one batched `/api/generate` `type:'grade'` call, pre-filling the marks (student can override). `score = sum(points)`, `total = count`. The quiz works fully even if AI grading is never used.

**T2 Flashcards** — Output JSON: `[{ front, back }]`. Study mode: flip animation (`framer-motion`), self-rating Know it / Almost / No idea stored per card; focus mode filters to weak cards. Deck persisted to `flashcard_decks`; persists across reloads on the same device.

**T3 Summariser** — Output JSON: `{ quickSummary (4–5 sentences), keyPoints[], terms[{term, definition}], remember[] }`. Copy-to-clipboard.

**T4 Tutor** — Streamed chat at the selected grade level. "Explain differently" → new analogy. "Try it yourself first" nudge before revealing the answer (risk R6). Persisting conversations is optional in V1.

**T5 Lesson Plan** — Teacher inputs subject/grade/topic/duration. Output JSON: `{ objectives[], intro, structure[], activities[], assessment[], homework }`. Export to PDF.

**T6 Study Planner + Tracker** — Inputs exam date + subjects → day-by-day `schedule`. Quiz scores charted over time (`recharts`). Streak from `daily_activity`. Weak subjects flagged from attempt history.

> **PDF export & non-Latin scripts (jsPDF caveat).** jsPDF's built-in fonts are Latin-1 only, so exporting Hindi/Tamil/Telugu/Bengali (and other Indic) output renders as boxes ("tofu") — and it needs more than a font swap (Indic complex-script shaping). For non-Latin output, embed the appropriate **Noto Sans** font *and* verify shaping, or render the on-screen HTML to canvas → PDF (e.g. `html2canvas` + jsPDF) / use the browser print path. The export QA (`IMPLEMENTATION_PLAN.md` P3) must include a non-Latin export, not just English.

---

## 8. Limits & validation

| Item | Limit | Enforced |
|---|---|---|
| PDF (text) | 20 MB | Client (before Storage upload) + defensive server check |
| Scanned/image PDF | 15 MB | same |
| DOCX | 10 MB | same |
| Image JPG/PNG | 10 MB | same |
| Page cap | 50 pages (process first 50, notify user) | Server, prevents context overflow |
| Request body to any API route | **< 4.5 MB** | Architecture (files go via Storage, not route bodies) |
| Function duration | `maxDuration = 60` | Per route |

File **type and size are validated server-side too**, never trusting the client alone.

---

## 9. Security specification

- **Secrets:** `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Verified absent from the client bundle in QA (risk R1).
- **RLS** on all tables and the Storage bucket (replaces IAM); cross-session reads must be impossible — verified in QA.
- **Prompt injection (OWASP LLM01):** uploaded/pasted content is untrusted; the system prompt is authoritative and document content can never alter instructions.
- **Content moderation:** users include minors — tutor output is guarded for age-appropriateness, harmful requests are refused, and inappropriate uploads are rejected.
- **Abuse / cost (risk R2):** no-login means weak per-session limiting; add per-IP throttling on `/api/*` and rely on the Anthropic billing cap as the backstop.
- **HTTPS:** automatic on Vercel.
- **Copyright (risk R11):** Terms of Use + "files processed then discarded if not needed" note; outputs are derivative (questions/summaries), not reproductions; AI disclaimer on every output (risk R3).
- **Transparent OCR fallback (risk R10):** a text-less PDF auto-routes to image reading; the user sees no difference.
- **Cross-device email (opt-in PII):** an email is collected only if the user enables cross-device. The "0 PII" claim becomes "no PII unless you enable cross-device" — reflect in Terms/copy. Magic-link delivery, expiry, and rate-limiting are handled by Supabase Auth (do not hand-roll). Confirm the warning shown before switching into an email that already belongs to another account (§3.4 edge cases).

---

## 10. Error handling & UX states

Every async action has explicit loading, empty, and error states (no silent failures). Errors speak to the user, not the system ("That file looks like a scanned page — reading it may take a little longer," not "EXTRACTION_FAILED"). Generation parse failures retry once before surfacing. Oversized files are caught before upload with a clear message naming the limit.

---

## 11. Responsive specification

| Device | Width | Nav | Layout | Upload |
|---|---|---|---|---|
| Mobile | 375–767 | Bottom bar | Single column | File picker + camera |
| Tablet | 768–1023 | Side nav | Two column | File picker |
| Laptop/Desktop | ≥1024 | Sidebar | Multi column | Picker + drag-drop |

Build mobile-first at 375px; touch targets ≥44px; verify 375/768/1280 before any page is "done".

---

## 12. Environment & configuration

`.env.local` (local only, git-ignored) and Vercel Project → Environment Variables (Production + Preview):

```
ANTHROPIC_API_KEY=            # server only
SUPABASE_SERVICE_ROLE_KEY=    # server only
NEXT_PUBLIC_SUPABASE_URL=     # public
NEXT_PUBLIC_SUPABASE_ANON_KEY=# public
```

**Supabase Auth config (required for cross-device magic links):** in the Supabase dashboard set **Site URL** and **Redirect URLs** to the production Vercel domain and the preview domain(s) — never leave them at `localhost`, or magic links will work locally and fail in production. Enable anonymous sign-ins and email OTP; review the confirmation/OTP email templates.

**Free-tier operational notes (portfolio).** Supabase free **pauses a project after ~7 days of inactivity** — for a demo whose value is a live link, add a lightweight keep-alive (e.g. a scheduled ping) so it doesn't appear broken to a visitor. Limits to watch: 500 MB DB, 1 GB Storage (see the §3.1 upload cleanup), 50 K MAU. Every first visit mints a new anonymous `auth.users` row, so a widely-shared demo accumulates anon users — fine for a portfolio, but account for it when reading auth metrics.

---

## 13. Folder structure

```
learnlab-ai/
├── app/
│   ├── page.tsx                  # Home: Student / Teacher split
│   ├── student/{quiz,flashcards,summariser,tutor,tracker}/page.tsx
│   ├── teacher/{quiz,lesson}/page.tsx
│   └── api/
│       ├── process/route.ts      # extract from storage path or paste
│       ├── generate/route.ts     # quiz | flashcards | summary | lesson | plan
│       └── tutor/route.ts        # streaming
├── components/
│   ├── UploadInput.tsx           # direct-to-Storage upload + camera + paste
│   ├── SubjectLanguageBar.tsx    # subject + output-language selectors
│   ├── QuizCard.tsx  FlashCard.tsx  ProgressChart.tsx
│   ├── StreakTracker.tsx  MobileNav.tsx  ExportPDF.tsx  AiDisclaimer.tsx
│   └── DeviceLink.tsx            # cross-device: link email + sign in with OTP
├── lib/
│   ├── supabase/{client.ts,server.ts}
│   ├── auth.ts                   # anon sign-in + email link + OTP helpers
│   ├── claude.ts                 # SDK wrapper, prompts, JSON parsing
│   ├── options.ts                # SINGLE SOURCE: subjects, grades, languages (see CLAUDE.md §11)
│   ├── extract/{pdf.ts,docx.ts,image.ts,pdf-split.ts,route-detect.ts}
│   └── validation.ts             # file type/size limits
├── docs/security-reviews/
├── .env.local
├── CLAUDE.md  TECH_SPEC.md  IMPLEMENTATION_PLAN.md  README.md
```

---

## 14. Non-functional requirements

- Generation feels fast: stream where possible; one-shot generations target < 10s for typical content.
- Accessible: keyboard focus visible, reduced motion respected, sufficient contrast, ARIA on interactive elements.
- No `localStorage` for app data — Supabase is the store. (Note: supabase-js keeps its auth session in localStorage by default; that is the only permitted use, and the cross-device copy must reflect it.)
- Testing is lightweight (portfolio scope): manual QA on the deployed URL is the real gate (see `IMPLEMENTATION_PLAN.md`), plus a few `vitest` unit tests on fragile logic (extraction routing, JSON-parse-retry, quiz scoring, streak math) and one `gitleaks` scan before launch. No coverage gate, no Playwright. Lint and build must be clean before any deploy.

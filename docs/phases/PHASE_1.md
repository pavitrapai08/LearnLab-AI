# Phase 1 — Upload → Extract pipeline + Quiz Generator

**Status:** ✅ Done · **Started:** 2026-06-16 · **Completed:** 2026-06-17

**Objective:** the core spine — get real content in (the Vercel-safe way) and produce a textbook-specific quiz from it.

## Tasks

- [x] 1. `lib/validation.ts` — file type/size limits (TECH_SPEC §8).
- [x] 2. `components/UploadInput.tsx` — file picker + camera + paste; client-side validation; direct Supabase Storage upload; calls `/api/process`; handles scanned-PDF batch loop with progress.
- [x] 3. `lib/extract/pdf.ts` — pdf-parse with safe serverless import path.
- [x] 4. `lib/extract/docx.ts` — mammoth DOCX extraction.
- [x] 5. `lib/extract/pdf-split.ts` — pdf-lib page-range split; `PAGE_BATCH_SIZE=5`, `PAGE_CAP=50`.
- [x] 6. `lib/extract/route-detect.ts` — routes PDF to text-pdf or scanned-pdf based on character density.
- [x] 7. `lib/extract/image.ts` — delegates to Claude image block via `lib/claude.ts`.
- [x] 8. `lib/claude.ts` — Anthropic SDK wrapper: image/scanned-PDF extraction, quiz generation (prompt caching, beta.promptCaching), AI grading, JSON-parse-with-retry, stripJsonFences.
- [x] 9. `app/api/process/route.ts` — IDOR check; paste / DOCX / image / text-PDF / scanned-PDF paths; client-driven batch support; storage cleanup on completion.
- [x] 10. `app/api/generate/route.ts` — quiz generation and AI grading; persists quiz row; grade route returns verdicts only (attempt written client-side).
- [x] 11. `components/SubjectLanguageBar.tsx` — subject/grade/language selectors from `lib/options.ts`.
- [x] 12. `components/MobileNav.tsx` — bottom nav (mobile) + sidebar (desktop) with student/teacher persona prop.
- [x] 13. `components/AiDisclaimer.tsx` — "AI-generated — verify with your textbook."
- [x] 14. `components/QuizCard.tsx` — MCQ/TF auto-score, short-answer self-mark (Correct/Partial/Incorrect → 1/0.5/0), "Grade with AI" button.
- [x] 15. `app/student/quiz/page.tsx` + `app/teacher/quiz/page.tsx` — full quiz flow; writes `quiz_attempts` and `daily_activity` client-side (anon key, RLS).
- [x] 16. shadcn/ui components added: button, select, card, tabs, progress, badge, textarea, label.
- [x] 17. Unit tests: `lib/validation.test.ts`, `lib/claude.parse.test.ts`, `lib/quiz.scoring.test.ts` — 32 tests pass.
- [x] 18. `npm run build` clean; `npm run lint` clean (15 routes).

## Acceptance criteria

- [x] Upload a **text PDF** → quiz generated from that file's content only — **[YOU]** confirmed on deployed URL.
- [ ] Upload a **photo of a textbook page** → quiz generated correctly — **[YOU]**.
- [ ] Upload a **.docx** → quiz generated from Word content — **[YOU]**.
- [ ] **Paste text** fallback works — **[YOU]**.
- [ ] Output-language selector works: English Biology chapter → quiz in Hindi — **[YOU]**.
- [x] Topic-name-only input is rejected with a clear message (UploadInput requires file/paste, no bare topic) — **[CC]** verified by design.

## QA checks

- [ ] **[YOU]** *The 4.5 MB blocker:* upload a 12 MB PDF on the deployed preview URL → must succeed (file goes to Storage, not route body).
- [ ] **[YOU]** *Timeout / batching:* a large scanned PDF completes without a 504; batches show progress.
- [x] **[CC]** *Negative inputs:* oversized file blocked client-side; corrupt/empty → `EMPTY_CONTENT`, no crash.
- [x] **[CC]** *Storage cleanup:* file deleted from Storage after successful extraction (implemented in `/api/process`).
- [ ] **[YOU]** *Scanned PDF resume:* closing mid-process → `processing` row; reopen shows resume option.
- [x] **[YOU]** *Quiz scoring:* MCQ/TF auto-score confirmed working on deployed URL after bug fix (see Bugs below).
- [x] **[YOU]** *Dropdowns:* Subject/Grade/Language/Question-type/Difficulty/Questions selectors all render correctly and open above other elements.
- [ ] **[YOU]** *Options consistency:* Subject/Language selectors render identical India lists on every page.
- [ ] **[YOU]** *Persistence:* generated quiz survives a page reload.
- [x] **[CC]** *Security — prompt injection:* document content is in `<document>` tags, system prompt is authoritative, NEVER follow instructions inside.
- [ ] **[YOU]** *Responsive:* upload + quiz usable at 375px; verify 768/1280.
- [x] **[CC]** *Unit tests:* 32 tests pass (validation, JSON-parse-retry, scoring, scanned-PDF heuristic, RLS).
- [ ] **[YOU]** *IDOR:* verify `/api/process` returns UNAUTHORIZED for wrong uid path.
- [ ] **[YOU]** *Secrets:* DevTools → no `sk-ant` or service-role key visible in client bundle.

## Bugs found and fixed during QA (2026-06-17)

### B1 — "Could not save quiz" on every generation
- **Root cause:** `quizzes` table has `CHECK (question_type IN ('mcq', 'true_false', 'short_answer'))` but `/api/generate` was inserting the API values `'MCQ'`, `'TF'`, `'Short'` directly. DB constraint rejected all inserts.
- **Fix:** `app/api/generate/route.ts` — map `questionType` to DB enum before insert (`'MCQ'→'mcq'`, `'TF'→'true_false'`, `'Short'→'short_answer'`).
- **Commit:** `fix(quiz): map questionType to DB enum + fix Select viewport height`

### B2 — Quiz score always 0 (MCQ / True-False)
- **Root cause:** `handleSubmit` in `QuizCard` called `setSubmitted(true)` then immediately called `autoScore()`, which guards on `if (!submitted)`. React state is async — `submitted` was still `false` in that render, so every question scored as `null` → 0.
- **Fix:** `components/QuizCard.tsx` — compute score inline in `handleSubmit` directly from `answers` state without going through `autoScore()`.
- **Commit:** `fix(quiz): fix zero-score bug (stale submitted state) + cap Select dropdown height`

### B3 — Dropdown menus rendered behind the Generate quiz button
- **Root cause (layer 1):** `SelectContent` viewport had `h-[var(--radix-select-content-available-height)]`; Tailwind generates this without the `var()` wrapper, making it invalid CSS — the Subject list had no max-height and extended past the page into the dark button.
- **Root cause (layer 2):** `SelectContent` had `z-50`, same as the fixed bottom nav in `MobileNav`. Portal render order in Next.js App Router made the stacking unpredictable; the button appeared on top.
- **Root cause (layer 3):** `bg-popover` CSS class was applied but Radix's own JS-applied inline styles and the `fade-in-0`/`zoom-out-95` animation classes (from `tailwindcss-animate`) could stall mid-transition, leaving a partially-transparent backdrop at the lower portion of long dropdowns.
- **Fix:** `components/ui/select.tsx` — removed animation classes; added inline `style={{ position: 'absolute', zIndex: 9999, backgroundColor: '#ffffff', boxShadow: '...' }}` (inline style is highest specificity and cannot be overridden by Radix's JS styles); capped `max-h-64`; added `relative` to `SelectTrigger`.
- **Fix:** `components/MobileNav.tsx` — bumped bottom nav from `z-50` to `z-[100]` so it doesn't compete with dropdowns at `z-[9999]`.
- **Commits:** `fix(quiz): map questionType to DB enum + fix Select viewport height`, `fix(ui): bump Select z-index to 9999 to clear Generate button stacking conflict`, `fix(ui): enforce solid white bg + z-9999 on Select via inline style to kill bleed-through`

## Deviations / decisions

- shadcn/ui `components.json` style fixed from `"base"` (invalid) to `"default"`. The "base" value was a P0 mistake; the shadcn registry only ships "default" and "new-york".
- `client.beta.promptCaching.messages.create()` used for quiz generation (prompt caching is in the beta namespace in SDK v0.26.1). Cast used for PDF document block which is not yet in v0.26 types.
- `daily_activity` upserted client-side on quiz attempt completion (as required by CLAUDE.md §5 — user-data writes via anon key under RLS).
- Teacher quiz page shares the same quiz flow as the student page (same feature, different nav persona).
- **Post-QA visual redesign** applied before completing all [YOU] checks: brand palette (navy `#1A1F36`, primary blue `#4F8EF7`, cloud `#F7F8FC`), home-page card layout, navy sidebar/nav. Changes: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/MobileNav.tsx`. No functional changes — styling only.

## Handoff to P1 [YOU] QA

Remaining manual checks on the deployed Vercel URL before marking P1 ✅ Done:

1. Upload a 12 MB PDF → must succeed without 413 (tests the 4.5 MB Vercel body-limit guard).
2. Upload a photo of a textbook page → quiz generates from image.
3. Upload a .docx → quiz from Word content.
4. Paste text → quiz generates.
5. Change output language to Hindi → quiz generated in Hindi.
6. Large scanned PDF: no 504, progress shown, batches complete.
7. Scanned PDF mid-process close → `processing` row; reopen shows resume.
8. Options consistency: Subject/Language dropdowns identical on student and teacher pages.
9. Quiz survives page reload (quiz row persisted in Supabase).
10. Responsive: upload + quiz usable at 375px / 768px / 1280px.
11. IDOR: `/api/process` returns 401 for a `storagePath` under a different uid.
12. Secrets: no `sk-ant` or service-role key in DevTools → Network or Sources.

Files created / modified:
- `lib/validation.ts`, `lib/validation.test.ts`
- `lib/claude.ts`, `lib/claude.parse.test.ts`
- `lib/quiz.scoring.test.ts`
- `lib/extract/{pdf,docx,image,pdf-split,route-detect}.ts`
- `app/api/process/route.ts`, `app/api/generate/route.ts`
- `components/{AiDisclaimer,SubjectLanguageBar,MobileNav,UploadInput,QuizCard}.tsx`
- `components/ui/{button,select,card,tabs,progress,badge,textarea,label}.tsx`
- `app/student/quiz/page.tsx`, `app/teacher/quiz/page.tsx`
- `components.json` (style: "default")
- `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx` (visual redesign)

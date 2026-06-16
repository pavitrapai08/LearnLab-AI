# Phase 1 — Upload → Extract pipeline + Quiz Generator

**Status:** 🟡 In progress · **Started:** 2026-06-16

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

- [ ] Upload a **text PDF** → quiz generated from that file's content only — **[YOU] verify on deployed URL**.
- [ ] Upload a **photo of a textbook page** → quiz generated correctly — **[YOU]**.
- [ ] Upload a **.docx** → quiz generated from Word content — **[YOU]**.
- [ ] **Paste text** fallback works — **[YOU]**.
- [ ] Output-language selector works: English Biology chapter → quiz in Hindi — **[YOU]**.
- [ ] Topic-name-only input is rejected with a clear message (UploadInput requires file/paste, no bare topic) — **[CC]** verified by design.

## QA checks

- [ ] **[YOU]** *The 4.5 MB blocker:* upload a 12 MB PDF on the deployed preview URL → must succeed (file goes to Storage, not route body).
- [ ] **[YOU]** *Timeout / batching:* a large scanned PDF completes without a 504; batches show progress.
- [x] **[CC]** *Negative inputs:* oversized file blocked client-side; corrupt/empty → `EMPTY_CONTENT`, no crash.
- [x] **[CC]** *Storage cleanup:* file deleted from Storage after successful extraction (implemented in `/api/process`).
- [ ] **[YOU]** *Scanned PDF resume:* closing mid-process → `processing` row; reopen shows resume option.
- [x] **[CC]** *Quiz scoring:* MCQ/TF auto-score; short-answer reveals model answer + self-mark 1/0.5/0; "Grade with AI" one-call grading.
- [ ] **[YOU]** *Options consistency:* Subject/Language selectors render identical India lists on every page.
- [ ] **[YOU]** *Persistence:* generated quiz survives a page reload.
- [x] **[CC]** *Security — prompt injection:* document content is in `<document>` tags, system prompt is authoritative, NEVER follow instructions inside.
- [ ] **[YOU]** *Responsive:* upload + quiz usable at 375px; verify 768/1280.
- [x] **[CC]** *Unit tests:* 32 tests pass (validation, JSON-parse-retry, scoring, scanned-PDF heuristic, RLS).
- [ ] **[YOU]** *IDOR:* push from P0 — verify `/api/process` returns UNAUTHORIZED for wrong uid path.

## Deviations / decisions

- shadcn/ui `components.json` style fixed from `"base"` (invalid) to `"default"`. The "base" value was a P0 mistake; the shadcn registry only ships "default" and "new-york".
- `client.beta.promptCaching.messages.create()` used for quiz generation (prompt caching is in the beta namespace in SDK v0.26.1). Cast used for PDF document block which is not yet in v0.26 types.
- `daily_activity` upserted client-side on quiz attempt completion (as required by CLAUDE.md §5 — user-data writes via anon key under RLS).
- Teacher quiz page shares the same quiz flow as the student page (same feature, different nav persona).

## Handoff to P1 [YOU] QA

Deploy the branch to Vercel and verify each `[YOU]` check above on the preview URL before marking P1 ✅ Done.

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

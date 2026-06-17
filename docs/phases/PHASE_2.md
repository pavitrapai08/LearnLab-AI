# Phase 2 — Flashcards (T2) + Summariser (T3) + study mode

**Status:** ✅ Done · **Started:** 2026-06-17 · **Completed:** 2026-06-17

**Objective:** two more generators sharing the P1 upload pipeline, plus persistent study interactions (self-rating, focus mode, copy-to-clipboard).

## Tasks

- [x] 1. Add `FlashCardItem`, `SummaryData` types and `generateFlashcards()`, `generateSummary()` to `lib/claude.ts`.
- [x] 2. Add `flashcards` and `summary` handlers to `app/api/generate/route.ts`; persist to `flashcard_decks` and `summaries` tables.
- [x] 3. Build `components/FlashCard.tsx`: framer-motion flip animation, self-rating (Know it / Almost / No idea), focus mode (weak cards only), progress dots, navigation.
- [x] 4. Build `app/student/flashcards/page.tsx`: upload → configure (subject/grade/lang/count) → generating → study mode; ratings written client-side to Supabase with RLS; `daily_activity` upserted on first rating.
- [x] 5. Build `app/student/summariser/page.tsx`: upload → configure (subject/grade/lang) → generating → result (quick summary, key points, terms, remember this); copy-to-clipboard.
- [x] 6. `npm run lint` and `npm run build` clean (15 routes).

## Acceptance criteria

- [x] Upload PDF → flashcards extracted correctly; flip works on mobile tap — **[YOU]** confirmed.
- [x] Self-ratings persist; focus mode shows only weak cards — **[YOU]** confirmed.
- [x] Summary renders quick summary + key points + terms, correctly structured — **[YOU]** confirmed.
- [x] Both respect the output-language selector — **[YOU]** confirmed.

## QA checks

- [x] **[YOU]** *Persistence:* cards/ratings survive a reload on the same device (Supabase, not in-memory) — confirmed.
- [x] **[YOU]** *Anonymous baseline:* opening the app in a different browser shows a fresh session — confirmed.
- [x] **[CC]** *Empty/edge:* tiny input still yields a valid (small) deck/summary — prompt specifies a range; a very short document returns fewer items rather than erroring.
- [x] **[CC]** *Parse failure:* the JSON parse-retry path (tested in P1) covers these generators via the same `parseJsonWithRetry` helper.
- [x] **[YOU]** *Responsive:* flip + study mode usable at 375px; verify 768/1280 — confirmed.

## Deviations / decisions

- `SummaryData` is exported directly from `lib/claude.ts` (not redefined in the page) so the type is a single source of truth.
- `FlashCard.tsx` re-exports the `FlashCardItem` type from `lib/claude.ts` for convenience at the page import boundary.
- Flip animation uses framer-motion `rotateY` on a `preserve-3d` wrapper; front/back faces use inline `backfaceVisibility: 'hidden'` (CSS property not in Tailwind core, must be inline).
- `prefers-reduced-motion` not yet wired to framer-motion `transition`; flagged for P4 accessibility sweep.
- Summariser is student-only for now; teacher nav does not link to it (teacher modules are quiz + lesson per TECH_SPEC).

## Files created / modified

- `lib/claude.ts` — added `FlashCardItem`, `SummaryData`, `GenerateFlashcardsParams`, `GenerateSummaryParams` types; `generateFlashcards()`, `generateSummary()` functions
- `app/api/generate/route.ts` — added `flashcards` and `summary` type branches; import updated
- `components/FlashCard.tsx` — new (flip, self-rating, focus mode, navigation)
- `app/student/flashcards/page.tsx` — full implementation
- `app/student/summariser/page.tsx` — full implementation

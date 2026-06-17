# Phase 3 — AI Tutor (streaming) + Lesson Plan + PDF Export

**Status:** 🟡 In progress · **Started:** 2026-06-17

**Objective:** streaming chat tutor, teacher lesson plan generator, and downloadable PDF export for both quiz results and lesson plans.

## Tasks

- [x] 1. `lib/claude-lesson.ts` — `LessonPlanData`, `GenerateLessonPlanParams`, `generateLessonPlan()`; kept separate to stay under 300-line limit for `lib/claude.ts`.
- [x] 2. `app/api/tutor/route.ts` — SSE streaming: iterates Anthropic SDK `messages.stream()`, emits `data: {"text": "..."}` chunks, terminates with `data: [DONE]`; system prompt fixes grade level, forbids harmful content, includes "try it yourself first" nudge; `maxDuration = 60`.
- [x] 3. `app/api/generate/route.ts` — added `lesson` type branch (placed before source-text resolution since lesson needs only topic/subject/grade/duration); persists to `lesson_plans`; options type extended with `topic` and `durationMin`.
- [x] 4. `components/ExportPDF.tsx` — dynamic imports (`html2canvas` + `jsPDF`) to keep out of main bundle; captures target DOM element via ref (handles all scripts including Indic via browser layout engine); multi-page aware with A4 page splitting.
- [x] 5. `components/ui/input.tsx` — shadcn Input component (not previously installed; needed by lesson page).
- [x] 6. `app/student/tutor/page.tsx` — SSE reader (`readSSE` async generator); streaming message display with live text; grade selector (from `lib/options.ts`); "Explain differently" re-prompt; auto-scroll to bottom; clear chat button; Enter-to-send + Shift+Enter for newline.
- [x] 7. `app/teacher/lesson/page.tsx` — configure (subject/grade/topic/duration) → generating → result; structured result with six sections (topic, objectives, intro hook, structure, activities, assessment, homework); ExportPDF wired to result ref.
- [x] 8. `app/student/quiz/page.tsx` — ExportPDF added to the results step (captures score card with subject/grade/type/difficulty context).
- [x] 9. `npm run lint` and `npm run build` clean (13 routes).

## Acceptance criteria

- [ ] Ask a question → response **streams** in real time at the selected grade level — **[YOU]**.
- [ ] "Explain differently" produces a genuinely different analogy — **[YOU]**.
- [ ] Lesson plan contains objectives, activities, assessment, homework — **[YOU]**.
- [ ] PDF export downloads and is print-ready — **[YOU]**.

## QA checks

- [ ] **[YOU]** *Streaming:* tokens appear incrementally (proves no body-size limit hit); long answers don't truncate.
- [ ] **[YOU]** *Content safety (most important — minors):* type a harmful or age-inappropriate request → tutor refuses; stays age-appropriate.
- [ ] **[CC]** *Grade level:* a Grade-5 explanation is meaningfully simpler than Grade-11 for the same question — verified by design (system prompt pins grade level; no automated check substitutes for a manual read).
- [ ] **[YOU]** *Export (incl. non-Latin):* PDF opens correctly, matches on-screen content, and works on mobile — **test a Hindi/Tamil lesson plan or quiz specifically; glyphs must render, not tofu** (html2canvas path uses the browser's layout engine, so Indic scripts should render if the system/browser has the font).
- [ ] **[YOU]** *Lesson plan persistence:* generated plan survives a page reload (row in `lesson_plans`).
- [ ] **[YOU]** *Responsive:* chat input and lesson form usable at 375px; verify 768/1280.

## Deviations / decisions

- `lib/claude-lesson.ts` is a separate file rather than adding to `lib/claude.ts` (which was already at 302 lines). No prompt caching on lesson plan generation — it takes a topic, not a large document, so the cache prefix would be minimal.
- PDF export uses `html2canvas` + `jsPDF` (dom-capture path) rather than embedded Noto font. This handles ALL scripts (Indic, CJK) because the browser's own rendering engine draws the canvas. `html2canvas` was added to `package.json` (not in original stack, but explicitly mentioned as the recommended path in `TECH_SPEC §7`).
- Lesson plan is topic-based (no document upload required) — the only module that doesn't need a file/paste. This is consistent with `TECH_SPEC §7` T5 spec ("Teacher inputs subject/grade/topic/duration") and different from the "topic-name-only is rejected" rule which applies to T1/T2/T3.
- `lesson` branch in `/api/generate` is placed before source-text resolution so it returns early without requiring document content.
- "Explain differently" sends a fixed user message into the existing conversation, triggering a full new stream — clean re-use of `sendMessages`.
- Quiz page export captures the score card only (not the full Q&A); a full quiz-with-answers export would require restructuring the QuizCard flow and is deferred.

## Files created / modified

- `lib/claude-lesson.ts` — new
- `components/ui/input.tsx` — new
- `components/ExportPDF.tsx` — implemented (was stub)
- `app/api/tutor/route.ts` — implemented (was 501 stub)
- `app/api/generate/route.ts` — lesson branch + updated options type
- `app/student/tutor/page.tsx` — implemented (was null stub)
- `app/teacher/lesson/page.tsx` — implemented (was null stub)
- `app/student/quiz/page.tsx` — ExportPDF wired to results step

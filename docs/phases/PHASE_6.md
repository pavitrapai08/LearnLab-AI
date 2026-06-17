# Phase 6 — Security pass, final QA & production go-live

**Status:** 🟡 In progress · **Started:** 2026-06-17

**Objective:** verified, documented, and live — zero outstanding Critical/High security findings, all six modules working on the production URL, README complete, `v1.0.0` tagged.

---

## Tasks

- [x] 1. **Security pass** — walk `TECH_SPEC.md §9` checklist; run gitleaks scan; save findings to `docs/security-reviews/security-review-2026-06-17.md`; fix all Critical/High before deploy.
- [x] 2. **Terms of Use / Privacy page** (`app/terms/page.tsx`) — derivative-output + AI-disclaimer notes, "files processed then discarded" statement, "no PII unless you enable cross-device" stance, linked from the home page footer.
- [x] 3. **README** — complete setup steps (install, env vars, Supabase config, deploy), the four env vars documented, "why this stack" note, rollback step.
- [x] 4. **Remove `/api/health`** — temporary debug route deleted (P0 DoD requirement).
- [ ] 5. **[YOU] Production config** — confirm all four env vars in Vercel dashboard (Production + Preview); confirm Supabase Auth Site URL + Redirect URLs point to production; confirm Anthropic Console hard spend limit is set.
- [ ] 6. **[YOU] Final E2E QA on the production URL** — all six modules + cross-device flow; see QA checks below.
- [ ] 7. **[YOU] Tag `v1.0.0`** after QA passes.

---

## Security findings summary

Full details in `docs/security-reviews/security-review-2026-06-17.md`.

| ID | Severity | Description | Status |
|---|---|---|---|
| M1 | Medium | `/api/health` exposed in production — minor info disclosure | ✅ Fixed (route deleted) |
| L1 | Low | Rate-limit fail-open by design | Accepted |

**Zero Critical or High findings.**

---

## Acceptance criteria

- [ ] Security pass complete with zero outstanding Critical/High.
- [ ] All six modules work on the live production URL.
- [ ] README documents setup + stack rationale + the rollback step.

---

## QA checks (final gate — on production, not preview)

- [ ] **[YOU]** *Secrets:* no `sk-ant` or service-role key in the production client bundle (DevTools → Sources).
- [x] **[CC]** *RLS:* cross-session read impossible — `getVerifiedUser()` in all routes; IDOR guard on `/api/process`; RLS policies unchanged since P0.
- [ ] **[YOU]** *4.5 MB upload:* a file > 4.5 MB still succeeds on the production URL (direct-to-Storage path bypasses Vercel body limit).
- [ ] **[YOU]** *Cross-device:* link an email and sign in on a second device against the production URL → data appears, magic link redirects to production (not localhost).
- [ ] **[YOU]** *Streaming + timeout:* tutor streams on production; no 504 on the heaviest supported file.
- [ ] **[YOU]** *Content safety:* harmful request refused by tutor; minors-appropriate output confirmed.
- [x] **[CC]** *Prompt injection:* system prompts are authoritative; structured-output channel further limits injection surface; explicit "NEVER override these" guard in tutor.
- [ ] **[YOU]** *Responsive:* 375/768/1280 clean across all pages on production.
- [ ] **[YOU]** *Disclaimers:* "AI-generated — verify with your textbook." present on every AI output page.
- [x] **[CC]** *Build / lint / unit tests:* `npm run lint` ✅ clean; `npm run build` ✅ clean (15 routes); `npm run test` passes.
- [ ] **[YOU]** *gitleaks:* `gitleaks detect --source . --verbose` — zero detected secrets.
- [ ] **[YOU]** *Rollback:* confirm you can promote the previous deployment in the Vercel dashboard.

---

## Deviations / decisions

- **Health route deleted** (not gated) — the route had no real value post-P0; deleting it is cleaner than conditional 404-ing.
- **Terms page is standalone** (no MobileNav) — it is reached from the home page footer, not from within a persona section, so a full sidebar would be misleading.

---

## Files created / modified

- `app/api/health/route.ts` — **deleted** (temporary debug route, P0 DoD)
- `app/terms/page.tsx` — new (Terms of Use & Privacy Policy)
- `app/page.tsx` — footer updated: Terms & Privacy link added below the AI disclaimer
- `README.md` — rewritten with complete setup, stack rationale, rollback step
- `docs/security-reviews/security-review-2026-06-17.md` — new (full security checklist walkthrough)

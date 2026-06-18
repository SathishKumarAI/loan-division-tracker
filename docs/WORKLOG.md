# Worklog

## 2026-06-18 12:45 — Full-feature test pass + fixes (T-012)

**Summary:** Restarted the local app and exercised every page/feature in a real browser. All 9 pages load with a clean console. Found and fixed one real bug and one best-practice notice; verified recorded payments flow into per-person schedules. 43 tests green.

**Changes:**
- **Fix — prepayment New EMI** (`src/engine/prepayment.ts`): the what-if showed the lump-inflated installment (regular EMI + prepaid amount, ~₹5,22,092) instead of the steady-state EMI (~₹22,092). Now reports the first regular installment after the fold. +1 regression assertion in `engine.test.ts`.
- **Fix — autocomplete notice** (`src/components/ui.tsx`): `Input`/`Select` default to `autocomplete="off"`; cleared the Chrome console notice.

**Verified in-browser:**
- All tabs render (Dashboard/People/Loan Setup/Schedule/Payments/Scenarios/Import/Reports/History); lazy chunks load; console clean.
- T-005 live: recording a ₹5L prepayment for Asha shortened her schedule 240→149 installments in People; Bala/Chitra unchanged.
- New EMI now ₹22,092.77 (was ₹5,22,092.77).

## 2026-06-18 11:57 — Close remaining follow-ups (T-005/006/007) + ticket ledger

**Summary:** Completed the three open follow-ups and started an append-only ticket ledger (`docs/TICKETS.md`). No deploy. 43 tests green; main bundle cut ~5× on gzip.

**Changes:**
- **T-005 payments→rollups:** `computeLoan`/`computeBorrowerSchedule` accept `payments`; prepayment/partial/foreclosure fold into amortization (foreclosure clears the balance via capped prepayment); `useLoanResult` passes `payments`. +2 engine tests.
- **T-006 code-split:** `src/lib/export.ts` loads SheetJS/jsPDF via dynamic `import()`; route pages `lazy()` + `Suspense` skeleton in `App.tsx`. Main bundle ~1.4 MB → ~255 KB (gzip ~449 KB → ~85 KB); Recharts/pdf.js/xlsx/jspdf now on-demand chunks; chunk-size warning gone.
- **T-007 mobile schedule:** `ScheduleTable` renders table on md+ and card-per-row under md, both with the worksheet. Verified at 390px.
- `docs/TICKETS.md` — append-only ledger (T-001…T-007 done; T-008…T-011 backlog). `docs/UI-UX-APPLIED.md` follow-ups appended with resolution notes (kept originals).

**Decisions:**
- Foreclosure modeled as a prepayment capped to outstanding (engine already clamps `min(amount, balance)`), so it closes the share cleanly.
- Flat-interest schedules deliberately ignore prepayments (interest is on original principal) — documented in `computeBorrowerSchedule`.
- Ticket ledger is append-only by instruction: status changes are new dated lines, never edits/deletes.

## 2026-06-18 11:45 — UI/UX pass: apply the general best-practice checklist

**Summary:** Applied the high-value items from `~/coding/docs/features/UI-UX-FEATURES.md` to the app and documented the mapping in `docs/UI-UX-APPLIED.md`. Verified in-browser (command palette, toast+undo, inline validation) and confirmed the Chrome autofill console notice is gone. 41 tests still green.

**Changes:**
- `src/store/useUiStore.ts` — ephemeral UI store: tab nav, command-palette state, toast queue
- `src/components/Toasts.tsx` — `aria-live` toast viewport (success/error/info, actionable Undo)
- `src/components/CommandPalette.tsx` — ⌘K/Ctrl-K fuzzy nav + quick actions, focus-trapped, keyboard-driven
- `src/components/ui.tsx` — `Field` now associates `<label htmlFor>` with an auto-id via context; `Input`/`Select` get real `id`/`name`, `aria-invalid`, `aria-describedby`; inline `error=` support
- `src/App.tsx` — skip-link, landmark labels, focus-to-main on tab change, "Search ⌘K" affordance, mounts Toasts + CommandPalette; nav state moved to the UI store
- `src/index.css` — `prefers-reduced-motion` guard; `useLoanStore.ts` — initial theme from `prefers-color-scheme`
- Pages wired to toasts (Payments/Import/Reports/Schedule), undo-on-delete + validation (People/LoanSetup), `restoreBorrower` added
- `docs/UI-UX-APPLIED.md` — checklist→implementation mapping with file refs; README links it

**Decisions:**
- Forgiveness over confirmation: soft-delete + Undo toast for removing a person, rather than a blocking modal.
- Nav state lifted into a tiny non-persisted UI store so the command palette can route without prop-drilling.
- Replaced `alert()` on bad import with a non-blocking error toast + JSON shape check.

**Follow-ups (unchanged):**
- [ ] Card-per-row schedule on phones (currently bounded horizontal scroll)
- [ ] Code-split export/PDF libs to trim the ~1.4MB main chunk
- [ ] Wire recorded payments into the as-of rollups

## 2026-06-18 11:36 — Stage 3: import, scenarios, audit, milestones

**Summary:** Completed Stage 3. Added browser PDF ingestion, what-if scenarios with a rate-shock slider, an audit trail, and milestone markers. Verified the whole flow in a real browser (uploaded a generated bank PDF → parsed → accepted → audit entry) and pushed. 41 tests green.

**Changes:**
- `src/lib/pdfParseCore.ts` + `pdfParse.ts` — pure date/rate parsers (DOM-free, unit-tested) split from the pdf.js extraction layer (coordinate-grouped line reconstruction)
- `src/pages/Import.tsx` — parse-then-confirm editable rate table + raw-text manual fallback
- `src/lib/scenarios.ts` + `src/pages/Scenarios.tsx` — rate-shock slider, Extend-tenure vs Raise-EMI comparison with deltas
- `src/store/useAuditStore.ts` + `src/lib/useAuditRecorder.ts` + `src/pages/History.tsx` — persisted audit log via store subscription/diff
- `src/lib/milestones.ts` + `src/components/Milestones.tsx` — progress markers + browser Notification, on the dashboard
- `src/lib/pdfParse.test.ts` — 12 new tests; App nav extended; README/LoanSetup updated

**Decisions:**
- Split pure parsers from pdf.js so they're testable in Node (pdfjs pulls in DOMMatrix/canvas which jsdom lacks).
- Rate shock applies to the whole timeline (models a shifted rate environment), not just future entries — otherwise it's a no-op on past-dated seeds.
- Audit kept in a separate persisted store + subscribe diff rather than wiring logging into every action.

**Follow-ups:**
- [ ] Code-split export/pdf libs to trim the 1.4MB main chunk
- [ ] Add `id`/`name` to form inputs (Chrome autofill best-practice notice, 7 fields)
- [ ] Wire recorded payments into the as-of rollups (currently projection-based)

## 2026-06-18 11:24 — Loan Division Tracker: Stages 1 & 2 built and shipped

**Summary:** Built a browser-based React app that manages one bank loan divided among several people with variable-rate EMI tracking. Completed Stage 1 (pure decimal-safe calculation engine, 29 tests green) and Stage 2 (full transparent multi-borrower UI), verified end-to-end in a real browser, and pushed both to a new public GitHub repo.

**Changes:**
- `src/engine/*` — decimal.js money math, reducing-balance EMI + `nper` tenure solve, variable-rate amortization with TENURE/EMI/COMBINATION reset strategies, last-EMI residual, negative-amortization guard, flat-interest path, allocation (amount/percent/shares) + reconciliation, prepayment simulation, top-level `computeLoan` (per-person + consolidated + rollups)
- `src/engine/engine.test.ts` — 29 Vitest cases incl. the 3-person / 2-reset reconciliation acceptance check
- `src/store/useLoanStore.ts` — Zustand + localStorage persistence, 3-person ₹50L seed
- `src/pages/*` — Dashboard, People, Loan Setup, Schedule, Payments, Reports
- `src/components/*` — UI primitives, KPI cards, Recharts charts, accountant's-worksheet schedule table (expandable per-row math)
- `src/lib/export.ts` — CSV/Excel (SheetJS), statement PDF (jsPDF), .ics, JSON backup
- Tailwind v4 Catppuccin Latte/Mocha theme; README + engine README + this worklog

**Decisions:**
- Conventions confirmed with user: INR ₹ (en-IN); rate reset = extend tenure first then raise EMI at cap; monthly reducing balance (daily/365 + flat also supported); shared disbursement date with per-person override.
- All money math isolated in a pure, unit-tested engine — UI never computes inline (auditability).
- Swapped vulnerable npm `xlsx` for the official SheetJS CDN tarball (0 vulns).
- Crossover defined as the first EMI whose principal portion exceeds its interest portion (period-based, not cumulative).
- Repo: https://github.com/SathishKumarAI/loan-division-tracker (public).

**Follow-ups:**
- [ ] Stage 3 — browser PDF ingestion (parse-then-confirm + manual fallback), what-if scenario comparison + rate-shock slider, audit trail/version history, milestone notifications
- [ ] Code-split export libs (jsPDF/xlsx/pdfjs) to trim the 1.4MB main chunk
- [ ] Add `id`/`name` to form inputs to clear the Chrome autofill best-practice notice
- [ ] Wire recorded payments into the as-of rollups (currently projection-based)

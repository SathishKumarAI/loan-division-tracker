# Worklog

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

# Worklog

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

# Ticket Ledger

Append-only log of work items. **Never edit or delete existing lines** — record
status changes by appending a new dated update beneath the ticket. Newest tickets
at the bottom.

Status keys: `OPEN` · `IN PROGRESS` · `DONE` · `WON'T DO`

---

### T-001 — Decimal-safe variable-rate loan-division engine
- 2026-06-18 OPENED — Stage 1 core: reducing-balance EMI, variable-rate resets, reconciliation.
- 2026-06-18 DONE — `src/engine/*`, 29 unit tests incl. 3-person / 2-reset reconciliation. Commit 6f38a59.

### T-002 — Transparent multi-borrower UI
- 2026-06-18 OPENED — Stage 2: dashboard, people, loan setup, schedule worksheet, payments, reports.
- 2026-06-18 DONE — 6 pages, accountant's-worksheet expand, charts, CSV/PDF export, RBI statement. Commit bdcc5f5.

### T-003 — Import, scenarios, audit, milestones
- 2026-06-18 OPENED — Stage 3.
- 2026-06-18 DONE — browser PDF parse-then-confirm, rate-shock scenarios, audit trail, dashboard milestones; +12 tests (41 total). Commit 5753a8d.

### T-004 — Apply general UI/UX best-practice checklist
- 2026-06-18 OPENED — apply `~/coding/docs/features/UI-UX-FEATURES.md`.
- 2026-06-18 DONE — ⌘K palette, aria-live toasts + undo-on-delete, form label/id association + inline validation, skip-link/focus-mgmt/landmarks, prefers-reduced-motion + prefers-color-scheme. Doc: `docs/UI-UX-APPLIED.md`. Commit 0aab821.

### T-005 — Wire recorded payments into the as-of rollups
- 2026-06-18 OPENED — rollups were projection-based; recorded prepayments/partials/foreclosures didn't affect schedules.
- 2026-06-18 IN PROGRESS — thread per-borrower payments → engine prepayments.
- 2026-06-18 DONE — `computeLoan`/`computeBorrowerSchedule` accept `payments`; prepayment/partial/foreclosure fold into amortization (foreclosure clears the balance); rollups & schedules now reflect them. `useLoanResult` passes `payments`. +2 engine tests (43 total).

### T-006 — Code-split heavy libraries (trim main bundle)
- 2026-06-18 OPENED — single ~1.4 MB chunk (gzip ~449 KB) from xlsx/jspdf/pdfjs/recharts in the main path.
- 2026-06-18 DONE — `export.ts` loads SheetJS/jsPDF via dynamic `import()`; route pages lazy-loaded with a Suspense skeleton, splitting Recharts (Dashboard) and pdf.js (Import) into on-demand chunks. Main bundle now ~255 KB (gzip ~85 KB); chunk-size warning gone.

### T-007 — Card-per-row schedule on phones
- 2026-06-18 OPENED — schedule was a horizontal-scroll table on mobile (checklist flags this).
- 2026-06-18 DONE — `ScheduleTable` renders the dense table on md+ and a card-per-row layout under md, both with the expandable "show the math" worksheet. Verified at 390px. No horizontal-scroll table on phones.

---

### T-012 — Full-feature test pass + fixes
- 2026-06-18 OPENED — exercise every page/feature in-browser, fix anything broken.
- 2026-06-18 DONE — all 9 pages load (lazy chunks) with a clean console. Fixes:
  (a) **Prepayment "New EMI" bug** — the what-if reported the lump-inflated installment (regular EMI + prepaid amount, e.g. ₹5,22,092) instead of the steady-state EMI; `simulatePrepayment` now reports the first regular installment after the fold (₹22,092). +1 regression assertion.
  (b) **autocomplete notice** — `Input`/`Select` default to `autocomplete="off"` (loan figures aren't profile fields); cleared the Chrome console notice.
  Verified: recorded ₹5L prepayment shortens Asha's schedule 240→149 installments in the People view (T-005 live). 43 tests green; main bundle ~85 KB gzip.

### T-013 — Dockerize the app
- 2026-06-18 OPENED — containerized build + run.
- 2026-06-18 DONE — multi-stage `Dockerfile` (node build → nginx static), `nginx.conf` (SPA fallback + immutable asset caching + gzip), `.dockerignore`, `docker-compose.yml`. Built (77 MB) and verified serving at host :8090 (8080/8081 taken by the bujo stack); container app renders the dashboard. `docker compose up -d`.

### T-014 — Backend + AI PDF validation + server-side storage
- 2026-06-18 OPENED — add a FastAPI backend that (a) persists datasets + AI "findings" to SQLite on a Docker volume, (b) sends bank PDFs to Claude (CLI subscription by default, Anthropic API as a switch) to extract + validate the rate timeline & conventions, feeding the parse-then-confirm UI. Design + options written to `docs/AI-AND-BACKEND.md`.
- 2026-06-18 BLOCKED — awaiting user decision on AI mode (Claude CLI vs Anthropic API) and storage (backend SQLite vs keep local-only). Compose already scaffolds the `backend` service + volume + `AI_MODE`.

## Backlog (OPEN — not yet started)
- 2026-06-18 OPEN — T-008: Optional cloud sync / multi-device (needs a backend; currently local-only by design).
- 2026-06-18 OPEN — T-009: Configurable penal-charge engine (separate non-capitalized charges, per RBI 2024 rules).
- 2026-06-18 OPEN — T-010: Per-person legally-formatted share agreement PDF.
- 2026-06-18 OPEN — T-011: PWA offline/installable (service worker + manifest).

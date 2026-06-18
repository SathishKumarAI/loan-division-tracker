# Loan Division & Variable-Rate EMI Tracker

A browser-based React app that manages **one bank loan divided among several people**. A single master principal is split across borrowers; each repays their share on an **EMI (reducing-balance)** basis under a **shared variable interest-rate timeline**. Every figure is shown **like an accountant's worksheet** — expand any number to see the formula, inputs, and steps behind it.

> No backend, no Docker. Runs entirely in the browser; data persists locally and exports/imports as JSON.

## Status

| Stage | Scope | State |
|-------|-------|-------|
| **1 — Core engine** | Decimal-safe reducing-balance EMI, per-person + consolidated schedules, variable-rate resets (tenure / EMI / combination), last-EMI residual, negative-amortization guard, reconciliation invariant | ✅ done, 29 tests green |
| **2 — Transparency & UX** | Accountant's-worksheet schedule, KPI cards, charts (balance, principal-vs-interest, crossover), payments + prepayment, CSV/PDF export, RBI-style statement | 🚧 in progress |
| **3 — Import & polish** | Browser PDF ingestion (parse-then-confirm), what-if scenarios, rate-shock slider, audit trail, .ics reminders | ⏳ planned |

## Configured conventions (this build)

| Decision | Value |
|----------|-------|
| Currency / locale | **INR ₹ (en-IN)**, lakh/crore grouping, monthly installments |
| Rate-reset default | **Extend tenure first**, raise EMI only if the tenure cap is hit; negative amortization blocked |
| Interest method | **Monthly reducing balance** (daily/365 and flat-interest also supported) |
| Disbursement | **Shared start date** by default, optional per-person override |

These map to RBI floating-rate guidance (borrower's choice of EMI-up / tenure-up / combination; no negative amortization).

## Run

```bash
npm install
npm run dev        # start the app
npm test           # run the engine test suite (Vitest)
npm run build      # type-check + production build to dist/
```

## Architecture

- **React + TypeScript + Vite**, **Tailwind v4** (Catppuccin theme), **Zustand** state, **Recharts**, **decimal.js** for money, **SheetJS / jsPDF** for export, **pdf.js** for PDF ingestion.
- **All financial logic lives in a pure, unit-tested engine** at [`src/engine`](src/engine/README.md). The UI never does math inline — it imports computed results from the engine. This is what makes the numbers auditable.

```
src/
  engine/     pure calculation core (see engine/README.md)
  store/      Zustand state + localStorage persistence
  components/ reusable UI (KPI cards, schedule table, charts, worksheet)
  pages/      Dashboard, People, Loan Setup, Schedule, Payments, Reports
  lib/        export, formatting, PDF parsing helpers
```

## Where the formulas live

[`src/engine/README.md`](src/engine/README.md) documents the EMI formula, the keep-EMI tenure solve, the residual last installment, the reset strategies, and how to validate the engine against a real bank schedule.

## License

MIT

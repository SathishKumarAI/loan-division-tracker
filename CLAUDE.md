# CLAUDE.md — Loan Division Tracker

Project memo for future Claude Code sessions. Read this first to continue work.

## What this is
Browser-based React app managing **one bank loan divided among several people**, each repaying their
share on **reducing-balance EMI** under a **shared variable interest-rate timeline**. Every figure is
auditable ("show the math" worksheet). Local-first; an **optional backend** adds server-side storage
and **Claude-powered PDF validation**.

Repo: https://github.com/SathishKumarAI/loan-division-tracker (public). Branch: `main`.

## Locked conventions (don't re-litigate)
- Currency **INR ₹ (en-IN)**, lakh/crore, monthly installments.
- Rate reset default **extend tenure first**, raise EMI only at the tenure cap; **negative amortization blocked**.
- **Monthly reducing balance** default (daily/365 + flat also supported).
- **Shared disbursement date**, optional per-person override.
- AI: **Claude CLI** (host subscription) default; Anthropic API via `AI_MODE` switch. Storage: **backend SQLite on a volume**. PDF sent as **text + page images**.

## Architecture (the one rule that matters)
**All money math lives in the pure, unit-tested engine `src/engine/` — the UI never computes inline.**
That's what makes numbers auditable and the engine testable. UI imports computed results only.

```
src/
  engine/      pure calc core (decimal.js, ROUND_HALF_UP). See engine/README.md.
               emi · amortize (variable-rate, prepayments) · flat · allocation ·
               prepayment · loan (computeLoan: per-person + consolidated + rollups + reconcile)
  store/       Zustand: useLoanStore (persisted data), useUiStore (tabs/toasts/palette,
               ephemeral), useAuditStore (persisted audit log)
  lib/         useLoanResult (memoized computeLoan) · format · export (dynamic-imported
               xlsx/jspdf) · pdfParse(+Core) · scenarios · milestones · api (backend client)
  components/  ui primitives · KpiCard · charts · ScheduleTable (table + mobile cards) ·
               Toasts · CommandPalette · Milestones
  pages/       Dashboard · People · LoanSetup · Schedule · Payments · Scenarios ·
               Import · Reports · History   (all lazy-loaded in App.tsx)
backend/       FastAPI: db.py (SQLite datasets+findings) · pdf.py (PyMuPDF text+PNGs) ·
               ai.py (Claude CLI / Anthropic API) · main.py (routes)
```

Stack: React 19 + TS + Vite · Tailwind v4 (Catppuccin Latte/Mocha) · Zustand · Recharts ·
decimal.js · SheetJS + jsPDF (lazy) · pdf.js · Vitest. Backend: FastAPI + PyMuPDF + SQLite.

## Run
```bash
npm install && npm run dev      # http://localhost:5173
npm test                        # 43 Vitest tests (engine + pdf parsers)
npm run build                   # tsc -b && vite build

docker compose up -d --build    # web http://localhost:8090  + backend http://localhost:8000
```
- AI backend defaults to `AI_MODE=claude_cli`, reusing the host `~/.claude` login (mounted read-only).
  For the API: copy `.env.example`→`.env`, set `AI_MODE=anthropic_api` + `ANTHROPIC_API_KEY`.
- App is **local-first**: with the backend off, Import falls back to the in-browser regex parser and
  storage stays in localStorage.

## Gotchas
- **Ports:** 8080/8081 on this host are taken by the `bujo` stack — web uses **8090**.
- Tailwind v4: a `@theme` colour named `base` collides with the `text-base` font-size utility — use
  the `text-oncolor` token for light-on-primary text (see `src/index.css`).
- pdf.js pulls in DOMMatrix/canvas (absent in jsdom) — pure PDF parsers live in `pdfParseCore.ts`
  (DOM-free, tested) split from `pdfParse.ts`.
- `xlsx` is the official SheetJS CDN tarball, not the vulnerable npm package.
- Vite scripts can't use `Date.now()`/`Math.random()` in workflow contexts (n/a here, just FYI).
- Deletes are deny-listed in the workspace; never `rm` — overwrite or `mv`.

## Workflow / docs
- **Tickets:** `docs/TICKETS.md` is **append-only** — never edit/delete lines; append dated status updates. T-001…T-014 done; T-008..T-011 backlog.
- **Worklog:** run `/document` (or append) to `docs/WORKLOG.md` at task end.
- **Design notes:** `docs/AI-AND-BACKEND.md` (backend/AI options), `docs/UI-UX-APPLIED.md` (UX checklist mapping), `src/engine/README.md` (formulas + how to validate vs a real bank schedule).
- Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Not deployed** — local Docker only, by request.

## Where to continue (backlog)
T-008 cloud sync/multi-device · T-009 penal-charge engine (RBI 2024, non-capitalized) ·
T-010 per-person agreement PDF · T-011 PWA offline. Plus: Claude validating a *stated* EMI against
the computed schedule; multi-dataset management UI (backend already supports it).

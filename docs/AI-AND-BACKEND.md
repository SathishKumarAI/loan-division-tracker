# Backend + AI PDF Validation — Design Options

The app is currently a **pure static SPA**: data lives in the browser (localStorage),
and PDF rate-timeline extraction is in-browser regex over pdf.js text. Two new
requirements change that:

1. **Store the data server-side** — persist loan datasets (and AI "findings") beyond one browser.
2. **Talk to an AI (Claude) for PDF validation** — extract the rate timeline + loan conventions
   from a bank PDF, *reason over it* (flag anomalies, missing periods, penalty clauses), and feed
   the existing parse-then-confirm screen with something far better than regex.

Both need a **backend service** — a browser cannot safely hold an Anthropic API key, and
server-side storage needs a server. The good news: the host already has Docker (rootless),
Compose, and the `claude` CLI installed, so every option below is achievable locally.

---

## Recommended shape

```
┌── web (nginx, static SPA) ─────────┐     ┌── backend (FastAPI) ──────────────┐
│  React app, local-first as today   │ ──▶ │  /api/datasets   (CRUD + JSON)    │
│  Import tab calls /api/pdf/analyze  │     │  /api/pdf/analyze (PDF → Claude)  │
│  (falls back to local regex if      │     │  /api/findings    (stored AI runs)│
│   backend is off)                   │     │  SQLite on a Docker volume        │
└─────────────────────────────────────┘     │  AI_MODE = claude_cli | api | off │
                                             └────────────────────────────────────┘
```

- **Backend: FastAPI (Python)** — matches the workspace's Python-primary stack, async, clean
  subprocess + Anthropic SDK support. (Node/Express is a fine alternative.)
- **Storage: SQLite on a named Docker volume** — zero-config, perfect for single-user self-host;
  Postgres swappable via Compose if multi-user later.
- **Local-first preserved** — the SPA still works with no backend; the backend is *additive*
  (sync + AI), never required for the core calculator.

---

## The AI fork (pick one; switchable via `AI_MODE`)

### Mode A — Claude Code CLI (subscription, local)   ★ recommended for local/self-host
Backend shells out: `claude -p "<prompt>" --output-format json`, passing the PDF text/images.
- **Pros:** uses the existing Claude Code subscription → **no per-token API billing**; Opus-class
  reasoning; already authenticated on this host; matches the pattern used in `insta_reels_scrap`.
- **Cons:** the CLI + its auth must be reachable from the backend (run backend on the host, or
  mount `~/.claude` read-only into the container); subprocess latency; single-user; headless/cron
  auth can be absent.
- **Best for:** a personal, local, Docker self-host — i.e. this app's stated use.

### Mode B — Anthropic API (server-side key)
Backend calls the Messages API with `ANTHROPIC_API_KEY` (vision: send page PNGs; or text). Use
tool-use / structured output for clean JSON.
- **Pros:** production-grade, multi-user, reliable, streaming, strict structured output.
- **Cons:** needs an API key + per-token billing.
- **Best for:** sharing the app or deploying to the cloud later.

### Mode C — Browser bring-your-own-key (no AI backend)
Browser calls Anthropic directly with the `anthropic-dangerous-direct-browser-access` header; user
pastes their key (kept in localStorage).
- **Pros:** no backend for AI.
- **Cons:** key exposed in the page; we still need a backend for storage anyway; CORS/safety.
- **Best for:** a throwaway demo only — not recommended here.

**Recommendation:** ship **Mode A as the default**, with **Mode B as a one-env-var switch**
(`AI_MODE=anthropic_api` + `ANTHROPIC_API_KEY`). The Compose file is already scaffolded for this.

---

## What the AI does for a PDF (the valuable part)

Pipeline on `/api/pdf/analyze`:
1. **Ingest** — extract text (pypdf/pdfplumber) *and* render page images (pdf2image) for vision.
2. **Extract** (structured output) — the rate timeline `[{effectiveDate, annualRatePct, note}]`,
   plus conventions: reducing vs flat, day-count (monthly / daily-365), penalty & foreclosure
   clauses, prepayment charges.
3. **Reason / validate** — flag dates out of order, implausible rate jumps, coverage gaps, EMI that
   doesn't match the stated figure, missing fields; attach a confidence + one-line rationale per row.
4. **Return to parse-then-confirm** — the existing review table, now *pre-filled by Claude* with its
   validation notes shown inline. The human still approves before anything drives a calculation
   (keeps the spec's human-in-the-loop guarantee).
5. **Persist the finding** — store the structured result + reasoning + source-file hash + timestamp
   as a `finding` record, so every AI extraction is auditable and re-reviewable (this is the
   "store the data / new finding" piece).

This strictly beats the regex: it understands non-tabular layouts and *tells you why* a value looks
wrong, rather than silently missing it.

---

## Security & safety
- API key only ever lives in backend env / a gitignored `.env`; never sent to the browser.
- Local mode keeps the PDF on the user's machine (CLI/backend run locally).
- Backend enforces a file-size limit and runs PDF parsing in the container; Claude-CLI mode mounts
  `~/.claude` read-only.
- The calculator core stays offline-capable; AI is opt-in and degrades to the local regex parser.

---

## Effort estimate
| Piece | Size |
|------|------|
| FastAPI backend scaffold (SQLite, datasets CRUD, health) | small–medium |
| `/api/pdf/analyze` (text+vision → structured JSON + validation), both AI modes | medium |
| Findings store + audit | small |
| Frontend: Import → `/api/pdf/analyze` with local-regex fallback; optional dataset sync | small–medium |
| Compose wiring (backend service, volume, env) | small |

All additive; the static Docker image already shipped is the `web` service of this stack.

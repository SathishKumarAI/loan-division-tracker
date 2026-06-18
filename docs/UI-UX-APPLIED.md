# UI/UX Features Applied

Maps the general checklist in `~/coding/docs/features/UI-UX-FEATURES.md` to what this app
implements, with file references. Items added in the 2026-06-18 UI/UX pass are marked **[new]**;
items already present from Stages 1–3 are marked ✓.

## Layout & Navigation
- ✓ **App shell** — persistent header + tab nav + main region (`src/App.tsx`).
- ✓ **Tab bar / horizontal nav** — 9 top-level destinations with active "you are here" state (`aria-current="page"`).
- ✓ **Sticky header** — slim, stays reachable on long schedules.
- **[new] Skip-to-main link** — first focusable element, visible on focus, jumps past the nav (`App.tsx`, WCAG 2.4.1).
- **[new] Landmark labels** — `<nav aria-label="Primary">`, one `<main id="main">`, `<header>`/`<footer>` (`App.tsx`).
- ✓ **Visual hierarchy & whitespace** — KPI cards → charts → tables; 8pt-ish spacing via Tailwind scale.

## Forms, Input & Data Entry
- **[new] Real label↔control association** — `Field` generates a `useId`, renders `<label htmlFor>`, and shares it via context so every `Input`/`Select` gets a real `id`/`name` (`src/components/ui.tsx`, WCAG 3.3.2). Cleared the browser autofill warning.
- **[new] Inline validation** — `Field error=…` sets `aria-invalid`, `aria-describedby`, a red border, and a plain-language message. Applied to principal (`> 0`) and allocation (`≥ 0`) (`LoanSetup.tsx`, `People.tsx`, WCAG 3.3.1).
- **[new] Correct input modes** — `inputMode="decimal"` on money/rate fields for the right mobile keyboard.
- ✓ **Single-column field layout**, top-aligned labels, format hints (`hint=` on `Field`).
- ✓ **Smart defaults** — realistic ₹50L 3-person seed; today's date prefilled.
- ✓ **Date pickers allow text entry** — native `<input type="date">` (keyboard-operable, WCAG 2.1.1).
- **[new] Destructive-action confirmation done right** — inline two-step confirm with the verb + name ("Remove Asha"), not a generic "Yes/OK"; paired with **undo** (see below) (`People.tsx`).

## Feedback & System State
- **[new] Toasts / snackbars** — transient, non-blocking confirmations for save/export/import/apply, mirrored to an `aria-live="polite"` region; actionable toasts get longer dwell (`src/components/Toasts.tsx`, `src/store/useUiStore.ts`).
- **[new] Undo (forgiveness over confirm)** — removing a person shows "Removed X · Undo"; `restoreBorrower` re-inserts at the original index (`useLoanStore.ts`, `People.tsx`).
- **[new] Error-as-toast, not `alert()`** — invalid JSON import now surfaces a non-blocking error toast with shape validation (`Reports.tsx`).
- ✓ **Empty states** — People, Payments, Import, History teach the next action.
- ✓ **Persistent banners** — allocation gap, reconciliation drift, negative-amortization warnings (`Dashboard.tsx`, `People.tsx`).
- ✓ **Status visibility / never change silently** — allocation reconciliation surfaced; warnings listed.
- **[new] Progressive disclosure with ARIA** — schedule worksheet rows use `aria-expanded` (`ScheduleTable.tsx`).

## Visual Design, Theming & Design Systems
- ✓ **Token-swap theming** — Catppuccin Latte/Mocha via CSS custom properties; semantic tokens (`--color-primary`, `--color-principal`, `--color-interest`, `--color-positive/negative/warning`) in `src/index.css`.
- **[new] Honor OS colour-scheme on first load** — initial theme from `prefers-color-scheme` before any stored preference (`useLoanStore.ts`).
- ✓ **Semantic colour, never colour alone** — interest/principal also distinguished by label, position, and tags; warnings carry text + icon.
- ✓ **Tabular figures** for all money (`.tnum`); border-radius + elevation token set.

## Motion & Micro-interactions
- **[new] `prefers-reduced-motion` honored** — global rule near-zeroes transitions/animations/scroll-behaviour (`src/index.css`, WCAG C39).
- ✓ **Hover/press feedback** on buttons, rows, tabs; transitions kept short and on `opacity`/`color`/`transform`.

## Accessibility, Responsiveness & Performance UX
- **[new] Focus management on view change** — `<main tabIndex=-1>` receives focus on tab change so keyboard/SR users land on new content (`App.tsx`, WCAG 2.4.3).
- ✓ **Visible focus indicator** — `:focus-visible` ring at 3:1 (`index.css`); never `outline:none` without replacement.
- **[new] Accessible names everywhere** — icon-only buttons (theme toggle, dismiss, palette) and bare timeline inputs got `aria-label`s.
- ✓ **Semantic HTML first** — native `<button>`/`<a>`/`<table>`/landmarks; ARIA only to augment.
- ✓ **Charts have text alternatives** — every chart pairs with KPI cards / a full schedule table conveying the same numbers.
- ✓ **Locale-aware formatting** — `Intl.NumberFormat('en-IN')` for INR lakh/crore (`engine/money.ts`).
- ✓ **Responsive grids** — `grid-cols-*` collapse to one column on mobile; nav scrolls horizontally; schedule table scrolls within a bounded region.

## Common UI Components
- **[new] Command palette (⌘K / Ctrl-K)** — fuzzy nav over all pages + quick actions (toggle theme, export backup, reset); arrow/Enter/Esc, focus-trapped dialog, backed by the visible "Search ⌘K" affordance (`src/components/CommandPalette.tsx`). Hick's/Doherty-friendly power-user path.
- ✓ **Cards, data table, tabs, chips/tags, badges, banners, modal dialog** — across the app.
- ✓ **Data-table best practice** — frozen header, right-aligned numbers, highlighted rate-change rows, row-level disclosure instead of edit-in-modal.

## Onboarding & Engagement
- ✓ **Empty-state-as-onboarding** — Import/People/Payments explain the next step.
- ✓ **Milestones (gamification, restrained)** — progress markers (25/50/75/100% principal, crossover, per-person halfway) layered on already-valuable data; opt-in browser Notification (`Milestones.tsx`).
- ✓ **Good defaults** — most users never need to touch Loan Setup to see a working example.

## Cross-cutting Laws of UX
- **Jakob's Law** — conventional tabs, ⌘K, toasts, date pickers.
- **Hick's Law** — segmented controls for allocation mode / reset strategy instead of long menus.
- **Fitts's Law** — generously sized primary buttons; padded hit areas.
- **Doherty Threshold** — all compute is local/synchronous and well under ~400ms; pure-engine memoized via `useMemo`.
- **Goal-Gradient / Zeigarnik** — milestone progress + crossover marker.

---

## Known follow-ups (not yet applied)
- Card-per-row schedule on phones (currently a bounded horizontal scroll) — checklist "avoid horizontal-scroll tables on mobile".
- Code-split export/PDF libraries to trim the ~1.4 MB main chunk (perceived-performance / lazy-loading).
- Wire recorded payments into the as-of rollups (currently projection-based).

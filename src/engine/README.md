# Calculation Engine

Pure, decimal-safe, framework-free financial core. **The UI never does money math** — it imports only from `src/engine`. Every function is a pure function of its inputs, which is what makes the on-screen numbers auditable and the engine unit-testable.

## Files

| File | Responsibility |
|------|----------------|
| `money.ts` | Decimal-safe math (decimal.js, ROUND_HALF_UP), paise rounding, INR formatting |
| `dates.ts` | ISO date helpers — add months (end-of-month clamp), day counts |
| `types.ts` | Domain model (MasterLoan, Borrower, RateChange, Schedule, LoanResult…) |
| `emi.ts` | Reducing-balance EMI formula + `nper` (solve tenure) + neg-am check |
| `amortize.ts` | Variable-rate, period-by-period schedule with resets & prepayments |
| `flat.ts` | Flat-interest schedule (the "both" option) |
| `allocation.ts` | Split master principal by amount / percent / shares + reconcile |
| `prepayment.ts` | Lump-prepayment simulation → interest saved, months saved |
| `loan.ts` | Top-level: per-person + consolidated schedules, rollups, reconciliation |

## Key formulas

**EMI (reducing balance)** — used by every major Indian bank:

```
EMI = [P · i · (1+i)^n] / [(1+i)^n − 1]      i = annual / 12 / 100
```

**Keep EMI, solve new tenure** at a rate reset:

```
n = −ln(1 − B·i / EMI) / ln(1+i)             (rounded up)
```

**Final installment (residual)** so the balance closes to exactly ₹0.00:

```
Last EMI = opening balance × (1 + i)
```

## Variable-rate convention (configured for this build)

- **Default reset strategy: `TENURE`** — keep the EMI, extend the tenure. `EMI` keeps tenure and raises the installment; `COMBINATION` extends tenure up to `maxTenureMonths`, then raises EMI.
- **Negative-amortization guard:** if a fixed EMI ≤ the period interest, the balance would grow. The engine refuses to do that — it raises the EMI instead and records a warning (per RBI floating-rate rules).
- **Day count:** `monthly` reducing (default) or `daily365` (SBI-style, actual days / 365).
- **Interest type:** `reducing` (default) or `flat`.

## Rounding discipline

Interest is rounded to paise **first** each period; principal is derived from it (`principal = EMI − interest`). Totals are summed with full decimal precision then rounded once, so a long schedule still reconciles to the paisa.

## Reconciliation invariant

The sum of every person's outstanding balance must equal the master loan's outstanding balance. `computeLoan` builds a reference schedule for the whole loan and compares it to the sum of the per-person schedules; any drift (pure rounding residue) is surfaced in `result.reconciliation`.

## Validate against a real bank schedule

1. Get a sanctioned amortization sheet from the bank PDF.
2. Build a single-borrower `MasterLoan` with the same principal, rate timeline, and tenure.
3. Compare `amortize(...).rows` against the bank's row-by-row EMI / interest / principal / balance.
4. Differences should be ≤ ₹1 (rounding mode). If larger, check the day-count setting (monthly vs daily/365).

## Tests

`src/engine/engine.test.ts` (Vitest) covers the EMI formula against the known 1L @ 12% / 12m figure, variable-rate tenure-extension and EMI-recompute, the negative-amortization guard, zero-interest and tenure-of-1 edges, allocation exactness, the 3-person / 2-reset reconciliation acceptance check, and prepayment savings.

```bash
npm test
```

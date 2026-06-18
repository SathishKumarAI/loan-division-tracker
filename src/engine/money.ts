/**
 * Decimal-safe money math.
 *
 * Never use raw JS floating point for money — over hundreds of amortization
 * rows the error accumulates and the schedule fails to reconcile. All interest
 * and principal math runs through decimal.js with an explicit ROUND_HALF_UP
 * mode (the standard financial rounding), and money is rounded to 2 decimals
 * (paise) at each period boundary.
 */
import Decimal from 'decimal.js'

// High internal precision; explicit half-up rounding for all money.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

export type DecimalInput = Decimal.Value

/** Wrap any value as a Decimal. */
export const D = (v: DecimalInput): Decimal => new Decimal(v)

/** Round to 2 decimal places (paise), half-up. Returns a Decimal. */
export const round2 = (v: DecimalInput): Decimal =>
  new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)

/** Round to 2 dp and return a plain number for display/output rows. */
export const money = (v: DecimalInput): number => round2(v).toNumber()

/** Sum a list of values with full decimal precision, then round to paise. */
export const sumMoney = (vals: DecimalInput[]): number =>
  money(vals.reduce<Decimal>((acc, v) => acc.plus(v), new Decimal(0)))

/** Annual % rate → monthly fractional rate (annual / 12 / 100). */
export const monthlyRate = (annualPct: DecimalInput): Decimal =>
  new Decimal(annualPct).div(1200)

/**
 * Format a number as INR currency (en-IN, lakh/crore grouping).
 * `paise` controls whether the 2 decimal places are shown.
 */
export const formatINR = (v: number, paise = true): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: paise ? 2 : 0,
    maximumFractionDigits: paise ? 2 : 0,
  }).format(v)

/** Format a number with en-IN grouping, no currency symbol. */
export const formatNum = (v: number, dp = 2): string =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(v)

/**
 * Core reducing-balance EMI math — the formulas every major Indian bank uses.
 * Pure functions over Decimal; no rounding here except where noted, so callers
 * control paise rounding at period boundaries.
 */
import { D, Decimal } from './money'
import type { DecimalInput } from './money'

/**
 * Equated Monthly Installment for reducing-balance interest.
 *
 *   EMI = [P · i · (1+i)^n] / [(1+i)^n − 1]
 *
 * @param principal outstanding principal P
 * @param i         monthly fractional rate (annual/12/100)
 * @param n         number of remaining installments
 */
export const emi = (
  principal: DecimalInput,
  i: DecimalInput,
  n: number,
): Decimal => {
  const P = D(principal)
  const rate = D(i)
  if (n <= 0) return D(0)
  // Zero-interest period: EMI is straight-line principal.
  if (rate.isZero()) return P.div(n)
  const onePlus = rate.plus(1)
  const pow = onePlus.pow(n)
  return P.times(rate).times(pow).div(pow.minus(1))
}

/**
 * Remaining installments needed to clear balance B at monthly rate i with a
 * fixed EMI:
 *
 *   n = −ln(1 − B·i / EMI) / ln(1+i)
 *
 * Returns a non-rounded count; callers typically Math.ceil it. Throws if the
 * EMI cannot service the interest (would cause negative amortization).
 */
export const nper = (
  balance: DecimalInput,
  i: DecimalInput,
  emiAmount: DecimalInput,
): number => {
  const B = D(balance)
  const rate = D(i)
  const E = D(emiAmount)
  if (rate.isZero()) return B.div(E).toNumber()
  const interest = B.times(rate)
  if (E.lte(interest)) {
    throw new Error('NEGATIVE_AMORTIZATION')
  }
  // 1 − B·i/EMI, computed in JS floats only for the logarithm (safe: ratio < 1).
  const ratio = 1 - B.times(rate).div(E).toNumber()
  return -Math.log(ratio) / Math.log(1 + rate.toNumber())
}

/** True if a fixed EMI would not cover the period interest on balance B. */
export const causesNegativeAmortization = (
  balance: DecimalInput,
  i: DecimalInput,
  emiAmount: DecimalInput,
): boolean => D(emiAmount).lte(D(balance).times(D(i)))

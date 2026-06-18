/**
 * Prepayment simulation — quantify the interest saved by a lump part-payment,
 * comparing the baseline schedule against the schedule with the prepayment
 * folded in, under either the reduce-tenure or reduce-EMI strategy.
 */
import { D, money } from './money'
import { amortize } from './amortize'
import type { AmortizeInput, Prepayment } from './amortize'
import type { Schedule } from './types'

export interface PrepaymentResult {
  baseline: Schedule
  modified: Schedule
  interestSaved: number
  monthsSaved: number
  newEmi: number
  newTenureMonths: number
}

export function simulatePrepayment(
  base: AmortizeInput,
  prepayment: Prepayment,
): PrepaymentResult {
  const baseline = amortize({ ...base, prepayments: [] })
  const modified = amortize({
    ...base,
    prepayments: [...(base.prepayments ?? []), prepayment],
  })
  // The installment that absorbs the lump has its EMI inflated by the prepaid
  // amount (emi = regular EMI + lump). The *new steady-state* EMI is the next
  // regular installment after it, so report that.
  const foldIdx = modified.rows.findIndex((r) => r.dueDate >= prepayment.date)
  const steady =
    (foldIdx >= 0 ? modified.rows.slice(foldIdx + 1) : modified.rows).find((r) => !r.isFinal) ??
    modified.rows[foldIdx] ??
    modified.rows[0]

  return {
    baseline,
    modified,
    interestSaved: money(D(baseline.totalInterest).minus(modified.totalInterest)),
    monthsSaved: baseline.actualTenureMonths - modified.actualTenureMonths,
    newEmi: steady?.emi ?? modified.firstEmi,
    newTenureMonths: modified.actualTenureMonths,
  }
}

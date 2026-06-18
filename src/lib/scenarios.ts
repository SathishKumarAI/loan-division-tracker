/** What-if scenario builder — rate shocks and reset-strategy comparison. */
import { computeLoan } from '../engine'
import type { MasterLoan, Borrower, ResetStrategy } from '../engine'

export interface ScenarioSummary {
  label: string
  strategy: ResetStrategy
  shockPct: number
  totalInterest: number
  totalPayable: number
  tenureMonths: number
  firstEmi: number
}

/** Apply a uniform shock (percentage points) to every rate in the timeline. */
function shockLoan(loan: MasterLoan, shockPct: number, strategy: ResetStrategy): MasterLoan {
  return {
    ...loan,
    resetStrategy: strategy,
    rateTimeline: loan.rateTimeline.map((r) => ({
      ...r,
      annualRatePct: Math.max(0, +(r.annualRatePct + shockPct).toFixed(3)),
    })),
  }
}

export function computeScenario(
  loan: MasterLoan,
  borrowers: Borrower[],
  asOf: string,
  shockPct: number,
  strategy: ResetStrategy,
  label: string,
): ScenarioSummary {
  const result = computeLoan(shockLoan(loan, shockPct, strategy), borrowers, asOf)
  const c = result.consolidated
  return {
    label,
    strategy,
    shockPct,
    totalInterest: c.totalInterest,
    totalPayable: c.totalPaid,
    tenureMonths: c.actualTenureMonths,
    firstEmi: c.firstEmi,
  }
}

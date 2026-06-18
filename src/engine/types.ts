/**
 * Domain model for the loan-division engine.
 *
 * One master loan is borrowed from a bank and split among several people.
 * Each person repays their share on an EMI (reducing-balance) basis, under a
 * shared variable interest-rate timeline. Everything the engine produces is
 * derived purely from these inputs so the UI can show the math.
 */

/** How the master principal is divided across people. */
export type AllocationMode = 'amount' | 'percent' | 'shares'

/** Interest accrual method. */
export type InterestType = 'reducing' | 'flat'

/** Day-count convention for reducing-balance interest. */
export type DayCount = 'monthly' | 'daily365'

/**
 * What happens to a person's schedule when the rate changes mid-tenure.
 * - TENURE: keep EMI, extend/shorten the number of installments (Indian default)
 * - EMI: keep the tenure, recompute the EMI on the outstanding balance
 * - COMBINATION: extend tenure up to a cap, then raise EMI if the cap is hit
 */
export type ResetStrategy = 'TENURE' | 'EMI' | 'COMBINATION'

/** One entry in the variable-rate timeline. */
export interface RateChange {
  id: string
  /** ISO date (YYYY-MM-DD) this annual rate becomes effective. */
  effectiveDate: string
  /** Annual interest rate, percent (e.g. 8.5). */
  annualRatePct: number
  /** Optional note (e.g. "RBI repo +25bps", parsed from PDF). */
  note?: string
}

/** A person sharing the master loan. */
export interface Borrower {
  id: string
  name: string
  contact?: string
  /**
   * Allocation value, interpreted per the loan's allocationMode:
   * exact rupee amount, a percentage, or a number of shares.
   */
  allocation: number
  /** Optional per-person disbursement date; falls back to the master start. */
  startDate?: string
  /** Optional per-person tenure override (months). */
  tenureMonthsOverride?: number
}

/** A recorded real payment / event against a person's share. */
export type PaymentKind =
  | 'regular'
  | 'partial'
  | 'prepayment'
  | 'foreclosure'
  | 'missed'

export interface Payment {
  id: string
  borrowerId: string
  date: string
  amount: number
  kind: PaymentKind
  /** For prepayment: how to apply the surplus. */
  applyAs?: ResetStrategy
  note?: string
}

/** The master loan configuration. */
export interface MasterLoan {
  principal: number
  startDate: string
  tenureMonths: number
  /** Frequency is monthly for now; kept for future extension. */
  frequency: 'monthly'
  interestType: InterestType
  dayCount: DayCount
  allocationMode: AllocationMode
  /** Default reset strategy applied to every rate change. */
  resetStrategy: ResetStrategy
  /** Cap on total installments for the COMBINATION strategy. */
  maxTenureMonths: number
  rateTimeline: RateChange[]
}

/** One row of an amortization schedule — an accountant's worksheet line. */
export interface ScheduleRow {
  index: number
  dueDate: string
  /** Annual rate active for this period (percent). */
  annualRatePct: number
  monthlyRatePct: number
  openingBalance: number
  emi: number
  interest: number
  principal: number
  closingBalance: number
  /** True when the rate changed at this row (reset event). */
  rateChanged: boolean
  /** True for the final, residual-adjusted installment. */
  isFinal: boolean
  /** Cumulative interest and principal paid through this row. */
  cumulativeInterest: number
  cumulativePrincipal: number
}

/** Per-period audit trace — the inputs and steps behind one row. */
export interface RowTrace {
  index: number
  formula: string
  steps: string[]
}

/** A computed amortization schedule plus its rollups. */
export interface Schedule {
  rows: ScheduleRow[]
  traces: RowTrace[]
  principal: number
  totalInterest: number
  totalPaid: number
  /** Installment count actually used (may differ from requested tenure). */
  actualTenureMonths: number
  /** First installment EMI. */
  firstEmi: number
  /** Index (1-based) where cumulative principal first exceeds interest. */
  crossoverIndex: number | null
  warnings: string[]
}

/** Per-person result. */
export interface BorrowerResult {
  borrower: Borrower
  allocatedPrincipal: number
  schedule: Schedule
}

/** Allocation reconciliation against the master principal. */
export interface AllocationReport {
  allocations: { borrowerId: string; amount: number }[]
  totalAllocated: number
  masterPrincipal: number
  /** master − allocated; non-zero is a gap to warn about. */
  gap: number
  ok: boolean
}

/** Top-level computed result for the whole divided loan. */
export interface LoanResult {
  allocation: AllocationReport
  borrowers: BorrowerResult[]
  /** Consolidated schedule = sum of all per-person rows by installment. */
  consolidated: Schedule
  totals: {
    borrowed: number
    repaid: number
    principalRepaid: number
    interestPaid: number
    outstanding: number
    blendedCurrentRatePct: number
  }
  reconciliation: {
    /** Reference schedule treating the whole loan as one. */
    referenceTotalInterest: number
    sumOfPersonsInterest: number
    /** Absolute drift between the two (rounding residue). */
    drift: number
    ok: boolean
  }
  warnings: string[]
}

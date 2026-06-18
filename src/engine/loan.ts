/**
 * Top-level computation for the whole divided loan.
 *
 * Pulls together allocation, per-person amortization (reducing or flat),
 * a consolidated schedule, headline rollups (as of a reference date), and the
 * reconciliation invariant that the sum of the people must equal the master.
 */
import { D, money, sumMoney, monthlyRate } from './money'
import { cmpISO } from './dates'
import { amortize, activeAnnualRate } from './amortize'
import type { Prepayment } from './amortize'
import { amortizeFlat } from './flat'
import { allocate, reconcileAllocation } from './allocation'
import type {
  MasterLoan,
  Borrower,
  Payment,
  Schedule,
  ScheduleRow,
  RowTrace,
  BorrowerResult,
  LoanResult,
} from './types'

/**
 * Recorded payments that reduce principal beyond the scheduled EMI become
 * prepayment events folded into the amortization. A foreclosure clears the
 * balance (its amount is capped to the outstanding inside the engine). Regular
 * and missed payments don't alter the reducing-balance schedule and are skipped.
 */
function toPrepayments(payments: Payment[], defaultStrategy: 'TENURE' | 'EMI'): Prepayment[] {
  return payments
    .filter((p) => p.kind === 'prepayment' || p.kind === 'partial' || p.kind === 'foreclosure')
    .map((p) => ({
      date: p.date,
      amount: p.kind === 'foreclosure' ? Number.MAX_SAFE_INTEGER : p.amount,
      applyAs: p.applyAs === 'EMI' ? 'EMI' : defaultStrategy,
    }))
}

/** Compute one person's schedule from their allocated principal and payments. */
export function computeBorrowerSchedule(
  loan: MasterLoan,
  borrower: Borrower,
  allocatedPrincipal: number,
  payments: Payment[] = [],
): Schedule {
  const startDate = borrower.startDate ?? loan.startDate
  const tenureMonths = borrower.tenureMonthsOverride ?? loan.tenureMonths

  if (loan.interestType === 'flat') {
    // Flat interest is charged on the original principal, so prepayments can't be
    // folded in the reducing-balance way; flat schedules ignore them.
    return amortizeFlat({
      principal: allocatedPrincipal,
      startDate,
      tenureMonths,
      rateTimeline: loan.rateTimeline,
    })
  }

  const defaultStrategy = loan.resetStrategy === 'EMI' ? 'EMI' : 'TENURE'
  return amortize({
    principal: allocatedPrincipal,
    startDate,
    tenureMonths,
    rateTimeline: loan.rateTimeline,
    resetStrategy: loan.resetStrategy,
    maxTenureMonths: loan.maxTenureMonths,
    dayCount: loan.dayCount,
    prepayments: toPrepayments(payments, defaultStrategy),
  })
}

/** Sum per-person rows into a consolidated schedule (aligned by installment #). */
function consolidate(results: BorrowerResult[]): Schedule {
  const maxLen = Math.max(0, ...results.map((r) => r.schedule.rows.length))
  const rows: ScheduleRow[] = []
  const traces: RowTrace[] = []
  let cumI = D(0)
  let cumP = D(0)

  for (let k = 0; k < maxLen; k++) {
    const parts = results
      .map((r) => ({ name: r.borrower.name, row: r.schedule.rows[k] }))
      .filter((p) => p.row) as { name: string; row: ScheduleRow }[]
    if (parts.length === 0) continue
    const interest = sumMoney(parts.map((p) => p.row.interest))
    const principal = sumMoney(parts.map((p) => p.row.principal))
    cumI = cumI.plus(interest)
    cumP = cumP.plus(principal)
    traces.push({
      index: k + 1,
      formula: 'Consolidated row = sum of every person’s installment for this period',
      steps: [
        `EMI = ${parts.map((p) => `${p.name} ₹${p.row.emi.toFixed(2)}`).join(' + ')}`,
        `Interest = ${parts.map((p) => `₹${p.row.interest.toFixed(2)}`).join(' + ')} = ₹${interest.toFixed(2)}`,
        `Principal = ${parts.map((p) => `₹${p.row.principal.toFixed(2)}`).join(' + ')} = ₹${principal.toFixed(2)}`,
      ],
    })
    rows.push({
      index: k + 1,
      dueDate: parts[0].row.dueDate,
      annualRatePct: parts[0].row.annualRatePct,
      monthlyRatePct: parts[0].row.monthlyRatePct,
      openingBalance: sumMoney(parts.map((p) => p.row.openingBalance)),
      emi: sumMoney(parts.map((p) => p.row.emi)),
      interest,
      principal,
      closingBalance: sumMoney(parts.map((p) => p.row.closingBalance)),
      rateChanged: parts.some((p) => p.row.rateChanged),
      isFinal: parts.every((p) => p.row.isFinal),
      cumulativeInterest: money(cumI),
      cumulativePrincipal: money(cumP),
    })
  }

  const crossover = rows.find((r) => r.principal > r.interest)
  return {
    rows,
    traces,
    principal: sumMoney(results.map((r) => r.schedule.principal)),
    totalInterest: money(cumI),
    totalPaid: money(cumI.plus(cumP)),
    actualTenureMonths: rows.length,
    firstEmi: sumMoney(results.map((r) => r.schedule.firstEmi)),
    crossoverIndex: crossover ? crossover.index : null,
    warnings: [],
  }
}

/** Per-person paid-to-date / outstanding snapshot as of a reference date. */
function snapshot(schedule: Schedule, asOf: string) {
  let interestPaid = D(0)
  let principalPaid = D(0)
  let outstanding = D(schedule.principal)
  for (const row of schedule.rows) {
    if (cmpISO(row.dueDate, asOf) <= 0) {
      interestPaid = interestPaid.plus(row.interest)
      principalPaid = principalPaid.plus(row.principal)
      outstanding = D(row.closingBalance)
    } else {
      outstanding = D(row.openingBalance)
      break
    }
  }
  return {
    interestPaid: money(interestPaid),
    principalPaid: money(principalPaid),
    outstanding: money(outstanding),
  }
}

/**
 * Compute the full divided-loan result.
 * @param asOf reference ISO date for "paid to date" rollups (defaults provided by caller)
 */
export function computeLoan(
  loan: MasterLoan,
  borrowers: Borrower[],
  asOf: string,
  payments: Payment[] = [],
): LoanResult {
  const allocations = allocate(borrowers, loan.principal, loan.allocationMode)
  const allocReport = reconcileAllocation(allocations, loan.principal)
  const allocMap = new Map(allocations.map((a) => [a.borrowerId, a.amount]))
  const paymentsByBorrower = new Map<string, Payment[]>()
  for (const p of payments) {
    const arr = paymentsByBorrower.get(p.borrowerId) ?? []
    arr.push(p)
    paymentsByBorrower.set(p.borrowerId, arr)
  }

  const results: BorrowerResult[] = borrowers.map((b) => {
    const allocatedPrincipal = allocMap.get(b.id) ?? 0
    return {
      borrower: b,
      allocatedPrincipal,
      schedule: computeBorrowerSchedule(loan, b, allocatedPrincipal, paymentsByBorrower.get(b.id) ?? []),
    }
  })

  const consolidated = consolidate(results)

  // Headline rollups as of the reference date.
  let interestPaid = D(0)
  let principalPaid = D(0)
  let outstanding = D(0)
  let rateWeighted = D(0)
  for (const r of results) {
    const s = snapshot(r.schedule, asOf)
    interestPaid = interestPaid.plus(s.interestPaid)
    principalPaid = principalPaid.plus(s.principalPaid)
    outstanding = outstanding.plus(s.outstanding)
    const startDate = r.borrower.startDate ?? loan.startDate
    const rate = activeAnnualRate(loan.rateTimeline, asOf < startDate ? startDate : asOf, loan.rateTimeline[0]?.annualRatePct ?? 0)
    rateWeighted = rateWeighted.plus(D(s.outstanding).times(rate))
  }
  const blended = outstanding.gt(0) ? rateWeighted.div(outstanding).toNumber() : 0

  // Reconciliation: per-person sum vs the loan treated as a single reference.
  const referenceSchedule =
    loan.interestType === 'flat'
      ? amortizeFlat({
          principal: loan.principal,
          startDate: loan.startDate,
          tenureMonths: loan.tenureMonths,
          rateTimeline: loan.rateTimeline,
        })
      : amortize({
          principal: loan.principal,
          startDate: loan.startDate,
          tenureMonths: loan.tenureMonths,
          rateTimeline: loan.rateTimeline,
          resetStrategy: loan.resetStrategy,
          maxTenureMonths: loan.maxTenureMonths,
          dayCount: loan.dayCount,
        })
  const sumOfPersonsInterest = sumMoney(results.map((r) => r.schedule.totalInterest))
  const drift = money(D(sumOfPersonsInterest).minus(referenceSchedule.totalInterest))

  const warnings: string[] = []
  if (!allocReport.ok) {
    warnings.push(
      allocReport.gap > 0
        ? `Allocations are short of the principal by ₹${allocReport.gap.toFixed(2)}.`
        : `Allocations exceed the principal by ₹${Math.abs(allocReport.gap).toFixed(2)}.`,
    )
  }
  results.forEach((r) =>
    r.schedule.warnings.forEach((w) => warnings.push(`${r.borrower.name}: ${w}`)),
  )

  return {
    allocation: allocReport,
    borrowers: results,
    consolidated,
    totals: {
      borrowed: money(D(allocReport.totalAllocated)),
      repaid: money(interestPaid.plus(principalPaid)),
      principalRepaid: money(principalPaid),
      interestPaid: money(interestPaid),
      outstanding: money(outstanding),
      blendedCurrentRatePct: blended,
    },
    reconciliation: {
      referenceTotalInterest: referenceSchedule.totalInterest,
      sumOfPersonsInterest,
      drift,
      // Drift is pure rounding residue; tolerate a few rupees across many people.
      ok: Math.abs(drift) <= Math.max(1, results.length),
    },
    warnings,
  }
}

/** Monthly fractional rate helper re-exported for UI convenience. */
export { monthlyRate }

/**
 * Variable-rate, reducing-balance amortization — the engine's differentiator.
 *
 * The schedule is simulated installment by installment so every rate reset can
 * recompute forward from the actual outstanding balance, exactly as a bank
 * does. Each period rounds interest to paise first, then derives principal, and
 * the final installment is a residual so the balance closes to exactly zero.
 */
import { D, Decimal, round2, money, monthlyRate } from './money'
import { emi, nper, causesNegativeAmortization } from './emi'
import { addMonths, daysBetween, cmpISO } from './dates'
import type {
  RateChange,
  ResetStrategy,
  DayCount,
  ScheduleRow,
  RowTrace,
  Schedule,
} from './types'

/** A lump prepayment applied during the schedule. */
export interface Prepayment {
  /** ISO date — applied at the first installment on/after this date. */
  date: string
  amount: number
  /** Reduce tenure (keep EMI) or reduce EMI (keep tenure). */
  applyAs: 'TENURE' | 'EMI'
}

export interface AmortizeInput {
  principal: number
  startDate: string
  tenureMonths: number
  rateTimeline: RateChange[]
  resetStrategy: ResetStrategy
  /** Cap for the COMBINATION strategy (max total installments). */
  maxTenureMonths: number
  dayCount: DayCount
  /** Optional lump prepayments to fold into the schedule. */
  prepayments?: Prepayment[]
}

/** Hard stop so a misconfigured loan can never loop forever. */
const MAX_INSTALLMENTS = 1200

/** Annual % rate effective on or before a given ISO date (latest wins). */
export const activeAnnualRate = (
  timeline: RateChange[],
  onDate: string,
  fallback: number,
): number => {
  let rate = fallback
  let best = ''
  for (const rc of timeline) {
    if (cmpISO(rc.effectiveDate, onDate) <= 0) {
      if (best === '' || cmpISO(rc.effectiveDate, best) >= 0) {
        best = rc.effectiveDate
        rate = rc.annualRatePct
      }
    }
  }
  return rate
}

/** Periodic (monthly) interest on a balance, honouring the day-count rule. */
const periodInterest = (
  balance: Decimal,
  annualRatePct: number,
  dayCount: DayCount,
  prevDate: string,
  dueDate: string,
): Decimal => {
  if (dayCount === 'daily365') {
    const days = daysBetween(prevDate, dueDate)
    return balance.times(annualRatePct).div(100).times(days).div(365)
  }
  // monthly reducing: balance × annual/12/100
  return balance.times(monthlyRate(annualRatePct))
}

/**
 * Build a full reducing-balance schedule under a variable-rate timeline.
 */
export function amortize(input: AmortizeInput): Schedule {
  const {
    principal,
    startDate,
    tenureMonths,
    rateTimeline,
    resetStrategy,
    maxTenureMonths,
    dayCount,
    prepayments = [],
  } = input

  const pending = [...prepayments].sort((a, b) => cmpISO(a.date, b.date))
  const rows: ScheduleRow[] = []
  const traces: RowTrace[] = []
  const warnings: string[] = []

  if (principal <= 0 || tenureMonths <= 0) {
    return emptySchedule(principal, warnings)
  }

  const firstRate = activeAnnualRate(rateTimeline, startDate, fallbackRate(rateTimeline))
  let balance = D(principal)
  let remaining = tenureMonths
  let i = monthlyRate(firstRate)
  let currentEmi = round2(emi(balance, i, remaining))
  let prevAnnual = firstRate
  let prevDate = startDate
  let cumI = D(0)
  let cumP = D(0)
  const firstEmi = currentEmi.toNumber()

  for (let k = 1; k <= MAX_INSTALLMENTS; k++) {
    const dueDate = addMonths(startDate, k)
    const annual = activeAnnualRate(rateTimeline, dueDate, firstRate)
    let rateChanged = false

    if (annual !== prevAnnual && balance.gt(0)) {
      rateChanged = true
      i = monthlyRate(annual)
      const recomputed = applyReset({
        strategy: resetStrategy,
        balance,
        i,
        remaining,
        currentEmi,
        maxTenure: maxTenureMonths,
        installmentsDone: k - 1,
        warnings,
        atDate: dueDate,
      })
      currentEmi = recomputed.emi
      remaining = recomputed.remaining
    }

    const interestRaw = periodInterest(balance, annual, dayCount, prevDate, dueDate)
    const interest = round2(interestRaw)

    // Decide whether this is the final, residual installment.
    const principalIfRegular = currentEmi.minus(interest)
    const isFinal =
      remaining <= 1 ||
      principalIfRegular.gte(balance) ||
      k >= MAX_INSTALLMENTS

    let principalPart: Decimal
    let emiPart: Decimal
    if (isFinal) {
      // Close the balance exactly: last EMI = opening × (1 + i) for the period.
      principalPart = balance
      emiPart = round2(balance.plus(interest))
    } else {
      principalPart = principalIfRegular
      emiPart = currentEmi
    }

    let closing = isFinal ? D(0) : balance.minus(principalPart)

    // Fold in any prepayments effective on/before this installment's due date.
    let prepaidThisRow = D(0)
    while (!isFinal && pending.length && cmpISO(pending[0].date, dueDate) <= 0) {
      const pp = pending.shift()!
      const applied = Decimal.min(D(pp.amount), closing)
      closing = closing.minus(applied)
      prepaidThisRow = prepaidThisRow.plus(applied)
      // Recompute forward per the chosen prepayment strategy.
      if (closing.gt(0)) {
        if (pp.applyAs === 'TENURE') {
          // keep EMI, fewer installments — remaining recomputed lazily by final-row guard
          remaining = Math.max(1, Math.ceil(nper(closing, i, currentEmi)))
        } else {
          currentEmi = round2(emi(closing, i, Math.max(1, remaining - 1)))
        }
      }
    }
    const principalTotal = principalPart.plus(prepaidThisRow)
    const emiTotal = emiPart.plus(prepaidThisRow)

    cumI = cumI.plus(interest)
    cumP = cumP.plus(principalTotal)

    rows.push({
      index: k,
      dueDate,
      annualRatePct: annual,
      monthlyRatePct: monthlyRate(annual).times(100).toNumber(),
      openingBalance: money(balance),
      emi: money(emiTotal),
      interest: money(interest),
      principal: money(principalTotal),
      closingBalance: money(closing),
      rateChanged,
      isFinal,
      cumulativeInterest: money(cumI),
      cumulativePrincipal: money(cumP),
    })

    traces.push(
      buildTrace(k, {
        balance,
        annual,
        i,
        dayCount,
        interest,
        emiPart,
        principalPart,
        closing,
        isFinal,
        rateChanged,
      }),
    )

    balance = closing
    prevAnnual = annual
    prevDate = dueDate
    remaining -= 1
    if (balance.lte(0)) break
  }

  if (balance.gt(0)) {
    warnings.push(
      `Schedule did not close within ${MAX_INSTALLMENTS} installments — check rate/EMI inputs.`,
    )
  }

  const crossoverIndex = findCrossover(rows)

  return {
    rows,
    traces,
    principal: money(D(principal)),
    totalInterest: money(cumI),
    totalPaid: money(cumI.plus(cumP)),
    actualTenureMonths: rows.length,
    firstEmi,
    crossoverIndex,
    warnings,
  }
}

interface ResetArgs {
  strategy: ResetStrategy
  balance: Decimal
  i: Decimal
  remaining: number
  currentEmi: Decimal
  maxTenure: number
  installmentsDone: number
  warnings: string[]
  atDate: string
}

/** Recompute EMI and remaining installments at a rate reset, per strategy. */
function applyReset(a: ResetArgs): { emi: Decimal; remaining: number } {
  const { strategy, balance, i, remaining, currentEmi, maxTenure, installmentsDone } = a

  if (strategy === 'EMI') {
    return { emi: round2(emi(balance, i, remaining)), remaining }
  }

  // TENURE / COMBINATION both try to keep the EMI and extend tenure first.
  if (causesNegativeAmortization(balance, i, currentEmi)) {
    a.warnings.push(
      `Rate rise on ${a.atDate}: EMI ₹${currentEmi.toFixed(2)} cannot cover interest ` +
        `(₹${balance.times(i).toFixed(2)}). Raised EMI to avoid negative amortization.`,
    )
    return { emi: round2(emi(balance, i, remaining)), remaining }
  }

  let newRemaining = Math.ceil(nper(balance, i, currentEmi))
  const totalWouldBe = installmentsDone + newRemaining

  if (strategy === 'TENURE') {
    return { emi: currentEmi, remaining: newRemaining }
  }

  // COMBINATION: extend tenure up to the cap, then raise EMI to fit the cap.
  if (totalWouldBe > maxTenure) {
    newRemaining = Math.max(1, maxTenure - installmentsDone)
    a.warnings.push(
      `Rate rise on ${a.atDate}: tenure cap (${maxTenure}) hit — EMI raised to keep within cap.`,
    )
    return { emi: round2(emi(balance, i, newRemaining)), remaining: newRemaining }
  }
  return { emi: currentEmi, remaining: newRemaining }
}

interface TraceCtx {
  balance: Decimal
  annual: number
  i: Decimal
  dayCount: DayCount
  interest: Decimal
  emiPart: Decimal
  principalPart: Decimal
  closing: Decimal
  isFinal: boolean
  rateChanged: boolean
}

function buildTrace(index: number, c: TraceCtx): RowTrace {
  const steps: string[] = []
  if (c.rateChanged) steps.push(`Rate reset → ${c.annual}% p.a. applied to outstanding balance.`)
  if (c.dayCount === 'daily365') {
    steps.push(
      `Interest = balance × annual%/100 × days/365 = ₹${c.balance.toFixed(2)} × ${c.annual}%/100 × days/365 = ₹${c.interest.toFixed(2)}`,
    )
  } else {
    steps.push(
      `Interest = balance × (annual%/12/100) = ₹${c.balance.toFixed(2)} × ${(c.annual / 12).toFixed(4)}% = ₹${c.interest.toFixed(2)}`,
    )
  }
  if (c.isFinal) {
    steps.push(
      `Final installment (residual): EMI = opening × (1 + i) = ₹${c.emiPart.toFixed(2)}; principal = full opening balance ₹${c.principalPart.toFixed(2)}.`,
    )
    steps.push('Closing balance forced to ₹0.00.')
  } else {
    steps.push(`Principal = EMI − interest = ₹${c.emiPart.toFixed(2)} − ₹${c.interest.toFixed(2)} = ₹${c.principalPart.toFixed(2)}`)
    steps.push(`Closing balance = opening − principal = ₹${c.balance.toFixed(2)} − ₹${c.principalPart.toFixed(2)} = ₹${c.closing.toFixed(2)}`)
  }
  return {
    index,
    formula: c.isFinal
      ? 'Last EMI = opening balance × (1 + monthly rate)'
      : 'EMI = [P·i·(1+i)^n] / [(1+i)^n − 1]; interest = balance·i; principal = EMI − interest',
    steps,
  }
}

function findCrossover(rows: ScheduleRow[]): number | null {
  // First installment whose principal portion exceeds its interest portion —
  // the point from which each EMI repays more principal than interest.
  for (const r of rows) {
    if (r.principal > r.interest) return r.index
  }
  return null
}

const fallbackRate = (timeline: RateChange[]): number =>
  timeline.length ? timeline[0].annualRatePct : 0

function emptySchedule(principal: number, warnings: string[]): Schedule {
  return {
    rows: [],
    traces: [],
    principal: money(D(principal)),
    totalInterest: 0,
    totalPaid: 0,
    actualTenureMonths: 0,
    firstEmi: 0,
    crossoverIndex: null,
    warnings,
  }
}

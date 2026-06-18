/**
 * Flat-rate interest schedule (the "both" option from the spec).
 *
 * Flat interest is charged on the ORIGINAL principal for the whole tenure, so
 * every installment carries the same interest — unlike reducing balance. Uses
 * the rate active at the start date; variable-rate resets do not apply to flat
 * loans (a warning is emitted if the timeline has later changes).
 */
import { D, round2, money, sumMoney } from './money'
import { addMonths, cmpISO } from './dates'
import { activeAnnualRate } from './amortize'
import type { RateChange, ScheduleRow, RowTrace, Schedule } from './types'

export interface FlatInput {
  principal: number
  startDate: string
  tenureMonths: number
  rateTimeline: RateChange[]
}

export function amortizeFlat(input: FlatInput): Schedule {
  const { principal, startDate, tenureMonths, rateTimeline } = input
  const warnings: string[] = []
  const rows: ScheduleRow[] = []
  const traces: RowTrace[] = []

  const annual = activeAnnualRate(
    rateTimeline,
    startDate,
    rateTimeline.length ? rateTimeline[0].annualRatePct : 0,
  )
  if (rateTimeline.some((r) => cmpISO(r.effectiveDate, startDate) > 0)) {
    warnings.push('Flat interest ignores later rate changes — only the start rate is used.')
  }

  const P = D(principal)
  const years = D(tenureMonths).div(12)
  const totalInterest = P.times(annual).div(100).times(years)
  const perMonthInterest = round2(totalInterest.div(tenureMonths))
  const perMonthPrincipal = round2(P.div(tenureMonths))
  const emiVal = round2(perMonthInterest.plus(perMonthPrincipal))

  let balance = P
  let cumI = D(0)
  let cumP = D(0)

  for (let k = 1; k <= tenureMonths; k++) {
    const isFinal = k === tenureMonths
    const principalPart = isFinal ? balance : perMonthPrincipal
    const interest = perMonthInterest
    const emiPart = round2(principalPart.plus(interest))
    const closing = isFinal ? D(0) : balance.minus(principalPart)
    cumI = cumI.plus(interest)
    cumP = cumP.plus(principalPart)

    rows.push({
      index: k,
      dueDate: addMonths(startDate, k),
      annualRatePct: annual,
      monthlyRatePct: 0,
      openingBalance: money(balance),
      emi: money(emiPart),
      interest: money(interest),
      principal: money(principalPart),
      closingBalance: money(closing),
      rateChanged: false,
      isFinal,
      cumulativeInterest: money(cumI),
      cumulativePrincipal: money(cumP),
    })
    traces.push({
      index: k,
      formula: 'Flat: total interest = P × rate% × years; per-EMI interest = total / n',
      steps: [
        `Total interest = ₹${P.toFixed(2)} × ${annual}% × ${years.toFixed(3)}yr = ₹${totalInterest.toFixed(2)}`,
        `Per-EMI interest = ₹${totalInterest.toFixed(2)} / ${tenureMonths} = ₹${perMonthInterest.toFixed(2)}`,
        `EMI = principal/n + interest/n = ₹${perMonthPrincipal.toFixed(2)} + ₹${perMonthInterest.toFixed(2)} = ₹${emiVal.toFixed(2)}`,
      ],
    })
    balance = closing
  }

  const crossover = rows.find((r) => r.cumulativePrincipal > r.cumulativeInterest)

  return {
    rows,
    traces,
    principal: money(P),
    totalInterest: sumMoney(rows.map((r) => r.interest)),
    totalPaid: sumMoney(rows.map((r) => r.emi)),
    actualTenureMonths: rows.length,
    firstEmi: emiVal.toNumber(),
    crossoverIndex: crossover ? crossover.index : null,
    warnings,
  }
}

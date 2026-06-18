/** Derive milestone events (achieved / upcoming) from a computed LoanResult. */
import type { LoanResult, Schedule } from '../engine'

export interface Milestone {
  title: string
  detail: string
  date: string | null
  status: 'achieved' | 'upcoming'
}

/** Date of the installment where cumulative principal first reaches a fraction. */
function principalFractionDate(schedule: Schedule, fraction: number): string | null {
  const target = schedule.principal * fraction
  const row = schedule.rows.find((r) => r.cumulativePrincipal >= target)
  return row ? row.dueDate : null
}

export function deriveMilestones(result: LoanResult, asOf: string): Milestone[] {
  const out: Milestone[] = []
  const c = result.consolidated
  const mark = (title: string, detail: string, date: string | null) => {
    if (!date) return
    out.push({ title, detail, date, status: date <= asOf ? 'achieved' : 'upcoming' })
  }

  // Overall principal-repayment milestones.
  for (const pct of [0.25, 0.5, 0.75, 1]) {
    mark(
      `${pct * 100}% principal repaid`,
      'Across all people, consolidated',
      principalFractionDate(c, pct === 1 ? 0.999999 : pct),
    )
  }

  // Crossover: each EMI starts repaying more principal than interest.
  if (c.crossoverIndex) {
    const row = c.rows[c.crossoverIndex - 1]
    mark('Crossover point', 'Each EMI now repays more principal than interest', row.dueDate)
  }

  // Per-person halfway points.
  for (const b of result.borrowers) {
    mark(`${b.borrower.name} halfway`, '50% of their share repaid', principalFractionDate(b.schedule, 0.5))
  }

  // Sort by date, achieved first within each date.
  return out.sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0))
}

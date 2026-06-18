import { useLoanResult } from '../lib/useLoanResult'
import { useLoanStore } from '../store/useLoanStore'
import { KpiCard } from '../components/KpiCard'
import { Card, Banner, Field, Input } from '../components/ui'
import {
  BalanceChart,
  PrincipalInterestPie,
  CrossoverChart,
  PerPersonBars,
} from '../components/charts'
import { Milestones } from '../components/Milestones'
import { formatINR } from '../engine'
import { formatINRCompact, formatPct, formatMonthYear } from '../lib/format'

export function Dashboard() {
  const result = useLoanResult()
  const asOf = useLoanStore((s) => s.asOf)
  const setAsOf = useLoanStore((s) => s.setAsOf)
  const { totals, consolidated, reconciliation, allocation } = result

  const perPerson = result.borrowers.map((b) => ({
    name: b.borrower.name,
    principal: b.schedule.principal,
    interest: b.schedule.totalInterest,
  }))

  const crossover =
    consolidated.crossoverIndex && consolidated.rows[consolidated.crossoverIndex - 1]
      ? formatMonthYear(consolidated.rows[consolidated.crossoverIndex - 1].dueDate)
      : '—'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard</h1>
          <p className="text-sm text-subtext0">
            One master loan, divided among {result.borrowers.length} people.
          </p>
        </div>
        <Field label="As of date" className="w-44">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
      </div>

      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w, i) => (
            <Banner key={i} kind="warning">{w}</Banner>
          ))}
        </div>
      )}
      {!reconciliation.ok && (
        <Banner kind="error">
          Reconciliation drift of {formatINR(reconciliation.drift)} between the sum of people and
          the master loan — check allocations and per-person overrides.
        </Banner>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total borrowed" value={formatINRCompact(totals.borrowed)} sub={formatINR(totals.borrowed)} accent="blue" />
        <KpiCard label="Repaid to bank" value={formatINRCompact(totals.repaid)} sub={`${formatINRCompact(totals.principalRepaid)} principal + ${formatINRCompact(totals.interestPaid)} interest`} accent="green" />
        <KpiCard label="Interest paid" value={formatINRCompact(totals.interestPaid)} sub="to date" accent="peach" />
        <KpiCard label="Outstanding" value={formatINRCompact(totals.outstanding)} sub={`${formatPct(totals.blendedCurrentRatePct)} blended rate`} accent="mauve" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="People" value={result.borrowers.length} accent="text" />
        <KpiCard label="Lifetime interest" value={formatINRCompact(consolidated.totalInterest)} sub={`over ${consolidated.actualTenureMonths} installments`} accent="peach" />
        <KpiCard label="Crossover point" value={crossover} sub="principal exceeds interest" accent="teal" />
        <KpiCard label="Allocation" value={allocation.ok ? 'Balanced' : 'Gap'} sub={allocation.ok ? 'sums to principal' : formatINR(allocation.gap)} accent={allocation.ok ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Outstanding balance over time" subtitle="Consolidated, all people">
          <BalanceChart schedule={consolidated} />
        </Card>
        <Card title="Principal vs interest" subtitle="Lifetime split">
          <PrincipalInterestPie schedule={consolidated} />
        </Card>
        <Card title="Principal vs interest per EMI" subtitle="Crossover: where each EMI starts repaying more principal than interest">
          <CrossoverChart schedule={consolidated} />
        </Card>
        <Card title="Per-person comparison" subtitle="Principal and interest by borrower">
          <PerPersonBars data={perPerson} />
        </Card>
      </div>

      <Milestones />
    </div>
  )
}

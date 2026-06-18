import { useMemo, useState } from 'react'
import { useLoanStore } from '../store/useLoanStore'
import { Card, Banner } from '../components/ui'
import { KpiCard } from '../components/KpiCard'
import { computeScenario } from '../lib/scenarios'
import { formatINR } from '../engine'
import { formatINRCompact } from '../lib/format'

export function Scenarios() {
  const loan = useLoanStore((s) => s.loan)
  const borrowers = useLoanStore((s) => s.borrowers)
  const asOf = useLoanStore((s) => s.asOf)
  const [shock, setShock] = useState(0)

  // Baseline (no shock, current strategy) vs the two strategy choices at the shock.
  const baseline = useMemo(
    () => computeScenario(loan, borrowers, asOf, 0, loan.resetStrategy, 'Today (no change)'),
    [loan, borrowers, asOf],
  )
  const extendTenure = useMemo(
    () => computeScenario(loan, borrowers, asOf, shock, 'TENURE', 'Extend tenure'),
    [loan, borrowers, asOf, shock],
  )
  const raiseEmi = useMemo(
    () => computeScenario(loan, borrowers, asOf, shock, 'EMI', 'Raise EMI'),
    [loan, borrowers, asOf, shock],
  )

  const cheaper = extendTenure.totalInterest <= raiseEmi.totalInterest ? 'tenure' : 'emi'
  const interestGap = Math.abs(extendTenure.totalInterest - raiseEmi.totalInterest)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">What-if Scenarios</h1>
        <p className="text-sm text-subtext0">
          Stress-test the rate environment, then compare the two RBI reset choices side by side.
        </p>
      </div>

      <Card title="Rate-shock simulator" subtitle="Shifts every rate in the timeline up or down">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="range"
            min={-3}
            max={3}
            step={0.25}
            value={shock}
            onChange={(e) => setShock(Number(e.target.value))}
            className="h-2 flex-1 min-w-64 cursor-pointer accent-[var(--color-primary)]"
            aria-label="Rate shock in percentage points"
          />
          <span
            className={`tnum text-lg font-semibold ${shock > 0 ? 'text-red' : shock < 0 ? 'text-green' : 'text-text'}`}
          >
            {shock > 0 ? '+' : ''}
            {shock.toFixed(2)} pp
          </span>
        </div>
        <p className="mt-2 text-xs text-overlay0">
          Compared against today's schedule ({baseline.tenureMonths} installments, lifetime interest{' '}
          {formatINR(baseline.totalInterest)}).
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScenarioCard s={extendTenure} baseline={baseline} highlight={cheaper === 'tenure'} />
        <ScenarioCard s={raiseEmi} baseline={baseline} highlight={cheaper === 'emi'} />
      </div>

      <Banner kind="info">
        At a {shock >= 0 ? '+' : ''}
        {shock.toFixed(2)} pp shock, <strong>{cheaper === 'tenure' ? 'extending tenure' : 'raising EMI'}</strong>{' '}
        costs {formatINR(interestGap)} {cheaper === 'tenure' ? 'less' : 'less'} in total interest than the
        other choice. Raising the EMI clears the loan sooner; extending tenure keeps the monthly
        outflow flat but usually costs more interest overall.
      </Banner>
    </div>
  )
}

function ScenarioCard({
  s,
  baseline,
  highlight,
}: {
  s: ReturnType<typeof computeScenario>
  baseline: ReturnType<typeof computeScenario>
  highlight: boolean
}) {
  const dInterest = s.totalInterest - baseline.totalInterest
  const dTenure = s.tenureMonths - baseline.tenureMonths
  const dEmi = s.firstEmi - baseline.firstEmi
  return (
    <Card
      title={s.label}
      subtitle={highlight ? 'Lower total interest at this shock' : undefined}
      className={highlight ? 'ring-2 ring-primary' : ''}
    >
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Total interest"
          value={formatINRCompact(s.totalInterest)}
          sub={`${dInterest >= 0 ? '+' : ''}${formatINRCompact(dInterest)} vs today`}
          accent={dInterest > 0 ? 'red' : 'green'}
        />
        <KpiCard label="Total payable" value={formatINRCompact(s.totalPayable)} accent="blue" />
        <KpiCard
          label="Installments"
          value={s.tenureMonths}
          sub={`${dTenure >= 0 ? '+' : ''}${dTenure} mo`}
          accent="mauve"
        />
        <KpiCard
          label="First EMI"
          value={formatINR(s.firstEmi)}
          sub={`${dEmi >= 0 ? '+' : ''}${formatINR(dEmi)}`}
          accent="teal"
        />
      </div>
    </Card>
  )
}

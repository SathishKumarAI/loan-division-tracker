import { useState } from 'react'
import { useLoanStore } from '../store/useLoanStore'
import { useUiStore } from '../store/useUiStore'
import { useLoanResult } from '../lib/useLoanResult'
import { Card, Button, Input, Select, Field, Banner, Tag, EmptyState } from '../components/ui'
import { KpiCard } from '../components/KpiCard'
import { simulatePrepayment, formatINR } from '../engine'
import type { PaymentKind } from '../engine'
import { formatDate } from '../lib/format'

export function Payments() {
  const { loan, borrowers, payments, addPayment, removePayment } = useLoanStore()
  const toast = useUiStore((s) => s.toast)
  const result = useLoanResult()

  const [form, setForm] = useState({
    borrowerId: borrowers[0]?.id ?? '',
    date: loan.startDate,
    amount: 0,
    kind: 'regular' as PaymentKind,
    applyAs: 'TENURE' as 'TENURE' | 'EMI',
  })

  const borrowerName = (id: string) => borrowers.find((b) => b.id === id)?.name ?? '—'

  // Prepayment what-if for the chosen borrower.
  const target = result.borrowers.find((b) => b.borrower.id === form.borrowerId)
  let sim = null as ReturnType<typeof simulatePrepayment> | null
  if (target && form.amount > 0 && (form.kind === 'prepayment' || form.kind === 'partial') && loan.interestType === 'reducing') {
    const startDate = target.borrower.startDate ?? loan.startDate
    sim = simulatePrepayment(
      {
        principal: target.allocatedPrincipal,
        startDate,
        tenureMonths: target.borrower.tenureMonthsOverride ?? loan.tenureMonths,
        rateTimeline: loan.rateTimeline,
        resetStrategy: loan.resetStrategy,
        maxTenureMonths: loan.maxTenureMonths,
        dayCount: loan.dayCount,
      },
      { date: form.date, amount: form.amount, applyAs: form.applyAs },
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Payments</h1>
        <p className="text-sm text-subtext0">
          Record payments and model part-prepayment with the reduce-EMI / reduce-tenure choice.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Record a payment">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Person" className="col-span-2">
              <Select value={form.borrowerId} onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}>
                {borrowers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Amount (₹)">
              <Input type="number" value={form.amount} min={0} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Type">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PaymentKind })}>
                <option value="regular">Regular EMI</option>
                <option value="partial">Partial</option>
                <option value="prepayment">Prepayment</option>
                <option value="foreclosure">Foreclosure</option>
                <option value="missed">Missed</option>
              </Select>
            </Field>
            <Field label="Apply surplus as">
              <Select value={form.applyAs} onChange={(e) => setForm({ ...form, applyAs: e.target.value as 'TENURE' | 'EMI' })}>
                <option value="TENURE">Reduce tenure</option>
                <option value="EMI">Reduce EMI</option>
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Button
              variant="primary"
              disabled={!form.borrowerId || form.amount <= 0}
              onClick={() => {
                addPayment({
                  borrowerId: form.borrowerId,
                  date: form.date,
                  amount: form.amount,
                  kind: form.kind,
                  applyAs: form.applyAs,
                })
                toast(`Recorded ${formatINR(form.amount)} ${form.kind} payment`)
              }}
            >
              Record payment
            </Button>
          </div>
        </Card>

        <Card title="Prepayment what-if" subtitle="Interest saved vs the baseline schedule">
          {sim ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="Interest saved" value={formatINR(sim.interestSaved)} accent="green" />
                <KpiCard label="Months saved" value={sim.monthsSaved} accent="teal" />
                <KpiCard label="New EMI" value={formatINR(sim.newEmi)} accent="blue" />
                <KpiCard label="New tenure" value={`${sim.newTenureMonths} mo`} accent="mauve" />
              </div>
              <Banner kind="info">
                Applying {formatINR(form.amount)} on {formatDate(form.date)} as{' '}
                <strong>{form.applyAs === 'TENURE' ? 'reduce tenure' : 'reduce EMI'}</strong>.
                Reducing tenure usually saves the most interest.
              </Banner>
            </div>
          ) : (
            <EmptyState
              title="Enter a prepayment to simulate"
              hint="Choose a person, set an amount, and pick 'partial' or 'prepayment' (reducing-balance loans only)."
            />
          )}
        </Card>
      </div>

      <Card title="Recorded payments">
        {payments.length === 0 ? (
          <EmptyState title="No payments recorded yet" />
        ) : (
          <div className="overflow-auto rounded-lg border border-surface0">
            <table className="w-full text-sm tnum">
              <thead className="bg-mantle text-left text-xs uppercase tracking-wide text-subtext0">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Person</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Apply</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...payments]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((p) => (
                    <tr key={p.id} className="border-t border-surface0">
                      <td className="px-3 py-2">{formatDate(p.date)}</td>
                      <td className="px-3 py-2">{borrowerName(p.borrowerId)}</td>
                      <td className="px-3 py-2"><Tag color={p.kind === 'missed' ? 'red' : 'blue'}>{p.kind}</Tag></td>
                      <td className="px-3 py-2 text-right">{formatINR(p.amount)}</td>
                      <td className="px-3 py-2 text-right text-subtext0">{p.applyAs ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button variant="danger" onClick={() => removePayment(p.id)}>Remove</Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

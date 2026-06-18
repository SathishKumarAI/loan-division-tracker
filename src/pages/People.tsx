import { useState } from 'react'
import { useLoanStore } from '../store/useLoanStore'
import { useLoanResult } from '../lib/useLoanResult'
import { Card, Button, Input, Field, Banner, Tag, EmptyState } from '../components/ui'
import { formatINR } from '../engine'
import { formatPct } from '../lib/format'

export function People() {
  const { loan, borrowers, addBorrower, updateBorrower, removeBorrower, setAllocationMode } =
    useLoanStore()
  const result = useLoanResult()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const allocUnit =
    loan.allocationMode === 'amount' ? '₹' : loan.allocationMode === 'percent' ? '%' : 'shares'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">People</h1>
          <p className="text-sm text-subtext0">
            Divide the {formatINR(loan.principal)} master principal. Changes recompute everything live.
          </p>
        </div>
        <Button variant="primary" onClick={() => addBorrower()}>+ Add person</Button>
      </div>

      <Card
        title="Allocation method"
        subtitle="How the master principal is split across people"
        actions={
          <div className="flex gap-1">
            {(['amount', 'percent', 'shares'] as const).map((m) => (
              <Button
                key={m}
                variant={loan.allocationMode === m ? 'primary' : 'outline'}
                onClick={() => setAllocationMode(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        }
      >
        {!result.allocation.ok ? (
          <Banner kind={result.allocation.gap > 0 ? 'warning' : 'error'}>
            {result.allocation.gap > 0
              ? `Under-allocated by ${formatINR(result.allocation.gap)} — the people don't cover the full principal.`
              : `Over-allocated by ${formatINR(Math.abs(result.allocation.gap))} — the shares exceed the principal.`}
          </Banner>
        ) : (
          <Banner kind="success">
            Allocations reconcile exactly to {formatINR(loan.principal)}.
          </Banner>
        )}
      </Card>

      {borrowers.length === 0 ? (
        <EmptyState title="No people yet" hint="Add a person to start dividing the loan." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.borrowers.map(({ borrower: b, allocatedPrincipal, schedule }) => {
            const pctComplete =
              schedule.principal > 0
                ? ((schedule.principal - (schedule.rows.at(-1)?.closingBalance ?? 0)) /
                    schedule.principal) *
                  100
                : 0
            return (
              <Card key={b.id} className="!p-0">
                <div className="flex items-start justify-between gap-3 border-b border-surface0 p-4">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={b.name}
                      onChange={(e) => updateBorrower(b.id, { name: e.target.value })}
                      className="!font-semibold"
                      aria-label="Name"
                    />
                    <Input
                      value={b.contact ?? ''}
                      placeholder="Contact (optional)"
                      onChange={(e) => updateBorrower(b.id, { contact: e.target.value })}
                      aria-label="Contact"
                    />
                  </div>
                  {confirmDelete === b.id ? (
                    <div className="flex flex-col gap-1">
                      <Button variant="danger" onClick={() => { removeBorrower(b.id); setConfirmDelete(null) }}>
                        Confirm
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button variant="danger" onClick={() => setConfirmDelete(b.id)}>Remove</Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 p-4">
                  <Field label={`Allocation (${allocUnit})`}>
                    <Input
                      type="number"
                      value={b.allocation}
                      min={0}
                      onChange={(e) => updateBorrower(b.id, { allocation: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Tenure override (months)" hint="blank = master tenure">
                    <Input
                      type="number"
                      value={b.tenureMonthsOverride ?? ''}
                      placeholder={String(loan.tenureMonths)}
                      onChange={(e) =>
                        updateBorrower(b.id, {
                          tenureMonthsOverride: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                    />
                  </Field>
                  <Field label="Disbursement date" hint="blank = master start" className="col-span-2">
                    <Input
                      type="date"
                      value={b.startDate ?? ''}
                      onChange={(e) =>
                        updateBorrower(b.id, { startDate: e.target.value || undefined })
                      }
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-surface0 p-4 text-sm tnum">
                  <Stat label="Allocated principal" value={formatINR(allocatedPrincipal)} />
                  <Stat label="First EMI" value={formatINR(schedule.firstEmi)} />
                  <Stat label="Total interest" value={formatINR(schedule.totalInterest)} accent="interest" />
                  <Stat label="Total payable" value={formatINR(schedule.totalPaid)} />
                  <Stat label="Installments" value={String(schedule.actualTenureMonths)} />
                  <Stat label="Progress" value={formatPct(pctComplete, 1)} />
                </div>
                {schedule.warnings.length > 0 && (
                  <div className="border-t border-surface0 p-3">
                    {schedule.warnings.map((w, i) => (
                      <Tag key={i} color="yellow">{w}</Tag>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'interest' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-subtext0">{label}</span>
      <span className={accent === 'interest' ? 'font-medium text-interest' : 'font-medium text-text'}>{value}</span>
    </div>
  )
}

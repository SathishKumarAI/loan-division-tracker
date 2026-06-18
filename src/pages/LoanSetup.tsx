import { useLoanStore } from '../store/useLoanStore'
import { Card, Button, Input, Select, Field, Banner } from '../components/ui'
import { formatINR } from '../engine'
import { formatDate } from '../lib/format'

export function LoanSetup() {
  const {
    loan,
    setLoanField,
    setInterestType,
    setDayCount,
    setResetStrategy,
    addRateChange,
    updateRateChange,
    removeRateChange,
  } = useLoanStore()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Loan Setup</h1>
        <p className="text-sm text-subtext0">Master loan terms and the variable-rate timeline.</p>
      </div>

      <Card title="Master loan" subtitle="Principal, dates, tenure and frequency">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Principal (₹)" hint={formatINR(loan.principal)}>
            <Input
              type="number"
              value={loan.principal}
              min={0}
              onChange={(e) => setLoanField('principal', Number(e.target.value))}
            />
          </Field>
          <Field label="Start / disbursement date">
            <Input
              type="date"
              value={loan.startDate}
              onChange={(e) => setLoanField('startDate', e.target.value)}
            />
          </Field>
          <Field label="Original tenure (months)" hint={`${(loan.tenureMonths / 12).toFixed(1)} years`}>
            <Input
              type="number"
              value={loan.tenureMonths}
              min={1}
              onChange={(e) => setLoanField('tenureMonths', Number(e.target.value))}
            />
          </Field>
        </div>
      </Card>

      <Card title="Conventions" subtitle="How interest is computed and what happens on a rate reset">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Interest type">
            <Select value={loan.interestType} onChange={(e) => setInterestType(e.target.value as 'reducing' | 'flat')}>
              <option value="reducing">Reducing balance</option>
              <option value="flat">Flat</option>
            </Select>
          </Field>
          <Field label="Day count" hint="daily/365 = SBI-style">
            <Select value={loan.dayCount} onChange={(e) => setDayCount(e.target.value as 'monthly' | 'daily365')} disabled={loan.interestType === 'flat'}>
              <option value="monthly">Monthly reducing</option>
              <option value="daily365">Daily / 365</option>
            </Select>
          </Field>
          <Field label="Rate-reset strategy" hint="default behaviour on a rate change">
            <Select value={loan.resetStrategy} onChange={(e) => setResetStrategy(e.target.value as 'TENURE' | 'EMI' | 'COMBINATION')}>
              <option value="TENURE">Extend tenure (keep EMI)</option>
              <option value="EMI">Raise EMI (keep tenure)</option>
              <option value="COMBINATION">Combination (cap then raise)</option>
            </Select>
          </Field>
          <Field label="Max tenure cap (months)" hint="used by combination">
            <Input
              type="number"
              value={loan.maxTenureMonths}
              min={loan.tenureMonths}
              onChange={(e) => setLoanField('maxTenureMonths', Number(e.target.value))}
            />
          </Field>
        </div>
        {loan.interestType === 'flat' && (
          <div className="mt-4">
            <Banner kind="info">
              Flat interest charges interest on the original principal for the whole term and ignores
              later rate changes (only the start rate is used).
            </Banner>
          </div>
        )}
      </Card>

      <Card
        title="Variable-rate timeline"
        subtitle="Each (effective date, annual rate) drives recomputation from that point"
        actions={<Button variant="primary" onClick={() => addRateChange()}>+ Add rate change</Button>}
      >
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 px-1 text-xs uppercase tracking-wide text-subtext0">
            <span className="col-span-3">Effective date</span>
            <span className="col-span-2">Rate %</span>
            <span className="col-span-6">Note</span>
            <span className="col-span-1" />
          </div>
          {loan.rateTimeline.map((rc) => (
            <div key={rc.id} className="grid grid-cols-12 items-center gap-2">
              <Input
                className="col-span-3"
                type="date"
                value={rc.effectiveDate}
                onChange={(e) => updateRateChange(rc.id, { effectiveDate: e.target.value })}
              />
              <Input
                className="col-span-2"
                type="number"
                step="0.05"
                value={rc.annualRatePct}
                onChange={(e) => updateRateChange(rc.id, { annualRatePct: Number(e.target.value) })}
              />
              <Input
                className="col-span-6"
                value={rc.note ?? ''}
                placeholder="e.g. Repo hike +25bps"
                onChange={(e) => updateRateChange(rc.id, { note: e.target.value })}
              />
              <div className="col-span-1 flex justify-end">
                <Button variant="danger" onClick={() => removeRateChange(rc.id)} aria-label="Remove">✕</Button>
              </div>
            </div>
          ))}
          {loan.rateTimeline.length === 0 && (
            <p className="py-4 text-center text-sm text-subtext0">
              No rate changes — add at least one to set the starting rate.
            </p>
          )}
        </div>
        {loan.rateTimeline.length > 0 && (
          <p className="mt-3 text-xs text-overlay0">
            Starting rate {loan.rateTimeline[0].annualRatePct}% from {formatDate(loan.rateTimeline[0].effectiveDate)}.
            PDF import (parse-then-confirm) lands here in Stage 3.
          </p>
        )}
      </Card>
    </div>
  )
}

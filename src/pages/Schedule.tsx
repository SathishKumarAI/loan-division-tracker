import { useState } from 'react'
import { useLoanResult } from '../lib/useLoanResult'
import { Card, Button, Select, Field } from '../components/ui'
import { KpiCard } from '../components/KpiCard'
import { ScheduleTable } from '../components/ScheduleTable'
import { formatINR } from '../engine'
import { exportScheduleCSV, exportScheduleXLSX } from '../lib/export'
import type { Schedule as ScheduleT } from '../engine'

export function Schedule() {
  const result = useLoanResult()
  const [selected, setSelected] = useState<string>('consolidated')

  const schedule: ScheduleT =
    selected === 'consolidated'
      ? result.consolidated
      : result.borrowers.find((b) => b.borrower.id === selected)?.schedule ?? result.consolidated

  const name =
    selected === 'consolidated'
      ? 'Consolidated'
      : result.borrowers.find((b) => b.borrower.id === selected)?.borrower.name ?? 'Schedule'

  const fileName = `schedule-${name.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Amortization Schedule</h1>
          <p className="text-sm text-subtext0">Click any row to show the math behind it.</p>
        </div>
        <div className="flex items-end gap-2">
          <Field label="View" className="w-52">
            <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="consolidated">Consolidated (all people)</option>
              {result.borrowers.map((b) => (
                <option key={b.borrower.id} value={b.borrower.id}>{b.borrower.name}</option>
              ))}
            </Select>
          </Field>
          <Button onClick={() => exportScheduleCSV(schedule, fileName)}>CSV</Button>
          <Button onClick={() => exportScheduleXLSX(schedule, fileName)}>Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Principal" value={formatINR(schedule.principal)} accent="blue" />
        <KpiCard label="Total interest" value={formatINR(schedule.totalInterest)} accent="peach" />
        <KpiCard label="Total payable" value={formatINR(schedule.totalPaid)} accent="green" />
        <KpiCard label="Installments" value={schedule.actualTenureMonths} accent="mauve" />
      </div>

      <Card title={`${name} schedule`} subtitle="Rate-change rows are highlighted; the final row is a residual that closes to ₹0.00">
        <ScheduleTable schedule={schedule} />
      </Card>
    </div>
  )
}

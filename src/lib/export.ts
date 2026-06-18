/**
 * CSV / Excel / PDF / JSON / .ics exporters — all client-side, no backend.
 * The heavy libraries (SheetJS, jsPDF) are loaded on demand via dynamic import
 * so they stay out of the main bundle and only download when an export runs.
 */
import type { Schedule, ScheduleRow } from '../engine'
import { formatINR } from '../engine'
import { formatDate } from './format'

const trigger = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const COLS = [
  'Installment',
  'Due Date',
  'Rate %',
  'Opening Balance',
  'EMI',
  'Interest',
  'Principal',
  'Closing Balance',
]

const rowToArray = (r: ScheduleRow) => [
  r.index,
  r.dueDate,
  r.annualRatePct,
  r.openingBalance,
  r.emi,
  r.interest,
  r.principal,
  r.closingBalance,
]

export function exportScheduleCSV(schedule: Schedule, name: string) {
  const lines = [COLS.join(',')]
  for (const r of schedule.rows) lines.push(rowToArray(r).join(','))
  trigger(new Blob([lines.join('\n')], { type: 'text/csv' }), `${name}.csv`)
}

export async function exportScheduleXLSX(schedule: Schedule, name: string) {
  const XLSX = await import('xlsx')
  const data = [COLS, ...schedule.rows.map(rowToArray)]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Schedule')
  XLSX.writeFile(wb, `${name}.xlsx`)
}

export function exportJSON(data: unknown, name: string) {
  trigger(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    `${name}.json`,
  )
}

/** RBI-style per-person statement PDF. */
export async function exportStatementPDF(opts: {
  borrowerName: string
  principal: number
  schedule: Schedule
  interestPaidToDate: number
  principalPaidToDate: number
  outstanding: number
  emisLeft: number
  currentApr: number
  asOf: string
}) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableMod.default
  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Loan Share Statement', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Borrower: ${opts.borrowerName}`, 14, 26)
  doc.text(`As of: ${formatDate(opts.asOf)}`, 14, 31)

  autoTable(doc, {
    startY: 38,
    theme: 'grid',
    head: [['Field', 'Value']],
    body: [
      ['Sanctioned share (principal)', formatINR(opts.principal)],
      ['Principal recovered to date', formatINR(opts.principalPaidToDate)],
      ['Interest recovered to date', formatINR(opts.interestPaidToDate)],
      ['Outstanding balance', formatINR(opts.outstanding)],
      ['Current EMI', formatINR(opts.schedule.firstEmi)],
      ['EMIs left', String(opts.emisLeft)],
      ['Current APR', `${opts.currentApr.toFixed(2)} %`],
      ['Total interest over tenure', formatINR(opts.schedule.totalInterest)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 102, 245] },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterY = (doc as any).lastAutoTable.finalY + 8
  doc.setFontSize(11)
  doc.setTextColor(30)
  doc.text('Amortization schedule', 14, afterY)
  autoTable(doc, {
    startY: afterY + 3,
    theme: 'striped',
    head: [COLS],
    body: opts.schedule.rows.map((r) => [
      r.index,
      formatDate(r.dueDate),
      r.annualRatePct,
      formatINR(r.openingBalance),
      formatINR(r.emi),
      formatINR(r.interest),
      formatINR(r.principal),
      formatINR(r.closingBalance),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [30, 102, 245] },
  })

  doc.save(`statement-${opts.borrowerName.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

/** Generate a .ics calendar with one event per upcoming installment. */
export function exportICS(opts: {
  borrowerName: string
  rows: ScheduleRow[]
  fromDate: string
  max?: number
}) {
  const future = opts.rows.filter((r) => r.dueDate >= opts.fromDate).slice(0, opts.max ?? 24)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Loan Division Tracker//EN',
    'CALSCALE:GREGORIAN',
  ]
  for (const r of future) {
    const d = r.dueDate.replace(/-/g, '')
    lines.push(
      'BEGIN:VEVENT',
      `UID:emi-${opts.borrowerName}-${r.index}@loan-division-tracker`,
      `DTSTART;VALUE=DATE:${d}`,
      `SUMMARY:EMI #${r.index} — ${opts.borrowerName} — ${formatINR(r.emi)}`,
      `DESCRIPTION:Interest ${formatINR(r.interest)} / Principal ${formatINR(r.principal)}. Closing ${formatINR(r.closingBalance)}.`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  trigger(new Blob([lines.join('\r\n')], { type: 'text/calendar' }), `emi-${opts.borrowerName}.ics`)
}

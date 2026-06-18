/**
 * Amortization schedule as an accountant's worksheet. Every row expands to
 * show the formula and step-by-step derivation behind its numbers. Rate-change
 * rows are highlighted; the final residual row is tagged.
 */
import { useState, Fragment } from 'react'
import type { Schedule } from '../engine'
import { formatINR } from '../engine'
import { formatDate, formatPct } from '../lib/format'
import { Tag } from './ui'

export function ScheduleTable({ schedule }: { schedule: Schedule }) {
  const [open, setOpen] = useState<number | null>(null)

  if (schedule.rows.length === 0) {
    return <p className="py-8 text-center text-sm text-subtext0">No installments to show.</p>
  }

  return (
    <div className="overflow-auto rounded-lg border border-surface0" style={{ maxHeight: 560 }}>
      <table className="w-full border-collapse text-sm tnum">
        <thead className="sticky top-0 z-10 bg-mantle text-left text-xs uppercase tracking-wide text-subtext0">
          <tr>
            <Th>#</Th>
            <Th>Due</Th>
            <Th right>Rate</Th>
            <Th right>Opening</Th>
            <Th right>EMI</Th>
            <Th right>Interest</Th>
            <Th right>Principal</Th>
            <Th right>Closing</Th>
          </tr>
        </thead>
        <tbody>
          {schedule.rows.map((r) => {
            const trace = schedule.traces.find((t) => t.index === r.index)
            const isOpen = open === r.index
            return (
              <Fragment key={r.index}>
                <tr
                  onClick={() => setOpen(isOpen ? null : r.index)}
                  className={`cursor-pointer border-t border-surface0 transition hover:bg-surface0/40 ${
                    r.rateChanged ? 'bg-yellow/10' : ''
                  }`}
                  aria-expanded={isOpen}
                >
                  <Td>
                    <span className="inline-flex items-center gap-1">
                      <span className="text-overlay0">{isOpen ? '▾' : '▸'}</span>
                      {r.index}
                    </span>
                  </Td>
                  <Td>{formatDate(r.dueDate)}</Td>
                  <Td right>
                    <span className="inline-flex items-center gap-1">
                      {formatPct(r.annualRatePct)}
                      {r.rateChanged && <Tag color="yellow">reset</Tag>}
                    </span>
                  </Td>
                  <Td right>{formatINR(r.openingBalance)}</Td>
                  <Td right>
                    {formatINR(r.emi)}
                    {r.isFinal && <span className="ml-1"><Tag color="mauve">final</Tag></span>}
                  </Td>
                  <Td right className="text-interest">{formatINR(r.interest)}</Td>
                  <Td right className="text-principal">{formatINR(r.principal)}</Td>
                  <Td right>{formatINR(r.closingBalance)}</Td>
                </tr>
                {isOpen && trace && (
                  <tr className="bg-base">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="rounded-lg border border-surface0 bg-card p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtext0">
                          Show the math — installment #{r.index}
                        </p>
                        <p className="mb-2 font-mono text-xs text-mauve">{trace.formula}</p>
                        <ol className="space-y-1">
                          {trace.steps.map((s, i) => (
                            <li key={i} className="font-mono text-xs text-text">
                              {i + 1}. {s}
                            </li>
                          ))}
                          <li className="pt-1 font-mono text-xs text-subtext0">
                            Cumulative — interest {formatINR(r.cumulativeInterest)}, principal{' '}
                            {formatINR(r.cumulativePrincipal)}
                          </li>
                        </ol>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 font-medium ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}
function Td({
  children,
  right,
  className = '',
}: {
  children: React.ReactNode
  right?: boolean
  className?: string
}) {
  return <td className={`px-3 py-2 ${right ? 'text-right' : 'text-left'} ${className}`}>{children}</td>
}

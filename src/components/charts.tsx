/** Recharts visualizations for a Schedule — balance, split, crossover. */
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { Schedule } from '../engine'
import { formatINR } from '../engine'
import { formatINRCompact, formatMonthYear } from '../lib/format'

const PRINCIPAL = 'var(--color-principal)'
const INTEREST = 'var(--color-interest)'
const GRID = 'var(--color-surface0)'
const AXIS = 'var(--color-subtext0)'

const tip = {
  contentStyle: {
    background: 'var(--color-card)',
    border: '1px solid var(--color-surface1)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-text)',
  },
  labelStyle: { color: 'var(--color-subtext0)' },
}

const sampled = (rows: Schedule['rows'], max = 120) => {
  if (rows.length <= max) return rows
  const step = Math.ceil(rows.length / max)
  return rows.filter((_, idx) => idx % step === 0 || idx === rows.length - 1)
}

export function BalanceChart({ schedule }: { schedule: Schedule }) {
  const data = sampled(schedule.rows).map((r) => ({
    name: formatMonthYear(r.dueDate),
    balance: r.closingBalance,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="bal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRINCIPAL} stopOpacity={0.4} />
            <stop offset="100%" stopColor={PRINCIPAL} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} minTickGap={40} />
        <YAxis tickFormatter={formatINRCompact} tick={{ fill: AXIS, fontSize: 11 }} width={64} />
        <Tooltip {...tip} formatter={(v) => formatINR(Number(v))} />
        <Area type="monotone" dataKey="balance" stroke={PRINCIPAL} strokeWidth={2} fill="url(#bal)" name="Outstanding" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function PrincipalInterestPie({ schedule }: { schedule: Schedule }) {
  const data = [
    { name: 'Principal', value: schedule.principal },
    { name: 'Interest', value: schedule.totalInterest },
  ]
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          <Cell fill={PRINCIPAL} />
          <Cell fill={INTEREST} />
        </Pie>
        <Tooltip {...tip} formatter={(v) => formatINR(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12, color: AXIS }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/** Per-EMI principal vs interest split, with the crossover point marked. */
export function CrossoverChart({ schedule }: { schedule: Schedule }) {
  const data = sampled(schedule.rows).map((r) => ({
    name: formatMonthYear(r.dueDate),
    principal: r.principal,
    interest: r.interest,
  }))
  const crossover = schedule.crossoverIndex
    ? formatMonthYear(schedule.rows[schedule.crossoverIndex - 1].dueDate)
    : null
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} minTickGap={40} />
        <YAxis tickFormatter={formatINRCompact} tick={{ fill: AXIS, fontSize: 11 }} width={64} />
        <Tooltip {...tip} formatter={(v) => formatINR(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {crossover && (
          <ReferenceLine x={crossover} stroke={AXIS} strokeDasharray="4 4" label={{ value: 'crossover', fill: AXIS, fontSize: 11, position: 'top' }} />
        )}
        <Line type="monotone" dataKey="principal" stroke={PRINCIPAL} strokeWidth={2} dot={false} name="Principal / EMI" />
        <Line type="monotone" dataKey="interest" stroke={INTEREST} strokeWidth={2} dot={false} name="Interest / EMI" />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Per-person comparison of principal vs interest. */
export function PerPersonBars({
  data,
}: {
  data: { name: string; principal: number; interest: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} />
        <YAxis tickFormatter={formatINRCompact} tick={{ fill: AXIS, fontSize: 11 }} width={64} />
        <Tooltip {...tip} formatter={(v) => formatINR(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="principal" stackId="a" fill={PRINCIPAL} name="Principal" radius={[0, 0, 0, 0]} />
        <Bar dataKey="interest" stackId="a" fill={INTEREST} name="Interest" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

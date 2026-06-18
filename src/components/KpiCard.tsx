import type { ReactNode } from 'react'

export function KpiCard({
  label,
  value,
  sub,
  accent = 'text',
  icon,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: 'text' | 'blue' | 'green' | 'red' | 'peach' | 'mauve' | 'teal'
  icon?: ReactNode
}) {
  const accentMap: Record<string, string> = {
    text: 'text-text',
    blue: 'text-blue',
    green: 'text-green',
    red: 'text-red',
    peach: 'text-peach',
    mauve: 'text-mauve',
    teal: 'text-teal',
  }
  return (
    <div className="rounded-xl border border-surface0 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-subtext0">{label}</p>
        {icon && <span className="text-overlay0">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-semibold tnum ${accentMap[accent]}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-subtext0 tnum">{sub}</p>}
    </div>
  )
}

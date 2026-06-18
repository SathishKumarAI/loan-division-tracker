/** Display formatting helpers (presentation only — no money math here). */
export { formatINR, formatNum } from '../engine'

/** Compact INR for KPI cards: ₹50.0 L, ₹1.2 Cr. */
export const formatINRCompact = (v: number): string => {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)} K`
  return `${sign}₹${abs.toFixed(0)}`
}

export const formatPct = (v: number, dp = 2): string => `${v.toFixed(dp)}%`

/** Human date: 01 Apr 2024. */
export const formatDate = (iso: string): string => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`
}

/** Month-year: Apr 2024. */
export const formatMonthYear = (iso: string): string => {
  const [y, m] = iso.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[m - 1]} ${y}`
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10)

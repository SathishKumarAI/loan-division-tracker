/** Minimal, dependency-free date helpers operating on ISO YYYY-MM-DD strings. */

/** Parse an ISO date string to a UTC Date (date-only, no tz drift). */
export const parseISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Format a Date back to ISO YYYY-MM-DD. */
export const toISO = (d: Date): string => d.toISOString().slice(0, 10)

/**
 * Add `n` calendar months to an ISO date, clamping the day to the end of the
 * target month (e.g. Jan 31 + 1 month → Feb 28/29).
 */
export const addMonths = (iso: string, n: number): string => {
  const d = parseISO(iso)
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return toISO(target)
}

/** Whole days between two ISO dates (b − a). */
export const daysBetween = (a: string, b: string): number =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000)

/** Compare ISO dates: negative if a < b, 0 if equal, positive if a > b. */
export const cmpISO = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0

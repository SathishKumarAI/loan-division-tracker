/**
 * Pure text parsers for bank-PDF ingestion — no pdf.js dependency, so they are
 * unit-testable in Node. The pdf.js-backed extraction lives in `pdfParse.ts`.
 */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Try to parse a date out of free text → ISO YYYY-MM-DD, or null. */
export function parseDate(text: string): string | null {
  // 2024-04-01
  let m = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`

  // 01 Apr 2024  /  1 April 2024  /  Apr 2024
  m = text.match(/(?:(\d{1,2})\s+)?([A-Za-z]{3,9})\.?\s*,?\s*(\d{4})/)
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mon) return `${m[3]}-${pad(mon)}-${pad(m[1] ? Number(m[1]) : 1)}`
  }

  // 01/04/2024 or 01-04-2024 → assumed DD/MM/YYYY (Indian convention)
  m = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    const d = Number(m[1])
    const mo = Number(m[2])
    let y = Number(m[3])
    if (y < 100) y += 2000
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${pad(mo)}-${pad(d)}`
  }
  return null
}

/** First plausible annual rate (percent) in the text, or null. */
export function parseRate(text: string): number | null {
  // e.g. "8.50%", "8.5 %", "ROI 9.25 p.a."
  const m = text.match(/(\d{1,2}(?:\.\d{1,3})?)\s*(?:%|p\.?a\.?|per\s*annum)/i)
  if (m) {
    const r = Number(m[1])
    if (r > 0 && r < 50) return r
  }
  return null
}

export interface ParsedRateRow {
  effectiveDate: string
  annualRatePct: number
  raw: string
}

/** Build candidate (date, rate) rows from reconstructed PDF lines. */
export function rowsFromLines(lines: string[]): ParsedRateRow[] {
  const seen = new Set<string>()
  const rows: ParsedRateRow[] = []
  for (const line of lines) {
    const date = parseDate(line)
    const rate = parseRate(line)
    if (date && rate !== null && !seen.has(date)) {
      seen.add(date)
      rows.push({ effectiveDate: date, annualRatePct: rate, raw: line })
    }
  }
  rows.sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1))
  return rows
}

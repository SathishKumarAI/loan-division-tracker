import { describe, it, expect } from 'vitest'
import { parseDate, parseRate, rowsFromLines } from './pdfParseCore'

describe('parseDate', () => {
  it('parses ISO', () => expect(parseDate('eff 2024-04-01 rate')).toBe('2024-04-01'))
  it('parses "01 Apr 2024"', () => expect(parseDate('w.e.f 01 Apr 2024')).toBe('2024-04-01'))
  it('parses "April 2024" (day defaults to 01)', () => expect(parseDate('April 2024')).toBe('2024-04-01'))
  it('parses DD/MM/YYYY (Indian order)', () => expect(parseDate('01/04/2024')).toBe('2024-04-01'))
  it('parses DD-MM-YY', () => expect(parseDate('15-02-25')).toBe('2025-02-15'))
  it('returns null when no date', () => expect(parseDate('no date here')).toBeNull())
})

describe('parseRate', () => {
  it('parses "8.50%"', () => expect(parseRate('ROI 8.50%')).toBe(8.5))
  it('parses "9.25 p.a."', () => expect(parseRate('rate 9.25 p.a.')).toBe(9.25))
  it('parses "8 %"', () => expect(parseRate('8 %')).toBe(8))
  it('rejects implausible values', () => expect(parseRate('year 2024')).toBeNull())
  it('returns null when no rate', () => expect(parseRate('no rate')).toBeNull())
})

describe('rowsFromLines', () => {
  it('extracts and de-dupes (date, rate) rows, sorted by date', () => {
    const rows = rowsFromLines([
      'Sanctioned w.e.f 01 Apr 2024 ROI 8.50%',
      'header noise without anything useful',
      'Reset 01/02/2025 9.25% p.a.',
      'Duplicate 01-02-2025 9.25%', // same date → ignored
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ effectiveDate: '2024-04-01', annualRatePct: 8.5 })
    expect(rows[1]).toMatchObject({ effectiveDate: '2025-02-01', annualRatePct: 9.25 })
  })
})

import { describe, it, expect } from 'vitest'
import {
  emi,
  nper,
  amortize,
  amortizeFlat,
  allocate,
  reconcileAllocation,
  computeLoan,
  simulatePrepayment,
  monthlyRate,
  sumMoney,
} from './index'
import type { MasterLoan, Borrower } from './index'

const i12 = monthlyRate(12) // 1% monthly

describe('EMI formula (reducing balance)', () => {
  it('matches the standard 1L @ 12% / 12m figure', () => {
    expect(emi(100000, i12, 12).toNumber()).toBeCloseTo(8884.88, 2)
  })
  it('is straight-line principal at 0% interest', () => {
    expect(emi(120000, 0, 12).toNumber()).toBeCloseTo(10000, 6)
  })
})

describe('nper (keep EMI, solve tenure)', () => {
  it('recovers the original tenure from its own EMI', () => {
    const e = emi(100000, i12, 12)
    expect(Math.round(nper(100000, i12, e))).toBe(12)
  })
  it('throws on negative amortization (EMI <= interest)', () => {
    expect(() => nper(100000, i12, 500)).toThrow('NEGATIVE_AMORTIZATION')
  })
})

const baseInput = {
  principal: 100000,
  startDate: '2025-01-01',
  tenureMonths: 12,
  rateTimeline: [{ id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 12 }],
  resetStrategy: 'TENURE' as const,
  maxTenureMonths: 360,
  dayCount: 'monthly' as const,
}

describe('amortize — single fixed rate', () => {
  const s = amortize(baseInput)
  it('closes to exactly zero', () => {
    expect(s.rows.at(-1)!.closingBalance).toBe(0)
  })
  it('repays exactly the principal', () => {
    expect(sumMoney(s.rows.map((r) => r.principal))).toBeCloseTo(100000, 2)
  })
  it('uses the requested tenure', () => {
    expect(s.actualTenureMonths).toBe(12)
  })
  it('reports a sensible total interest', () => {
    // ~6618 for 1L @12% over 12m
    expect(s.totalInterest).toBeGreaterThan(6500)
    expect(s.totalInterest).toBeLessThan(6700)
  })
  it('finds a crossover point', () => {
    expect(s.crossoverIndex).not.toBeNull()
  })
})

describe('amortize — variable rate, keep EMI extends tenure', () => {
  const s = amortize({
    ...baseInput,
    tenureMonths: 24,
    rateTimeline: [
      { id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 9 },
      { id: 'r1', effectiveDate: '2025-07-01', annualRatePct: 13 },
    ],
  })
  it('extends the tenure beyond the original 24 months', () => {
    expect(s.actualTenureMonths).toBeGreaterThanOrEqual(24)
  })
  it('still closes to zero', () => {
    expect(s.rows.at(-1)!.closingBalance).toBe(0)
  })
  it('marks the rate-change row', () => {
    expect(s.rows.some((r) => r.rateChanged)).toBe(true)
  })
})

describe('amortize — keep tenure recomputes EMI', () => {
  const s = amortize({
    ...baseInput,
    tenureMonths: 24,
    resetStrategy: 'EMI',
    rateTimeline: [
      { id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 9 },
      { id: 'r1', effectiveDate: '2025-07-01', annualRatePct: 13 },
    ],
  })
  it('keeps the tenure at 24 months', () => {
    expect(s.actualTenureMonths).toBe(24)
  })
  it('raises the EMI after the reset', () => {
    const before = s.rows.find((r) => r.dueDate < '2025-07-01')!.emi
    const after = s.rows.find((r) => r.rateChanged)!.emi
    expect(after).toBeGreaterThan(before)
  })
})

describe('negative-amortization guard', () => {
  it('raises EMI rather than letting the balance grow on a huge rate jump', () => {
    const s = amortize({
      ...baseInput,
      tenureMonths: 240,
      resetStrategy: 'TENURE',
      rateTimeline: [
        { id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 5 },
        { id: 'r1', effectiveDate: '2025-06-01', annualRatePct: 30 },
      ],
    })
    expect(s.warnings.some((w) => /negative amortization/i.test(w))).toBe(true)
    expect(s.rows.at(-1)!.closingBalance).toBe(0)
    // No row's balance ever increases.
    for (let k = 1; k < s.rows.length; k++) {
      expect(s.rows[k].openingBalance).toBeLessThanOrEqual(s.rows[k - 1].openingBalance + 0.01)
    }
  })
})

describe('edge cases', () => {
  it('tenure of 1', () => {
    const s = amortize({ ...baseInput, tenureMonths: 1 })
    expect(s.rows.length).toBe(1)
    expect(s.rows[0].closingBalance).toBe(0)
  })
  it('zero-interest period', () => {
    const s = amortize({
      ...baseInput,
      rateTimeline: [{ id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 0 }],
    })
    expect(s.totalInterest).toBe(0)
    expect(s.rows.at(-1)!.closingBalance).toBe(0)
  })
  it('empty / invalid principal', () => {
    expect(amortize({ ...baseInput, principal: 0 }).rows.length).toBe(0)
  })
})

describe('flat interest', () => {
  const s = amortizeFlat({
    principal: 100000,
    startDate: '2025-01-01',
    tenureMonths: 12,
    rateTimeline: [{ id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 12 }],
  })
  it('charges interest on the original principal for the whole term', () => {
    expect(s.totalInterest).toBeCloseTo(12000, 0) // 1L × 12% × 1yr
  })
  it('still repays exactly the principal', () => {
    expect(sumMoney(s.rows.map((r) => r.principal))).toBeCloseTo(100000, 2)
  })
})

describe('allocation', () => {
  const bs: Borrower[] = [
    { id: 'a', name: 'A', allocation: 50 },
    { id: 'b', name: 'B', allocation: 30 },
    { id: 'c', name: 'C', allocation: 20 },
  ]
  it('percent split sums exactly to the principal', () => {
    const alloc = allocate(bs, 1000000, 'percent')
    expect(sumMoney(alloc.map((a) => a.amount))).toBe(1000000)
  })
  it('shares split sums exactly (residue on last)', () => {
    const alloc = allocate(
      [
        { id: 'a', name: 'A', allocation: 1 },
        { id: 'b', name: 'B', allocation: 1 },
        { id: 'c', name: 'C', allocation: 1 },
      ],
      100000,
      'shares',
    )
    expect(sumMoney(alloc.map((a) => a.amount))).toBe(100000)
  })
  it('flags an allocation gap', () => {
    const alloc = allocate(bs, 1000000, 'amount') // 50+30+20 = 100 ≠ 1,000,000
    const rep = reconcileAllocation(alloc, 1000000)
    expect(rep.ok).toBe(false)
    expect(rep.gap).toBeCloseTo(999900, 2)
  })
})

describe('Stage 1 acceptance: 3-person split reconciles across 2 rate resets', () => {
  const loan: MasterLoan = {
    principal: 3000000,
    startDate: '2025-01-01',
    tenureMonths: 120,
    frequency: 'monthly',
    interestType: 'reducing',
    dayCount: 'monthly',
    allocationMode: 'percent',
    resetStrategy: 'TENURE',
    maxTenureMonths: 360,
    rateTimeline: [
      { id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 8.5 },
      { id: 'r1', effectiveDate: '2026-04-01', annualRatePct: 9.25 },
      { id: 'r2', effectiveDate: '2028-01-01', annualRatePct: 8.0 },
    ],
  }
  const borrowers: Borrower[] = [
    { id: 'a', name: 'Asha', allocation: 50 },
    { id: 'b', name: 'Bala', allocation: 30 },
    { id: 'c', name: 'Chitra', allocation: 20 },
  ]
  const result = computeLoan(loan, borrowers, '2030-01-01')

  it('allocation reconciles to the paisa', () => {
    expect(result.allocation.ok).toBe(true)
    expect(result.allocation.gap).toBe(0)
  })
  it('sum of persons matches the reference loan (rounding-tolerant)', () => {
    expect(result.reconciliation.ok).toBe(true)
  })
  it('every person closes to zero', () => {
    for (const b of result.borrowers) {
      expect(b.schedule.rows.at(-1)!.closingBalance).toBe(0)
    }
  })
  it('consolidated principal equals the master principal', () => {
    expect(result.consolidated.principal).toBeCloseTo(3000000, 2)
  })
})

describe('recorded payments wired into the loan result', () => {
  const loan: MasterLoan = {
    principal: 1200000,
    startDate: '2025-01-01',
    tenureMonths: 120,
    frequency: 'monthly',
    interestType: 'reducing',
    dayCount: 'monthly',
    allocationMode: 'percent',
    resetStrategy: 'TENURE',
    maxTenureMonths: 360,
    rateTimeline: [{ id: 'r0', effectiveDate: '2024-01-01', annualRatePct: 9 }],
  }
  const borrowers: Borrower[] = [
    { id: 'a', name: 'A', allocation: 60 },
    { id: 'b', name: 'B', allocation: 40 },
  ]

  it('a prepayment shortens that person’s schedule and cuts their interest', () => {
    const base = computeLoan(loan, borrowers, '2035-01-01', [])
    const withPre = computeLoan(loan, borrowers, '2035-01-01', [
      { id: 'p1', borrowerId: 'a', date: '2026-01-01', amount: 200000, kind: 'prepayment', applyAs: 'TENURE' },
    ])
    const baseA = base.borrowers.find((x) => x.borrower.id === 'a')!.schedule
    const preA = withPre.borrowers.find((x) => x.borrower.id === 'a')!.schedule
    expect(preA.actualTenureMonths).toBeLessThan(baseA.actualTenureMonths)
    expect(preA.totalInterest).toBeLessThan(baseA.totalInterest)
    // Untouched borrower B is unchanged.
    const baseB = base.borrowers.find((x) => x.borrower.id === 'b')!.schedule
    const preB = withPre.borrowers.find((x) => x.borrower.id === 'b')!.schedule
    expect(preB.totalInterest).toBe(baseB.totalInterest)
  })

  it('a foreclosure clears the person’s balance early', () => {
    const r = computeLoan(loan, borrowers, '2035-01-01', [
      { id: 'p2', borrowerId: 'b', date: '2027-01-01', amount: 0, kind: 'foreclosure' },
    ])
    const b = r.borrowers.find((x) => x.borrower.id === 'b')!.schedule
    expect(b.rows.at(-1)!.closingBalance).toBe(0)
    // Closes on/around the foreclosure date, well before the 120-month term.
    expect(b.actualTenureMonths).toBeLessThan(30)
  })
})

describe('prepayment simulation', () => {
  it('reduce-tenure saves interest and shortens the loan', () => {
    const r = simulatePrepayment(
      { ...baseInput, tenureMonths: 120, principal: 1000000 },
      { date: '2026-01-01', amount: 200000, applyAs: 'TENURE' },
    )
    expect(r.interestSaved).toBeGreaterThan(0)
    expect(r.monthsSaved).toBeGreaterThan(0)
    expect(r.modified.rows.at(-1)!.closingBalance).toBe(0)
  })
  it('reduce-EMI saves interest while keeping tenure roughly fixed', () => {
    const r = simulatePrepayment(
      { ...baseInput, tenureMonths: 120, principal: 1000000 },
      { date: '2026-01-01', amount: 200000, applyAs: 'EMI' },
    )
    expect(r.interestSaved).toBeGreaterThan(0)
    expect(r.modified.rows.at(-1)!.closingBalance).toBe(0)
  })
})

/**
 * Application state — the master loan, borrowers, payments, and UI prefs.
 * Persisted to localStorage so a refresh keeps your data; exportable as JSON.
 * No financial math lives here — derived numbers come from `computeLoan`.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  MasterLoan,
  Borrower,
  Payment,
  RateChange,
  AllocationMode,
  InterestType,
  DayCount,
  ResetStrategy,
} from '../engine'

const uid = (() => {
  let n = 0
  return (p: string) => `${p}_${(++n).toString(36)}_${Math.floor(performance.now())}`
})()

/** Realistic seed: a ₹50L home loan split 3 ways with two rate resets. */
const seedLoan: MasterLoan = {
  principal: 5000000,
  startDate: '2024-04-01',
  tenureMonths: 240,
  frequency: 'monthly',
  interestType: 'reducing',
  dayCount: 'monthly',
  allocationMode: 'percent',
  resetStrategy: 'TENURE',
  maxTenureMonths: 360,
  rateTimeline: [
    { id: 'r0', effectiveDate: '2024-04-01', annualRatePct: 8.5, note: 'Initial sanctioned rate' },
    { id: 'r1', effectiveDate: '2025-02-01', annualRatePct: 9.25, note: 'Repo hike +75bps' },
    { id: 'r2', effectiveDate: '2026-01-01', annualRatePct: 8.75, note: 'Repo cut −50bps' },
  ],
}

const seedBorrowers: Borrower[] = [
  { id: 'b_asha', name: 'Asha', contact: 'asha@example.com', allocation: 50 },
  { id: 'b_bala', name: 'Bala', contact: 'bala@example.com', allocation: 30 },
  { id: 'b_chitra', name: 'Chitra', contact: 'chitra@example.com', allocation: 20 },
]

export interface PersistedState {
  loan: MasterLoan
  borrowers: Borrower[]
  payments: Payment[]
  /** Reference date for "paid to date" rollups (ISO). */
  asOf: string
  theme: 'light' | 'dark'
}

export interface LoanStore extends PersistedState {
  // loan setup
  setLoanField: <K extends keyof MasterLoan>(k: K, v: MasterLoan[K]) => void
  setAllocationMode: (m: AllocationMode) => void
  setInterestType: (t: InterestType) => void
  setDayCount: (d: DayCount) => void
  setResetStrategy: (s: ResetStrategy) => void
  // rate timeline
  addRateChange: (rc?: Partial<RateChange>) => void
  updateRateChange: (id: string, patch: Partial<RateChange>) => void
  removeRateChange: (id: string) => void
  replaceRateTimeline: (rows: RateChange[]) => void
  // borrowers
  addBorrower: (b?: Partial<Borrower>) => void
  updateBorrower: (id: string, patch: Partial<Borrower>) => void
  removeBorrower: (id: string) => void
  // payments
  addPayment: (p: Omit<Payment, 'id'>) => void
  updatePayment: (id: string, patch: Partial<Payment>) => void
  removePayment: (id: string) => void
  // misc
  setAsOf: (iso: string) => void
  toggleTheme: () => void
  importData: (data: PersistedState) => void
  resetToSeed: () => void
}

const initial: PersistedState = {
  loan: seedLoan,
  borrowers: seedBorrowers,
  payments: [],
  asOf: '2026-06-18',
  theme: 'light',
}

export const useLoanStore = create<LoanStore>()(
  persist(
    (set) => ({
      ...initial,

      setLoanField: (k, v) => set((s) => ({ loan: { ...s.loan, [k]: v } })),
      setAllocationMode: (m) => set((s) => ({ loan: { ...s.loan, allocationMode: m } })),
      setInterestType: (t) => set((s) => ({ loan: { ...s.loan, interestType: t } })),
      setDayCount: (d) => set((s) => ({ loan: { ...s.loan, dayCount: d } })),
      setResetStrategy: (st) => set((s) => ({ loan: { ...s.loan, resetStrategy: st } })),

      addRateChange: (rc) =>
        set((s) => ({
          loan: {
            ...s.loan,
            rateTimeline: [
              ...s.loan.rateTimeline,
              {
                id: uid('r'),
                effectiveDate: rc?.effectiveDate ?? s.loan.startDate,
                annualRatePct: rc?.annualRatePct ?? 9,
                note: rc?.note,
              },
            ].sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1)),
          },
        })),
      updateRateChange: (id, patch) =>
        set((s) => ({
          loan: {
            ...s.loan,
            rateTimeline: s.loan.rateTimeline
              .map((r) => (r.id === id ? { ...r, ...patch } : r))
              .sort((a, b) => (a.effectiveDate < b.effectiveDate ? -1 : 1)),
          },
        })),
      removeRateChange: (id) =>
        set((s) => ({
          loan: { ...s.loan, rateTimeline: s.loan.rateTimeline.filter((r) => r.id !== id) },
        })),
      replaceRateTimeline: (rows) =>
        set((s) => ({ loan: { ...s.loan, rateTimeline: rows } })),

      addBorrower: (b) =>
        set((s) => ({
          borrowers: [
            ...s.borrowers,
            {
              id: uid('b'),
              name: b?.name ?? `Person ${s.borrowers.length + 1}`,
              contact: b?.contact,
              allocation: b?.allocation ?? 0,
              startDate: b?.startDate,
              tenureMonthsOverride: b?.tenureMonthsOverride,
            },
          ],
        })),
      updateBorrower: (id, patch) =>
        set((s) => ({
          borrowers: s.borrowers.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeBorrower: (id) =>
        set((s) => ({
          borrowers: s.borrowers.filter((b) => b.id !== id),
          payments: s.payments.filter((p) => p.borrowerId !== id),
        })),

      addPayment: (p) => set((s) => ({ payments: [...s.payments, { ...p, id: uid('p') }] })),
      updatePayment: (id, patch) =>
        set((s) => ({
          payments: s.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePayment: (id) => set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),

      setAsOf: (iso) => set({ asOf: iso }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      importData: (data) => set({ ...data }),
      resetToSeed: () => set({ ...initial }),
    }),
    { name: 'loan-division-tracker' },
  ),
)

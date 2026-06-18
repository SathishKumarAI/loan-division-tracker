/** Derives the full LoanResult from store state, memoized on the inputs. */
import { useMemo } from 'react'
import { computeLoan } from '../engine'
import type { LoanResult } from '../engine'
import { useLoanStore } from '../store/useLoanStore'

export function useLoanResult(): LoanResult {
  const loan = useLoanStore((s) => s.loan)
  const borrowers = useLoanStore((s) => s.borrowers)
  const asOf = useLoanStore((s) => s.asOf)
  const payments = useLoanStore((s) => s.payments)
  return useMemo(
    () => computeLoan(loan, borrowers, asOf, payments),
    [loan, borrowers, asOf, payments],
  )
}

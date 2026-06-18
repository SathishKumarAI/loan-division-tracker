/**
 * Splitting the master principal across people by amount, percentage, or shares.
 *
 * The reconciliation invariant — sum of allocations must equal the master
 * principal — is checked here and any gap is surfaced. For percent/shares the
 * last borrower absorbs the rounding residue so the parts always sum exactly.
 */
import { D, round2, money } from './money'
import type { Borrower, AllocationMode, AllocationReport } from './types'

/** Resolve each borrower's rupee principal from the chosen allocation mode. */
export function allocate(
  borrowers: Borrower[],
  masterPrincipal: number,
  mode: AllocationMode,
): { borrowerId: string; amount: number }[] {
  if (borrowers.length === 0) return []
  const P = D(masterPrincipal)

  if (mode === 'amount') {
    return borrowers.map((b) => ({ borrowerId: b.id, amount: money(D(b.allocation)) }))
  }

  // percent or shares: compute weights, then distribute with residue on the last.
  const weights = borrowers.map((b) => D(Math.max(0, b.allocation)))
  const totalWeight = weights.reduce((a, w) => a.plus(w), D(0))
  if (totalWeight.isZero()) {
    return borrowers.map((b) => ({ borrowerId: b.id, amount: 0 }))
  }

  const out: { borrowerId: string; amount: number }[] = []
  let running = D(0)
  borrowers.forEach((b, idx) => {
    let amount: number
    if (idx === borrowers.length - 1) {
      amount = money(P.minus(running)) // residue to the last person
    } else {
      const share = round2(P.times(weights[idx]).div(totalWeight))
      amount = share.toNumber()
      running = running.plus(share)
    }
    out.push({ borrowerId: b.id, amount })
  })
  return out
}

/** Reconcile allocations against the master principal. */
export function reconcileAllocation(
  allocations: { borrowerId: string; amount: number }[],
  masterPrincipal: number,
): AllocationReport {
  const totalAllocated = money(
    allocations.reduce((a, x) => a.plus(D(x.amount)), D(0)),
  )
  const gap = money(D(masterPrincipal).minus(totalAllocated))
  return {
    allocations,
    totalAllocated,
    masterPrincipal,
    gap,
    ok: Math.abs(gap) < 0.01,
  }
}

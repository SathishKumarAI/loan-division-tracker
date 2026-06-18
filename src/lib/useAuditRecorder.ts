/**
 * Subscribes to the loan store and records meaningful changes into the audit
 * store. Diffs top-level loan fields, the rate timeline, borrowers, and
 * payments — enough for an accountant-grade "what changed" trail without
 * threading logging through every action.
 */
import { useEffect } from 'react'
import { useLoanStore } from '../store/useLoanStore'
import type { PersistedState } from '../store/useLoanStore'
import { useAuditStore } from '../store/useAuditStore'
import { formatINR } from '../engine'

type Snap = Pick<PersistedState, 'loan' | 'borrowers' | 'payments'>

const snapshot = (s: PersistedState): Snap => ({
  loan: s.loan,
  borrowers: s.borrowers,
  payments: s.payments,
})

export function useAuditRecorder() {
  const log = useAuditStore((s) => s.log)

  useEffect(() => {
    let prev = snapshot(useLoanStore.getState())

    const unsub = useLoanStore.subscribe((state) => {
      const next = snapshot(state)
      const a = prev.loan
      const b = next.loan

      if (a.principal !== b.principal)
        log('Principal', `${formatINR(a.principal)} → ${formatINR(b.principal)}`)
      if (a.tenureMonths !== b.tenureMonths)
        log('Tenure', `${a.tenureMonths} → ${b.tenureMonths} months`)
      if (a.interestType !== b.interestType) log('Interest type', `${a.interestType} → ${b.interestType}`)
      if (a.dayCount !== b.dayCount) log('Day count', `${a.dayCount} → ${b.dayCount}`)
      if (a.resetStrategy !== b.resetStrategy) log('Reset strategy', `${a.resetStrategy} → ${b.resetStrategy}`)
      if (a.allocationMode !== b.allocationMode) log('Allocation mode', `${a.allocationMode} → ${b.allocationMode}`)
      if (a.startDate !== b.startDate) log('Start date', `${a.startDate} → ${b.startDate}`)
      if (JSON.stringify(a.rateTimeline) !== JSON.stringify(b.rateTimeline))
        log('Rate timeline', `updated (${b.rateTimeline.length} entries)`)

      // Borrowers added / removed / re-allocated.
      const aById = new Map(prev.borrowers.map((x) => [x.id, x]))
      const bById = new Map(next.borrowers.map((x) => [x.id, x]))
      for (const x of next.borrowers) if (!aById.has(x.id)) log('Person added', x.name)
      for (const x of prev.borrowers) if (!bById.has(x.id)) log('Person removed', x.name)
      for (const x of next.borrowers) {
        const old = aById.get(x.id)
        if (old && old.allocation !== x.allocation)
          log('Allocation', `${x.name}: ${old.allocation} → ${x.allocation}`)
      }

      // Payments added / removed.
      if (next.payments.length > prev.payments.length) {
        const added = next.payments[next.payments.length - 1]
        log('Payment recorded', `${added.kind} ${formatINR(added.amount)} on ${added.date}`)
      } else if (next.payments.length < prev.payments.length) {
        log('Payment removed', `${prev.payments.length - next.payments.length} entry`)
      }

      prev = next
    })
    return unsub
  }, [log])
}

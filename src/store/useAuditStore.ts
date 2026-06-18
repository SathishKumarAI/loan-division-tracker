/**
 * Audit log / version history. A separate persisted store so the record of
 * "who changed what, when" survives reloads independently of the loan data.
 * Entries are produced by `useAuditRecorder`, which diffs the loan store.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuditEntry {
  ts: string // ISO datetime
  field: string
  detail: string
}

interface AuditStore {
  entries: AuditEntry[]
  log: (field: string, detail: string) => void
  clear: () => void
}

export const useAuditStore = create<AuditStore>()(
  persist(
    (set) => ({
      entries: [],
      log: (field, detail) =>
        set((s) => ({
          entries: [
            { ts: new Date().toISOString(), field, detail },
            ...s.entries,
          ].slice(0, 500),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: 'loan-division-audit' },
  ),
)

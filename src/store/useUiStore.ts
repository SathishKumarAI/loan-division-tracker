/**
 * Ephemeral UI state — current tab, command-palette visibility, and the toast
 * queue. Not persisted (it's session UI, not data). Navigation lives here so the
 * command palette and other components can route without prop-drilling.
 */
import { create } from 'zustand'

export type Tab =
  | 'dashboard'
  | 'people'
  | 'setup'
  | 'schedule'
  | 'payments'
  | 'scenarios'
  | 'import'
  | 'reports'
  | 'history'

export interface Toast {
  id: number
  message: string
  kind: 'success' | 'error' | 'info'
  /** Optional action (e.g. Undo). */
  action?: { label: string; run: () => void }
}

interface UiStore {
  tab: Tab
  setTab: (t: Tab) => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  toasts: Toast[]
  toast: (
    message: string,
    kind?: Toast['kind'],
    action?: Toast['action'],
  ) => void
  dismissToast: (id: number) => void
}

let toastSeq = 0

export const useUiStore = create<UiStore>()((set) => ({
  tab: 'dashboard',
  setTab: (t) => set({ tab: t }),
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  toasts: [],
  toast: (message, kind = 'success', action) => {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, message, kind, action }] }))
    // Auto-dismiss; give actionable toasts more dwell time.
    const ttl = action ? 7000 : 3500
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ttl)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

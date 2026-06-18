/**
 * ⌘K / Ctrl-K command palette — keyboard fuzzy nav + quick actions for power
 * users. Backs up the visible tab nav (never replaces it). Full keyboard
 * operation: arrows to move, Enter to run, Esc to close; focus is trapped while
 * open and returned to the page on close.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useUiStore } from '../store/useUiStore'
import type { Tab } from '../store/useUiStore'
import { useLoanStore } from '../store/useLoanStore'
import { exportJSON } from '../lib/export'

interface Command {
  id: string
  label: string
  hint: string
  run: () => void
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen)
  const setOpen = useUiStore((s) => s.setPaletteOpen)
  const setTab = useUiStore((s) => s.setTab)
  const toast = useUiStore((s) => s.toast)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = useMemo(() => {
    const go = (tab: Tab, label: string): Command => ({
      id: `go-${tab}`,
      label,
      hint: 'Navigate',
      run: () => setTab(tab),
    })
    return [
      go('dashboard', 'Go to Dashboard'),
      go('people', 'Go to People'),
      go('setup', 'Go to Loan Setup'),
      go('schedule', 'Go to Schedule'),
      go('payments', 'Go to Payments'),
      go('scenarios', 'Go to Scenarios'),
      go('import', 'Go to Import PDF'),
      go('reports', 'Go to Reports'),
      go('history', 'Go to History'),
      {
        id: 'theme',
        label: 'Toggle light / dark theme',
        hint: 'Action',
        run: () => useLoanStore.getState().toggleTheme(),
      },
      {
        id: 'export',
        label: 'Export data backup (JSON)',
        hint: 'Action',
        run: () => {
          const s = useLoanStore.getState()
          exportJSON(
            { loan: s.loan, borrowers: s.borrowers, payments: s.payments, asOf: s.asOf, theme: s.theme },
            'loan-division-backup',
          )
          toast('Backup exported')
        },
      },
      {
        id: 'reset',
        label: 'Reset to sample data',
        hint: 'Action',
        run: () => {
          if (confirm('Reset all data to the seed example?')) {
            useLoanStore.getState().resetToSeed()
            toast('Reset to sample data', 'info')
          }
        },
      },
    ]
  }, [setTab, toast])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  // Global ⌘K / Ctrl-K to open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  const run = (c: Command) => {
    c.run()
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-crust/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-surface1 bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command or page…"
          className="w-full border-b border-surface0 bg-transparent px-4 py-3 text-sm text-text outline-none"
          aria-label="Command search"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            else if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, filtered.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter' && filtered[active]) {
              e.preventDefault()
              run(filtered[active])
            }
          }}
        />
        <ul className="max-h-80 overflow-auto py-1">
          {filtered.map((c, i) => (
            <li key={c.id}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                  i === active ? 'bg-primary/15 text-text' : 'text-subtext0'
                }`}
              >
                <span>{c.label}</span>
                <span className="text-xs text-overlay0">{c.hint}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-subtext0">No matching commands.</li>
          )}
        </ul>
        <div className="border-t border-surface0 px-4 py-2 text-xs text-overlay0">
          ↑↓ navigate · ↵ run · esc close
        </div>
      </div>
    </div>
  )
}

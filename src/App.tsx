import { useEffect, useRef, lazy, Suspense } from 'react'
import { useLoanStore } from './store/useLoanStore'
import { useUiStore } from './store/useUiStore'
import type { Tab } from './store/useUiStore'
import { useAuditRecorder } from './lib/useAuditRecorder'
import { Toasts } from './components/Toasts'
import { CommandPalette } from './components/CommandPalette'

// Route pages are lazy-loaded so their heavy dependencies (Recharts on the
// chart pages, pdf.js on Import) split into separate chunks and only download
// when that page is opened.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const People = lazy(() => import('./pages/People').then((m) => ({ default: m.People })))
const LoanSetup = lazy(() => import('./pages/LoanSetup').then((m) => ({ default: m.LoanSetup })))
const Schedule = lazy(() => import('./pages/Schedule').then((m) => ({ default: m.Schedule })))
const Payments = lazy(() => import('./pages/Payments').then((m) => ({ default: m.Payments })))
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })))
const Import = lazy(() => import('./pages/Import').then((m) => ({ default: m.Import })))
const Scenarios = lazy(() => import('./pages/Scenarios').then((m) => ({ default: m.Scenarios })))
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })))

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'people', label: 'People' },
  { id: 'setup', label: 'Loan Setup' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'payments', label: 'Payments' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'import', label: 'Import PDF' },
  { id: 'reports', label: 'Reports' },
  { id: 'history', label: 'History' },
]

export default function App() {
  const tab = useUiStore((s) => s.tab)
  const setTab = useUiStore((s) => s.setTab)
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen)
  const theme = useLoanStore((s) => s.theme)
  const toggleTheme = useLoanStore((s) => s.toggleTheme)
  const mainRef = useRef<HTMLElement>(null)
  useAuditRecorder()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Focus management: on tab change, move focus to the main region so keyboard
  // and screen-reader users land on the new content (WCAG 2.4.3).
  useEffect(() => {
    mainRef.current?.focus()
  }, [tab])

  return (
    <div className="min-h-full">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-oncolor"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-20 border-b border-surface0 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-oncolor">₹</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-text">Loan Division Tracker</p>
              <p className="text-xs text-subtext0">Variable-rate EMI, divided &amp; auditable</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-1.5 rounded-lg border border-surface1 px-2.5 py-1.5 text-xs text-subtext0 hover:bg-surface0/40 sm:flex"
              aria-label="Open command palette"
            >
              <span>Search</span>
              <kbd className="rounded bg-surface0 px-1.5 py-0.5 font-mono text-[10px] text-subtext0">⌘K</kbd>
            </button>
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-surface1 px-2.5 py-1.5 text-sm text-subtext0 hover:bg-surface0/40"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-2" aria-label="Primary">
          <div className="flex gap-1 pb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-subtext0 hover:text-text'
                }`}
                aria-current={tab === t.id ? 'page' : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-6 outline-none"
      >
        <Suspense fallback={<PageSkeleton />}>
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'people' && <People />}
          {tab === 'setup' && <LoanSetup />}
          {tab === 'schedule' && <Schedule />}
          {tab === 'payments' && <Payments />}
          {tab === 'scenarios' && <Scenarios />}
          {tab === 'import' && <Import />}
          {tab === 'reports' && <Reports />}
          {tab === 'history' && <History />}
        </Suspense>
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-overlay0">
        All calculations run locally in your browser · decimal-safe · open source
      </footer>

      <Toasts />
      <CommandPalette />
    </div>
  )
}

/** Skeleton shown while a lazy page chunk loads — mirrors the cards-then-content layout. */
function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-7 w-48 rounded bg-surface0" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface0" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface0" />
    </div>
  )
}

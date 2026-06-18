import { useEffect, useState } from 'react'
import { useLoanStore } from './store/useLoanStore'
import { Dashboard } from './pages/Dashboard'
import { People } from './pages/People'
import { LoanSetup } from './pages/LoanSetup'
import { Schedule } from './pages/Schedule'
import { Payments } from './pages/Payments'
import { Reports } from './pages/Reports'

type Tab = 'dashboard' | 'people' | 'setup' | 'schedule' | 'payments' | 'reports'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'people', label: 'People' },
  { id: 'setup', label: 'Loan Setup' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'payments', label: 'Payments' },
  { id: 'reports', label: 'Reports' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const theme = useLoanStore((s) => s.theme)
  const toggleTheme = useLoanStore((s) => s.toggleTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-surface0 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-bold text-oncolor">₹</div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-text">Loan Division Tracker</p>
              <p className="text-xs text-subtext0">Variable-rate EMI, divided &amp; auditable</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="rounded-lg border border-surface1 px-2.5 py-1.5 text-sm text-subtext0 hover:bg-surface0/40"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-2">
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

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'people' && <People />}
        {tab === 'setup' && <LoanSetup />}
        {tab === 'schedule' && <Schedule />}
        {tab === 'payments' && <Payments />}
        {tab === 'reports' && <Reports />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-overlay0">
        All calculations run locally in your browser · decimal-safe · open source
      </footer>
    </div>
  )
}

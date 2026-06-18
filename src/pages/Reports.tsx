import { useEffect, useRef, useState } from 'react'
import { useLoanStore } from '../store/useLoanStore'
import type { PersistedState } from '../store/useLoanStore'
import { useUiStore } from '../store/useUiStore'
import { useLoanResult } from '../lib/useLoanResult'
import { backendHealthy, saveDataset, getDataset } from '../lib/api'
import { Card, Button, Banner, Tag } from '../components/ui'
import { formatINR, activeAnnualRate } from '../engine'
import { cmpISO } from '../engine'
import { exportStatementPDF, exportICS, exportJSON } from '../lib/export'
import { formatDate } from '../lib/format'

export function Reports() {
  const store = useLoanStore()
  const { loan, borrowers, payments, asOf, importData, resetToSeed } = store
  const toast = useUiStore((s) => s.toast)
  const result = useLoanResult()
  const fileInput = useRef<HTMLInputElement>(null)
  const [backendOk, setBackendOk] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    backendHealthy().then((h) => setBackendOk(h.ok))
  }, [])

  const snapshotData = (): PersistedState => ({ loan, borrowers, payments, asOf, theme: store.theme })

  const saveToServer = async () => {
    setSyncing(true)
    try {
      await saveDataset('primary', 'Primary loan', snapshotData())
      toast('Saved to server')
    } catch (e) {
      toast(`Save failed: ${e instanceof Error ? e.message : ''}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const loadFromServer = async () => {
    setSyncing(true)
    try {
      const ds = await getDataset('primary')
      importData(ds.data as PersistedState)
      toast('Loaded from server')
    } catch (e) {
      toast(`Load failed: ${e instanceof Error ? e.message : 'no saved dataset'}`, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const snapshotFor = (schedule: typeof result.borrowers[number]['schedule'], startDate: string) => {
    let interestPaid = 0
    let principalPaid = 0
    let outstanding = schedule.principal
    let emisLeft = schedule.rows.length
    for (const r of schedule.rows) {
      if (cmpISO(r.dueDate, asOf) <= 0) {
        interestPaid += r.interest
        principalPaid += r.principal
        outstanding = r.closingBalance
        emisLeft -= 1
      }
    }
    const apr = activeAnnualRate(loan.rateTimeline, asOf < startDate ? startDate : asOf, loan.rateTimeline[0]?.annualRatePct ?? 0)
    return { interestPaid, principalPaid, outstanding, emisLeft, apr }
  }

  const onImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as PersistedState
        if (!data.loan || !Array.isArray(data.borrowers)) throw new Error('shape')
        importData(data)
        toast('Backup imported')
      } catch {
        toast('Invalid JSON backup file', 'error')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Reports & Export</h1>
        <p className="text-sm text-subtext0">
          RBI-style per-person statements, calendar reminders, and full data backup.
        </p>
      </div>

      <Card title="Per-person statements" subtitle={`As of ${formatDate(asOf)} — principal & interest recovered, EMIs left, current APR`}>
        <div className="space-y-2">
          {result.borrowers.map(({ borrower: b, schedule, allocatedPrincipal }) => {
            const startDate = b.startDate ?? loan.startDate
            const snap = snapshotFor(schedule, startDate)
            return (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface0 p-3">
                <div className="text-sm">
                  <p className="font-medium text-text">{b.name}</p>
                  <p className="text-subtext0 tnum">
                    Share {formatINR(allocatedPrincipal)} · Outstanding {formatINR(snap.outstanding)} · {snap.emisLeft} EMIs left · APR {snap.apr.toFixed(2)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      exportStatementPDF({
                        borrowerName: b.name,
                        principal: allocatedPrincipal,
                        schedule,
                        interestPaidToDate: snap.interestPaid,
                        principalPaidToDate: snap.principalPaid,
                        outstanding: snap.outstanding,
                        emisLeft: snap.emisLeft,
                        currentApr: snap.apr,
                        asOf,
                      })
                      toast(`Statement PDF for ${b.name} downloaded`)
                    }}
                  >
                    Statement PDF
                  </Button>
                  <Button onClick={() => { exportICS({ borrowerName: b.name, rows: schedule.rows, fromDate: asOf }); toast(`Calendar reminders for ${b.name} downloaded`) }}>
                    .ics reminders
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Data backup" subtitle="Everything is stored locally in your browser">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={() => {
              exportJSON({ loan, borrowers, payments, asOf, theme: store.theme }, 'loan-division-backup')
              toast('Backup exported')
            }}
          >
            Export JSON
          </Button>
          <Button onClick={() => fileInput.current?.click()}>Import JSON</Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Reset all data to the seed example?')) {
                resetToSeed()
                toast('Reset to sample data', 'info')
              }
            }}
          >
            Reset to sample
          </Button>
        </div>
        <div className="mt-3">
          <Banner kind="info">
            A browser-only app can't push notifications when closed — the .ics export adds your EMI
            due dates to Google / Apple / Outlook calendars instead.
          </Banner>
        </div>
      </Card>

      <Card
        title="Server storage (optional backend)"
        subtitle="Persist this dataset on the backend so it survives across browsers/devices"
        actions={backendOk ? <Tag color="green">backend online</Tag> : <Tag color="overlay0">backend offline</Tag>}
      >
        {backendOk ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={syncing} onClick={saveToServer}>
              Save to server
            </Button>
            <Button disabled={syncing} onClick={loadFromServer}>
              Load from server
            </Button>
          </div>
        ) : (
          <Banner kind="info">
            Start the backend (<span className="font-mono">docker compose up -d</span>) to enable
            server-side storage and Claude-powered PDF import. The app works fully without it.
          </Banner>
        )}
      </Card>
    </div>
  )
}

import { useAuditStore } from '../store/useAuditStore'
import { Card, Button, Tag, EmptyState } from '../components/ui'

export function History() {
  const entries = useAuditStore((s) => s.entries)
  const clear = useAuditStore((s) => s.clear)

  const fmt = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Audit Trail</h1>
          <p className="text-sm text-subtext0">
            Every edit to the loan, people, rates, and payments — newest first.
          </p>
        </div>
        {entries.length > 0 && (
          <Button variant="danger" onClick={() => confirm('Clear the audit history?') && clear()}>
            Clear history
          </Button>
        )}
      </div>

      <Card title={`${entries.length} change${entries.length === 1 ? '' : 's'} recorded`}>
        {entries.length === 0 ? (
          <EmptyState title="No changes recorded yet" hint="Edit the loan or people and changes will appear here." />
        ) : (
          <ul className="divide-y divide-surface0">
            {entries.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <Tag color="blue">{e.field}</Tag>
                  <span className="text-text">{e.detail}</span>
                </div>
                <span className="shrink-0 text-xs text-subtext0 tnum">{fmt(e.ts)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

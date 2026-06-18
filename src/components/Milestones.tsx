import { useLoanResult } from '../lib/useLoanResult'
import { useLoanStore } from '../store/useLoanStore'
import { deriveMilestones } from '../lib/milestones'
import { Card, Button, Tag } from './ui'
import { formatDate } from '../lib/format'

export function Milestones() {
  const result = useLoanResult()
  const asOf = useLoanStore((s) => s.asOf)
  const milestones = deriveMilestones(result, asOf)
  const nextUp = milestones.find((m) => m.status === 'upcoming')

  const notifyNext = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted' && nextUp) {
      new Notification('Loan milestone ahead', {
        body: `${nextUp.title} — expected ${formatDate(nextUp.date!)}. ${nextUp.detail}.`,
      })
    }
  }

  return (
    <Card
      title="Milestones"
      subtitle="Progress markers across the loan"
      actions={
        nextUp ? (
          <Button onClick={notifyNext} aria-label="Notify me of the next milestone">
            🔔 Notify next
          </Button>
        ) : undefined
      }
    >
      <ul className="space-y-2">
        {milestones.map((m, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className={m.status === 'achieved' ? 'text-green' : 'text-overlay0'}>
                {m.status === 'achieved' ? '✓' : '○'}
              </span>
              <span className="text-text">{m.title}</span>
              <span className="hidden text-xs text-subtext0 sm:inline">— {m.detail}</span>
            </div>
            <div className="flex items-center gap-2 tnum">
              <span className="text-subtext0">{formatDate(m.date!)}</span>
              <Tag color={m.status === 'achieved' ? 'green' : 'overlay0'}>{m.status}</Tag>
            </div>
          </li>
        ))}
        {milestones.length === 0 && <li className="text-sm text-subtext0">No milestones yet.</li>}
      </ul>
    </Card>
  )
}

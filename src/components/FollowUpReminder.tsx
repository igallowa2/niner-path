import type { Application } from '../types'
import { daysSinceApplying } from '../lib/date'

interface FollowUpReminderProps {
  app: Application
  now?: Date
}

export function FollowUpReminder({ app, now }: FollowUpReminderProps) {
  if (app.status !== 'Applied') return null

  const appliedEntry = [...app.timeline].reverse().find((entry) => entry.status === 'Applied')
  if (!appliedEntry) return null

  const days = daysSinceApplying(appliedEntry.date, now)
  if (days < 14) return null

  return (
    <aside className="follow-up-reminder" aria-label="Follow-up reminder">
      Applied {days} days ago. Send a follow-up?
    </aside>
  )
}

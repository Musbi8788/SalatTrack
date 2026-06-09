import { CrescentMoonIcon } from '@/components/icons'

const REMINDERS = [
  'These statistics are for personal reflection. Allah rewards sincerity, not numbers.',
  'Prayer is an act of worship for Allah, not a competition.',
  'Use this data to improve consistency, not to judge yourself harshly.',
  'Allah knows your intentions better than any statistic.',
] as const

/** Derives a stable 0-based index from today's date so the same reminder shows all day. */
function getDailyIndex(): number {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const sum = today
    .replace(/-/g, '')
    .split('')
    .reduce((acc, ch) => acc + parseInt(ch, 10), 0)
  return sum % REMINDERS.length
}

export function IntentionReminder() {
  const reminder = REMINDERS[getDailyIndex()]

  return (
    <div
      className="bg-surface border border-subtle rounded-2xl px-4 py-3 flex items-start gap-3"
      aria-label="Daily spiritual reminder"
    >
      <CrescentMoonIcon size={16} className="text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
          Daily Reminder
        </p>
        <p className="text-sm text-text-secondary italic leading-relaxed">{reminder}</p>
      </div>
    </div>
  )
}

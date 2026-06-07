import { redirect } from 'next/navigation'
import Link from 'next/link'
import { startOfWeek, addDays, format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { PrayerGrid } from '@/components/prayer/PrayerGrid'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import type { DayLogs, PrayerLog } from '@/types'

function parseWeekStart(startParam: string | undefined): Date {
  if (startParam) {
    const parts = startParam.split('-')
    const y = parseInt(parts[0] ?? '2026', 10)
    const m = parseInt(parts[1] ?? '1', 10)
    const d = parseInt(parts[2] ?? '1', 10)
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d)
    }
  }
  return startOfWeek(new Date(), { weekStartsOn: 1 })
}

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>
}) {
  const { start: startParam } = await searchParams

  const weekStart = parseWeekStart(startParam)
  const weekEnd = addDays(weekStart, 6)
  const today = new Date().toISOString().slice(0, 10)

  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  // Cap navigation at the current week
  const thisMonday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  if (weekStartStr > thisMonday) {
    redirect(`/weekly?start=${thisMonday}`)
  }

  const prevWeekStr = format(addDays(weekStart, -7), 'yyyy-MM-dd')
  const nextWeekStr = format(addDays(weekStart, 7), 'yyyy-MM-dd')
  const isCurrentWeek = weekStartStr === thisMonday

  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  // Fetch logs directly from DB (Server Component — no fetch round-trip)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('prayer_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('prayer_date', weekStartStr)
    .lte('prayer_date', weekEndStr)
    .order('prayer_date', { ascending: true })

  const logs = (data ?? []) as PrayerLog[]

  // Group logs by date
  const grouped = new Map<string, PrayerLog[]>()
  for (const log of logs) {
    const arr = grouped.get(log.prayer_date) ?? []
    arr.push(log)
    grouped.set(log.prayer_date, arr)
  }

  const days: DayLogs[] = Array.from({ length: 7 }, (_, i) => {
    const date = format(addDays(weekStart, i), 'yyyy-MM-dd')
    return { date, logs: grouped.get(date) ?? [] }
  })

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-text-primary">Weekly View</h1>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/weekly?start=${prevWeekStr}`}
          className="p-2 rounded-xl bg-surface border border-subtle text-text-muted
                     hover:text-text-primary transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeftIcon size={18} />
        </Link>
        <span className="text-sm font-medium text-text-secondary">{weekLabel}</span>
        <Link
          href={isCurrentWeek ? '#' : `/weekly?start=${nextWeekStr}`}
          className={`p-2 rounded-xl bg-surface border border-subtle text-text-muted
                      hover:text-text-primary transition-colors
                      ${isCurrentWeek ? 'opacity-30 pointer-events-none' : ''}`}
          aria-label="Next week"
          aria-disabled={isCurrentWeek}
        >
          <ChevronRightIcon size={18} />
        </Link>
      </div>

      {/* Prayer grid */}
      <div className="bg-surface border border-subtle rounded-2xl p-4">
        <PrayerGrid days={days} today={today} />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {[
          { bg: 'bg-brand-blue', label: 'On Time' },
          { bg: 'bg-late', label: 'Late' },
          { bg: 'bg-brand-red', label: 'Missed' },
          { bg: 'bg-subtle', label: 'Pending' },
        ].map(({ bg, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${bg}`} />
            <span className="text-xs text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

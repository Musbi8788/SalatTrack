import Link from 'next/link'
import { getDaysInMonth, getDay, format } from 'date-fns'
import type { PrayerLog } from '@/types'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'

interface PrayerCalendarProps {
  logs: PrayerLog[]
  month: number    // 1–12
  year: number
  today: string    // 'YYYY-MM-DD'
}

type DayColor = 'on_time' | 'late' | 'missed' | 'no_data' | 'future'

const DOT_BG: Record<DayColor, string> = {
  on_time: 'bg-brand-blue',
  late: 'bg-late',
  missed: 'bg-brand-red',
  no_data: 'bg-subtle/60',
  future: 'bg-subtle/25',
}

const DAY_TEXT: Record<DayColor, string> = {
  on_time: 'text-brand-blue',
  late: 'text-late',
  missed: 'text-brand-red-light',
  no_data: 'text-text-muted',
  future: 'text-text-disabled',
}

function getDayColor(dayLogs: PrayerLog[], isFuture: boolean): DayColor {
  if (isFuture) return 'future'
  if (dayLogs.length === 0) return 'no_data'
  if (dayLogs.some(l => l.status === 'missed')) return 'missed'
  if (dayLogs.some(l => l.status === 'late')) return 'late'
  return 'on_time'
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

export function PrayerCalendar({ logs, month, year, today }: PrayerCalendarProps) {
  const firstOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = getDaysInMonth(firstOfMonth)
  // getDay: 0=Sun … 6=Sat. Convert to Mon-first offset: Mon=0, Tue=1 … Sun=6
  const offset = (getDay(firstOfMonth) + 6) % 7

  const mm = String(month).padStart(2, '0')
  const currentMonthStr = `${year}-${mm}`
  const todayMonthStr = today.slice(0, 7)

  // Prev/next month calculation
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  const isCurrentOrFutureMonth = currentMonthStr >= todayMonthStr

  const monthLabel = format(firstOfMonth, 'MMMM yyyy')

  // Group logs by date
  const byDate = new Map<string, PrayerLog[]>()
  for (const log of logs) {
    const arr = byDate.get(log.prayer_date) ?? []
    arr.push(log)
    byDate.set(log.prayer_date, arr)
  }

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-4">
      {/* Month navigation header */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href={`/monthly?month=${prevMonth}&year=${prevYear}`}
          className="p-1.5 rounded-lg bg-raised text-text-muted hover:text-text-primary transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeftIcon size={18} />
        </Link>
        <h2 className="text-base font-semibold text-text-primary">{monthLabel}</h2>
        <Link
          href={
            isCurrentOrFutureMonth
              ? '#'
              : `/monthly?month=${nextMonth}&year=${nextYear}`
          }
          className={`p-1.5 rounded-lg bg-raised text-text-muted hover:text-text-primary transition-colors ${
            isCurrentOrFutureMonth ? 'opacity-30 pointer-events-none' : ''
          }`}
          aria-label="Next month"
          aria-disabled={isCurrentOrFutureMonth}
        >
          <ChevronRightIcon size={18} />
        </Link>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-medium text-text-muted py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar day grid */}
      <div className="grid grid-cols-7 gap-y-2">
        {/* Leading empty cells */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = `${year}-${mm}-${String(day).padStart(2, '0')}`
          const isFuture = dateStr > today
          const isToday = dateStr === today
          const dayLogs = byDate.get(dateStr) ?? []
          const color = getDayColor(dayLogs, isFuture)

          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span
                className={`text-xs leading-none ${
                  isToday ? 'text-brand-blue font-semibold' : DAY_TEXT[color]
                }`}
              >
                {day}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${DOT_BG[color]}`} />
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 flex-wrap mt-4 pt-3 border-t border-subtle">
        {[
          { bg: 'bg-brand-blue', label: 'On Time' },
          { bg: 'bg-late', label: 'Late' },
          { bg: 'bg-brand-red', label: 'Missed' },
          { bg: 'bg-subtle/60', label: 'No data' },
        ].map(({ bg, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${bg}`} />
            <span className="text-[10px] text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

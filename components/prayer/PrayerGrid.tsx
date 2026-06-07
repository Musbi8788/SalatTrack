'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { ComponentType } from 'react'
import type { DayLogs, PrayerLog, PrayerName, PrayerStatus } from '@/types'
import { PRAYERS } from '@/lib/prayers'
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PendingCircleIcon,
} from '@/components/icons'

interface IconProps {
  size?: number
  className?: string
}

const PRAYER_SHORT: Record<PrayerName, string> = {
  Fajr: 'Fajr',
  Dhuhr: 'Dhr',
  Asr: 'Asr',
  Maghrib: 'Mgr',
  Isha: 'Isha',
}

const CELL_BG: Record<PrayerStatus, string> = {
  on_time: 'bg-brand-blue',
  late: 'bg-late',
  missed: 'bg-brand-red',
  pending: 'bg-subtle',
}

const STATUS_ICONS: Record<PrayerStatus, ComponentType<IconProps>> = {
  on_time: CheckCircleIcon,
  late: ClockIcon,
  missed: XCircleIcon,
  pending: PendingCircleIcon,
}

const STATUS_TEXT: Record<PrayerStatus, string> = {
  on_time: 'On Time',
  late: 'Late',
  missed: 'Missed',
  pending: 'Pending',
}

const STATUS_COLOR: Record<PrayerStatus, string> = {
  on_time: 'text-brand-blue',
  late: 'text-late',
  missed: 'text-brand-red-light',
  pending: 'text-text-muted',
}

interface SelectedCell {
  prayerName: PrayerName
  date: string
  log: PrayerLog | null
}

function StatusBadge({ status }: { status: PrayerStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={STATUS_COLOR[status]} />
      <span className={`text-sm font-medium ${STATUS_COLOR[status]}`}>
        {STATUS_TEXT[status]}
      </span>
    </div>
  )
}

interface PrayerGridProps {
  days: DayLogs[]   // exactly 7 items
  today: string     // 'YYYY-MM-DD'
}

export function PrayerGrid({ days, today }: PrayerGridProps) {
  const [selected, setSelected] = useState<SelectedCell | null>(null)

  function handleCellClick(prayerName: PrayerName, day: DayLogs) {
    if (day.date > today) return
    const log = day.logs.find(l => l.prayer_name === prayerName) ?? null
    setSelected({ prayerName, date: day.date, log })
  }

  return (
    <div>
      {/* Day header row */}
      <div className="flex items-end gap-1 mb-2 pl-12">
        {days.map(day => {
          const d = new Date(day.date + 'T12:00:00')
          const isToday = day.date === today
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-text-muted leading-none">
                {format(d, 'EEEEE')}
              </span>
              <span
                className={`text-xs font-medium leading-none ${
                  isToday ? 'text-brand-blue' : 'text-text-secondary'
                }`}
              >
                {format(d, 'd')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Prayer rows */}
      <div className="space-y-1.5">
        {PRAYERS.map(prayerName => (
          <div key={prayerName} className="flex items-center gap-1">
            {/* Prayer label */}
            <div className="w-12 flex-shrink-0 text-[11px] text-text-muted">
              {PRAYER_SHORT[prayerName]}
            </div>
            {/* Day cells */}
            {days.map(day => {
              const isFuture = day.date > today
              const log = day.logs.find(l => l.prayer_name === prayerName)
              const status: PrayerStatus = log?.status ?? 'pending'
              const bg = isFuture ? 'bg-subtle/30' : CELL_BG[status]

              return (
                <button
                  key={day.date}
                  className={`flex-1 aspect-square rounded-lg ${bg} transition-opacity active:opacity-60
                    ${isFuture ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
                  onClick={() => handleCellClick(prayerName, day)}
                  disabled={isFuture}
                  aria-label={`${prayerName} on ${day.date}: ${status}`}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Detail sheet modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md bg-surface border border-subtle rounded-t-2xl p-6 pb-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="w-10 h-1 bg-subtle rounded-full mx-auto mb-5" />

            {/* Prayer name + date */}
            <p className="text-lg font-semibold text-text-primary mb-0.5">
              {selected.prayerName}
            </p>
            <p className="text-sm text-text-muted mb-4">
              {format(new Date(selected.date + 'T12:00:00'), 'EEEE, MMMM d')}
            </p>

            {/* Status */}
            <div className="mb-3">
              <StatusBadge status={selected.log?.status ?? 'pending'} />
            </div>

            {/* Scheduled time */}
            {selected.log?.scheduled_time && (
              <p className="text-sm text-text-secondary mb-1.5">
                <span className="text-text-muted">Scheduled: </span>
                <span className="font-mono text-brand-blue">
                  {selected.log.scheduled_time}
                </span>
              </p>
            )}

            {/* Logged at */}
            {selected.log?.logged_at && (
              <p className="text-sm text-text-secondary mb-1.5">
                <span className="text-text-muted">Logged at: </span>
                <span className="font-mono">
                  {format(new Date(selected.log.logged_at), 'HH:mm')}
                </span>
              </p>
            )}

            {/* Notes */}
            {selected.log?.notes && (
              <div className="mt-3 p-3 bg-raised rounded-xl">
                <p className="text-sm text-text-secondary">{selected.log.notes}</p>
              </div>
            )}

            {!selected.log && (
              <p className="text-sm text-text-muted mt-1">No record for this prayer.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import type { ComponentType } from 'react'
import type { PrayerName, PrayerStatus } from '@/types'
import {
  FajrIcon,
  DhuhrIcon,
  AsrIcon,
  MaghribIcon,
  IshaIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  PendingCircleIcon,
  LoaderIcon,
} from '@/components/icons'

interface IconProps {
  className?: string
  size?: number
}

const PRAYER_ICONS: Record<PrayerName, ComponentType<IconProps>> = {
  Fajr: FajrIcon,
  Dhuhr: DhuhrIcon,
  Asr: AsrIcon,
  Maghrib: MaghribIcon,
  Isha: IshaIcon,
}

const STATUS_ICONS: Record<PrayerStatus, ComponentType<IconProps>> = {
  on_time: CheckCircleIcon,
  late: ClockIcon,
  missed: XCircleIcon,
  pending: PendingCircleIcon,
}

const STATUS_BADGE: Record<PrayerStatus, string> = {
  on_time: 'bg-brand-blue-muted text-brand-blue border border-brand-blue/30',
  late: 'bg-late-muted text-late border border-late/30',
  missed: 'bg-brand-red-muted text-brand-red-light border border-brand-red/30',
  pending: 'bg-subtle/40 text-text-muted border border-subtle',
}

const STATUS_ICON_COLOR: Record<PrayerStatus, string> = {
  on_time: 'text-brand-blue',
  late: 'text-late',
  missed: 'text-brand-red-light',
  pending: 'text-text-muted',
}

const STATUS_LABELS: Record<PrayerStatus, string> = {
  on_time: 'On Time',
  late: 'Late',
  missed: 'Missed',
  pending: 'Pending',
}

interface PrayerCardProps {
  prayerName: PrayerName
  scheduledTime: string  // 'HH:mm'
  status: PrayerStatus
  onLog?: (logTime: string) => void
  isLogging?: boolean
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function PrayerCard({
  prayerName,
  scheduledTime,
  status,
  onLog,
  isLogging = false,
}: PrayerCardProps) {
  const [picking, setPicking] = useState(false)
  const [logTime, setLogTime] = useState('')

  // Close the time picker if the prayer gets logged externally
  useEffect(() => {
    if (status !== 'pending') setPicking(false)
  }, [status])

  function openPicker() {
    setLogTime(nowHHMM())
    setPicking(true)
  }

  function confirmLog() {
    if (!logTime || !onLog) return
    onLog(logTime)
    setPicking(false)
  }

  const PrayerIcon = PRAYER_ICONS[prayerName]
  const StatusIcon = STATUS_ICONS[status]

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-4">
      {/* Prayer name + scheduled time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PrayerIcon size={20} className="text-brand-blue" />
          <span className="text-base font-medium text-text-primary">{prayerName}</span>
        </div>
        <span className="text-sm font-mono text-brand-blue">{scheduledTime}</span>
      </div>

      <div className="h-px bg-subtle my-3" />

      {/* Status area */}
      <div className="flex justify-end">
        {status === 'pending' ? (
          picking ? (
            /* Inline time picker — user can adjust the time before confirming */
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <input
                type="time"
                value={logTime}
                onChange={(e) => setLogTime(e.target.value)}
                className="bg-raised border border-subtle rounded-lg px-3 py-2 text-sm font-mono
                           text-text-primary focus:outline-none focus:border-brand-blue
                           min-h-[44px] [color-scheme:dark]"
              />
              <button
                onClick={confirmLog}
                disabled={!logTime || isLogging}
                className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-light active:scale-95
                           text-white text-sm font-semibold rounded-xl px-4 py-2.5 min-h-[44px]
                           transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLogging && <LoaderIcon size={14} className="animate-spin" />}
                Confirm
              </button>
              <button
                onClick={() => setPicking(false)}
                className="text-text-muted text-sm hover:text-text-secondary px-2 min-h-[44px]
                           transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            /* "I Prayed" tap → opens time picker pre-filled with current time */
            <button
              onClick={openPicker}
              disabled={isLogging || !onLog}
              className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-light active:scale-95
                         text-white text-sm font-semibold rounded-xl px-5 py-2.5 min-h-[44px]
                         transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLogging && <LoaderIcon size={14} className="animate-spin" />}
              I Prayed
            </button>
          )
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${STATUS_BADGE[status]}`}
          >
            <StatusIcon size={12} className={STATUS_ICON_COLOR[status]} />
            {STATUS_LABELS[status]}
          </span>
        )}
      </div>
    </div>
  )
}

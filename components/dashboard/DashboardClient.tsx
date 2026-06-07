'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { useLocation } from '@/hooks/useLocation'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { usePrayerLogs } from '@/hooks/usePrayerLogs'
import type { PrayerLogsMap, PrayerLogEntry } from '@/hooks/usePrayerLogs'
import { PrayerCard } from '@/components/prayer/PrayerCard'
import { MapPinIcon, LoaderIcon, WifiOffIcon } from '@/components/icons'
import type { PrayerName, PrayerStatus, PrayerTimes } from '@/types'

const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

interface DashboardClientProps {
  initialLat: number | null
  initialLng: number | null
  initialCityName: string | null
  method: number
  todayDate: string  // 'YYYY-MM-DD'
}

interface OptimisticAction {
  name: PrayerName
  status: PrayerStatus
}

function applyOptimistic(state: PrayerLogsMap, action: OptimisticAction): PrayerLogsMap {
  return {
    ...state,
    [action.name]: {
      id: state[action.name]?.id ?? '',
      status: action.status,
      logged_at: state[action.name]?.logged_at ?? null,
    },
  }
}

export function DashboardClient({
  initialLat,
  initialLng,
  initialCityName,
  method,
  todayDate,
}: DashboardClientProps) {
  const location = useLocation({ initialLat, initialLng, initialCityName })
  const prayerTimes = usePrayerTimes(location.lat, location.lng, todayDate, method, !location.loading)
  const { logs, addLog } = usePrayerLogs(todayDate)

  const [optimisticLogs, addOptimistic] = useOptimistic(logs, applyOptimistic)
  const [isPending, startTransition] = useTransition()
  const [loggingPrayer, setLoggingPrayer] = useState<PrayerName | null>(null)

  async function handleLog(prayerName: PrayerName, scheduledTime: string) {
    if (isPending) return
    setLoggingPrayer(prayerName)

    startTransition(async () => {
      addOptimistic({ name: prayerName, status: 'on_time' })

      try {
        const res = await fetch('/api/prayer-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prayer_name: prayerName, scheduled_time: scheduledTime }),
        })

        if (res.ok) {
          const data = (await res.json()) as { id: string; status: PrayerStatus; logged_at: string }
          const entry: PrayerLogEntry = { id: data.id, status: data.status, logged_at: data.logged_at }
          addLog(prayerName, entry)
        }
      } finally {
        setLoggingPrayer(null)
      }
    })
  }

  const times: PrayerTimes | null = prayerTimes.data

  return (
    <div className="space-y-4">
      {/* Location pill */}
      <div className="inline-flex items-center gap-1.5 bg-raised border border-subtle rounded-full px-3 py-1">
        <MapPinIcon size={12} className="text-brand-blue" />
        <span className="text-xs text-brand-blue">
          {location.loading ? 'Locating...' : location.cityName}
        </span>
      </div>

      {/* Prayer times loading */}
      {prayerTimes.loading && (
        <div className="bg-surface border border-subtle rounded-2xl p-8 flex flex-col items-center gap-3">
          <LoaderIcon size={24} className="text-brand-blue animate-spin" />
          <p className="text-text-muted text-sm">Loading prayer times...</p>
        </div>
      )}

      {/* Prayer times error */}
      {!prayerTimes.loading && prayerTimes.error && (
        <div className="bg-surface border border-subtle rounded-2xl p-6 flex flex-col items-center gap-3">
          <WifiOffIcon size={24} className="text-brand-red-light" />
          <p className="text-text-secondary text-sm text-center">{prayerTimes.error}</p>
        </div>
      )}

      {/* Prayer cards */}
      {!prayerTimes.loading && times && (
        <div className="space-y-3">
          {PRAYER_NAMES.map((name) => {
            const status = optimisticLogs[name]?.status ?? 'pending'
            const canLog = status === 'pending' && !isPending
            // Wrap async handler so onLog stays () => void (not () => Promise<void>)
            // Conditional spread avoids passing onLog={undefined} (exactOptionalPropertyTypes)
            const logProp = canLog
              ? { onLog: () => { void handleLog(name, times[name]) } }
              : {}
            return (
              <PrayerCard
                key={name}
                prayerName={name}
                scheduledTime={times[name]}
                status={status}
                isLogging={loggingPrayer === name && isPending}
                {...logProp}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

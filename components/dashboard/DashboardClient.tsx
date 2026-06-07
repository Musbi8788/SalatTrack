'use client'

import { useLocation } from '@/hooks/useLocation'
import { usePrayerTimes } from '@/hooks/usePrayerTimes'
import { PrayerCard } from '@/components/prayer/PrayerCard'
import { MapPinIcon, LoaderIcon, WifiOffIcon } from '@/components/icons'
import type { PrayerName, PrayerTimes } from '@/types'

const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

interface DashboardClientProps {
  initialLat: number | null
  initialLng: number | null
  initialCityName: string | null
  method: number
  todayDate: string  // 'YYYY-MM-DD'
}

export function DashboardClient({
  initialLat,
  initialLng,
  initialCityName,
  method,
  todayDate,
}: DashboardClientProps) {
  const location = useLocation({ initialLat, initialLng, initialCityName })
  const prayerTimes = usePrayerTimes(
    location.lat,
    location.lng,
    todayDate,
    method,
    !location.loading
  )

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

      {/* Loading state */}
      {prayerTimes.loading && (
        <div className="bg-surface border border-subtle rounded-2xl p-8 flex flex-col items-center gap-3">
          <LoaderIcon size={24} className="text-brand-blue animate-spin" />
          <p className="text-text-muted text-sm">Loading prayer times...</p>
        </div>
      )}

      {/* Error state */}
      {!prayerTimes.loading && prayerTimes.error && (
        <div className="bg-surface border border-subtle rounded-2xl p-6 flex flex-col items-center gap-3">
          <WifiOffIcon size={24} className="text-brand-red-light" />
          <p className="text-text-secondary text-sm text-center">{prayerTimes.error}</p>
        </div>
      )}

      {/* Prayer cards */}
      {!prayerTimes.loading && times && (
        <div className="space-y-3">
          {PRAYER_NAMES.map((name) => (
            <PrayerCard
              key={name}
              prayerName={name}
              scheduledTime={times[name]}
              status="pending"
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'
import type { Profile, PrayerTimes } from '@/types'

const BANJUL_LAT = 13.4549
const BANJUL_LNG = -16.579

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, location_lat, location_lng, city_name, calculation_method, notification_enabled, email_notification, prayer_time_overrides'
    )
    .eq('id', user.id)
    .single()

  // Fetch today's Aladhan times from cache so the UI can show them as placeholders.
  // Falls back to Banjul if the user hasn't set a location yet.
  const lat  = Math.round((profile?.location_lat  ?? BANJUL_LAT) * 10000) / 10000
  const lng  = Math.round((profile?.location_lng  ?? BANJUL_LNG) * 10000) / 10000
  const method = profile?.calculation_method ?? 3
  const today  = new Date().toISOString().slice(0, 10)

  const { data: cached } = await supabase
    .from('prayer_time_cache')
    .select('fajr, dhuhr, asr, maghrib, isha')
    .eq('cache_date', today)
    .eq('lat', lat)
    .eq('lng', lng)
    .eq('method', method)
    .maybeSingle()

  const hhmm = (t: string) => t.slice(0, 5)
  const aladhanTimes: Omit<PrayerTimes, 'Sunrise'> | null = cached
    ? {
        Fajr:    hhmm(cached.fajr),
        Dhuhr:   hhmm(cached.dhuhr),
        Asr:     hhmm(cached.asr),
        Maghrib: hhmm(cached.maghrib),
        Isha:    hhmm(cached.isha),
      }
    : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>
      <SettingsClient
        profile={profile as Profile}
        aladhanTimes={aladhanTimes}
      />
    </div>
  )
}

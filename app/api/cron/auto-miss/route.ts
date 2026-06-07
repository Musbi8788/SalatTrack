import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getPrayerTimes } from '@/lib/aladhan'
import { PRAYERS, parseTimeToToday } from '@/lib/prayers'
import type { PrayerName } from '@/types'

// Banjul, Gambia — UTC+0, used for all users in Phase 1
const BANJUL_LAT = 13.4549
const BANJUL_LNG = -16.579
const DEFAULT_METHOD = 3

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = createServiceClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // 1. Get prayer times for Banjul (try cache first, then Aladhan)
  const { data: cached } = await service
    .from('prayer_time_cache')
    .select('fajr, dhuhr, asr, maghrib, isha')
    .eq('cache_date', today)
    .eq('lat', BANJUL_LAT)
    .eq('lng', BANJUL_LNG)
    .maybeSingle()

  let banjulTimes: Record<PrayerName, string>

  if (cached) {
    const row = cached as { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }
    banjulTimes = { Fajr: row.fajr, Dhuhr: row.dhuhr, Asr: row.asr, Maghrib: row.maghrib, Isha: row.isha }
  } else {
    try {
      const fetched = await getPrayerTimes(BANJUL_LAT, BANJUL_LNG, today, DEFAULT_METHOD)
      banjulTimes = { Fajr: fetched.Fajr, Dhuhr: fetched.Dhuhr, Asr: fetched.Asr, Maghrib: fetched.Maghrib, Isha: fetched.Isha }
    } catch {
      return NextResponse.json({ error: 'Cannot fetch prayer times — skipping run' }, { status: 503 })
    }
  }

  // 2. Build cutoff map: a prayer is "missed" once the NEXT prayer's time has passed
  //    Isha cutoff: 23:59 (end of day)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const cutoffs: Record<PrayerName, Date> = {
    Fajr:    parseTimeToToday(banjulTimes.Dhuhr),
    Dhuhr:   parseTimeToToday(banjulTimes.Asr),
    Asr:     parseTimeToToday(banjulTimes.Maghrib),
    Maghrib: parseTimeToToday(banjulTimes.Isha),
    Isha:    endOfDay,
  }

  const passedPrayers = PRAYERS.filter((name) => now > cutoffs[name])
  if (passedPrayers.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  // 3. Get all user IDs
  const { data: profiles } = await service.from('profiles').select('id')
  if (!profiles?.length) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  // 4. Insert missed logs for prayers with no existing record (ignoreDuplicates preserves on_time/late)
  const rows = profiles.flatMap((p) =>
    passedPrayers.map((name) => ({
      user_id: (p as { id: string }).id,
      prayer_date: today,
      prayer_name: name,
      scheduled_time: banjulTimes[name],
      status: 'missed' as const,
      logged_at: null as string | null,
    }))
  )

  await service
    .from('prayer_logs')
    .upsert(rows, { onConflict: 'user_id,prayer_date,prayer_name', ignoreDuplicates: true })

  // 5. Also update any rows that are still 'pending' → 'missed'
  await service
    .from('prayer_logs')
    .update({ status: 'missed' })
    .eq('prayer_date', today)
    .eq('status', 'pending')
    .in('prayer_name', passedPrayers)

  return NextResponse.json({ ok: true, processed: rows.length, passedPrayers })
}

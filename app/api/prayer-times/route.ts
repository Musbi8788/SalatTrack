import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getPrayerTimes } from '@/lib/aladhan'
import type { PrayerTimes } from '@/types'

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.coerce.number().int().min(0).max(23).default(3),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Auth check
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate query params
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = QuerySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { lat, lng, date, method } = parsed.data
  // Round to 4 dp to match DECIMAL(9,4) in prayer_time_cache
  const roundedLat = Math.round(lat * 10000) / 10000
  const roundedLng = Math.round(lng * 10000) / 10000

  // 3. Cache lookup (user client — authenticated_read RLS policy allows this)
  const { data: cached } = await supabase
    .from('prayer_time_cache')
    .select('fajr, sunrise, dhuhr, asr, maghrib, isha')
    .eq('cache_date', date)
    .eq('lat', roundedLat)
    .eq('lng', roundedLng)
    .eq('method', method)
    .maybeSingle()

  if (cached) {
    const row = cached as {
      fajr: string
      sunrise: string
      dhuhr: string
      asr: string
      maghrib: string
      isha: string
    }
    return NextResponse.json<PrayerTimes>({
      Fajr: row.fajr,
      Sunrise: row.sunrise,
      Dhuhr: row.dhuhr,
      Asr: row.asr,
      Maghrib: row.maghrib,
      Isha: row.isha,
    })
  }

  // 4. Cache miss — fetch from Aladhan
  let times: PrayerTimes
  try {
    times = await getPrayerTimes(roundedLat, roundedLng, date, method)
  } catch {
    return NextResponse.json(
      { error: 'Prayer times unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  // 5. Persist to cache (service client — service_role INSERT policy required)
  const service = createServiceClient()
  await service.from('prayer_time_cache').insert({
    cache_date: date,
    lat: roundedLat,
    lng: roundedLng,
    method,
    fajr: times.Fajr,
    sunrise: times.Sunrise,
    dhuhr: times.Dhuhr,
    asr: times.Asr,
    maghrib: times.Maghrib,
    isha: times.Isha,
  })
  // Cache write failure is non-fatal — the response is still useful

  return NextResponse.json<PrayerTimes>(times)
}

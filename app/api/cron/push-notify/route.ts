import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

const PRAYER_COLUMNS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
type PrayerColumn = (typeof PRAYER_COLUMNS)[number]

const PRAYER_LABEL: Record<PrayerColumn, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
}

const NOTIFY_WINDOW_MS = 10 * 60 * 1000

function round4dp(n: number): number {
  return Math.round(n * 10000) / 10000
}

function parseTimeToday(timeStr: string): Date {
  const parts = timeStr.split(':')
  const h = parts[0] ? parseInt(parts[0], 10) : 0
  const m = parts[1] ? parseInt(parts[1], 10) : 0
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_SUBJECT ?? 'contact@salattrack.app'}`,
    vapidPublic,
    vapidPrivate,
  )

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, push_subscription, location_lat, location_lng, calculation_method')
    .not('push_subscription', 'is', null)
    .eq('notification_enabled', true)

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  let sent = 0
  let cleared = 0

  for (const user of users ?? []) {
    if (!user.push_subscription) continue

    const lat = round4dp((user.location_lat as number | null) ?? 13.4549)
    const lng = round4dp((user.location_lng as number | null) ?? -16.579)

    const { data: cache } = await supabase
      .from('prayer_time_cache')
      .select('fajr, dhuhr, asr, maghrib, isha')
      .eq('cache_date', today)
      .eq('lat', lat)
      .eq('lng', lng)
      .eq('method', user.calculation_method)
      .single()

    if (!cache) continue

    for (const col of PRAYER_COLUMNS) {
      const timeStr = (cache as Record<string, unknown>)[col]
      if (typeof timeStr !== 'string') continue

      const prayerTime = parseTimeToday(timeStr)
      const diffMs = prayerTime.getTime() - now.getTime()
      if (diffMs < 0 || diffMs > NOTIFY_WINDOW_MS) continue

      const prayerName = PRAYER_LABEL[col]
      const payload = JSON.stringify({
        title: 'SalatTrack',
        body: `It's time for ${prayerName} prayer 🕌`,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        tag: `prayer-${col}-${today}`,
        data: { prayerName, date: today },
      })

      try {
        await webpush.sendNotification(
          user.push_subscription as webpush.PushSubscription,
          payload
        )
        sent++
      } catch (err) {
        // 410 Gone means the subscription has expired — clear it so the user is re-prompted
        if (
          typeof err === 'object' &&
          err !== null &&
          'statusCode' in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          await supabase
            .from('profiles')
            .update({ push_subscription: null })
            .eq('id', user.id)
          cleared++
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, cleared })
}

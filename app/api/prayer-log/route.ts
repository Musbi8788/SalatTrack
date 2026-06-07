import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { determinePrayerStatus } from '@/lib/prayers'
import type { PrayerLog } from '@/types'

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const

const LogPrayerSchema = z.object({
  prayer_name: z.enum(PRAYER_NAMES),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
  log_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
})

const GetLogsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = LogPrayerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { prayer_name, scheduled_time, log_time, notes } = parsed.data

  // Use log_time (user-specified HH:mm) if provided, otherwise use current server time
  let loggedAt = new Date()
  if (log_time) {
    const parts = log_time.split(':')
    const hours = parts[0] ? parseInt(parts[0], 10) : 0
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0
    loggedAt = new Date()
    loggedAt.setHours(hours, minutes, 0, 0)
  }

  const status = determinePrayerStatus(scheduled_time, loggedAt)
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('prayer_logs')
    .upsert(
      {
        user_id: user.id,
        prayer_date: today,
        prayer_name,
        scheduled_time,
        status,
        logged_at: loggedAt.toISOString(),
        notes: notes ?? null,
      },
      { onConflict: 'user_id,prayer_date,prayer_name' }
    )
    .select('id, status, logged_at')
    .single()

  if (error) {
    console.error('[prayer-log POST]', error.code, error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = Object.fromEntries(request.nextUrl.searchParams)
  const parsed = GetLogsSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { date } = parsed.data

  const { data, error } = await supabase
    .from('prayer_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('prayer_date', date)
    .order('prayer_name', { ascending: true })

  if (error) {
    console.error('[prayer-log GET]', error.code, error.message, error.details)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Normalize Postgres TIME columns (HH:MM:SS) to HH:MM
  return NextResponse.json((data as PrayerLog[]).map((log) => ({
    ...log,
    scheduled_time: log.scheduled_time.slice(0, 5),
  })))
}

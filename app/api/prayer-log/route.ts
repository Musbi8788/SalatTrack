import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { determinePrayerStatus } from '@/lib/prayers'
import type { PrayerLog } from '@/types'

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const

const LogPrayerSchema = z.object({
  prayer_name: z.enum(PRAYER_NAMES),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/),
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

  const { prayer_name, scheduled_time, notes } = parsed.data
  const loggedAt = new Date()
  const status = determinePrayerStatus(scheduled_time, loggedAt)
  const today = loggedAt.toISOString().slice(0, 10)

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data as PrayerLog[])
}

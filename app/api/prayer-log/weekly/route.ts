import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { DayLogs, PrayerLog } from '@/types'

const WeeklySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number)
  const y = parts[0] ?? 2026
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
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
  const parsed = WeeklySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { start } = parsed.data
  const end = addDays(start, 6)

  const { data, error } = await supabase
    .from('prayer_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('prayer_date', start)
    .lte('prayer_date', end)
    .order('prayer_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const logs = (data ?? []) as PrayerLog[]
  const grouped = new Map<string, PrayerLog[]>()
  for (const log of logs) {
    const existing = grouped.get(log.prayer_date) ?? []
    existing.push(log)
    grouped.set(log.prayer_date, existing)
  }

  // Normalize Postgres TIME columns (HH:MM:SS) to HH:MM
  const result: DayLogs[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const logs = (grouped.get(date) ?? []).map((log) => ({
      ...log,
      scheduled_time: log.scheduled_time.slice(0, 5),
    }))
    return { date, logs }
  })

  return NextResponse.json(result)
}

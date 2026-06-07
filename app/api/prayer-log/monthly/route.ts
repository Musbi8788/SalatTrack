import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { PrayerLog } from '@/types'

const MonthlySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2024).max(2100),
})

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
  const parsed = MonthlySchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { month, year } = parsed.data
  const mm = String(month).padStart(2, '0')
  const start = `${year}-${mm}-01`
  // Last day: 0th day of next month = last day of this month
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

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

  // Normalize Postgres TIME columns (HH:MM:SS) to HH:MM
  return NextResponse.json((data as PrayerLog[]).map((log) => ({
    ...log,
    scheduled_time: log.scheduled_time.slice(0, 5),
  })))
}

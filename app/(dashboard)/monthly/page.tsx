import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PrayerCalendar } from '@/components/prayer/PrayerCalendar'
import { PrayerStats } from '@/components/prayer/PrayerStats'
import { getMonthlyStats } from '@/lib/prayers'
import type { PrayerLog } from '@/types'

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { month: monthParam, year: yearParam } = await searchParams

  const now = new Date()
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()

  // Validate parsed values
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2024) {
    redirect('/monthly')
  }

  const today = now.toISOString().slice(0, 10)
  const mm = String(month).padStart(2, '0')
  const start = `${year}-${mm}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('prayer_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('prayer_date', start)
    .lte('prayer_date', end)
    .order('prayer_date', { ascending: true })

  const logs = (data ?? []) as PrayerLog[]
  const stats = getMonthlyStats(logs)

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      <h1 className="text-xl font-semibold text-text-primary">Monthly Overview</h1>

      <PrayerCalendar logs={logs} month={month} year={year} today={today} />

      <div>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
          Stats
        </h2>
        <PrayerStats stats={stats} />
      </div>
    </div>
  )
}

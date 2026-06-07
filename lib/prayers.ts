import type { MonthlyStats, PrayerLog, PrayerName, PrayerStatus } from '@/types'

export const PRAYERS: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

// Returns a Date object for today at the given 'HH:mm' time
export function parseTimeToToday(timeStr: string): Date {
  const parts = timeStr.split(':')
  const hours = parts[0] ? parseInt(parts[0], 10) : 0
  const minutes = parts[1] ? parseInt(parts[1], 10) : 0
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Within 15 minutes of the scheduled time = on_time; after = late
export function determinePrayerStatus(
  scheduledTime: string,  // 'HH:mm'
  loggedAt: Date
): Exclude<PrayerStatus, 'missed' | 'pending'> {
  const scheduled = parseTimeToToday(scheduledTime)
  const diffMinutes = (loggedAt.getTime() - scheduled.getTime()) / 60_000
  return diffMinutes <= 15 ? 'on_time' : 'late'
}

// Returns the prayer that follows `current`, or null for Isha
export function getNextPrayer(current: PrayerName): PrayerName | null {
  const idx = PRAYERS.indexOf(current)
  if (idx === -1 || idx === PRAYERS.length - 1) return null
  return PRAYERS[idx + 1] ?? null
}

// Computes aggregate stats for a set of prayer logs (typically one month)
export function getMonthlyStats(logs: PrayerLog[]): MonthlyStats {
  const settled = logs.filter(l => l.status !== 'pending')
  const total = settled.length
  const onTime = settled.filter(l => l.status === 'on_time').length
  const late = settled.filter(l => l.status === 'late').length
  const missed = settled.filter(l => l.status === 'missed').length
  const consistency = total > 0 ? Math.round(((onTime + late) / total) * 100) : 0

  // Group by date for streak calculation
  const byDate = new Map<string, PrayerLog[]>()
  for (const log of settled) {
    const arr = byDate.get(log.prayer_date) ?? []
    arr.push(log)
    byDate.set(log.prayer_date, arr)
  }

  const sortedDates = Array.from(byDate.keys()).sort()

  // A day is a streak day when all 5 prayers are on_time or late (none missed)
  const isStreakDay = (date: string): boolean => {
    const dayLogs = byDate.get(date) ?? []
    return dayLogs.length === 5 && dayLogs.every(l => l.status === 'on_time' || l.status === 'late')
  }

  // Longest streak (scan forward)
  let longestStreak = 0
  let currentRun = 0
  for (const date of sortedDates) {
    if (isStreakDay(date)) {
      currentRun++
      if (currentRun > longestStreak) longestStreak = currentRun
    } else {
      currentRun = 0
    }
  }

  // Current streak (scan backward from today)
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const date = sortedDates[i]
    if (!date || date > today) continue
    if (isStreakDay(date)) {
      streak++
    } else {
      break
    }
  }

  // Per-prayer on_time+late rate for best/worst calculation
  const prayerRates = PRAYERS.map(name => {
    const prayerLogs = settled.filter(l => l.prayer_name === name)
    if (prayerLogs.length === 0) return null
    const prayed = prayerLogs.filter(l => l.status !== 'missed').length
    return { name, rate: prayed / prayerLogs.length }
  }).filter((p): p is { name: PrayerName; rate: number } => p !== null)

  const bestPrayer: PrayerName | null =
    prayerRates.length > 0
      ? prayerRates.reduce((a, b) => (b.rate > a.rate ? b : a)).name
      : null

  const worstPrayer: PrayerName | null =
    prayerRates.length > 0
      ? prayerRates.reduce((a, b) => (b.rate < a.rate ? b : a)).name
      : null

  return { total, onTime, late, missed, consistency, streak, longestStreak, bestPrayer, worstPrayer }
}

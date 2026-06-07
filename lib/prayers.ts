import type { PrayerName, PrayerStatus } from '@/types'

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

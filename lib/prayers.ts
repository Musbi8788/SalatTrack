import type { PrayerName } from '@/types'

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

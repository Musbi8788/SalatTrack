import type { PrayerTimes } from '@/types'

interface AladhanTimings {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

function isAladhanTimings(obj: unknown): obj is AladhanTimings {
  if (typeof obj !== 'object' || obj === null) return false
  const t = obj as Record<string, unknown>
  return (
    typeof t['Fajr'] === 'string' &&
    typeof t['Sunrise'] === 'string' &&
    typeof t['Dhuhr'] === 'string' &&
    typeof t['Asr'] === 'string' &&
    typeof t['Maghrib'] === 'string' &&
    typeof t['Isha'] === 'string'
  )
}

// Strip any timezone suffix Aladhan occasionally appends, e.g. "05:23 (ADT)" → "05:23"
function stripTz(t: string): string {
  return t.split(' ')[0] ?? t
}

export async function getPrayerTimes(
  lat: number,
  lng: number,
  date: string,   // 'YYYY-MM-DD'
  method: number
): Promise<PrayerTimes> {
  const parts = date.split('-')
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (!year || !month || !day) throw new Error('Invalid date format')

  // Aladhan requires DD-MM-YYYY in the path
  const aladhanDate = `${day}-${month}-${year}`
  const url =
    `https://api.aladhan.com/v1/timings/${aladhanDate}` +
    `?latitude=${lat}&longitude=${lng}&method=${method}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Aladhan API returned ${res.status}`)

  const json: unknown = await res.json()
  if (typeof json !== 'object' || json === null) {
    throw new Error('Aladhan API: unexpected response')
  }

  const payload = json as { code?: number; data?: { timings?: unknown } }
  if (payload.code !== 200) throw new Error(`Aladhan API code ${payload.code ?? 'unknown'}`)

  const { timings } = payload.data ?? {}
  if (!isAladhanTimings(timings)) {
    throw new Error('Aladhan API: timings missing required fields')
  }

  return {
    Fajr: stripTz(timings.Fajr),
    Sunrise: stripTz(timings.Sunrise),
    Dhuhr: stripTz(timings.Dhuhr),
    Asr: stripTz(timings.Asr),
    Maghrib: stripTz(timings.Maghrib),
    Isha: stripTz(timings.Isha),
  }
}

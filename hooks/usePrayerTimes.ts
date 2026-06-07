'use client'

import { useState, useEffect } from 'react'
import type { PrayerTimes } from '@/types'

interface UsePrayerTimesState {
  data: PrayerTimes | null
  loading: boolean
  error: string | null
}

export function usePrayerTimes(
  lat: number,
  lng: number,
  date: string,     // 'YYYY-MM-DD'
  method: number,
  enabled: boolean  // prevents fetch while location is still resolving
): UsePrayerTimesState {
  const [state, setState] = useState<UsePrayerTimesState>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!enabled) return

    setState({ data: null, loading: true, error: null })

    const controller = new AbortController()
    const url = `/api/prayer-times?lat=${lat}&lng=${lng}&date=${date}&method=${method}`

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          throw new Error(body.error ?? 'Failed to load prayer times')
        }
        return res.json() as Promise<PrayerTimes>
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        const message =
          err instanceof Error ? err.message : 'Failed to load prayer times'
        setState({ data: null, loading: false, error: message })
      })

    return () => controller.abort()
  }, [lat, lng, date, method, enabled])

  return state
}

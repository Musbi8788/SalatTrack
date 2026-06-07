'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PrayerName, PrayerStatus } from '@/types'

export interface PrayerLogEntry {
  id: string
  status: PrayerStatus
  logged_at: string | null
}

export type PrayerLogsMap = Partial<Record<PrayerName, PrayerLogEntry>>

interface UsePrayerLogsState {
  logs: PrayerLogsMap
  loading: boolean
  error: string | null
}

export function usePrayerLogs(date: string): UsePrayerLogsState & {
  addLog: (name: PrayerName, entry: PrayerLogEntry) => void
} {
  const [state, setState] = useState<UsePrayerLogsState>({
    logs: {},
    loading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    setState({ logs: {}, loading: true, error: null })

    fetch(`/api/prayer-log?date=${date}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string }
          throw new Error(body.error ?? 'Failed to load prayer logs')
        }
        return res.json() as Promise<Array<{ id: string; prayer_name: PrayerName; status: PrayerStatus; logged_at: string | null }>>
      })
      .then((rows) => {
        const logs: PrayerLogsMap = {}
        for (const row of rows) {
          logs[row.prayer_name] = { id: row.id, status: row.status, logged_at: row.logged_at }
        }
        setState({ logs, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Failed to load prayer logs'
        setState({ logs: {}, loading: false, error: message })
      })

    return () => controller.abort()
  }, [date])

  const addLog = useCallback((name: PrayerName, entry: PrayerLogEntry) => {
    setState((prev) => ({
      ...prev,
      logs: { ...prev.logs, [name]: entry },
    }))
  }, [])

  return { ...state, addLog }
}

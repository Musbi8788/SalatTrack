export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type PrayerStatus = 'on_time' | 'late' | 'missed' | 'pending'

export interface Profile {
  id: string
  full_name: string
  email: string
  location_lat: number | null
  location_lng: number | null
  city_name: string | null
  calculation_method: number
  notification_enabled: boolean
  email_notification: boolean
  push_subscription: PushSubscriptionJSON | null
  created_at: string
  updated_at: string
}

export interface PrayerLog {
  id: string
  user_id: string
  prayer_date: string         // 'YYYY-MM-DD'
  prayer_name: PrayerName
  scheduled_time: string      // 'HH:mm'
  status: PrayerStatus
  logged_at: string | null    // ISO timestamp
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PrayerTimes {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

export interface DayLogs {
  date: string                // 'YYYY-MM-DD'
  logs: PrayerLog[]
}

export interface MonthlyStats {
  total: number
  onTime: number
  late: number
  missed: number
  consistency: number         // 0–100 percentage
  streak: number              // current streak in days
  longestStreak: number
  bestPrayer: PrayerName | null
  worstPrayer: PrayerName | null
}

export interface AIAnalysisLog {
  id: string
  period_start: string        // 'YYYY-MM-DD'
  period_end: string          // 'YYYY-MM-DD'
  analysis_text: string
  model_used: string
  created_at: string
}

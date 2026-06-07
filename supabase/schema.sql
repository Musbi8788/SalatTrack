-- SalatTrack — Initial Database Schema
-- Run this in your Supabase project → SQL Editor
-- All 4 tables + RLS policies

-- ── Table: profiles ──────────────────────────────────────────────────────────
-- Extends Supabase Auth auth.users. Auto-populated by trigger in Phase 1.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  location_lat DECIMAL,
  location_lng DECIMAL,
  city_name TEXT,
  calculation_method INTEGER DEFAULT 3, -- 3 = Muslim World League (Aladhan method)
  notification_enabled BOOLEAN DEFAULT TRUE,
  email_notification BOOLEAN DEFAULT TRUE,
  push_subscription JSONB,              -- Added in Phase 5 (P5.3)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Table: prayer_logs ────────────────────────────────────────────────────────
-- One row per prayer per day per user. UNIQUE constraint prevents duplicates.
CREATE TABLE IF NOT EXISTS prayer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prayer_date DATE NOT NULL,            -- e.g. '2026-06-05'
  prayer_name TEXT NOT NULL             -- 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
    CHECK (prayer_name IN ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha')),
  scheduled_time TIME NOT NULL,         -- Snapshot from Aladhan API at log time
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('on_time', 'late', 'missed', 'pending')),
  logged_at TIMESTAMPTZ,                -- NULL until user taps "I Prayed"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, prayer_date, prayer_name)
);

-- Fast queries by user + date (used on every dashboard load)
CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_date
  ON prayer_logs (user_id, prayer_date);

-- Fast queries for cron auto-miss job (pending logs across all users)
CREATE INDEX IF NOT EXISTS idx_prayer_logs_status_date
  ON prayer_logs (status, prayer_date);

-- ── Table: prayer_time_cache ──────────────────────────────────────────────────
-- Caches Aladhan API responses. UNIQUE prevents duplicate fetches.
CREATE TABLE IF NOT EXISTS prayer_time_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_date DATE NOT NULL,
  lat DECIMAL(9, 4) NOT NULL,           -- Rounded to 4dp (~11m precision)
  lng DECIMAL(9, 4) NOT NULL,
  method INTEGER NOT NULL,
  fajr TIME NOT NULL,
  sunrise TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cache_date, lat, lng, method)
);

-- ── Table: ai_analysis_logs ───────────────────────────────────────────────────
-- Stores AI suggestion history per user.
CREATE TABLE IF NOT EXISTS ai_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  analysis_text TEXT NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_time_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;

-- profiles: users read/write only their own row
CREATE POLICY "profiles_own_data" ON profiles
  FOR ALL USING (auth.uid() = id);

-- prayer_logs: users read/write only their own logs
CREATE POLICY "prayer_logs_own_data" ON prayer_logs
  FOR ALL USING (auth.uid() = user_id);

-- prayer_time_cache: all authenticated users can SELECT; only service role can INSERT
-- (INSERT is done via the service client in /api/prayer-times)
CREATE POLICY "prayer_time_cache_read" ON prayer_time_cache
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "prayer_time_cache_insert_service" ON prayer_time_cache
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ai_analysis_logs: users read/write only their own entries
CREATE POLICY "ai_analysis_logs_own_data" ON ai_analysis_logs
  FOR ALL USING (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER prayer_logs_updated_at
  BEFORE UPDATE ON prayer_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

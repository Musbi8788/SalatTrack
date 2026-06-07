-- SalatTrack — prayer_logs table fix
-- Run this in Supabase Dashboard → SQL Editor if the "I Prayed" button returns errors.
-- It is safe to run multiple times (idempotent).

-- 1. Create the table if it was never created
CREATE TABLE IF NOT EXISTS prayer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prayer_date DATE NOT NULL,
  prayer_name TEXT NOT NULL
    CHECK (prayer_name IN ('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha')),
  scheduled_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('on_time', 'late', 'missed', 'pending')),
  logged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, prayer_date, prayer_name)
);

CREATE INDEX IF NOT EXISTS idx_prayer_logs_user_date
  ON prayer_logs (user_id, prayer_date);

CREATE INDEX IF NOT EXISTS idx_prayer_logs_status_date
  ON prayer_logs (status, prayer_date);

ALTER TABLE prayer_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate the RLS policy with explicit WITH CHECK
--    (fixes INSERT failures in some Supabase configurations)
DROP POLICY IF EXISTS "prayer_logs_own_data" ON prayer_logs;

CREATE POLICY "prayer_logs_own_data" ON prayer_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Create the updated_at trigger if missing
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prayer_logs_updated_at ON prayer_logs;
CREATE TRIGGER prayer_logs_updated_at
  BEFORE UPDATE ON prayer_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Verify: run this SELECT — it should return 0 rows (empty) not an error
SELECT count(*) AS prayer_logs_row_count FROM prayer_logs;

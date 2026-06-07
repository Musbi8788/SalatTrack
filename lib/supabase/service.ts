import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS.
// ONLY use this in cron routes (/api/cron/*).
// Never expose to client-side code or non-cron API routes.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

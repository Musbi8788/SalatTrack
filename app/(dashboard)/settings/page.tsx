import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from './SettingsClient'
import type { Profile } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, location_lat, location_lng, city_name, calculation_method, notification_enabled, email_notification'
    )
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>
      <SettingsClient profile={profile as Profile} />
    </div>
  )
}

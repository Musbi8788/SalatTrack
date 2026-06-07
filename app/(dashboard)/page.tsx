import { createClient } from '@/lib/supabase/server'
import { MapPinIcon } from '@/components/icons'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name, city_name').eq('id', user.id).single()
    : { data: null }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Friend'
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Assalamu Alaikum, {firstName} 🌙
        </h1>
        <p className="text-sm text-text-muted mt-0.5">{today}</p>
      </div>

      {/* Location pill */}
      <div className="inline-flex items-center gap-1.5 bg-raised border border-subtle rounded-full px-3 py-1">
        <MapPinIcon size={12} className="text-brand-blue" />
        <span className="text-xs text-brand-blue">
          {profile?.city_name ?? 'Banjul, Gambia'}
        </span>
      </div>

      {/* Prayer times placeholder */}
      <div className="bg-surface border border-subtle rounded-2xl p-6 text-center space-y-2">
        <p className="text-text-secondary text-sm font-medium">Prayer times loading in Phase 2</p>
        <p className="text-text-muted text-xs">
          Fajr · Dhuhr · Asr · Maghrib · Isha
        </p>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('full_name, location_lat, location_lng, city_name, calculation_method')
        .eq('id', user.id)
        .single()
    : { data: null }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Friend'

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // 'YYYY-MM-DD' for the prayer-times API
  const todayDate = new Date().toISOString().slice(0, 10)

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Assalamu Alaikum, {firstName} 🌙
        </h1>
        <p className="text-sm text-text-muted mt-0.5">{today}</p>
      </div>

      {/* Prayer times — client component handles geolocation + fetch */}
      <DashboardClient
        initialLat={profile?.location_lat ?? null}
        initialLng={profile?.location_lng ?? null}
        initialCityName={profile?.city_name ?? null}
        method={profile?.calculation_method ?? 3}
        todayDate={todayDate}
      />
    </div>
  )
}

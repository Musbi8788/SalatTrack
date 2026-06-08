import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
const HH_MM = /^\d{2}:\d{2}$/

/** Each prayer key is optional; null clears the override for that prayer. */
const PrayerTimeOverridesSchema = z
  .object({
    Fajr:    z.string().regex(HH_MM).nullable().optional(),
    Dhuhr:   z.string().regex(HH_MM).nullable().optional(),
    Asr:     z.string().regex(HH_MM).nullable().optional(),
    Maghrib: z.string().regex(HH_MM).nullable().optional(),
    Isha:    z.string().regex(HH_MM).nullable().optional(),
  })
  .optional()

const SettingsSchema = z.object({
  full_name:              z.string().min(2).max(100).optional(),
  location_lat:           z.number().min(-90).max(90).nullable().optional(),
  location_lng:           z.number().min(-180).max(180).nullable().optional(),
  city_name:              z.string().max(100).nullable().optional(),
  calculation_method:     z.number().int().min(0).max(23).optional(),
  notification_enabled:   z.boolean().optional(),
  email_notification:     z.boolean().optional(),
  prayer_time_overrides:  PrayerTimeOverridesSchema,
})

/** Strips null values from overrides so we only store active overrides in the JSONB.
 *  Null entries from the client mean "clear this prayer's override". */
function sanitiseOverrides(
  raw: z.infer<typeof PrayerTimeOverridesSchema>
): Record<string, string> | null | undefined {
  if (raw === undefined) return undefined
  const cleaned: Record<string, string> = {}
  for (const key of PRAYER_NAMES) {
    const val = raw[key]
    if (val != null) cleaned[key] = val
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: unknown = await request.json()
  const parsed = SettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { prayer_time_overrides: rawOverrides, ...rest } = parsed.data
  const updatePayload: Record<string, unknown> = { ...rest }
  const sanitised = sanitiseOverrides(rawOverrides)
  if (sanitised !== undefined) {
    updatePayload.prayer_time_overrides = sanitised
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select(
      'id, full_name, location_lat, location_lng, city_name, calculation_method, notification_enabled, email_notification, prayer_time_overrides'
    )
    .single()

  if (error) {
    console.error('[settings PATCH]', error.code, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const SettingsSchema = z.object({
  full_name:            z.string().min(2).max(100).optional(),
  location_lat:         z.number().min(-90).max(90).nullable().optional(),
  location_lng:         z.number().min(-180).max(180).nullable().optional(),
  city_name:            z.string().max(100).nullable().optional(),
  calculation_method:   z.number().int().min(0).max(23).optional(),
  notification_enabled: z.boolean().optional(),
  email_notification:   z.boolean().optional(),
})

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

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', user.id)
    .select(
      'id, full_name, location_lat, location_lng, city_name, calculation_method, notification_enabled, email_notification'
    )
    .single()

  if (error) {
    console.error('[settings PATCH]', error.code, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

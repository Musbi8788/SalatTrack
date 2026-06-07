import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const PatchSchema = z.object({
  status: z.enum(['on_time', 'late', 'missed', 'pending']).optional(),
  notes: z.string().max(500).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const body: unknown = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (!parsed.data.status && parsed.data.notes === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // RLS policy (prayer_logs_own_data) ensures the row belongs to the user
  const { data, error } = await supabase
    .from('prayer_logs')
    .update({ ...parsed.data })
    .eq('id', id)
    .select('id, status, logged_at, notes')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

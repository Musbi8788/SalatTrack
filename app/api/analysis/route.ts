import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getMonthlyStats } from '@/lib/prayers'
import { fetchAnalysisStream } from '@/lib/openrouter'
import type { PrayerLog } from '@/types'

const MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001'

export async function POST(): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const periodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const { data: logs, error: logsError } = await supabase
    .from('prayer_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('prayer_date', periodStart)
    .lte('prayer_date', today)
    .order('prayer_date', { ascending: true })

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 })
  }

  const typedLogs = (logs ?? []) as PrayerLog[]

  if (typedLogs.filter((l) => l.status !== 'pending').length === 0) {
    return NextResponse.json(
      { error: 'No prayer logs found — log some prayers first.' },
      { status: 422 }
    )
  }

  const stats = getMonthlyStats(typedLogs)

  const openrouterRes = await fetchAnalysisStream(typedLogs, stats, MODEL)

  if (!openrouterRes.ok || !openrouterRes.body) {
    return NextResponse.json(
      { error: `OpenRouter error ${openrouterRes.status}` },
      { status: 502 }
    )
  }

  // Accumulate text as chunks flow through, then save via after()
  let fullText = ''

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      controller.enqueue(chunk)
      const text = new TextDecoder().decode(chunk)
      for (const line of text.split('\n')) {
        if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') continue
        try {
          const parsed = JSON.parse(line.slice(6)) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          fullText += parsed.choices?.[0]?.delta?.content ?? ''
        } catch {}
      }
    },
  })

  // Save to ai_analysis_logs after streaming finishes
  after(async () => {
    if (!fullText.trim()) return
    const service = createServiceClient()
    await service.from('ai_analysis_logs').insert({
      user_id: user.id,
      period_start: periodStart,
      period_end: today,
      analysis_text: fullText.trim(),
      model_used: MODEL,
    })
  })

  openrouterRes.body.pipeTo(writable).catch(() => {})

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

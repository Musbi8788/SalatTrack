import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const

interface PrayerLogRow {
  prayer_name: string
  status: string
  scheduled_time: string
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email_notification', true)

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  let sent = 0

  for (const user of users ?? []) {
    const { data: logs } = await supabase
      .from('prayer_logs')
      .select('prayer_name, status, scheduled_time')
      .eq('user_id', user.id)
      .eq('prayer_date', today)

    const hasMissed = logs?.some((l) => l.status === 'missed' || l.status === 'pending')
    if (!hasMissed) continue

    const firstName = (user.full_name as string | null)?.split(' ')[0] ?? 'Friend'
    const dateLabel = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const { error: sendError } = await resend.emails.send({
      from: 'SalatTrack <noreply@salattrack.app>',
      to: user.email as string,
      subject: `Your Prayer Summary for ${today}`,
      html: buildEmailHtml(firstName, dateLabel, (logs ?? []) as PrayerLogRow[]),
    })

    if (!sendError) sent++
  }

  return NextResponse.json({ ok: true, sent })
}

function statusLabel(status: string): string {
  switch (status) {
    case 'on_time': return '✓ On Time'
    case 'late':    return '⏰ Late'
    case 'missed':  return '✗ Missed'
    default:        return '— Pending'
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'on_time': return '#4FC3F7'
    case 'late':    return '#F59E0B'
    case 'missed':  return '#E05A5A'
    default:        return '#7070A0'
  }
}

function buildEmailHtml(firstName: string, dateLabel: string, logs: PrayerLogRow[]): string {
  const logsByName = new Map(logs.map((l) => [l.prayer_name, l]))

  const prayerRows = PRAYER_ORDER.map((name) => {
    const log = logsByName.get(name)
    const status = log?.status ?? 'pending'
    const time = log?.scheduled_time.slice(0, 5) ?? '—'
    const label = statusLabel(status)
    const color = statusColor(status)

    return `
      <tr>
        <td style="padding:10px 0;font-size:14px;color:#E8E8F0;border-bottom:1px solid #2A2A42">
          ${name}
          <span style="font-size:12px;color:#7070A0;margin-left:6px">${time}</span>
        </td>
        <td style="padding:10px 0;text-align:right;font-size:13px;color:${color};
                   font-weight:600;border-bottom:1px solid #2A2A42">
          ${label}
        </td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Prayer Summary</title>
</head>
<body style="margin:0;padding:0;background:#080810;font-family:system-ui,sans-serif;color:#E8E8F0">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px">
    <h1 style="color:#4FC3F7;font-size:20px;margin:0 0 4px">🌙 SalatTrack</h1>
    <p style="color:#7070A0;font-size:13px;margin:0 0 24px">${dateLabel}</p>
    <p style="font-size:15px;margin:0 0 16px">Assalamu Alaikum, <strong>${firstName}</strong></p>
    <p style="font-size:14px;color:#7070A0;margin:0 0 24px">
      Here is your prayer summary for today. Keep striving — every prayer counts.
    </p>
    <div style="background:#12121E;border:1px solid #2A2A42;border-radius:12px;padding:16px">
      <p style="font-size:12px;color:#7070A0;margin:0 0 12px;text-transform:uppercase;letter-spacing:.05em">
        Today's Prayers
      </p>
      <table style="width:100%;border-collapse:collapse">
        ${prayerRows}
      </table>
    </div>
    <p style="font-size:12px;color:#3A3A58;margin:24px 0 0;text-align:center">
      Manage email preferences in your SalatTrack settings.
    </p>
  </div>
</body>
</html>`
}

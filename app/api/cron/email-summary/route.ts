import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
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
    // TODO(Phase 3): Query prayer_logs to filter only users with missed/pending prayers today.
    // Uncomment and fill in once prayer_logs route is merged:
    //
    //   const { data: logs } = await supabase
    //     .from('prayer_logs')
    //     .select('prayer_name, status, scheduled_time')
    //     .eq('user_id', user.id)
    //     .eq('prayer_date', today)
    //
    //   const hasMissed = logs?.some((l) => l.status === 'missed' || l.status === 'pending')
    //   if (!hasMissed) continue
    //
    // Remove the line below once the TODO above is wired up:
    const hasMissed = true

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
      html: buildEmailHtml(firstName, dateLabel),
    })

    if (!sendError) sent++
  }

  return NextResponse.json({ ok: true, sent })
}

function buildEmailHtml(firstName: string, dateLabel: string): string {
  const prayerRows = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
    .map(
      (p) => `
      <tr>
        <td style="padding:10px 0;font-size:14px;color:#E8E8F0;border-bottom:1px solid #2A2A42">${p}</td>
        <td style="padding:10px 0;text-align:right;font-size:13px;color:#7070A0;border-bottom:1px solid #2A2A42">
          See app for details
        </td>
      </tr>`
    )
    .join('')

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

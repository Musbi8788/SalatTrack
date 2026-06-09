import type { PrayerLog, MonthlyStats } from '@/types'
import { PRAYERS } from '@/lib/prayers'

const SYSTEM_PROMPT = `You are a prayer habit coach helping a Muslim improve their daily prayer consistency. Your role is strictly analytical and motivational.

You are NOT an Islamic scholar, mufti, or imam. Never:
- Issue religious rulings (fatwas) or cite fiqh opinions
- Declare a prayer valid, invalid, accepted, or rejected
- State or imply that the user is sinful, blameworthy, or deficient in their deen
- Claim to speak on behalf of Islamic scholarship or any religious authority
- Use shaming, condemning, or discouraging language — never use words like "failed", "poor", or "inconsistent" to describe the person

Your focus:
- Identify behavioral patterns and scheduling trends from the data
- Highlight which prayers consistently need more attention
- Suggest practical, concrete adjustments to daily schedule, sleep, and routine
- Offer warm, encouraging motivation for building greater consistency

Tone: compassionate, non-judgmental, and practical. Use phrases like "area for growth", "opportunity for consistency", "possible contributing factor" — never language that judges the person's character or spiritual standing.

Be concise (150–200 words). Format with clear Markdown sections. Reference specific patterns from the data — avoid generic advice. Use Islamic greetings where natural.`

function buildPrompt(logs: PrayerLog[], stats: MonthlyStats): string {
  const settled = logs.filter((l) => l.status !== 'pending')

  const prayerBreakdown = PRAYERS.map((name) => {
    const pl = settled.filter((l) => l.prayer_name === name)
    if (pl.length === 0) return `- **${name}**: no data`
    const onTime = pl.filter((l) => l.status === 'on_time').length
    const late = pl.filter((l) => l.status === 'late').length
    const missed = pl.filter((l) => l.status === 'missed').length
    const successPct = Math.round(((onTime + late) / pl.length) * 100)
    return `- **${name}**: ${onTime} on-time, ${late} late, ${missed} missed (${successPct}% success)`
  }).join('\n')

  // Last 7 distinct prayer dates
  const recentDates = [
    ...new Set(settled.map((l) => l.prayer_date)),
  ].sort().slice(-7)

  const recentPattern = recentDates.map((date) => {
    const dayLogs = settled.filter((l) => l.prayer_date === date)
    const statuses = PRAYERS.map((p) => {
      const log = dayLogs.find((l) => l.prayer_name === p)
      return `${p}(${log?.status ?? 'pending'})`
    }).join(' ')
    return `${date}: ${statuses}`
  }).join('\n')

  return `Here is my prayer record for the past 30 days:

**Overall Statistics**
- On time: ${stats.onTime} | Late: ${stats.late} | Missed: ${stats.missed}
- Consistency (on-time + late): ${stats.consistency}%
- Current streak: ${stats.streak} days | Longest streak: ${stats.longestStreak} days
- Most consistent prayer: ${stats.bestPrayer ?? 'N/A'} | Most challenging prayer: ${stats.worstPrayer ?? 'N/A'}

**Per-Prayer Breakdown (30 days)**
${prayerBreakdown}

**Recent 7-Day Pattern**
${recentPattern}

Please provide:
1. A brief overall assessment
2. Specific encouragement and practical tips for my most challenging prayer(s)
3. One practical tip to improve consistency`
}

export async function fetchAnalysisStream(
  logs: PrayerLog[],
  stats: MonthlyStats,
  model: string,
): Promise<Response> {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://salattrack-gamma.vercel.app',
      'X-Title': 'SalatTrack',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(logs, stats) },
      ],
      stream: true,
    }),
  })
}

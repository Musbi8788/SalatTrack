# SalatTrack — System Design

## Core Design Principles

1. **Mobile-first, offline-capable.** Dashboard must render from cache when offline.
2. **Eventually consistent is fine.** Prayer log status can be a few minutes stale. No need for realtime subscriptions in Phase 1.
3. **Server is the source of truth.** Optimistic UI updates on the client, but server always wins on refresh.
4. **Minimal client state.** Prefer server-rendered pages with React Server Components over complex client state stores.

---

## Key Design Decisions

### Decision 1: Prayer Time Caching Strategy

**Problem:** Aladhan API is a free external service with no SLA. Calling it on every dashboard load would be unreliable.

**Solution:** Cache prayer times in the `prayer_time_cache` Supabase table. Cache key = `(cache_date, lat rounded to 4dp, lng rounded to 4dp, method)`. Cache is written once per day per unique location. TTL is implicit — `cache_date` is always the current date.

**Cache lookup flow:**
```
GET /api/prayer-times?lat=13.4549&lng=-16.5790&date=2026-06-07&method=3
  1. Round lat/lng to 4 decimal places (~11m precision, sufficient)
  2. Query prayer_time_cache WHERE cache_date = $date AND lat = $lat AND lng = $lng AND method = $method
  3. HIT  → return row immediately (~5ms)
  4. MISS → fetch https://api.aladhan.com/v1/timings/07-06-2026?latitude=...
           → insert into prayer_time_cache
           → return data
```

**Why DB cache not in-memory:** Vercel serverless functions are stateless and ephemeral. In-memory cache doesn't survive across requests.

---

### Decision 2: Prayer Status State Machine

Each prayer log moves through these states:

```
                    ┌─────────┐
                    │ pending │  ← initial state (no log row yet, or row with pending)
                    └────┬────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    User logs       User logs      Cron detects
    ≤ 15 min        > 15 min       window passed,
    after time      after time     no log exists
          │              │              │
     ┌────▼────┐   ┌─────▼────┐  ┌─────▼─────┐
     │ on_time │   │   late   │  │  missed   │
     └─────────┘   └──────────┘  └───────────┘
```

**Rules:**
- A user can update their status **any time before midnight** (for today's prayers).
- After midnight, logs are frozen. Historical data is read-only.
- The `pending` state means the prayer time has arrived but the user hasn't tapped yet.
- `missed` is set by the cron job, not by the user. Users cannot manually mark a prayer as missed — it happens automatically.

**Implementation note:** There is no `prayer_logs` row until either the user logs or the cron runs. When the dashboard loads, it generates the 5 prayer slots from prayer times, then merges with any existing log rows. Missing rows = `pending`.

---

### Decision 3: Auto-Miss Detection

**Problem:** Detecting missed prayers requires checking every user's logs every few minutes.

**Cron frequency:** Every 30 minutes is sufficient. A prayer window is at minimum ~1 hour, so 30-minute granularity means at worst 30 minutes delay before a prayer is marked missed. This is acceptable.

**Cron logic:**
```sql
-- Pseudocode for auto-miss cron
-- Get all prayer_logs rows for today with status = 'pending'
-- where the next prayer's scheduled_time has already passed (in user's local timezone)

-- For Isha specifically: mark missed if current UTC time > midnight

-- This is tricky because scheduled_time is local time, users may be in different timezones
-- Solution: store scheduled_time + user timezone in prayer_logs
--   OR: only support single timezone (Banjul, Africa/Banjul = UTC+0) in Phase 1
```

**Phase 1 simplification:** All users are assumed to be in Banjul (UTC+0 / GMT). This eliminates timezone complexity. Multi-timezone support is a Phase 2+ concern.

---

### Decision 4: Push Notification Architecture

```
Cron runs every 5 minutes
  → Query: which prayers are due in the next 10 minutes (across all users)?
  → For each due prayer: fetch the user's push_subscription from profiles
  → Call web-push.sendNotification(subscription, payload)
  → Log success/failure (update profiles.last_push_at)
```

**Web Push payload:**
```json
{
  "title": "SalatTrack",
  "body": "It's time for Asr prayer 🕌",
  "icon": "/icons/icon-192.png",
  "badge": "/icons/badge-72.png",
  "tag": "prayer-asr-2026-06-07",
  "data": { "prayerName": "Asr", "date": "2026-06-07" }
}
```

**Tag** prevents duplicate notifications: if the same tag is sent twice, the second replaces the first in the notification tray.

**Failure handling:** If `sendNotification` throws a 410 Gone error, the user's push subscription has expired. Remove it from `profiles.push_subscription`. The user will be re-prompted to enable notifications next time they open the app.

---

### Decision 5: AI Analysis — Preventing Slow Responses

OpenRouter LLM calls can take 5–25 seconds. A synchronous API response would timeout or feel broken.

**Phase 1 solution (simple):** Stream the response using Next.js `ReadableStream`. The client shows a streaming text card. No queue needed at this scale.

**Pattern:**
```typescript
// app/api/analysis/route.ts
export async function POST(req: Request) {
  // Validate auth, build prompt from last 30 days of logs
  const stream = await openrouter.chat.completions.create({
    model: process.env.OPENROUTER_MODEL!,
    messages: [...],
    stream: true,
  })
  return new Response(stream.toReadableStream())
}
```

Client uses `useEffect` + `ReadableStreamDefaultReader` to display text as it arrives.

---

## Data Models — Detailed

### `prayer_logs` — the core table

```
user_id        → FK to profiles (RLS key)
prayer_date    → DATE (not TIMESTAMPTZ — one row per calendar day)
prayer_name    → TEXT enum: 'Fajr'|'Dhuhr'|'Asr'|'Maghrib'|'Isha'
scheduled_time → TIME (copied from Aladhan at log creation time — immutable snapshot)
status         → TEXT: 'pending'|'on_time'|'late'|'missed'
logged_at      → TIMESTAMPTZ (when user tapped "I Prayed", NULL until then)
notes          → TEXT (optional, max 500 chars)
```

**Why copy `scheduled_time` into each row?** Aladhan times vary daily. If we re-fetch prayer times to compute status after the fact, we'd need to cache times forever. Copying the time into the log row makes each row self-contained and auditable.

---

### Client State Architecture

Use **React Server Components** for the dashboard (SSR prayer times + logs on load). Client components only for:
- The "I Prayed" button (needs onClick + optimistic update)
- The weekly grid (interactive tap)
- The settings form (controlled inputs)

No Zustand or Redux needed in Phase 1. `useState` + `useOptimistic` (React 19) handles all UI state.

---

## API Response Contracts

### GET `/api/prayer-times`
```typescript
type PrayerTimesResponse = {
  date: string           // "2026-06-07"
  location: { lat: number; lng: number; city?: string }
  method: number
  prayers: {
    Fajr: string         // "05:23"
    Dhuhr: string        // "13:12"
    Asr: string          // "16:45"
    Maghrib: string      // "19:34"
    Isha: string         // "20:52"
    Sunrise: string      // "06:41"
  }
  cached: boolean        // true if served from DB cache
}
```

### POST `/api/prayer-log`
```typescript
// Request body
type LogPrayerRequest = {
  prayer_name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
  notes?: string
}
// Status is computed server-side from logged_at vs scheduled_time

// Response
type LogPrayerResponse = {
  id: string
  status: 'on_time' | 'late'
  logged_at: string  // ISO timestamp
}
```

### GET `/api/prayer-log/weekly`
```typescript
type WeeklyLogsResponse = {
  week_start: string     // "2026-06-01"
  days: {
    date: string
    logs: PrayerLog[]    // 0–5 entries
  }[]
}
```

---

## Error Handling Strategy

| Layer | Strategy |
|---|---|
| API routes | Return `{ error: string }` with appropriate HTTP status |
| Client fetch | `try/catch` + toast notification for user-facing errors |
| Cron jobs | Log failures to console (Vercel function logs); do not throw — partial success is OK |
| Supabase errors | Check `error` from every Supabase call; never assume success |
| Aladhan API | If fetch fails, return last cached value if available; else return 503 |
| OpenRouter | Surface error message to user in the AI analysis card |

---

## Offline Strategy (Service Worker)

```
sw.js cache strategy:

CACHE_NAME = 'salattrack-v1'

On install:
  → Pre-cache: /, /dashboard, /weekly, /manifest.json, /icons/*

On fetch:
  → Static assets (JS, CSS, images): Cache First
  → /api/prayer-times: Network First, fall back to cache (stale is OK for today's times)
  → /api/prayer-log: Network Only (logging requires server)
  → Everything else: Network First, fall back to offline page
```

When offline, the user can see their prayer times and today's status from cache, but cannot log a prayer. Show a subtle "You're offline" banner.

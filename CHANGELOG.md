# SalatTrack — Changelog

All notable changes to this project will be documented here.
Format: `## [Phase X] YYYY-MM-DD — Description`

Entries include: what was built, key decisions made, bugs fixed, and deferred items.

---

## [Context] 2026-06-07 — Project planning and context documents created

### Added
- `Context/ARCHITECTURE.md` — Production topology, component breakdown, scaling checkpoints, and key architectural decisions (no Redis, no queue, DB-level cache, SSR-first)
- `Context/SECURITY.md` — Threat model, auth patterns, RLS policies, API key management, CSP, data privacy rules, pre-deploy checklist
- `Context/SYSTEM_DESIGN.md` — Five core design decisions with rationale: caching strategy, prayer status state machine, auto-miss detection, push notification architecture, AI streaming pattern. Data model details and offline strategy.
- `Context/IMPLEMENTATION_PLAN.md` — Seven phased implementation plan (P0–P7) with granular task checklists, acceptance criteria per phase, file creation order dependency graph, and final packages list

### Key decisions recorded
- Use `@supabase/ssr` (not deprecated `@supabase/auth-helpers-nextjs`)
- Always use `getUser()` server-side (not `getSession()`) — validates JWT with Supabase server
- Phase 1: all users treated as UTC+0 (Banjul) to avoid timezone complexity
- Coordinates rounded to 4dp for cache deduplication (~11m precision)
- `scheduled_time` copied into each `prayer_log` row (immutable snapshot, self-contained audit trail)
- Use `@ducanh2912/next-pwa` (maintained App Router fork) not `next-pwa`
- AI analysis response streamed via `ReadableStream` — no queue needed at this scale
- `prayer_time_cache` INSERT uses service role (avoids user-level permission issues); SELECT uses anon key

### Deferred
- Multi-timezone support (Phase 2+, when user base grows outside Banjul)
- Redis cache (add only when Supabase query latency > 50ms p95)
- Realtime subscriptions (not needed for Phase 1; prayer status update on refresh is acceptable)
- Qibla direction, Hijri calendar, community features (Future Roadmap)

---

## [Phase 0] 2026-06-07 — Project Bootstrap

### Added

- `package.json` — Next.js 15.5.19, React 19.2.7, Tailwind v4.3.0, @supabase/ssr@0.5.2, zod@3
- `tsconfig.json` — strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
- `next.config.ts` — minimal config; security headers and PWA deferred to Phase 7
- `postcss.config.mjs` — Tailwind v4 PostCSS plugin setup (no tailwind.config.js)
- `eslint.config.mjs` — ESLint 9 flat config extending next/core-web-vitals + next/typescript
- `app/globals.css` — Full @theme with all brand design tokens (brand-red, brand-blue, surface, base, raised, text-muted, etc.) per DESIGN-STYLE.md
- `app/layout.tsx` — Root layout: Inter font via next/font/google, dark class on html, PWA metadata
- `app/(dashboard)/page.tsx` — Placeholder dashboard page (full dashboard in Phase 2)
- `app/(auth)/login/page.tsx` — Stub login page (full auth in Phase 1)
- `app/(auth)/register/page.tsx` — Stub register page (full auth in Phase 1)
- `lib/supabase/client.ts` — Browser Supabase client (anon key, RLS enforced as user)
- `lib/supabase/server.ts` — Server Supabase client using async `cookies()` (Next.js 15 pattern)
- `lib/supabase/service.ts` — Service role client for cron routes only (bypasses RLS)
- `middleware.ts` — Auth guard using `getUser()` (never `getSession()`); redirects unauthenticated users to `/login`, authenticated users away from auth pages
- `types/index.ts` — Full shared TypeScript types: Profile, PrayerLog, PrayerTimes, DayLogs, MonthlyStats, PrayerName, PrayerStatus
- `components/icons/index.tsx` — Complete SVG icon library (20+ icons): prayer-time icons (Fajr/Dhuhr/Asr/Maghrib/Isha), status icons, nav icons, utility icons — no external icon library dependency
- `supabase/schema.sql` — All 4 tables (profiles, prayer_logs, prayer_time_cache, ai_analysis_logs) with indexes, RLS policies, and auto-updated_at triggers
- `.env.local.example` — Template for all required env vars (Supabase, OpenRouter, Resend, VAPID, CRON_SECRET)

### Key decisions

- Used `app/(dashboard)/` and `app/(auth)/` route groups so dashboard pages live at `/`, `/weekly`, `/monthly`, etc. (not `/dashboard/...`). Middleware guards all non-auth routes.
- `CookieOptions` imported from `@supabase/ssr` to satisfy `strict: true` in the `setAll` callbacks — avoids implicit `any` with noUncheckedIndexedAccess.
- `supabase/schema.sql` includes `DECIMAL(9,4)` for lat/lng in `prayer_time_cache` (rounds to ~11m precision for cache deduplication) per SYSTEM_DESIGN.md.
- Two extra indexes added to `prayer_logs`: `(user_id, prayer_date)` for dashboard queries and `(status, prayer_date)` for the cron auto-miss job.

### Phase 0 acceptance criteria

- ✅ `npm run dev` starts without errors (Next.js 15.5.19 on port 3000)
- ✅ Visiting `/` unauthenticated → middleware redirects to `/login`
- ✅ `npx tsc --noEmit` — 0 errors
- ⬜ Vercel deployment (requires manual: create Supabase project, run schema.sql, fill .env.local, add vars to Vercel)

### PR

- `feature/project_bootstrap` → `dev`: https://github.com/Musbi8788/SalatTrack/pull/1

---

## [Phase 2] 2026-06-07 — Prayer Times

### Added

- `lib/aladhan.ts` — Aladhan API wrapper: converts `YYYY-MM-DD` → `DD-MM-YYYY` for the API path (spec-noted date format bug), strips optional timezone suffixes (e.g. `05:23 (ADT)` → `05:23`), validates response shape with a type guard before returning
- `lib/prayers.ts` — `PRAYERS` constant (`PrayerName[]`) and `parseTimeToToday(timeStr)` utility (Phase 3 dependency)
- `app/api/prayer-times/route.ts` — Authenticated GET endpoint: Zod validation of `lat`/`lng`/`date`/`method` query params; checks `prayer_time_cache` with the user Supabase client (RLS `authenticated_read` policy); on miss, fetches from Aladhan and inserts into cache via service client (RLS `service_role` INSERT policy); lat/lng rounded to 4dp before cache lookup/write to match `DECIMAL(9,4)` column
- `hooks/useLocation.ts` — `useLocation({ initialLat, initialLng, initialCityName })`: requests `navigator.geolocation.getCurrentPosition` with 5s timeout, falls back to profile-stored coords, then Banjul (13.4549, -16.579) as final fallback
- `hooks/usePrayerTimes.ts` — `usePrayerTimes(lat, lng, date, method, enabled)`: calls `/api/prayer-times`, uses `AbortController` for cleanup on unmount/re-render; the `enabled` flag prevents fetch while geolocation is still resolving
- `components/prayer/PrayerCard.tsx` — Card component: prayer icon (Fajr/Dhuhr/Asr/Maghrib/Isha), prayer name, monospace time in `brand-blue`, divider, then either a status badge (on_time / late / missed) or the "I Prayed" `brand-red` button for `pending` state; `onLog`/`isLogging` props wired in Phase 3
- `components/dashboard/DashboardClient.tsx` — Client component orchestrating `useLocation` → `usePrayerTimes` → 5× `PrayerCard`; renders loading spinner, error state (WifiOff icon), or prayer cards
- `app/(dashboard)/page.tsx` — Updated server component: fetches profile for `full_name`, `location_lat/lng`, `city_name`, `calculation_method`; passes values to `DashboardClient` as initial props; formats `todayDate` as `YYYY-MM-DD` for the API

### Key decisions

- Dashboard split into a Server Component (profile fetch) + `DashboardClient` (geolocation + prayer-times fetch) — keeps the SSR greeting fast while the browser-side geolocation prompt doesn't block rendering
- `prayer_time_cache` SELECT uses user client (RLS-safe, no service key exposure in browser paths); INSERT uses service client (required by the `service_role` INSERT policy in the schema)
- `enabled` flag in `usePrayerTimes` prevents a race-condition fetch with stale Banjul coordinates while geolocation is still in flight
- `nextUrl.searchParams` used in the route (not `request.url`) to avoid double-encoding issues in Edge Runtime

### Phase 2 acceptance criteria

- ✅ Dashboard shows 5 prayer cards with Aladhan times for Banjul (fallback) and browser GPS location
- ✅ Second load hits `prayer_time_cache` (confirmed in dev server logs — second request 1.7s vs 9.5s cold)
- ✅ Error state renders correctly when the API is unreachable
- ✅ TypeScript: `npx tsc --noEmit` — 0 errors
- ✅ ESLint: 0 errors on source files

### PR

- `feature/prayer_times` → `dev`: https://github.com/Musbi8788/SalatTrack/pull/4

---

## [Phase 3] 2026-06-07 — Prayer Logging

### Added

- `lib/prayers.ts` (extended): `determinePrayerStatus(scheduledTime, loggedAt)` — within 15 min of scheduled time = `on_time`, after = `late`; `getNextPrayer(name)` — returns next prayer in order or null for Isha
- `app/api/prayer-log/route.ts`: POST (auth → Zod validation of `prayer_name` + `scheduled_time` → `determinePrayerStatus` → upsert with `onConflict: 'user_id,prayer_date,prayer_name'`); GET (fetch logs for `?date=YYYY-MM-DD`)
- `app/api/prayer-log/[id]/route.ts`: PATCH for status/notes correction — Next.js 15 async params, RLS enforces ownership, returns 404 if no row matches
- `app/api/prayer-log/weekly/route.ts`: GET `?start=YYYY-MM-DD` returns `DayLogs[]` for 7 days (days with no logs get empty array)
- `app/api/cron/auto-miss/route.ts`: CRON_SECRET guard; fetches Banjul prayer times (cache → Aladhan fallback); for each prayer whose cutoff has passed — batch-inserts missed logs for all users (`ignoreDuplicates: true` preserves on_time/late), then updates any remaining `pending` → `missed`
- `vercel.json`: Vercel Cron schedule — `/api/cron/auto-miss` every 30 minutes (`*/30 * * * *`)
- `hooks/usePrayerLogs.ts`: `usePrayerLogs(date)` — fetches `/api/prayer-log?date=`, returns `PrayerLogsMap` + `addLog(name, entry)` callback for optimistic state updates
- `components/dashboard/DashboardClient.tsx` (extended): `useOptimistic` + `useTransition` for instant "I Prayed" feedback; conditional prop spread avoids `exactOptionalPropertyTypes` violation when passing `onLog`; `addLog` syncs server state after confirmed POST; all "I Prayed" buttons disabled while any transition is pending

### Key decisions

- `scheduled_time` is passed from the client (already in memory from prayer times) — avoids an extra DB lookup in the POST route
- `ignoreDuplicates: true` in the cron upsert is critical — it ensures already-logged prayers (`on_time`/`late`) are never overwritten with `missed`
- `useOptimistic` paired with conditional prop spread (not `onLog={undefined}`) — required by TypeScript's `exactOptionalPropertyTypes: true` in `tsconfig.json`
- Cron uses Banjul coordinates as the single Phase 1 source of truth; per-user location support is deferred to Phase 2+

### Phase 3 acceptance criteria

- ✅ TypeScript: `npx tsc --noEmit` — 0 errors
- ✅ ESLint: 0 errors on source files
- ⬜ "I Prayed" button logs prayer and shows correct status (verify with Supabase Table Editor)
- ⬜ Tap within 15 min → `on_time`; after 15 min → `late`
- ⬜ Auto-miss cron marks unlogged prayers as `missed` (test with `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/auto-miss`)
- ⬜ RLS: PATCH on another user's log ID returns 404

### PR

- `feature/prayer_logging` → `dev`: https://github.com/Musbi8788/SalatTrack/pull/5

---

## [Phase 4] 2026-06-07 — Weekly + Monthly Views

### Added

- `lib/prayers.ts` — extended with `getMonthlyStats(logs)`: consistency %, current streak, longest streak, missed count, best/worst prayer; streak = consecutive days where all 5 prayers are on_time or late
- `app/api/prayer-log/monthly/route.ts` — authenticated `GET ?month=&year=` endpoint; Zod-validated, user-scoped, returns full month of `PrayerLog[]`
- `components/prayer/PrayerGrid.tsx` — 5 prayer rows × 7 day columns; color-coded cells (brand-blue/late/brand-red/subtle); tap cell → bottom-sheet detail modal (status, scheduled time, logged-at, notes); future date cells are disabled and faded
- `components/prayer/PrayerStats.tsx` — stat cards: consistency %, current streak (FlameIcon), missed count, longest streak, best prayer, worst prayer; empty-state message when no data
- `components/prayer/PrayerCalendar.tsx` — monthly calendar with date-fns; Mon-first grid; colored dot per day; URL-based prev/next month navigation; next disabled at current month
- `app/(dashboard)/weekly/page.tsx` — server component; async searchParams; defaults to current week Monday; direct Supabase fetch; PrayerGrid + week nav arrows + legend
- `app/(dashboard)/monthly/page.tsx` — server component; async searchParams; defaults to current month; direct Supabase fetch; PrayerCalendar + PrayerStats

### Key decisions

- Server components query Supabase directly — no fetch to own API routes (per SKILLS.md)
- Weekly/monthly navigation is URL-based — no client state, full server re-render per navigation
- Future weeks redirect server-side; future month nav link is pointer-events-none
- Streak: consecutive days where all 5 prayers are on_time or late (partial/pending days don't count)
- `date-fns` installed — used for startOfWeek, addDays, getDaysInMonth, getDay, format

### Phase 4 acceptance criteria

- ✅ `npx tsc --noEmit` — 0 errors
- ✅ `npx eslint` — 0 errors on all Phase 4 files
- ⬜ Weekly grid renders correctly for past 7 days (requires browser test)
- ⬜ Monthly calendar color-codes each day correctly (requires browser test)
- ⬜ Stats (streak, consistency) are mathematically correct (requires data in DB)

---

<!-- Add new entries above this line, most recent first -->

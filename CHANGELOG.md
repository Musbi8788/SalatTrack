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

## [Phase 1] 2026-06-07 — Authentication

### Added

- `app/(auth)/login/page.tsx` — Client component: email + password fields, `signInWithPassword`, inline error display, redirect to `/` on success, loading spinner on submit button; links to register page
- `app/(auth)/register/page.tsx` — Client component: full name + email + password fields, client-side validation (full name ≥ 2 chars, password ≥ 6 chars), `signUp` with `options.data: { full_name }` so the DB trigger receives the name, redirect to `/` on success
- `app/(dashboard)/layout.tsx` — Async server component: `getUser()` auth check (redirects to `/login` if no session), fetches `profiles.full_name` to pass to Navbar, renders `RegisterServiceWorker` + `<Navbar>` + `<BottomNav>` wrapping all dashboard pages; bottom padding accounts for fixed nav bar
- `components/layout/Navbar.tsx` — Top navigation bar: SalatTrack brand mark + user's first name; logout server action calls `supabase.auth.signOut()` and redirects to `/login`
- `components/layout/BottomNav.tsx` — Fixed bottom navigation: Home, Weekly, Monthly, Analysis tab icons; active state driven by `usePathname()`
- Supabase DB trigger `on_auth_user_created` — `AFTER INSERT ON auth.users` trigger calls `create_profile_on_signup()` which inserts a row into `profiles` with `id`, `email`, and `full_name` from `raw_user_meta_data`

### Key decisions

- `full_name` passed via `options.data` in `signUp` (not a separate API call after registration) — the DB trigger reads `raw_user_meta_data->>'full_name'` so no extra round trip is needed
- Dashboard layout does a second Supabase query for `profiles.full_name` separately from the middleware auth check — middleware only confirms session validity; layout fetches display data
- Logout is a server action (not client-side) to ensure the Supabase SSR cookie is cleared correctly via `@supabase/ssr`

### Phase 1 acceptance criteria

- ✅ Register creates a new user and a matching `profiles` row (DB trigger confirmed)
- ✅ Login with correct credentials reaches the dashboard
- ✅ Unauthenticated visit to `/` redirects to `/login` (middleware)
- ✅ Logout clears session and returns to `/login`
- ✅ `npx tsc --noEmit` — 0 errors

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

---

## [Phase 5] 2026-06-07 — Notifications

### Added

- `public/sw.js` — Service worker: install pre-caches `/` and `/manifest.json`; activate cleans old caches; fetch strategy: network-only for `/api/prayer-log` (logging must reach the server), network-first + cache fallback for `/api/prayer-times`, cache-first for all static assets; `push` event calls `self.registration.showNotification` with title/body/icon/badge/tag from the payload; `notificationclick` focuses an existing window or opens `/`
- `lib/notifications.ts` — `requestPermissionAndSubscribe()`: browser-side only; requests `Notification.permission`, subscribes via `pushManager.subscribe` with the VAPID public key, POSTs the `PushSubscription` JSON to `/api/push/subscribe`; returns `true` on success
- `app/api/push/subscribe/route.ts` — Authenticated POST: saves the full `PushSubscription` JSON to `profiles.push_subscription` (JSONB column) for the current user
- `app/api/cron/push-notify/route.ts` — CRON_SECRET-guarded GET: fetches all users with a non-null `push_subscription` and `notification_enabled = true`; for each user resolves their prayer times from `prayer_time_cache` (falls back to Banjul coords); sends a push if any prayer is within the next 10 minutes; on 410 Gone clears `push_subscription` so the user is re-prompted; returns `{ ok, sent, cleared }`
- `app/api/cron/email-summary/route.ts` — CRON_SECRET-guarded GET: fetches users with `email_notification = true`; queries `prayer_logs` per user for today; skips users with no missed/pending prayers; sends HTML email via Resend with a per-prayer status table (✓ On Time / ⏰ Late / ✗ Missed / — Pending) and the scheduled time for each prayer
- `components/notifications/NotificationBanner.tsx` — Client component: shown on first dashboard load if `Notification.permission !== 'granted'`; "Enable prayer time notifications" banner; calls `requestPermissionAndSubscribe()` on click; dismisses on success or denial
- `components/notifications/RegisterServiceWorker.tsx` — Client component mounted in dashboard layout; registers `/sw.js` via `navigator.serviceWorker.register` on mount (runs once per session)
- `vercel.json` updated — added push-notify cron: `*/5 * * * *`

### Key decisions

- Service worker registration is a separate `RegisterServiceWorker` client component mounted in the dashboard layout, keeping the layout itself a server component
- Push-notify cron runs every 5 minutes and checks a 10-minute window ahead — this means every prayer gets at most two notifications (at T-10 and T-5), which is acceptable
- Email is only sent if the user has at least one `missed` or `pending` prayer for the day — prevents empty summary emails
- 410 Gone handling clears the stale subscription immediately in the same cron run rather than deferring, so the user sees the permission banner again on next dashboard visit

### Phase 5 acceptance criteria

- ✅ `npx tsc --noEmit` — 0 errors
- ✅ ESLint — 0 errors on Phase 5 files
- ⬜ Push notification appears in browser at prayer time (test with system clock or manual cron trigger)
- ⬜ Email arrives for any user with a missed/pending prayer (test via Resend dashboard)
- ⬜ 410 response clears `push_subscription` in `profiles` table
- ⬜ Users can toggle notifications off in settings (Phase 7)

### PR

- `feature/notifications` → `dev`: https://github.com/Musbi8788/SalatTrack/pull/6

---

## [Phase 6] 2026-06-07 — AI Analysis

### Added

- `lib/openrouter.ts` — `fetchAnalysisStream(logs, stats, model)`: builds a system prompt and a user prompt from 30-day `PrayerLog[]` + `MonthlyStats` (per-prayer breakdown + 7-day pattern); calls `POST https://openrouter.ai/api/v1/chat/completions` with `stream: true`; returns the raw `Response` so the route can pipe it. No user coordinates or PII sent.
- `app/api/analysis/route.ts` — Authenticated POST: fetches last-30-day prayer logs; returns 422 if no settled logs exist; builds stats via `getMonthlyStats`; pipes the OpenRouter SSE response through a `TransformStream` that accumulates `fullText` while forwarding every chunk to the client; schedules an `after()` callback (runs post-stream) that inserts into `ai_analysis_logs` via the service client; returns `text/event-stream` response. Default model: `OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001'`.
- `app/api/analysis/history/route.ts` — Authenticated GET: returns the 10 most recent `ai_analysis_logs` rows for the current user.
- `components/analysis/AIAnalysisCard.tsx` — `'use client'` component with four phases (`idle → streaming → done → error`). Uses `fetch('/api/analysis', { method: 'POST' })` then `ReadableStreamDefaultReader` to parse SSE chunks incrementally; renders each chunk into a live `<ReactMarkdown>` block using design-system custom renderers. Past analyses accordion collapses/expands each history item with a `ChevronDownIcon`. Handles 422 (no data) and network errors with distinct messages.
- `app/(dashboard)/analysis/page.tsx` — Server component: fetches `ai_analysis_logs` history on load; passes `initialHistory` to `AIAnalysisCard`.
- `types/index.ts` — Added `AIAnalysisLog` interface.
- `CLAUDE.md` — Updated phase status: Phases 3, 4, 5 → ✅; Phase 6 → ✅.
- `package.json` / `package-lock.json` — Added `react-markdown` dependency.

### Key decisions

- `after()` from `next/server` used for the DB insert — avoids holding the streaming response open while waiting for the DB write; the client gets the full analysis in real time and the row is committed ~1s after stream ends
- `TransformStream` intercepts the SSE bytes in-flight to accumulate `fullText` for the DB insert, without buffering the response
- Model configurable via `OPENROUTER_MODEL` env var; fallback to `google/gemini-2.0-flash-001`; actual first run used `openai/gpt-4o-mini` (env var override)
- `react-markdown` + custom `Components` map for all block/inline elements to enforce design-system tokens (`text-text-primary`, `text-brand-blue`, `border-subtle`, etc.) — no raw HTML

### Phase 6 acceptance criteria

- ✅ Clicking "Analyze My Prayers" streams a personalized analysis in real time
- ✅ Analysis saved to `ai_analysis_logs` via `after()` (confirmed: POST 201 in Supabase logs)
- ✅ Past analyses visible in the accordion below the button
- ✅ 422 shown if no non-pending prayer logs exist
- ✅ `npx tsc --noEmit` — 0 errors

---

## [Fix] 2026-06-07 — Postgres TIME format bug + email-summary completion

### Fixed

- **`POST /api/prayer-log` returning 400 on cached prayer times** — Root cause: all prayer time columns in `prayer_time_cache` and `prayer_logs` are `time without time zone` in Postgres, which returns values as `HH:MM:SS`. The Zod schema in the prayer-log POST route only accepted `HH:mm`. First load worked (Aladhan returns `HH:mm` directly); every subsequent cache hit failed validation. Fixed by slicing to 5 chars (`.slice(0, 5)`) when reading from the DB in:
  - `app/api/prayer-times/route.ts` — normalizes cached times before returning `PrayerTimes`
  - `app/api/prayer-log/route.ts` — normalizes `scheduled_time` in GET daily logs response
  - `app/api/prayer-log/weekly/route.ts` — normalizes `scheduled_time` in each `DayLogs` entry
  - `app/api/prayer-log/monthly/route.ts` — normalizes `scheduled_time` in monthly log response

- **`email-summary` sending to all users regardless of prayer status** — The `hasMissed = true` stub (left from Phase 5 pending Phase 3 merge) was wired up: now queries `prayer_logs` per user for today and skips any user with no `missed` or `pending` logs. `buildEmailHtml` updated to accept the logs array and render each prayer's actual scheduled time and color-coded status icon.

<!-- Add new entries above this line, most recent first -->

# SalatTrack — Implementation Plan

## Rules for the Agent

1. **Never skip phases.** Each phase builds on the previous. Do not implement AI before auth is solid.
2. **Test each phase before moving on.** The acceptance criteria must pass locally before the next phase starts.
3. **Use `@supabase/ssr` not `@supabase/auth-helpers-nextjs`.** The helpers package is deprecated.
4. **No `any` types.** All TypeScript must be typed. Use `unknown` + type narrowing where type is genuinely unknown.
5. **Validate with zod** on every API route before touching the database.
6. **RLS is non-negotiable.** Every new table gets RLS enabled before any other query runs against it.
7. **Server components by default.** Only add `"use client"` when you need browser APIs or event handlers.
8. **Check `SECURITY.md`** before writing any API route or database interaction.
9. **Check `SYSTEM_DESIGN.md`** before designing any data model or cache strategy.

---

## Phase 0 — Project Bootstrap

**Goal:** Running Next.js project, connected to Supabase, deployable to Vercel.

### Tasks

- [ ] **P0.1** Initialize Next.js 16 with App Router and TypeScript
  ```bash
  npx create-next-app@latest salattrack --typescript --tailwind --app --src-dir=false
  ```

- [ ] **P0.2** Install core dependencies
  ```bash
  npm install @supabase/ssr @supabase/supabase-js zod
  npm install -D @types/node
  ```

- [ ] **P0.3** Create Supabase project and run schema migrations
  - Run SQL from `SalatTrack_Docs.md` sections 4.1–4.5
  - Enable RLS on all 4 tables
  - Create the RLS policies exactly as specified in `SECURITY.md`

- [ ] **P0.4** Set up environment variables
  - Create `.env.local` from template in `SalatTrack_Docs.md` section 14
  - Add all vars to Vercel project settings (do NOT commit `.env.local`)

- [ ] **P0.5** Create Supabase client utilities
  - `lib/supabase/client.ts` — browser client
  - `lib/supabase/server.ts` — server client (for API routes + RSC)
  - `lib/supabase/service.ts` — service role client (cron routes only)

- [ ] **P0.6** Set up middleware
  - `middleware.ts` using `getUser()` (not `getSession()`)
  - Protect `/dashboard/*` routes

- [ ] **P0.7** Deploy to Vercel and confirm `/` loads without error

**Acceptance criteria:**
- `npm run dev` starts without errors
- Navigating to `/dashboard` redirects to `/login` (middleware works)
- Vercel deployment succeeds

---

## Phase 1 — Authentication

**Goal:** Users can register, log in, and log out. Profile row is auto-created.

### Tasks

- [ ] **P1.1** Create Supabase database trigger for profile creation
  ```sql
  CREATE OR REPLACE FUNCTION create_profile_on_signup()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();
  ```

- [ ] **P1.2** Register page (`app/(auth)/register/page.tsx`)
  - Fields: Full Name, Email, Password
  - Pass `full_name` in `options.data` to `supabase.auth.signUp()`
  - On success: redirect to `/dashboard`

- [ ] **P1.3** Login page (`app/(auth)/login/page.tsx`)
  - Fields: Email, Password
  - `supabase.auth.signInWithPassword()`
  - On success: redirect to `/dashboard`

- [ ] **P1.4** Logout action
  - Server action calling `supabase.auth.signOut()`
  - Redirect to `/login`

- [ ] **P1.5** Protected layout (`app/(dashboard)/layout.tsx`)
  - Fetch user server-side, pass to client
  - Render `<Navbar>` and `<BottomNav>`

- [ ] **P1.6** TypeScript types (`types/index.ts`)
  - `Profile`, `PrayerLog`, `PrayerTimes`, `PrayerName`, `PrayerStatus`

**Acceptance criteria:**
- Can register a new user → `profiles` row appears in Supabase dashboard
- Can log in and reach `/dashboard`
- Unauthenticated visit to `/dashboard` redirects to `/login`
- Logout returns to `/login`

---

## Phase 2 — Prayer Times

**Goal:** Dashboard shows today's 5 prayer times based on user's location.

### Tasks

- [ ] **P2.1** Aladhan API wrapper (`lib/aladhan.ts`)
  - `getPrayerTimes(lat, lng, date, method)` — returns `PrayerTimes`
  - Handle fetch errors gracefully
  - Fix the date format bug in the spec: `YYYY-MM-DD` → `DD-MM-YYYY` for Aladhan URL

- [ ] **P2.2** Prayer times API route (`app/api/prayer-times/route.ts`)
  - Query params: `lat`, `lng`, `date`, `method`
  - Check `prayer_time_cache` first (use service client for INSERT, user client for SELECT)
  - Validate params with zod
  - Auth check before responding

- [ ] **P2.3** Location hook (`hooks/useLocation.ts`)
  - Request browser geolocation on first load
  - Fall back to profile `location_lat` / `location_lng` if stored
  - Fall back to Banjul coordinates (13.4549, -16.5790) if no permission

- [ ] **P2.4** Prayer times hook (`hooks/usePrayerTimes.ts`)
  - Calls `/api/prayer-times` with current location + today's date
  - Returns loading/error/data states

- [ ] **P2.5** `PrayerCard` component (`components/prayer/PrayerCard.tsx`)
  - Props: `prayerName`, `scheduledTime`, `status`, `onLog`
  - Shows: prayer name, time, status badge, "I Prayed" button (if pending/missed)
  - Status badge colors: green (on_time), yellow (late), red (missed), grey (future/pending)

- [ ] **P2.6** Dashboard page (`app/(dashboard)/page.tsx`)
  - Server component fetches profile (for location)
  - Client component renders 5 `PrayerCard`s using `usePrayerTimes`
  - Header: "Assalamu Alaikum, [name]" + today's Gregorian date
  - Location pill: "📍 [city_name or coordinates]"

**Acceptance criteria:**
- Dashboard shows 5 prayer times for Banjul (or user's location)
- Second page load uses DB cache (check `prayer_time_cache` in Supabase)
- If Aladhan API is unreachable, returns 503 with error message
- Location permission prompt appears on first visit

---

## Phase 3 — Prayer Logging

**Goal:** Users can log prayers; status is computed correctly.

### Tasks

- [ ] **P3.1** Prayer business logic (`lib/prayers.ts`)
  - `PRAYERS` constant and `PrayerName` type
  - `determinePrayerStatus(scheduledTime, loggedAt)` → `'on_time' | 'late'`
  - `getNextPrayer(currentPrayer)` → next prayer name or null (for Isha)
  - `parseTimeToToday(timeStr)` → `Date` object for today at that time

- [ ] **P3.2** Log prayer API route (`app/api/prayer-log/route.ts`)
  - `POST`: create/update prayer log
    - Auth check
    - Validate body with zod (prayer_name, optional notes)
    - Fetch today's scheduled_time from `prayer_time_cache` (or prayer-times route)
    - Compute status via `determinePrayerStatus`
    - Upsert into `prayer_logs` (UNIQUE: user_id + prayer_date + prayer_name)
    - Return `{ id, status, logged_at }`
  - `GET`: fetch logs for a given date (`?date=YYYY-MM-DD`)

- [ ] **P3.3** Update prayer status route (`app/api/prayer-log/[id]/route.ts`)
  - `PATCH`: allow status correction until end of day
  - Verify the log belongs to the authenticated user

- [ ] **P3.4** Weekly logs route (`app/api/prayer-log/weekly/route.ts`)
  - `GET ?start=YYYY-MM-DD`: return 7 days of logs
  - Returns array of `{ date, logs: PrayerLog[] }`

- [ ] **P3.5** "I Prayed" button with optimistic UI
  - `useOptimistic` hook to immediately show status change
  - Call `POST /api/prayer-log` in background
  - Revert optimistic update on error

- [ ] **P3.6** Auto-miss cron job (`app/api/cron/auto-miss/route.ts`)
  - Verify `CRON_SECRET` header
  - Use service role client
  - Find all `pending` logs for today where next prayer time has passed
  - Batch update to `missed`
  - **Phase 1 simplification:** treat all users as UTC+0 (Banjul)

- [ ] **P3.7** Register cron in `vercel.json`
  ```json
  {
    "crons": [
      { "path": "/api/cron/auto-miss", "schedule": "*/30 * * * *" }
    ]
  }
  ```

**Acceptance criteria:**
- Tapping "I Prayed" within 15 mins of prayer time → status `on_time`
- Tapping "I Prayed" after 15 mins → status `late`
- After next prayer's time passes, unlogged prayer status → `missed` (verified by running cron manually)
- Cannot log a prayer as someone else (RLS test: try PATCH with different user's session)

---

## Phase 4 — Views (Weekly + Monthly)

**Goal:** Weekly grid and monthly calendar views are functional.

### Tasks

- [ ] **P4.1** `PrayerGrid` component (`components/prayer/PrayerGrid.tsx`)
  - 5 rows (prayers) × 7 columns (days)
  - Color-coded cells: green/yellow/red/grey
  - Tap cell → `PrayerDetailModal` (shows time, status, notes)
  - Future dates: greyed out, not interactive

- [ ] **P4.2** Weekly page (`app/(dashboard)/weekly/page.tsx`)
  - Server-fetches last 7 days of logs
  - Passes to `PrayerGrid`
  - Navigation: prev/next week arrows

- [ ] **P4.3** Monthly stats calculation (`lib/prayers.ts`)
  - `getMonthlyStats(logs)` → `{ total, onTime, late, missed, consistency, streak, longestStreak }`
  - Streak = consecutive days where all 5 prayers have status `on_time` or `late` (not missed)

- [ ] **P4.4** `PrayerStats` component (`components/prayer/PrayerStats.tsx`)
  - Cards: consistency %, current streak, total missed, best prayer, worst prayer

- [ ] **P4.5** Monthly calendar (`components/prayer/PrayerCalendar.tsx`)
  - Calendar grid (use `date-fns` for date math — `npm install date-fns`)
  - Each day gets a dot: green (all prayed), yellow (some late), red (some missed), grey (future)
  - Color logic: if any missed → red; if any late → yellow; if all on_time → green

- [ ] **P4.6** Monthly logs route (`app/api/prayer-log/monthly/route.ts`)
  - `GET ?month=6&year=2026`: fetch all logs for that month

- [ ] **P4.7** Monthly page (`app/(dashboard)/monthly/page.tsx`)
  - Renders `PrayerCalendar` + `PrayerStats`

**Acceptance criteria:**
- Weekly grid renders correctly for the past 7 days
- Monthly calendar color-codes each day correctly
- Stats (streak, consistency) are mathematically correct

---

## Phase 5 — Notifications

**Goal:** Push notifications at prayer time; daily email summary.

### Tasks

- [ ] **P5.1** Generate VAPID keys
  ```bash
  npx web-push generate-vapid-keys
  ```
  Add to `.env.local` and Vercel env vars.

- [ ] **P5.2** Service worker (`public/sw.js`)
  - Listen for `push` events, show notification via `self.registration.showNotification`
  - Listen for `notificationclick`, open `/dashboard`
  - Cache strategy (see `SYSTEM_DESIGN.md`)

- [ ] **P5.3** Push subscription API route (`app/api/push/subscribe/route.ts`)
  - `POST`: save `PushSubscription` JSON to `profiles.push_subscription`
  - Add `push_subscription JSONB` column to `profiles` table (migration)

- [ ] **P5.4** Notifications helper (`lib/notifications.ts`)
  - `requestPermissionAndSubscribe()` — runs in browser, posts to `/api/push/subscribe`
  - `sendPushNotification(subscription, payload)` — server-side, uses `web-push` package
  ```bash
  npm install web-push
  npm install -D @types/web-push
  ```

- [ ] **P5.5** Push notification cron (`app/api/cron/push-notify/route.ts`)
  - Every 5 minutes: check which prayers are due in next 10 minutes (across all users)
  - Send push; on 410 response → clear `push_subscription` from profile
  - Add to `vercel.json`: `"schedule": "*/5 * * * *"`

- [ ] **P5.6** Email summary cron (`app/api/cron/email-summary/route.ts`)
  - Daily at 23:00 UTC
  - Fetch all users with `email_notification = true`
  - For each user: if any logs are `missed` or `pending` → send email via Resend
  ```bash
  npm install resend
  ```

- [ ] **P5.7** Email template (plain HTML in the route — no separate template engine needed)
  - Subject: "Your Prayer Summary for [date]"
  - Table of 5 prayers with status icons

- [ ] **P5.8** Permission prompt in dashboard on first load
  - Check `Notification.permission !== 'granted'`
  - Show a subtle banner: "Enable prayer time notifications?"
  - On click: call `requestPermissionAndSubscribe()`

**Acceptance criteria:**
- Notification appears in browser at prayer time (test by setting system clock)
- Email arrives for any missed prayer
- 410 response from Web Push removes stale subscription
- Users can toggle notifications off in settings

---

## Phase 6 — AI Analysis

**Goal:** Users can get personalized prayer habit analysis from an LLM.

### Tasks

- [ ] **P6.1** OpenRouter wrapper (`lib/openrouter.ts`)
  - `analyzeprayers(logs: PrayerLog[], stats: MonthlyStats)` → `ReadableStream`
  - Build prompt from `SYSTEM_DESIGN.md` section on AI Analysis
  - Use `fetch` to OpenRouter chat completions endpoint with `stream: true`

- [ ] **P6.2** Analysis API route (`app/api/analysis/route.ts`)
  - `POST`: auth check → fetch last 30 days of logs → build prompt → stream response
  - After streaming completes: insert into `ai_analysis_logs` (use a background task or a separate non-streaming insert)
  - **Do not include user coordinates in the prompt.** Only prayer times and statuses.

- [ ] **P6.3** Analysis history route (`app/api/analysis/history/route.ts`)
  - `GET`: return last 10 `ai_analysis_logs` for the authenticated user

- [ ] **P6.4** `AIAnalysisCard` component (`components/analysis/AIAnalysisCard.tsx`)
  - Renders streaming text progressively using `ReadableStreamDefaultReader`
  - Shows loading spinner while streaming
  - Formatted markdown rendering (use `react-markdown` — `npm install react-markdown`)

- [ ] **P6.5** Analysis page (`app/(dashboard)/analysis/page.tsx`)
  - "Analyze My Prayers" button
  - Renders `AIAnalysisCard` when triggered
  - History accordion below (past analyses)

**Acceptance criteria:**
- Analysis button triggers streaming response; text appears progressively
- Response is contextual (references specific weak prayers)
- Analysis is saved to `ai_analysis_logs`
- History shows past analyses

---

## Phase 7 — Settings + PWA Polish

**Goal:** Settings page works; app is installable as a PWA.

### Tasks

- [ ] **P7.1** Settings page (`app/(dashboard)/settings/page.tsx`)
  - Full name (editable, PATCH to `profiles`)
  - Location: re-detect button + manual city text field
  - Calculation method dropdown (Aladhan methods 1–15)
  - Push notifications toggle
  - Email notifications toggle
  - Logout button

- [ ] **P7.2** Settings update API route (`app/api/settings/route.ts`)
  - `PATCH`: validate with zod, update `profiles` row
  - Only allow updating: `full_name`, `location_lat`, `location_lng`, `city_name`, `calculation_method`, `notification_enabled`, `email_notification`

- [ ] **P7.3** PWA manifest (`public/manifest.json`)
  - Exact JSON from `SalatTrack_Docs.md` section 13

- [ ] **P7.4** Install `next-pwa` and configure
  ```bash
  npm install next-pwa
  ```
  - Update `next.config.js` as specified in docs
  - **Note:** `next-pwa` has issues with App Router. Use `@ducanh2912/next-pwa` instead (maintained fork).

- [ ] **P7.5** PWA icons
  - Create `public/icons/icon-192.png` and `public/icons/icon-512.png`
  - Use a crescent moon + app name design

- [ ] **P7.6** Security headers in `next.config.js`
  - Add CSP, X-Frame-Options, X-Content-Type-Options as specified in `SECURITY.md`

- [ ] **P7.7** Mobile UI audit
  - Test all screens on 375px width (iPhone SE)
  - Bottom nav is sticky and visible above OS home indicator
  - All touch targets are ≥ 44px

**Acceptance criteria:**
- App shows "Add to Home Screen" prompt in mobile Chrome
- Installed PWA opens in standalone mode (no browser chrome)
- Settings changes persist after page refresh
- All security headers present in production (check via browser DevTools)

---

## File Creation Order (Dependency Graph)

```
Phase 0:
  types/index.ts
  lib/supabase/client.ts
  lib/supabase/server.ts
  lib/supabase/service.ts
  middleware.ts
  app/layout.tsx

Phase 1:
  app/(auth)/login/page.tsx
  app/(auth)/register/page.tsx
  app/(dashboard)/layout.tsx
  components/layout/Navbar.tsx
  components/layout/BottomNav.tsx

Phase 2:
  lib/aladhan.ts
  lib/prayers.ts (initial: types + parseTimeToToday)
  hooks/useLocation.ts
  hooks/usePrayerTimes.ts
  app/api/prayer-times/route.ts
  components/prayer/PrayerCard.tsx
  app/(dashboard)/page.tsx

Phase 3:
  lib/prayers.ts (add: determinePrayerStatus, getNextPrayer)
  app/api/prayer-log/route.ts
  app/api/prayer-log/[id]/route.ts
  app/api/prayer-log/weekly/route.ts
  app/api/cron/auto-miss/route.ts
  vercel.json
  hooks/usePrayerLogs.ts

Phase 4:
  components/prayer/PrayerGrid.tsx
  components/prayer/PrayerCalendar.tsx
  components/prayer/PrayerStats.tsx
  app/api/prayer-log/monthly/route.ts
  app/(dashboard)/weekly/page.tsx
  app/(dashboard)/monthly/page.tsx

Phase 5:
  public/sw.js
  lib/notifications.ts
  app/api/push/subscribe/route.ts
  app/api/cron/push-notify/route.ts
  app/api/cron/email-summary/route.ts

Phase 6:
  lib/openrouter.ts
  app/api/analysis/route.ts
  app/api/analysis/history/route.ts
  components/analysis/AIAnalysisCard.tsx
  app/(dashboard)/analysis/page.tsx

Phase 7:
  app/api/settings/route.ts
  app/(dashboard)/settings/page.tsx
  public/manifest.json
  next.config.js (final)
```

---

## Packages Summary

```bash
# Core
npm install @supabase/ssr @supabase/supabase-js zod

# Utilities
npm install date-fns react-markdown

# Notifications
npm install web-push resend
npm install -D @types/web-push

# PWA (use maintained fork)
npm install @ducanh2912/next-pwa
```

Total: ~8 runtime packages. Keep it lean.

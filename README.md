# SalatTrack

A Muslim prayer tracking Progressive Web App (PWA) built by Musa Jawo.

Track your 5 daily prayers — Fajr, Dhuhr, Asr, Maghrib, Isha — with on-time/late/missed status, push notifications, weekly and monthly analytics, and AI-powered improvement suggestions.

---

## Features

- **Prayer Times** — Fetched from Aladhan API based on your GPS location; cached in Supabase to reduce API calls
- **Prayer Logging** — "I Prayed" button with optimistic UI; auto-detects on-time (within 15 min) vs late
- **Auto-Miss Detection** — Cron job marks unlogged prayers as missed after their window passes
- **Weekly Grid** — 5 prayers × 7 days color-coded view with tap-to-detail modal
- **Monthly Calendar** — Color-coded calendar with consistency %, streak, and per-prayer breakdown
- **Push Notifications** — Browser push alerts at prayer time via Web Push / VAPID
- **Email Summary** — Daily email if you have missed or pending prayers, sent via Resend
- **AI Analysis** — Streamed GPT/Gemini analysis of your 30-day prayer patterns with improvement suggestions
- **Settings** — Profile, location, calculation method, and notification preferences
- **PWA** — Installable on mobile; custom service worker with offline support

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS v4 |
| Database + Auth | Supabase (PostgreSQL + RLS) |
| Prayer Times API | Aladhan API |
| AI | OpenRouter (Gemini 2.0 Flash / configurable) |
| Email | Resend |
| Push | Web Push (VAPID) |
| Deployment | Vercel + Vercel Cron |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Musbi8788/SalatTrack.git
cd SalatTrack
npm install
```

### 2. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.0-flash-001   # optional override

RESEND_API_KEY=
RESEND_FROM=noreply@yourdomain.com

NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@yourdomain.com

CRON_SECRET=                                    # random string, used to guard cron routes
```

### 3. Set up the database

Run the schema in your Supabase project:

```
supabase/schema.sql
```

This creates: `profiles`, `prayer_logs`, `prayer_time_cache`, `ai_analysis_logs` — with RLS policies, indexes, and triggers.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The middleware redirects unauthenticated users to `/login`.

---

## Scripts

```bash
npm run dev          # Next.js dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check (no emit)
```

---

## Project Structure

```
app/
  (auth)/           # Login + Register pages
  (dashboard)/      # Main app: home, weekly, monthly, analysis, settings
  actions/          # Server actions (auth)
  api/
    prayer-times/   # Fetch + cache prayer times from Aladhan
    prayer-log/     # Log, fetch, update prayers (daily, weekly, monthly)
    analysis/       # AI analysis stream + history
    push/           # Push subscription save
    settings/       # Profile patch
    cron/           # Auto-miss, push-notify, email-summary
components/
  dashboard/        # DashboardClient, prayer cards
  prayer/           # PrayerCard, PrayerGrid, PrayerCalendar, PrayerStats
  analysis/         # AIAnalysisCard
  layout/           # Navbar, BottomNav
  notifications/    # NotificationBanner, RegisterServiceWorker
  icons/            # SVG icon library (no external icon package)
hooks/              # useLocation, usePrayerTimes, usePrayerLogs
lib/
  supabase/         # client.ts, server.ts, service.ts
  aladhan.ts        # Prayer times API wrapper
  prayers.ts        # Prayer utilities, status logic, stats
  notifications.ts  # requestPermissionAndSubscribe
  openrouter.ts     # AI stream builder
types/              # Shared TypeScript interfaces
public/
  sw.js             # Service worker (push + caching)
  manifest.json     # PWA manifest
  icons/            # PWA icons (192px, 512px, badge 72px)
scripts/
  generate-icons.mjs  # One-time PNG icon generator (no extra deps)
Context/            # Architecture, security, design, implementation plan docs
```

---

## Cron Jobs

Configured in `vercel.json`:

| Route | Schedule | Purpose |
|---|---|---|
| `/api/cron/auto-miss` | Every 30 min | Marks unlogged prayers as missed |
| `/api/cron/push-notify` | Every 5 min | Sends push alerts for prayers in the next 10 min |
| `/api/cron/email-summary` | Daily 21:00 UTC | Emails users who have missed/pending prayers |

All cron routes require the `Authorization: Bearer $CRON_SECRET` header.

---

## Security

- Every API route starts with `getUser()` — returns 401 if no session
- Every DB query is scoped to `user_id` — no cross-user data leakage
- Service role client is used **only** in cron routes
- No user coordinates or PII sent to OpenRouter — only aggregated prayer stats
- CSP, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` headers on all routes

---

## Implementation Phases

| Phase | Description | Status |
|---|---|---|
| 0 | Project Bootstrap | ✅ |
| 1 | Authentication | ✅ |
| 2 | Prayer Times | ✅ |
| 3 | Prayer Logging | ✅ |
| 4 | Weekly + Monthly Views | ✅ |
| 5 | Notifications | ✅ |
| 6 | AI Analysis | ✅ |
| 7 | Settings + PWA Polish | ✅ |

---

## Contributing

This is a personal project. Issues and pull requests targeting `dev` are welcome.

Branch naming: `feature/feature_name`, `fix/bug_name`, `chore/task_name` (underscores, not hyphens).

---

Built by [Musa Jawo](https://github.com/Musbi8788)

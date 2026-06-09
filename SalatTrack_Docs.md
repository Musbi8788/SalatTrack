# 🕌 Muslim Prayer Tracker — Full Project Specification

**Project Name:** SalatTrack  
**Type:** Progressive Web App (PWA)  
**Stack:** Next.js · Supabase · Aladhan API · OpenRouter  
**Author:** Musa Jawo  
**Version:** 1.0.0  
**Date:** June 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Features](#2-core-features)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [Project Structure](#5-project-structure)
6. [Authentication Flow](#6-authentication-flow)
7. [Prayer Times Logic](#7-prayer-times-logic)
8. [Prayer Logging Flow](#8-prayer-logging-flow)
9. [Notifications System](#9-notifications-system)
10. [Analytics & AI Suggestions](#10-analytics--ai-suggestions)
11. [API Routes](#11-api-routes)
12. [UI/UX Screens](#12-uiux-screens)
13. [PWA Configuration](#13-pwa-configuration)
14. [Environment Variables](#14-environment-variables)
15. [Development Phases](#15-development-phases)
16. [Future Roadmap](#16-future-roadmap)

---

## 1. Project Overview

SalatTrack is a Muslim prayer tracking Progressive Web App (PWA) that helps users monitor their 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha). The app automatically calculates prayer times based on the user's location, sends push notifications at prayer time, and tracks whether the user prayed on time, late, or missed — with weekly/monthly analytics and AI-powered improvement suggestions.

**Problem it solves:** Most Muslims have no data on their prayer habits. This app creates accountability, visibility, and actionable improvement paths.

**Target Users:**
- Phase 1: Personal use (Musa Jawo)
- Phase 2: Muslim individuals globally who want to track their Salat

---

## 2. Core Features

### 2.1 Authentication
- Email + password registration
- Full name stored in profile
- Login with email + password
- Supabase Auth (built-in session management)
- Protected routes via middleware

### 2.2 Prayer Time Calculation
- Auto-detect user location (browser geolocation API)
- Fallback: user manually sets city/coordinates in settings
- Fetch prayer times from **Aladhan API** (free, no key required)
- Cache prayer times daily (avoid repeated API calls)
- Display today's 5 prayer times on the dashboard

### 2.3 Prayer Logging
- For each prayer, user can mark:
  - ✅ **Prayed on time** — logged before or within 15 mins of prayer time
  - ⏰ **Prayed late** — logged after 15 mins window but before next prayer
  - ❌ **Missed** — auto-set if no log recorded before the next prayer starts
- One log entry per prayer per day per user
- Can update status until end of day

### 2.4 Notifications
- **Push notification** at each prayer time: *"It's time for Dhuhr 🕌"*
- **Reminder notification** 10 minutes before prayer time
- **Missed prayer email** at end of day summarizing unlogged prayers
- Uses Web Push API (service worker) for browser notifications
- Uses Supabase Edge Functions + Resend for email

### 2.5 Weekly View
- 7-day grid × 5 prayers
- Color-coded cells:
  - 🟢 Green = On time
  - 🟡 Yellow = Late
  - 🔴 Red = Missed
  - ⬜ Grey = Future (not yet due)
- Tap any cell to see details or update status

### 2.6 Monthly View
- Full calendar grid showing consistency
- Stats panel:
  - Total prayers prayed this month
  - Total missed
  - Consistency % (prayed on time / total due)
  - Current streak (consecutive days with all 5 prayers)
  - Longest streak

### 2.7 AI Suggestions (OpenRouter)
- Triggered manually ("Analyze my prayers") or auto weekly
- Sends last 30 days of prayer data to OpenRouter API
- Model: `mistralai/mistral-7b-instruct` (free tier friendly) or `openai/gpt-3.5-turbo`
- Returns personalized improvement advice
- Example output: *"You miss Fajr 80% of the time. This is likely because of sleep schedule. Consider setting a Tahajjud alarm at 5:00 AM."*

---

## 3. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) | SSR, PWA support, fast |
| Styling | Tailwind CSS | Utility-first, mobile-first |
| Auth | Supabase Auth | Built-in, free, easy |
| Database | Supabase (PostgreSQL) | Free tier, realtime |
| Prayer Times | Aladhan API | Free, no key, accurate |
| Push Notifications | Web Push API + Service Worker | PWA standard |
| Email Notifications | Resend + Supabase Edge Functions | Free tier, reliable |
| AI Analysis | OpenRouter API | Use existing credits |
| Deployment | Vercel | Free tier, Next.js native |
| PWA Config | next-pwa | Manifest + service worker |

---

## 4. Database Schema

### 4.1 Table: `profiles`
Extends Supabase Auth `auth.users`.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  location_lat DECIMAL,
  location_lng DECIMAL,
  city_name TEXT,
  calculation_method INTEGER DEFAULT 3, -- Aladhan method (3 = Muslim World League)
  notification_enabled BOOLEAN DEFAULT TRUE,
  email_notification BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Table: `prayer_logs`
Core data table — one row per prayer per day per user.

```sql
CREATE TABLE prayer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prayer_date DATE NOT NULL,          -- e.g. 2026-06-05
  prayer_name TEXT NOT NULL,          -- 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
  scheduled_time TIME NOT NULL,       -- From Aladhan API
  status TEXT NOT NULL DEFAULT 'pending', -- 'on_time' | 'late' | 'missed' | 'pending'
  logged_at TIMESTAMPTZ,              -- When user tapped "I Prayed"
  notes TEXT,                         -- Optional personal note
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prayer_date, prayer_name)
);

-- Index for fast queries by user + date
CREATE INDEX idx_prayer_logs_user_date ON prayer_logs(user_id, prayer_date);
```

### 4.3 Table: `prayer_time_cache`
Caches Aladhan API responses to avoid repeated calls.

```sql
CREATE TABLE prayer_time_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_date DATE NOT NULL,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  method INTEGER NOT NULL,
  fajr TIME NOT NULL,
  sunrise TIME NOT NULL,
  dhuhr TIME NOT NULL,
  asr TIME NOT NULL,
  maghrib TIME NOT NULL,
  isha TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cache_date, lat, lng, method)
);
```

### 4.4 Table: `ai_analysis_logs`
Stores AI suggestions history.

```sql
CREATE TABLE ai_analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  analysis_text TEXT NOT NULL,
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see and edit their own data
CREATE POLICY "Users own data" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users own prayer logs" ON prayer_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own AI logs" ON ai_analysis_logs
  FOR ALL USING (auth.uid() = user_id);
```

---

## 5. Project Structure

```
salattrack/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Protected layout with nav
│   │   ├── page.tsx               # Today's prayers dashboard
│   │   ├── weekly/
│   │   │   └── page.tsx           # Weekly grid view
│   │   ├── monthly/
│   │   │   └── page.tsx           # Monthly calendar + stats
│   │   ├── analysis/
│   │   │   └── page.tsx           # AI suggestions page
│   │   └── settings/
│   │       └── page.tsx           # User profile + notification settings
│   ├── api/
│   │   ├── prayer-times/
│   │   │   └── route.ts           # Fetch + cache prayer times
│   │   ├── prayer-log/
│   │   │   ├── route.ts           # POST: log a prayer
│   │   │   └── [id]/
│   │   │       └── route.ts       # PATCH: update prayer status
│   │   ├── analysis/
│   │   │   └── route.ts           # POST: trigger AI analysis
│   │   └── cron/
│   │       ├── auto-miss/
│   │       │   └── route.ts       # Mark unlogged prayers as missed
│   │       └── email-summary/
│   │           └── route.ts       # Send daily email summary
│   ├── layout.tsx                 # Root layout with PWA meta
│   └── globals.css
├── components/
│   ├── ui/                        # Base UI components (button, card, badge)
│   ├── prayer/
│   │   ├── PrayerCard.tsx         # Single prayer row (name, time, status button)
│   │   ├── PrayerGrid.tsx         # Weekly 7x5 grid
│   │   ├── PrayerCalendar.tsx     # Monthly calendar
│   │   └── PrayerStats.tsx        # Stats summary cards
│   ├── analysis/
│   │   └── AIAnalysisCard.tsx     # AI suggestion display
│   └── layout/
│       ├── Navbar.tsx
│       └── BottomNav.tsx          # Mobile bottom navigation
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser Supabase client
│   │   └── server.ts              # Server Supabase client
│   ├── aladhan.ts                 # Aladhan API wrapper
│   ├── openrouter.ts              # OpenRouter API wrapper
│   ├── prayers.ts                 # Prayer business logic utils
│   └── notifications.ts           # Web Push helpers
├── hooks/
│   ├── usePrayerTimes.ts
│   ├── usePrayerLogs.ts
│   └── useLocation.ts
├── types/
│   └── index.ts                   # Shared TypeScript types
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   └── icons/                     # PWA icons (192x192, 512x512)
├── middleware.ts                  # Auth route protection
├── next.config.js
├── tailwind.config.ts
└── .env.local
```

---

## 6. Authentication Flow

### Register
1. User fills: Full Name, Email, Password
2. `supabase.auth.signUp()` creates auth user
3. Supabase trigger auto-creates row in `profiles` table
4. User redirected to dashboard
5. App requests geolocation permission on first load

### Login
1. User fills: Email, Password
2. `supabase.auth.signInWithPassword()`
3. Session stored in cookie (Next.js middleware reads it)
4. Redirect to dashboard

### Route Protection (middleware.ts)
```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Redirect unauthenticated users to login
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}
```

---

## 7. Prayer Times Logic

### Fetching from Aladhan API

```typescript
// lib/aladhan.ts
const ALADHAN_BASE = 'https://api.aladhan.com/v1'

export async function getPrayerTimes(
  lat: number,
  lng: number,
  date: string, // YYYY-MM-DD
  method: number = 3
) {
  const [day, month, year] = date.split('-').reverse()
  const url = `${ALADHAN_BASE}/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=${method}`
  
  const res = await fetch(url)
  const data = await res.json()
  
  return {
    Fajr: data.data.timings.Fajr,
    Dhuhr: data.data.timings.Dhuhr,
    Asr: data.data.timings.Asr,
    Maghrib: data.data.timings.Maghrib,
    Isha: data.data.timings.Isha,
  }
}
```

### Prayer Status Logic

```typescript
// lib/prayers.ts
export const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const
export type PrayerName = typeof PRAYERS[number]
export const ON_TIME_WINDOW_MINUTES = 15

export function determinePrayerStatus(
  scheduledTime: string, // "05:30"
  loggedAt: Date | null,
  nextPrayerTime: string | null // null for Isha
): 'on_time' | 'late' | 'missed' | 'pending' {
  const now = new Date()
  const scheduled = parseTimeToDate(scheduledTime)
  
  if (!loggedAt) {
    // If next prayer time has passed and still no log = missed
    if (nextPrayerTime && now > parseTimeToDate(nextPrayerTime)) {
      return 'missed'
    }
    return 'pending'
  }
  
  const diffMinutes = (loggedAt.getTime() - scheduled.getTime()) / 60000
  
  if (diffMinutes <= ON_TIME_WINDOW_MINUTES) return 'on_time'
  return 'late'
}
```

---

## 8. Prayer Logging Flow

### User Flow
1. User opens app → sees today's 5 prayers with their scheduled times
2. Each prayer shows current status (pending/on_time/late/missed)
3. User taps **"I Prayed"** button on any prayer card
4. App logs timestamp and calculates on_time vs late
5. Status updates immediately (optimistic UI update)

### Auto-Miss Cron Job
- Runs every 30 minutes via Vercel Cron
- Checks all users' prayer logs for today
- Any prayer where `status = 'pending'` AND current time > next prayer time → update to `missed`
- Isha: if `status = 'pending'` AND time > 11:59 PM → `missed`

```typescript
// app/api/cron/auto-miss/route.ts
export async function GET(req: Request) {
  // Verify cron secret header
  // Get all pending prayer logs for today where window has passed
  // Batch update to 'missed'
}
```

---

## 9. Notifications System

### Push Notifications (Web Push)
1. On first login, app requests notification permission
2. Browser generates push subscription
3. Subscription saved to Supabase (`profiles.push_subscription`)
4. Vercel Cron runs every 5 mins, checks if any prayer is due in next 10 mins
5. Sends Web Push notification via `web-push` npm package

### Email Notifications
- Triggered daily at 11:00 PM via Vercel Cron
- Fetches today's prayer logs for all users with `email_notification = true`
- If any prayers are `missed` or `pending` → send summary email
- Email provider: **Resend** (free tier: 100 emails/day)

**Email Content:**
```
Subject: Your Prayer Summary for June 5, 2026

Fajr     ✅ On time
Dhuhr    ✅ On time  
Asr      ❌ Missed
Maghrib  ✅ On time
Isha     ⏳ Pending

You prayed 3 out of 5 prayers today.
Don't miss Isha — it's not too late! 🕌
```

---

## 10. Analytics & AI Suggestions

### Weekly Stats Calculation
```typescript
function getWeeklyStats(logs: PrayerLog[]) {
  const total = logs.length
  const onTime = logs.filter(l => l.status === 'on_time').length
  const late = logs.filter(l => l.status === 'late').length
  const missed = logs.filter(l => l.status === 'missed').length
  const consistency = Math.round((onTime / total) * 100)
  
  return { total, onTime, late, missed, consistency }
}
```

### AI Analysis (OpenRouter)

**Prompt sent to model:**
```
You are an Islamic spiritual coach helping a Muslim improve their prayer habits.

Here is the user's prayer data for the last 30 days:

[JSON data: date, prayer name, status for each entry]

Summary statistics:
- Fajr: on time X%, late X%, missed X%
- Dhuhr: on time X%, late X%, missed X%
- Asr: on time X%, late X%, missed X%
- Maghrib: on time X%, late X%, missed X%
- Isha: on time X%, late X%, missed X%
- Overall consistency: X%
- Current streak: X days

Please provide:
1. A short encouraging assessment (2-3 sentences)
2. The 2 weakest prayers and WHY they're likely being missed (based on time of day)
3. 3 specific, practical improvement suggestions
4. A motivational closing (1 sentence with a relevant hadith or Quran verse)

Be warm, non-judgmental, and practical. Keep total response under 300 words.
```

---

## 11. API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/prayer-times?lat=&lng=&date=` | Fetch + cache prayer times |
| GET | `/api/prayer-log?date=` | Get user's logs for a date |
| POST | `/api/prayer-log` | Log a prayer (body: `{prayer_name, status}`) |
| PATCH | `/api/prayer-log/[id]` | Update prayer status |
| GET | `/api/prayer-log/weekly?start=` | Get 7-day logs |
| GET | `/api/prayer-log/monthly?month=&year=` | Get monthly logs + stats |
| POST | `/api/analysis` | Trigger AI analysis |
| GET | `/api/analysis/history` | Get past AI analysis logs |
| GET | `/api/cron/auto-miss` | (Cron) Auto-mark missed prayers |
| GET | `/api/cron/email-summary` | (Cron) Send daily email summary |

---

## 12. UI/UX Screens

### Screen 1: Login / Register
- Clean minimal form
- App name + crescent moon icon
- Email + Password fields
- Toggle between Login / Register
- Register adds Full Name field

### Screen 2: Dashboard (Home)
- Header: "Assalamu Alaikum, [Name]" + today's date (Hijri + Gregorian)
- Location pill: "📍 Banjul, Gambia"
- Today's prayer times grid:
  ```
  Fajr      05:23  ✅ On Time
  Dhuhr     13:12  ✅ On Time
  Asr       16:45  ⏳ Tap to Log
  Maghrib   19:34  🔒 Not Yet
  Isha      20:52  🔒 Not Yet
  ```
- Quick stats bar: "3/5 prayed today · 7 day streak 🔥"

### Screen 3: Weekly View
- 7-column × 5-row colored grid
- Days as columns (Mon–Sun)
- Prayers as rows (Fajr–Isha)
- Tap cell → mini popup with prayer details

### Screen 4: Monthly View
- Calendar with daily dot colors (green/yellow/red based on % prayed)
- Stats panel below:
  - Consistency %, streak, best prayer, worst prayer

### Screen 5: AI Analysis
- "Analyze My Prayers" button
- Loading state while API processes
- Formatted card with AI response
- History of past analyses (accordion)

### Screen 6: Settings
- Full name (editable)
- Location (re-detect or manual city entry)
- Calculation method (dropdown)
- Push notifications toggle
- Email notifications toggle
- Logout button

### Navigation
- **Bottom tab bar** (mobile-first):
  - 🏠 Today | 📅 Weekly | 📆 Monthly | 🤖 Analysis | ⚙️ Settings

---

## 13. PWA Configuration

### public/manifest.json
```json
{
  "name": "SalatTrack",
  "short_name": "SalatTrack",
  "description": "Track your 5 daily prayers with analytics and AI insights",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#10b981",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### next.config.js
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})

module.exports = withPWA({
  // your next config
})
```

---

## 14. Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=mistralai/mistral-7b-instruct

# Resend (email)
RESEND_API_KEY=your_resend_key
EMAIL_FROM=salattrack@yourdomain.com

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:you@email.com

# Cron Security
CRON_SECRET=your_random_secret_string

# App
NEXT_PUBLIC_APP_URL=https://salattrack.vercel.app
```

---

## 15. Development Phases

### Phase 1 — Foundation (Days 1–3)
- [ ] Initialize Next.js project with Tailwind
- [ ] Set up Supabase project, run schema migrations
- [ ] Implement Auth (register, login, logout, middleware)
- [ ] Build profile creation on register
- [ ] Aladhan API integration + prayer time caching
- [ ] Basic dashboard showing today's prayer times

### Phase 2 — Core Logging (Days 4–6)
- [ ] Prayer log API routes (POST, PATCH, GET)
- [ ] "I Prayed" button with optimistic UI
- [ ] Status calculation (on_time / late / missed / pending)
- [ ] Auto-miss cron job (Vercel Cron)
- [ ] Weekly grid view

### Phase 3 — Analytics & Notifications (Days 7–10)
- [ ] Monthly calendar + stats
- [ ] Web Push notification setup (service worker + VAPID)
- [ ] Prayer time notifications via cron
- [ ] Email summary via Resend

### Phase 4 — AI + Polish (Days 11–14)
- [ ] OpenRouter integration
- [ ] AI analysis page + history
- [ ] Settings page (location, notifications, profile)
- [ ] PWA manifest + icons
- [ ] Mobile UI polish (bottom nav, responsive design)
- [ ] Deploy to Vercel

---

## 16. Future Roadmap

> **Note on public leaderboards:** A community prayer leaderboard is intentionally excluded from SalatTrack. Public rankings create pressure toward riya (showing off) and undermine the sincerity that prayer requires. SalatTrack is a personal muhasabah (self-accountability) tool — not a competition.

| Feature | Priority | Notes |
|---|---|---|
| Qibla direction | Medium | Using device compass + coordinates |
| Hijri calendar | Medium | Display Islamic dates natively |
| Personal Reflection Journal | Medium | Daily notes on prayer experience and intentions |
| Dua Tracking | Medium | Log personal duas and track their outcomes |
| Qada Prayer Tracker | Medium | Track missed prayers that need to be made up |
| Quran Reading Consistency | Low | Daily ayat/page log alongside prayer |
| Personal Goal Setting | Medium | User-defined weekly prayer targets |
| Mobile app (React Native) | High | Post-MVP, when user base grows |
| Multi-language support | Medium | Arabic, French for West Africa |
| Offline mode | High | PWA should work without internet |

---

*Built with intention. May Allah make it a means of benefit. 🤲*
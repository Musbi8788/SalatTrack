# SalatTrack — Production Architecture

## Overview

SalatTrack is a mobile-first PWA deployed entirely on Vercel + Supabase free tiers, with a clear upgrade path. Every component is stateless and horizontally scalable by default because Next.js on Vercel is serverless.

---

## System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER DEVICE                             │
│                                                                 │
│   Browser / PWA (Next.js client bundle)                        │
│   ├── Service Worker (sw.js)  — push + offline cache           │
│   └── React state (Zustand or useState)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────────┐
│                       VERCEL EDGE                               │
│                                                                 │
│   Next.js App Router                                            │
│   ├── middleware.ts           — auth guard (Edge Runtime)       │
│   ├── app/(auth)/*            — login / register pages          │
│   ├── app/(dashboard)/*       — protected pages (SSR)           │
│   └── app/api/*               — serverless API routes           │
│       ├── prayer-times/       — fetch + DB cache                │
│       ├── prayer-log/         — log CRUD                        │
│       ├── analysis/           — AI trigger                      │
│       └── cron/*              — scheduled jobs                  │
└────┬──────────────┬────────────────────────────────────────────┘
     │              │
     │              │ Supabase JS client (supabase-js v2)
     │    ┌─────────▼──────────────────────┐
     │    │        SUPABASE                │
     │    │                                │
     │    │  Auth (JWT + HttpOnly cookies) │
     │    │  PostgreSQL (RLS enabled)      │
     │    │  ├── profiles                  │
     │    │  ├── prayer_logs               │
     │    │  ├── prayer_time_cache         │
     │    │  └── ai_analysis_logs          │
     │    │  Realtime (optional, Phase 2+) │
     │    └────────────────────────────────┘
     │
     │  External HTTP calls (server-side only)
     ├── Aladhan API     — prayer times (free, no key)
     ├── OpenRouter API  — AI analysis (key: server env)
     └── Resend API      — transactional email (key: server env)
```

---

## Component Breakdown

### 1. Next.js App (Vercel)

| Layer | Runtime | Notes |
|---|---|---|
| `middleware.ts` | Edge Runtime | Session check, redirect unauthenticated |
| Page components | Node.js Serverless | SSR for dashboard pages |
| API routes | Node.js Serverless | Max 10s timeout on free tier |
| Cron routes | Node.js Serverless | Triggered by Vercel Cron config |

**Function timeout budget:**
- `/api/prayer-times` — < 2s (DB lookup + optional Aladhan fetch)
- `/api/prayer-log` — < 1s (single DB write)
- `/api/analysis` — < 25s (LLM call; use streaming response or background queue)
- `/api/cron/*` — < 60s (batch updates; paginate if user base grows)

### 2. Supabase

- **Auth:** Email/password. Sessions stored as HttpOnly cookies via `@supabase/ssr`.
- **Database:** PostgreSQL 15. RLS enforced on every table. No direct client-to-DB queries bypass server.
- **Connection pooling:** Supabase uses PgBouncer in transaction mode. Use `supabase.from()` (pooled) for API routes, not direct `pg` connections.

### 3. Service Worker

Handles two responsibilities:
1. **Push notifications** — listens for `push` events from Vercel Cron via Web Push protocol.
2. **Offline cache** — caches today's prayer times and dashboard shell so the app loads without internet.

Strategy: **Network-first for API calls, cache-first for static assets.**

### 4. Vercel Cron Jobs

Defined in `vercel.json`. All cron routes verify `Authorization: Bearer $CRON_SECRET`.

| Job | Schedule | Route | Purpose |
|---|---|---|---|
| Auto-miss | `*/30 * * * *` | `/api/cron/auto-miss` | Mark pending → missed |
| Push notify | `*/5 * * * *` | `/api/cron/push-notify` | Send prayer time pushes |
| Email summary | `0 23 * * *` | `/api/cron/email-summary` | Daily missed prayer email |

---

## Data Flow — Prayer Logging (Happy Path)

```
User taps "I Prayed"
  → POST /api/prayer-log
    → Verify Supabase session (server-side)
    → Compute status: on_time | late (compare logged_at vs scheduled_time)
    → Upsert prayer_logs row (UNIQUE constraint: user_id + prayer_date + prayer_name)
    → Return {id, status, logged_at}
  → Client updates UI optimistically before response
```

---

## Data Flow — Prayer Times

```
Dashboard loads
  → GET /api/prayer-times?lat=&lng=&date=
    → Check prayer_time_cache (cache_date + lat + lng + method)
    → HIT  → return cached row
    → MISS → fetch Aladhan API → insert into cache → return
  → Render 5 prayer cards with times
```

---

## Scaling Checkpoints

| Milestone | Bottleneck | Fix |
|---|---|---|
| 0–100 users | None | Supabase free tier sufficient |
| 100–1000 users | Cron fan-out (push to all users) | Paginate cron in batches of 100 |
| 1000+ users | Vercel function limits, Supabase connection count | Upgrade tiers; add Redis for push queue |
| 10,000+ users | Aladhan API rate limits | Deduplicate cache by (lat rounded to 2dp, lng, date) |

---

## Deployment Environments

| Env | Branch | URL | Notes |
|---|---|---|---|
| Development | `main` (local) | localhost:3000 | PWA disabled, .env.local |
| Preview | feature branches | Vercel preview URL | Auto-deployed by Vercel |
| Production | `main` (merged) | salattrack.vercel.app | Full PWA, env vars in Vercel dashboard |

---

## Key Architectural Decisions

1. **No Redis** — DB-level cache (`prayer_time_cache` table) is sufficient for prayer times at this scale. Add Redis only when Supabase query latency becomes a concern.
2. **No message queue** — Vercel Cron + direct Web Push is simpler than a queue at <1000 users. OpenRouter AI calls are slow (5–15s); return a job ID pattern if needed.
3. **Supabase RLS over server-side guards** — RLS is the last line of defense. Server routes also check auth, but RLS ensures DB-level tenant isolation even if a route has a bug.
4. **`@supabase/ssr` not `@supabase/auth-helpers-nextjs`** — The helpers package is deprecated. Use the `ssr` package for Next.js 14+ App Router.

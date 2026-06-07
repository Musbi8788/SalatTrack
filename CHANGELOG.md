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

<!-- Add new entries above this line, most recent first -->

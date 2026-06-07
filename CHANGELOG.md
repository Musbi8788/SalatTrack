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

<!-- Add new entries above this line, most recent first -->

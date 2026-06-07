# CLAUDE.md — SalatTrack Agent Rulebook

Read this file at the start of every session. It is the single source of truth for all agents working on SalatTrack.

---

## 1. Project Overview

**SalatTrack** is a Muslim prayer tracking PWA built by Musa Jawo.
It tracks 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) with on-time/late/missed status, push notifications, weekly/monthly analytics, and AI-powered improvement suggestions.

**Stack:** Next.js 16.2 · React 19.2.7 · Tailwind CSS v4 · Supabase (Auth + PostgreSQL) · Aladhan API · OpenRouter · Resend · Web Push · Vercel

**This is a personal project — no production users yet.** However, treat it as production quality from day one. Every decision should be safe to scale.

---

## 2. Context Folder — Read Before Coding

The `Context/` folder contains the full design and planning documentation.
**Read the relevant file before starting any task. Do not skip this.**

| File | Read when... |
|---|---|
| `Context/ARCHITECTURE.md` | Starting a new feature, designing a data flow, or choosing between approaches |
| `Context/SECURITY.md` | Writing any API route, database query, or auth-related code |
| `Context/SYSTEM_DESIGN.md` | Designing data models, caching, state machines, or the offline strategy |
| `Context/IMPLEMENTATION_PLAN.md` | Starting a new phase task or checking what comes next |
| `Context/SKILLS.md` | Writing any component, hook, API route, or Next.js config |
| `Context/DESIGN-STYLE.md` | Writing any UI component, choosing colors, or using icons |
| `Context/CODE-REVIEW.md` | Before every `git commit` — run the full checklist |
| `Context/VERSION-CONTROL.md` | Before creating branches, commits, or PRs — full workflow reference |
| `CHANGELOG.md` | After completing a session — append what was built and decided (root of project) |

---

## 3. Git Workflow (Agent Rules)

### 3.1 Branch Setup — Do This at Session Start

```bash
# Check if dev branch exists locally
git branch --list dev

# If dev does NOT exist, create it from main and push it
git checkout main
git pull origin main
git checkout -b dev
git push -u origin dev

# If dev DOES exist, just switch to it and pull
git checkout dev
git pull origin dev
```

### 3.2 Sub-Branch Naming

**Format:** `feature/feature_name` — use underscore between words, not hyphen.

```bash
# CORRECT
feature/prayer_logging
feature/weekly_grid
feature/push_notifications
feature/ai_analysis
fix/auto_miss_cron
fix/aladhan_date_format
chore/update_deps
refactor/extract_prayer_utils
test/prayer_status_edge_cases

# WRONG
feature/prayer-logging    ← hyphens not allowed
feature/prayerLogging     ← camelCase not allowed
prayer-logging            ← missing type prefix
```

### 3.3 Starting Work on a Feature

```bash
# 1. Always branch from the latest dev
git checkout dev
git pull origin dev

# 2. Create your feature sub-branch
git checkout -b feature/feature_name

# 3. Do your work

# 4. Run the full CODE-REVIEW.md checklist (Section 6 must pass)

# 5. Stage only the files you changed — never git add .
git add path/to/file1.ts path/to/file2.tsx

# 6. Commit with Conventional Commits format
git commit -m "feat(scope): short description"

# 7. Push the sub-branch to remote
git push origin feature/feature_name

# 8. Open PR targeting dev
gh pr create --base dev --title "feat(scope): description" --body "..."
```

### 3.4 Hard Rules — No Exceptions

- **NEVER** `git push origin main` — main is off-limits for agents
- **NEVER** `git push origin dev` — dev receives changes via PR only
- **NEVER** `git merge` — use `git rebase origin/dev` to sync your branch
- **NEVER** `git add .` or `git add -A` — add specific files only
- **NEVER** commit a `.env` file — check `git status` before every commit
- **ALWAYS** run the CODE-REVIEW.md checklist before `git commit`
- **ALWAYS** target `--base dev` in every PR — never `--base main`

### 3.5 Commit Message Format

```
type(scope): short description

Types: feat | fix | chore | refactor | test | docs | style | perf
```

Scopes: `auth` · `prayer_times` · `prayer_log` · `cron` · `weekly` · `monthly` · `analysis` · `notifications` · `email` · `settings` · `pwa` · `ui` · `types` · `deps` · `config` · `security`

```bash
# Good examples
git commit -m "feat(prayer_log): add optimistic UI for I Prayed button"
git commit -m "fix(cron): handle 410 Gone response for expired push subscriptions"
git commit -m "chore(deps): upgrade @supabase/ssr to latest"
git commit -m "test(prayer_times): add cache hit and miss unit tests"

# Bad examples (do not write these)
git commit -m "update"
git commit -m "fixed stuff"
git commit -m "WIP"
```

---

## 4. Technology Rules

**Read `Context/SKILLS.md` for full details. Key points:**

- **Next.js 15** — `params` and `cookies()` are async, must be awaited. Config is `next.config.ts`. Fetch is NOT cached by default.
- **React 19** — use `useOptimistic` for the "I Prayed" button. `ref` is a plain prop, no `forwardRef`. Use `useFormStatus` for submit buttons.
- **Tailwind v4** — config is CSS-first in `globals.css` (`@import "tailwindcss"` + `@theme {}`). No `tailwind.config.js`.
- **TypeScript strict** — no `any`, explicit return types everywhere, `import type` for type imports.
- **Zod** — validate every API route request body and query string before touching the database.
- **`@supabase/ssr`** — use this package, not the deprecated `@supabase/auth-helpers-nextjs`.
- **`getUser()`** — always use this in server contexts, never `getSession()`.

---

## 5. Design Rules

**Read `Context/DESIGN-STYLE.md` for full details. Key points:**

- **Dark only** — no light mode. Add `class="dark"` to `<html>`.
- **Two brand colors only:**
  - Dark Red `#C0272D` → token `brand-red` — CTAs, "I Prayed", active states
  - Light Blue `#4FC3F7` → token `brand-blue` — prayer times, analytics, on-time status
- **No Tailwind default color names** — never use `green-`, `blue-`, `emerald-`, `purple-` etc. Use `brand-red`, `brand-blue`, `text-muted`, `bg-surface` etc.
- **SVG icons only** — all icons come from `components/icons/index.tsx`. No Lucide, Heroicons, or react-icons.
- **No inline styles** — use Tailwind tokens only.

---

## 6. Security Rules

**Read `Context/SECURITY.md` for full details. Non-negotiables:**

- Every API route starts with `getUser()` auth check — returns 401 if no session.
- Every cron route starts with CRON_SECRET header check — returns 403 if missing/wrong.
- Every query scoped to a user includes `.eq('user_id', user.id)`.
- Service role client (`lib/supabase/service.ts`) is used ONLY in cron routes.
- No server-only keys in `NEXT_PUBLIC_*` environment variables.
- No user coordinates or PII sent to OpenRouter — only aggregated stats.

---

## 7. Database Rules

- Use `@supabase/ssr` server client in API routes and Server Components.
- Always destructure `{ data, error }` from Supabase calls — always check `error` first.
- No N+1 queries — batch with `.in()` instead of looping.
- Use `.upsert({ onConflict: '...' })` for prayer logs (not insert + catch).
- `prayer_date` is a `DATE` string `'YYYY-MM-DD'`. `scheduled_time` is `TIME` string `'HH:mm'`.

---

## 8. Implementation Plan

Full plan in `Context/IMPLEMENTATION_PLAN.md`. Work within the active phase.

| # | Phase | Status |
|---|---|---|
| 0 | Project Bootstrap | ⬜ |
| 1 | Authentication | ⬜ |
| 2 | Prayer Times | ⬜ |
| 3 | Prayer Logging | ⬜ |
| 4 | Weekly + Monthly Views | ⬜ |
| 5 | Notifications | ⬜ |
| 6 | AI Analysis | ⬜ |
| 7 | Settings + PWA Polish | ⬜ |

Update the status column (⬜ → 🔄 → ✅) as phases progress.
Append a session summary to `Context/CHANGELOG.md` after each session.

---

## 9. Code Review — Before Every Commit

Run the full checklist in `Context/CODE-REVIEW.md`. The final gate (Section 6):

```bash
npx tsc --noEmit        # must return 0 errors
npx eslint .            # must return 0 errors
npm run test -- --run   # all tests must pass
npm run build           # must succeed
git status              # confirm no .env file is staged
```

All five must pass before `git commit` runs.

---

## 10. When to Stop and Ask

- A database migration is needed that modifies existing columns or tables.
- A feature requires a new top-level folder not in the project structure.
- Work is drifting outside the current implementation phase.
- An API key or external service needs to be added.
- A PR has a merge conflict that touches both sides non-trivially.
- The Aladhan API structure appears to have changed.
- Any change would affect the authentication flow or session cookies.

---

## 11. Definition of a Good Session

- Work stays within the current phase task.
- A sub-branch was created from `dev` (not from `main`).
- All CODE-REVIEW.md checks pass.
- A PR is opened targeting `dev`.
- `Context/CHANGELOG.md` has a new entry for the session.
- No secrets committed, no `.env` staged.
- The build passes and tests are green.

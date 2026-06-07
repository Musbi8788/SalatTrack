# SalatTrack — Code Review Guide

## Agent Instructions

Run this review **before every commit**. No exceptions.
Go through each section in order. Fix every failure before moving on.
A commit that skips this review is not allowed.

---

## How to Run the Review

```bash
# 1. Type check
npx tsc --noEmit

# 2. Lint check
npx eslint . --ext .ts,.tsx

# 3. Run tests
npm run test

# 4. Build check (catches runtime errors lint misses)
npm run build

# 5. Only after all 4 pass → commit
```

If any command above fails, fix the errors before proceeding. Do not commit a broken build.

---

## Section 1 — Security Review

Work through every item. Mark mentally as PASS / FAIL / N/A.

### 1.1 Authentication

- [ ] Every API route that returns or mutates user data begins with:
  ```typescript
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- [ ] `getUser()` is used — NOT `getSession()`. (`getSession()` trusts the client JWT without server verification — security hole.)
- [ ] No route skips the auth check because "it feels safe."
- [ ] Middleware in `middleware.ts` covers all `/dashboard/*` and `/api/*` routes (except `/api/cron/*` which uses CRON_SECRET instead).

### 1.2 Cron Route Protection

- [ ] Every cron route at `/api/cron/*` begins with:
  ```typescript
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  ```
- [ ] No cron route can be triggered by a regular user session.

### 1.3 Authorization (IDOR Prevention)

- [ ] Every database query that touches a user-owned row includes `.eq('user_id', user.id)`.
  ```typescript
  // CORRECT
  .from('prayer_logs').select('*').eq('user_id', user.id)

  // WRONG — returns all users' logs
  .from('prayer_logs').select('*')
  ```
- [ ] PATCH/DELETE routes that operate on a row by ID verify the row belongs to the authenticated user before modifying it.
  ```typescript
  const { data: log } = await supabase
    .from('prayer_logs')
    .select('user_id')
    .eq('id', params.id)
    .single()
  if (log?.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  ```
- [ ] The service role client (`lib/supabase/service.ts`) is ONLY used in cron routes. It is never imported into components or regular API routes.

### 1.4 Environment Variables

- [ ] No secret keys start with `NEXT_PUBLIC_`. Check:
  - `SUPABASE_SERVICE_ROLE_KEY` — server only
  - `OPENROUTER_API_KEY` — server only
  - `RESEND_API_KEY` — server only
  - `VAPID_PRIVATE_KEY` — server only
  - `CRON_SECRET` — server only
- [ ] No `.env` file is staged for commit (`git status` check).
- [ ] No API keys or secrets appear in any source file, comment, or test fixture.
- [ ] `console.log` statements do not print `user`, `email`, `lat`, `lng`, or any env var.

### 1.5 Input Validation

- [ ] Every API route that accepts a request body validates it with zod before using any field.
  ```typescript
  const result = Schema.safeParse(await request.json())
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }
  // Only use result.data below — never raw body fields
  ```
- [ ] Query parameters are validated with zod (especially `lat`, `lng`, `date`).
- [ ] Notes / user text fields have a `max()` length validator.
- [ ] No raw user input is interpolated into a string that gets passed to the database.

### 1.6 Data Privacy

- [ ] User coordinates (`lat`, `lng`) are never included in the OpenRouter prompt. Only aggregated stats and prayer statuses go to the LLM.
- [ ] Full name and email are never logged to console in production paths.
- [ ] Prayer notes (user-generated text) are rendered as plaintext, never as HTML.

---

## Section 2 — TypeScript Review

### 2.1 No `any`

- [ ] Search the diff for `: any` and `as any`. Every hit must be justified or removed.
  ```bash
  git diff --staged | grep -n ": any\|as any"
  ```
- [ ] `unknown` with type narrowing is the correct alternative to `any`.
- [ ] Supabase query results are typed via the generated types or explicit interfaces — not `any`.

### 2.2 Return Types

- [ ] Every function in `lib/`, `hooks/`, and `app/api/` has an explicit return type annotation.
  ```typescript
  // CORRECT
  async function getPrayerLogs(userId: string): Promise<PrayerLog[]> { ... }

  // WRONG
  async function getPrayerLogs(userId: string) { ... }
  ```
- [ ] React components have typed `Props` interfaces — not inline `any` or untyped props.

### 2.3 Null Safety

- [ ] Optional chaining (`?.`) is used instead of direct access on nullable values.
- [ ] Supabase responses destructure both `data` and `error` — `error` is always checked before using `data`.
  ```typescript
  const { data, error } = await supabase.from(...).select(...)
  if (error) { /* handle */ }
  // only use data below
  ```
- [ ] `tsconfig.json` has `"noUncheckedIndexedAccess": true` — array/object index access returns `T | undefined`.

### 2.4 Type Imports

- [ ] Shared types are imported from `@/types`, not redefined locally.
- [ ] `import type` is used for type-only imports (keeps runtime bundle clean):
  ```typescript
  import type { PrayerLog, PrayerName } from '@/types'
  ```

### 2.5 Exhaustiveness

- [ ] `switch` statements on union types (e.g. `PrayerStatus`) have a default that throws:
  ```typescript
  default:
    status satisfies never  // compile-time check that all cases are handled
    throw new Error(`Unknown status: ${status}`)
  ```

---

## Section 3 — Database Query Review

### 3.1 RLS Compliance

- [ ] Every query against `prayer_logs` includes `.eq('user_id', user.id)` even though RLS enforces it — defense in depth.
- [ ] Every query against `profiles` operates on `user.id` only.
- [ ] No query uses `.select('*')` when only specific columns are needed. Select only what is used.

### 3.2 Performance

- [ ] Date-range queries on `prayer_logs` use the indexed columns:
  ```typescript
  // CORRECT — uses idx_prayer_logs_user_date
  .from('prayer_logs')
  .select('*')
  .eq('user_id', user.id)
  .eq('prayer_date', date)

  // WRONG — full table scan on notes column
  .from('prayer_logs')
  .select('*')
  .ilike('notes', `%${query}%`)
  ```
- [ ] No N+1 queries. If you're fetching data in a loop, batch it into a single query with `.in()`.
  ```typescript
  // WRONG — N queries
  for (const userId of userIds) {
    await supabase.from('prayer_logs').select('*').eq('user_id', userId)
  }

  // CORRECT — 1 query
  await supabase.from('prayer_logs').select('*').in('user_id', userIds)
  ```
- [ ] Cron jobs that iterate over all users paginate results (`.range(0, 99)`) rather than fetching all rows at once.

### 3.3 Upserts

- [ ] Prayer log creation uses `.upsert()` with `onConflict` to respect the UNIQUE constraint:
  ```typescript
  await supabase.from('prayer_logs').upsert(
    { user_id, prayer_date, prayer_name, status, logged_at, scheduled_time },
    { onConflict: 'user_id,prayer_date,prayer_name' }
  )
  ```
- [ ] No double-insert risk on the prayer time cache table.

### 3.4 Error Handling

- [ ] Every Supabase call destructures `error` and handles it — no silent failures.
- [ ] Errors from Supabase are logged (without PII) and return a 500 response, not a 200 with empty data.
- [ ] The service role client is never used in a context where the error would silently bypass RLS.

### 3.5 Schema Alignment

- [ ] Column names in queries match the actual schema in `SalatTrack_Docs.md` section 4 exactly.
- [ ] `prayer_date` is a `DATE` string (`'YYYY-MM-DD'`), not a full timestamp.
- [ ] `scheduled_time` is a `TIME` string (`'HH:mm'`), not a Date object.
- [ ] `logged_at` is a full `TIMESTAMPTZ` ISO string.

---

## Section 4 — Component & UI Review

### 4.1 Design System Compliance

- [ ] No Tailwind default color names in the diff: `green-`, `blue-`, `emerald-`, `purple-`, `red-` (only `brand-red`, `brand-blue`, etc. are allowed).
  ```bash
  git diff --staged | grep -E "bg-(green|blue|emerald|purple|indigo)|text-(green|blue|emerald|purple)"
  ```
- [ ] No inline styles (`style={{}}`).
- [ ] No hardcoded hex values in `className` (`text-[#4FC3F7]` → use `text-brand-blue`).
- [ ] No icon library imports (no `lucide-react`, `react-icons`, `@heroicons`).
  ```bash
  git diff --staged | grep -E "from 'lucide|from 'react-icons|from '@heroicons"
  ```
- [ ] All SVG icons come from `@/components/icons`.

### 4.2 Accessibility

- [ ] Interactive elements (`button`, `a`) have descriptive labels or `aria-label`.
- [ ] Status icons have `aria-label` describing the status (not just a colored dot).
- [ ] Touch targets are at least 44×44px (`min-h-[44px] min-w-[44px]`).
- [ ] Color is not the only indicator of state (status badges have both color AND an icon).

### 4.3 Client/Server Boundary

- [ ] `"use client"` is only added when the component needs: `onClick`/event handlers, `useState`/`useEffect`, browser APIs (geolocation, notifications, localStorage).
- [ ] No `fetch('/api/...')` calls from Server Components — Server Components query the database directly via the server Supabase client.
- [ ] No `process.env.*` (server-only vars) accessed in Client Components.

### 4.4 Loading & Error States

- [ ] Every async data fetch has a loading state (skeleton or spinner using `LoaderIcon`).
- [ ] Every async data fetch has an error state shown to the user.
- [ ] The "I Prayed" button is disabled while the request is in flight.

---

## Section 5 — Testing Review

### 5.1 What Must Be Tested

Every PR that touches these areas must include tests:

| Area | Required Tests |
|---|---|
| `lib/prayers.ts` | `determinePrayerStatus` — all 4 status outcomes |
| `lib/prayers.ts` | `getMonthlyStats` — streak calculation, consistency % |
| `lib/aladhan.ts` | Mock fetch; verify returned shape; verify date format |
| Any new API route | At minimum: auth rejection (401), invalid input (400), happy path (200) |
| Cron routes | CRON_SECRET rejection (403), happy path with mocked DB |

### 5.2 Test File Conventions

```
tests/
├── lib/
│   ├── prayers.test.ts
│   └── aladhan.test.ts
├── api/
│   ├── prayer-log.test.ts
│   └── prayer-times.test.ts
└── components/
    └── PrayerCard.test.tsx
```

### 5.3 Test Pattern

```typescript
// tests/lib/prayers.test.ts
import { describe, it, expect } from 'vitest'
import { determinePrayerStatus } from '@/lib/prayers'

describe('determinePrayerStatus', () => {
  it('returns on_time when logged within 15 minutes', () => {
    const scheduled = '05:30'
    const loggedAt = new Date('2026-06-07T05:40:00Z')
    expect(determinePrayerStatus(scheduled, loggedAt)).toBe('on_time')
  })

  it('returns late when logged after 15-minute window', () => {
    const scheduled = '05:30'
    const loggedAt = new Date('2026-06-07T05:50:00Z')
    expect(determinePrayerStatus(scheduled, loggedAt)).toBe('late')
  })

  it('returns pending when loggedAt is null and window has not passed', () => {
    expect(determinePrayerStatus('23:00', null)).toBe('pending')
  })
})
```

### 5.4 Pre-Commit Test Run

```bash
npm run test -- --run   # run once, no watch mode
```

All tests must pass. Do not commit with failing tests.

---

## Section 6 — Final Pre-Commit Checklist

Run this checklist last, after all sections above pass.

```
[ ] npx tsc --noEmit          → 0 errors
[ ] npx eslint .               → 0 errors (warnings acceptable)
[ ] npm run test -- --run      → all tests pass
[ ] npm run build              → build succeeds
[ ] git diff --staged          → reviewed manually, nothing suspicious
[ ] No .env files staged       → git status confirms
[ ] No console.log with PII    → grepped and confirmed
[ ] No hardcoded secrets       → grepped and confirmed
[ ] Branch is NOT main         → git branch --show-current confirms
[ ] Commit message follows convention in VERSION-CONTROL.md
```

Only after every box above is checked → run `git commit`.

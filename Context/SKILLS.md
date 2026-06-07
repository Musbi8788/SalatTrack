# SalatTrack — Skills & Technology Reference

## Agent Instructions

Read this file before writing any component, route, or configuration.
This file defines the **exact version, patterns, and APIs** the agent must use.
When in doubt, follow the linked documentation — do not rely on training data for API signatures.

---

## Technology Stack (Pinned Versions)

| Technology | Version | Notes |
|---|---|---|
| Next.js | **16** (App Router) | NOT Next.js 14 — use v16 patterns |
| React | **19** | Ships with Next.js 15 |
| Tailwind CSS | **v4** | Config is CSS-first, not JS config |
| TypeScript | **5.x** | Strict mode enabled |
| Node.js | **20 LTS** | Minimum for Next.js 16 |

---

## Documentation Links (Agent: fetch these when uncertain)

| Topic | URL |
|---|---|
| Next.js 16 full docs | https://nextjs.org/docs |
| Next.js App Router | https://nextjs.org/docs/app |
| Next.js API Routes | https://nextjs.org/docs/app/building-your-application/routing/route-handlers |
| Next.js Server Actions | https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations |
| Next.js Middleware | https://nextjs.org/docs/app/building-your-application/routing/middleware |
| Next.js Metadata API | https://nextjs.org/docs/app/building-your-application/optimizing/metadata |
| Next.js Caching | https://nextjs.org/docs/app/building-your-application/caching |
| React foundations | https://nextjs.org/learn/react-foundations/getting-started-with-react |
| React 19 new APIs | https://react.dev/blog/2024/12/05/react-19 |
| Tailwind CSS v4 docs | https://tailwindcss.com/docs |
| Tailwind v4 upgrade guide | https://tailwindcss.com/docs/upgrade-guide |
| Tailwind v4 installation | https://tailwindcss.com/docs/installation |

---

## 1. Next.js 16 — App Router

### Bootstrap command
```bash
npx create-next-app@latest salattrack \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias "@/*"
```

### What changed from Next.js 15 → 16 (agent must know)

| Feature | Next.js 14 | Next.js 16 |
|---|---|---|
| Async params/searchParams | sync | **async** — always `await params` |
| fetch caching default | cached by default | **not cached by default** |
| `cookies()` / `headers()` | sync | **async** — `await cookies()` |
| React version | 18 | **19** |
| Turbopack | experimental | **stable (default dev server)** |

**Breaking change — always await dynamic APIs:**
```typescript
// WRONG (Next.js 14 pattern — will error in Next.js 16)
export default function Page({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>
}

// CORRECT (Next.js 15)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <div>{id}</div>
}
```

**Breaking change — cookies and headers are now async:**
```typescript
// WRONG
import { cookies } from 'next/headers'
const cookieStore = cookies()

// CORRECT
import { cookies } from 'next/headers'
const cookieStore = await cookies()
```

### App Router folder conventions

```
app/
├── layout.tsx          ← Root layout (runs on every page)
├── page.tsx            ← Route: /
├── loading.tsx         ← Suspense fallback (optional)
├── error.tsx           ← Error boundary (optional, must be client)
├── not-found.tsx       ← 404 page
├── (auth)/             ← Route group — does NOT affect URL
│   ├── login/page.tsx  ← Route: /login
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx      ← Nested layout (auth-protected)
│   └── page.tsx        ← Route: / (inside dashboard layout)
└── api/
    └── prayer-log/
        └── route.ts    ← API: POST/GET /api/prayer-log
```

### Server vs Client Components

**Default: Server Components.** Only add `"use client"` when needed.

```typescript
// Server Component (default) — runs on the server, zero JS sent to client
// Can: async/await, read cookies/headers, access DB
// Cannot: useState, useEffect, event handlers, browser APIs
export default async function PrayerList() {
  const logs = await fetchLogs() // direct DB call OK here
  return <ul>{logs.map(l => <li key={l.id}>{l.prayer_name}</li>)}</ul>
}

// Client Component — runs in browser
// Must add directive at the top of the file
"use client"

import { useState } from 'react'
export function PrayerButton({ onLog }: { onLog: () => void }) {
  const [loading, setLoading] = useState(false)
  return <button onClick={onLog}>I Prayed</button>
}
```

**Decision rule:**
- Static display of data → Server Component
- Needs `onClick`, `onChange`, `useState`, `useEffect` → Client Component
- Needs browser API (geolocation, notifications, localStorage) → Client Component

### Route Handlers (API Routes)

```typescript
// app/api/prayer-log/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date')
  // ...
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // ...
  return NextResponse.json({ success: true }, { status: 201 })
}
```

### Server Actions

Use Server Actions for form submissions and mutations that originate from Client Components — avoids writing a separate API route.

```typescript
// app/actions/prayer.ts
"use server"

import { createServerClient } from '@supabase/ssr'

export async function logPrayer(prayerName: string) {
  // Runs on server, can access DB directly
  // Called from Client Components
}
```

```typescript
// components/prayer/PrayerButton.tsx
"use client"
import { logPrayer } from '@/app/actions/prayer'

export function PrayerButton({ prayerName }: { prayerName: string }) {
  return (
    <form action={() => logPrayer(prayerName)}>
      <button type="submit">I Prayed</button>
    </form>
  )
}
```

### Data Fetching Patterns

```typescript
// In Server Components: fetch directly (Next.js 15 — NOT cached by default)
const data = await fetch('https://api.aladhan.com/...', {
  next: { revalidate: 86400 } // cache for 24 hours (ISR)
})

// Force no cache (always fresh):
const data = await fetch(url, { cache: 'no-store' })

// Force cache (permanent until manually revalidated):
const data = await fetch(url, { cache: 'force-cache' })
```

### Metadata (SEO + PWA)

```typescript
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SalatTrack',
  description: 'Track your 5 daily prayers',
  manifest: '/manifest.json',
  themeColor: '#10b981',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SalatTrack',
  },
}
```

### next.config.ts (Next.js 15 uses .ts not .js)

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // config here
}

export default nextConfig
```

---

## 2. React 19 — New APIs to Use

### `useOptimistic` — Optimistic UI Updates

Use this for the "I Prayed" button so the UI updates instantly before the server confirms.

```typescript
"use client"
import { useOptimistic, useTransition } from 'react'

export function PrayerCard({ prayer, initialStatus }) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(initialStatus)
  const [isPending, startTransition] = useTransition()

  const handleLog = () => {
    startTransition(async () => {
      setOptimisticStatus('on_time') // immediate UI update
      await logPrayer(prayer.name)   // actual server call
      // if server call fails, React reverts to initialStatus automatically
    })
  }

  return (
    <div>
      <span>{optimisticStatus}</span>
      <button onClick={handleLog} disabled={isPending}>I Prayed</button>
    </div>
  )
}
```

### `useFormStatus` — Loading State for Form Buttons

```typescript
"use client"
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Settings'}
    </button>
  )
}
```

### `use()` Hook — Read Promises and Context

```typescript
"use client"
import { use } from 'react'

// Read a context (alternative to useContext)
const theme = use(ThemeContext)

// Unwrap a promise passed from a Server Component
function PrayerTimes({ timesPromise }: { timesPromise: Promise<PrayerTimes> }) {
  const times = use(timesPromise) // Suspense-aware
  return <div>{times.Fajr}</div>
}
```

### `ref` as Prop (No More `forwardRef`)

```typescript
// React 19 — ref is just a prop now
function PrayerInput({ ref, ...props }) {
  return <input ref={ref} {...props} />
}

// OLD React 18 way — don't use this
const PrayerInput = forwardRef((props, ref) => <input ref={ref} {...props} />)
```

### Error Handling with `ErrorBoundary`

```typescript
// app/(dashboard)/error.tsx — must be "use client"
"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <p>Something went wrong loading your prayers.</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

---

## 3. Tailwind CSS v4

### What changed from v3 → v4 (agent must know)

| Feature | v3 | v4 |
|---|---|---|
| Config file | `tailwind.config.js` | **CSS-first — config lives in CSS** |
| PostCSS setup | Required | **Built-in, no postcss.config needed** |
| `@tailwind` directives | `@tailwind base/components/utilities` | **`@import "tailwindcss"`** |
| Arbitrary values | `w-[100px]` | same |
| CSS variables | manual | **auto-generated as `--color-*`** |
| Dark mode | `darkMode: 'class'` in config | **`@variant dark` in CSS** |
| Prefix | `prefix: 'tw-'` in config | **`@import "tailwindcss" prefix(tw-)`** |

### Installation with Next.js 15

When using `create-next-app` with `--tailwind`, Tailwind v4 is set up automatically. If adding manually:

```bash
npm install tailwindcss @tailwindcss/postcss
```

```css
/* app/globals.css */
@import "tailwindcss";

/* Custom theme tokens go here */
@theme {
  --color-emerald-brand: #10b981;
  --font-sans: 'Inter', sans-serif;
}
```

No `tailwind.config.js` needed unless using plugins.

### Using Plugins (e.g. typography, forms)

```bash
npm install @tailwindcss/typography
```

```css
/* app/globals.css */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

### Component Patterns

**Mobile-first breakpoints** (same as v3):
```
Default = mobile
sm:  ≥ 640px
md:  ≥ 768px
lg:  ≥ 1024px
xl:  ≥ 1280px
```

**SalatTrack color palette** (use these consistently):
```
Background (dark)  : bg-slate-900
Surface cards      : bg-slate-800
Border             : border-slate-700
Primary action     : bg-emerald-500 hover:bg-emerald-600
Text primary       : text-white
Text secondary     : text-slate-400
On time (green)    : bg-emerald-500 / text-emerald-400
Late (yellow)      : bg-amber-500 / text-amber-400
Missed (red)       : bg-red-500 / text-red-400
Pending (grey)     : bg-slate-600 / text-slate-400
```

**Utility class patterns for this project:**
```tsx
// Prayer status badge
const statusClasses = {
  on_time: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  late:    'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  missed:  'bg-red-500/20 text-red-400 border border-red-500/30',
  pending: 'bg-slate-600/20 text-slate-400 border border-slate-600/30',
}

// Card container
<div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">

// Primary button
<button className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                   text-white font-medium rounded-xl px-4 py-3
                   transition-colors duration-150 w-full
                   disabled:opacity-50 disabled:cursor-not-allowed">

// Bottom nav item
<button className="flex flex-col items-center gap-1 px-4 py-2 text-slate-400
                   hover:text-emerald-400 transition-colors data-[active=true]:text-emerald-400">
```

**Dark mode (always dark — SalatTrack is dark-only):**
Add `class="dark"` to `<html>` in `app/layout.tsx`. The app does not support light mode.

---

## 4. TypeScript Conventions

### Project `tsconfig.json` settings (enforce these)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Type file (`types/index.ts`)

All shared types live here. Import from `@/types` everywhere.

```typescript
export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'
export type PrayerStatus = 'on_time' | 'late' | 'missed' | 'pending'

export interface Profile {
  id: string
  full_name: string
  email: string
  location_lat: number | null
  location_lng: number | null
  city_name: string | null
  calculation_method: number
  notification_enabled: boolean
  email_notification: boolean
  push_subscription: PushSubscriptionJSON | null
  created_at: string
  updated_at: string
}

export interface PrayerLog {
  id: string
  user_id: string
  prayer_date: string          // 'YYYY-MM-DD'
  prayer_name: PrayerName
  scheduled_time: string       // 'HH:mm'
  status: PrayerStatus
  logged_at: string | null     // ISO timestamp
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PrayerTimes {
  Fajr: string
  Sunrise: string
  Dhuhr: string
  Asr: string
  Maghrib: string
  Isha: string
}

export interface DayLogs {
  date: string                 // 'YYYY-MM-DD'
  logs: PrayerLog[]
}

export interface MonthlyStats {
  total: number
  onTime: number
  late: number
  missed: number
  consistency: number          // 0–100 percentage
  streak: number               // current streak in days
  longestStreak: number
  bestPrayer: PrayerName | null
  worstPrayer: PrayerName | null
}
```

### Zod validation patterns

```typescript
import { z } from 'zod'
import type { PrayerName } from '@/types'

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const

export const LogPrayerSchema = z.object({
  prayer_name: z.enum(PRAYER_NAMES),
  notes: z.string().max(500).optional(),
})

export const PrayerTimesQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.coerce.number().int().min(0).max(23).default(3),
})

// Usage in API route:
const result = LogPrayerSchema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
}
const { prayer_name, notes } = result.data // fully typed
```

---

## 5. Component Architecture Rules

### Naming conventions

| Type | Convention | Example |
|---|---|---|
| Page files | lowercase, App Router | `app/(dashboard)/weekly/page.tsx` |
| Components | PascalCase | `PrayerCard.tsx` |
| Hooks | camelCase, `use` prefix | `usePrayerTimes.ts` |
| Utilities | camelCase | `lib/prayers.ts` |
| Types | PascalCase interfaces | `PrayerLog`, `Profile` |
| Zod schemas | PascalCase + Schema suffix | `LogPrayerSchema` |

### Component file structure

```typescript
// 1. Directive (if needed)
"use client"

// 2. Framework imports
import { useState } from 'react'
import Link from 'next/link'

// 3. Internal imports
import { PrayerCard } from '@/components/prayer/PrayerCard'
import type { PrayerLog } from '@/types'

// 4. Types (local only — shared types go in types/index.ts)
interface Props {
  logs: PrayerLog[]
  onUpdate: (id: string) => void
}

// 5. Component (one per file)
export function PrayerGrid({ logs, onUpdate }: Props) {
  // ...
}
```

### Avoid these patterns

```typescript
// ❌ Don't use default exports for components (named exports are easier to refactor)
export default function PrayerCard() {}  // avoid

// ✅ Named exports
export function PrayerCard() {}

// ❌ Don't inline styles
<div style={{ color: 'green' }}>  // use Tailwind instead

// ❌ Don't use any
const data: any = await fetch(...)  // use proper types

// ❌ Don't call API routes from Server Components — query DB directly
const res = await fetch('/api/prayer-log')  // unnecessary round-trip

// ✅ In Server Components, call the data layer directly
const logs = await getPrayerLogs(userId)
```

---

## 6. Project-Specific Patterns

### Supabase client usage rule

```typescript
// Browser component → lib/supabase/client.ts (anon key, RLS enforced as user)
// Server component / API route → lib/supabase/server.ts (anon key, RLS enforced as user)
// Cron route only → lib/supabase/service.ts (service role, bypasses RLS)
```

### Standard API route template

```typescript
// app/api/[domain]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'

const RequestSchema = z.object({ /* ... */ })

export async function POST(request: NextRequest) {
  // 1. Auth
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate input
  const body = await request.json()
  const result = RequestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  // 3. Business logic
  const { data, error } = await supabase
    .from('prayer_logs')
    .select('*')
    .eq('user_id', user.id)  // always scope to user

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 4. Return
  return NextResponse.json({ data })
}
```

### Standard cron route template

```typescript
// app/api/cron/[job]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  // 1. Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Service role client (cron writes on behalf of all users)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 3. Job logic
  // ...

  return NextResponse.json({ ok: true, processed: count })
}
```

---

## 7. Quick Reference — When to Use What

| Situation | Tool |
|---|---|
| Display data from DB | Server Component + direct Supabase query |
| Form with user interaction | Client Component + Server Action |
| Complex mutation with optimistic UI | Client Component + `useOptimistic` + Server Action |
| One-off API endpoint (e.g. for cron, webhooks) | Route Handler (`route.ts`) |
| Redirect based on auth state | `middleware.ts` |
| Loading skeleton | `loading.tsx` in App Router |
| Error boundary | `error.tsx` in App Router (must be `"use client"`) |
| Shared layout (nav, footer) | `layout.tsx` |
| Reusable UI with no logic | Server Component in `components/ui/` |
| Reusable UI with events | Client Component in `components/` |
| Business logic | `lib/` (pure functions, no React) |
| Data fetching helpers | `lib/` (e.g. `lib/aladhan.ts`, `lib/prayers.ts`) |
| Browser-only utilities | `lib/` with `"use client"` guard or inside Client Component |

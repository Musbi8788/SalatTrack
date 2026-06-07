# SalatTrack — Security Design

## Threat Model

SalatTrack stores personal religious practice data. The primary threats are:
1. **Unauthorized access to another user's prayer logs** (IDOR / broken auth)
2. **Cron endpoint abuse** (unauthenticated callers triggering jobs)
3. **API key exposure** (OpenRouter, Resend, VAPID private key)
4. **Injection via user-supplied coordinates or prayer notes** (SQLi, XSS)

---

## Authentication & Session Security

### Session Handling
- Use `@supabase/ssr` cookie-based sessions only. Never `localStorage` for auth tokens.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`.
- Session refresh handled automatically by Supabase SSR middleware.
- Middleware runs on every request before any route handler.

### Middleware Pattern
```typescript
// middleware.ts — runs on Edge Runtime, zero cold start
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Always create a new response to propagate cookie updates
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* get/set/remove from request/response */ } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  // getUser() — NOT getSession() — validates the JWT server-side
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}
```

**Critical:** Always use `getUser()` in server contexts, never `getSession()`. `getSession()` trusts the client-sent JWT without server verification.

---

## Database Security (Supabase RLS)

### Row Level Security Rules

Every table has RLS enabled. No exceptions.

```sql
-- profiles: user owns their row
CREATE POLICY "self_only" ON profiles
  FOR ALL USING (auth.uid() = id);

-- prayer_logs: user owns their logs
CREATE POLICY "self_only" ON prayer_logs
  FOR ALL USING (auth.uid() = user_id);

-- prayer_time_cache: readable by all authenticated users (no PII)
CREATE POLICY "authenticated_read" ON prayer_time_cache
  FOR SELECT USING (auth.role() = 'authenticated');

-- prayer_time_cache: only service role can write (cron job)
CREATE POLICY "service_write" ON prayer_time_cache
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ai_analysis_logs: user owns their logs
CREATE POLICY "self_only" ON ai_analysis_logs
  FOR ALL USING (auth.uid() = user_id);
```

### Server-Side Client (Service Role)
- Cron routes that write on behalf of all users use `SUPABASE_SERVICE_ROLE_KEY`.
- Service role key is **never** in client-side code or `NEXT_PUBLIC_*` env vars.
- Service role client is only instantiated in API routes, never in components.

```typescript
// lib/supabase/server.ts — for regular authenticated requests
import { createServerClient } from '@supabase/ssr'
// uses NEXT_PUBLIC_SUPABASE_ANON_KEY — RLS enforced

// lib/supabase/service.ts — for cron/admin routes only
import { createClient } from '@supabase/supabase-js'
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // server-only, bypasses RLS
)
```

---

## API Route Security

### Authentication Check Pattern
Every non-cron API route must begin with:

```typescript
const supabase = createServerClient(...)
const { data: { user }, error } = await supabase.auth.getUser()
if (!user || error) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// All subsequent DB calls use `supabase` (RLS enforced as this user)
```

### Cron Route Protection
All cron routes verify the `CRON_SECRET` header before executing any logic:

```typescript
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... cron logic
}
```

Vercel automatically sends this header when calling cron routes. Do not expose `CRON_SECRET` publicly.

### Input Validation
Use `zod` for all request body/query validation:

```typescript
import { z } from 'zod'

const LogPrayerSchema = z.object({
  prayer_name: z.enum(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']),
  status: z.enum(['on_time', 'late', 'missed']).optional(),
  notes: z.string().max(500).optional(),
})
```

Never pass raw user input into Supabase queries as a string. Use parameterized queries (Supabase client handles this automatically via PostgREST).

---

## API Key Management

| Key | Env Var | Exposure | Notes |
|---|---|---|---|
| Supabase URL | `NEXT_PUBLIC_SUPABASE_URL` | Public | Safe — just a URL |
| Supabase Anon Key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Safe — RLS enforced |
| Supabase Service Key | `SUPABASE_SERVICE_ROLE_KEY` | Server only | Never in NEXT_PUBLIC_* |
| OpenRouter Key | `OPENROUTER_API_KEY` | Server only | Never in client bundle |
| Resend Key | `RESEND_API_KEY` | Server only | Never in client bundle |
| VAPID Public Key | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | By design — Web Push spec |
| VAPID Private Key | `VAPID_PRIVATE_KEY` | Server only | Never in client bundle |
| Cron Secret | `CRON_SECRET` | Server only | Never in client bundle |

**Rotation policy:** If any server-only key is ever found in client bundle, git history, or logs — rotate immediately in the provider dashboard before the next deploy.

---

## Content Security Policy (CSP)

Add to `next.config.js` headers:

```javascript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",  // Next.js requires unsafe-inline; tighten with nonces post-MVP
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.aladhan.com https://openrouter.ai",
    "worker-src 'self'",
    "manifest-src 'self'",
  ].join('; ')
}
```

---

## Data Privacy

- **No PII in logs.** Prayer times and statuses are not PII, but full name + coordinates are. Never log these.
- **No analytics third parties in Phase 1.** No Google Analytics, no Mixpanel. Add only with user consent.
- **Prayer notes** are user-generated content. Sanitize before rendering with `DOMPurify` if notes are ever rendered as HTML (they should be plaintext only).
- **Location data:** Coordinates stored in `profiles` table, RLS-protected. Never included in AI prompt sent to OpenRouter — only aggregate stats go to the LLM.

---

## Security Checklist Before Each Deploy

- [ ] No `console.log` statements that print user data or env vars
- [ ] No `NEXT_PUBLIC_` prefix on secret keys
- [ ] All new API routes start with `getUser()` check
- [ ] All new cron routes start with `CRON_SECRET` check
- [ ] All user inputs validated with zod
- [ ] RLS policies exist for any new table
- [ ] `SUPABASE_SERVICE_ROLE_KEY` only used in server files under `lib/supabase/service.ts`

# SalatTrack — Version Control & Git Workflow

## Agent Rules (Non-Negotiable)

1. **NEVER push directly to `main`.** Main is protected. It receives changes only via PR from `dev`.
2. **NEVER push directly to `dev`.** Dev receives changes only via PR from a feature/fix branch.
3. **Always create a sub-branch** before starting any work. Even a one-line fix gets its own branch.
4. **Always run the full CODE-REVIEW.md checklist** before committing to any branch.
5. **Always open a PR** when work is complete — never merge locally.
6. **One feature or fix per branch.** Do not bundle unrelated changes.

---

## Branch Structure

```
main
│
└── dev                          ← agent targets this branch for PRs
    │
    ├── feature/prayer-logging   ← agent sub-branch (one feature)
    ├── feature/weekly-grid      ← agent sub-branch (one feature)
    ├── fix/auto-miss-cron       ← agent sub-branch (one fix)
    └── chore/update-deps        ← agent sub-branch (maintenance)
```

### Branch Descriptions

| Branch | Who commits | Purpose |
|---|---|---|
| `main` | Nobody directly | Production. Receives PRs from `dev` only after human review. |
| `dev` | Nobody directly | Integration. Receives PRs from feature/fix branches. |
| `feature/*` | Agent | New feature work. Branched from `dev`. PR targets `dev`. |
| `fix/*` | Agent | Bug fixes. Branched from `dev`. PR targets `dev`. |
| `chore/*` | Agent | Dependency updates, config, docs. Branched from `dev`. PR targets `dev`. |
| `hotfix/*` | Human only | Emergency prod fix. Branched from `main`. PR targets both `main` and `dev`. |

---

## Branch Naming Convention

```
<type>/<short-kebab-description>

Types:
  feature/   New feature from IMPLEMENTATION_PLAN.md
  fix/       Bug fix
  chore/     Config, deps, docs, tooling
  refactor/  Code restructure without behavior change
  test/      Adding or fixing tests only
```

### Examples

```bash
feature/p0-project-bootstrap
feature/p1-authentication
feature/p2-prayer-times
feature/p3-prayer-logging
feature/p3-auto-miss-cron
feature/p4-weekly-grid
feature/p4-monthly-calendar
feature/p5-push-notifications
feature/p5-email-summary
feature/p6-ai-analysis
feature/p7-pwa-manifest
fix/prayer-status-boundary-condition
fix/aladhan-date-format
chore/update-supabase-ssr
refactor/extract-prayer-utils
test/prayer-status-edge-cases
```

---

## Creating a Branch (Agent Workflow)

```bash
# 1. Always start from the latest dev
git checkout dev
git pull origin dev

# 2. Create your sub-branch
git checkout -b feature/p2-prayer-times

# 3. Do your work, run the CODE-REVIEW.md checklist

# 4. Stage only the files you changed
git add app/api/prayer-times/route.ts lib/aladhan.ts hooks/usePrayerTimes.ts

# 5. Commit with the correct message format (see below)
git commit -m "feat(prayer-times): add Aladhan API wrapper and DB caching"

# 6. Push the branch
git push origin feature/p2-prayer-times

# 7. Open PR targeting dev (see PR format below)
```

**Never do:**
```bash
git checkout main        # ← FORBIDDEN for agent
git push origin main     # ← FORBIDDEN for agent
git push origin dev      # ← FORBIDDEN (use PR instead)
git merge dev main       # ← FORBIDDEN for agent
```

---

## Commit Message Format

Follow **Conventional Commits** (`type(scope): description`).

```
<type>(<scope>): <short description>

[optional body — what and why, not how]

[optional footer — breaking changes, closes issues]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or new file that adds functionality |
| `fix` | Bug fix |
| `chore` | Deps, config, tooling — no production code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no logic change |
| `perf` | Performance improvement |

### Scopes (use these consistently)

| Scope | What it covers |
|---|---|
| `auth` | Login, register, middleware, session |
| `prayer-times` | Aladhan API, prayer time cache |
| `prayer-log` | Logging, status calculation, CRUD routes |
| `cron` | Auto-miss, push-notify, email-summary jobs |
| `weekly` | Weekly grid view |
| `monthly` | Monthly calendar + stats |
| `analysis` | AI analysis (OpenRouter integration) |
| `notifications` | Web Push, service worker |
| `email` | Resend email integration |
| `settings` | User profile, location, notification prefs |
| `pwa` | Manifest, service worker, icons |
| `ui` | Shared components, design system, icons |
| `types` | TypeScript type definitions |
| `deps` | Dependency updates |
| `config` | Next.js, Tailwind, Supabase config |
| `security` | Security-related changes |

### Good Commit Messages

```bash
# Feature addition
git commit -m "feat(prayer-times): add Aladhan API wrapper with date format fix"

# Bug fix
git commit -m "fix(cron): handle 410 Gone response when push subscription expires"

# With body (for non-obvious changes)
git commit -m "feat(prayer-log): copy scheduled_time into log row on creation

Copying the Aladhan time into each log row makes the record self-contained.
Without this, recomputing status after the fact would require re-fetching
historical prayer times, which Aladhan does not guarantee to return unchanged."

# Security fix
git commit -m "fix(auth): replace getSession() with getUser() in all API routes

getSession() trusts the client-sent JWT without server verification.
getUser() validates the JWT against Supabase auth server on every call."

# Breaking change
git commit -m "feat(prayer-log): add scheduled_time column to prayer_logs

BREAKING CHANGE: prayer_logs table requires a new non-null column.
Run the migration before deploying this commit."
```

### Bad Commit Messages (do not write these)

```bash
# Too vague
git commit -m "fix stuff"
git commit -m "update"
git commit -m "wip"
git commit -m "changes"
git commit -m "done"

# Wrong format
git commit -m "Fixed the prayer logging bug"
git commit -m "Added weekly view component"
```

---

## Pull Request Format

### PR Title

Same format as a commit message:
```
feat(prayer-times): add Aladhan API wrapper and DB caching
fix(cron): handle expired push subscriptions correctly
chore(deps): upgrade @supabase/ssr to 0.5.0
```

### PR Description Template

```markdown
## What this PR does
<!-- 1-3 bullets describing the change -->
- Adds `lib/aladhan.ts` wrapper for the Aladhan prayer times API
- Implements DB caching in `prayer_time_cache` table to avoid repeated calls
- Adds `/api/prayer-times` route with zod validation

## Why
<!-- The motivation — what problem this solves -->
The Aladhan API is a free external service with no SLA.
Caching in the DB ensures the dashboard loads even if Aladhan is down.

## Implementation Plan phase
Phase 2 — Prayer Times (tasks P2.1, P2.2)

## Code Review checklist
- [ ] Section 1 (Security) passed
- [ ] Section 2 (TypeScript) passed
- [ ] Section 3 (Database) passed
- [ ] Section 4 (UI/Components) passed
- [ ] Section 5 (Tests) passed
- [ ] Section 6 (Final checklist) passed — build passes, no .env staged

## Test instructions
1. Start the dev server: `npm run dev`
2. Open the dashboard — prayer times for Banjul should load
3. Check Supabase dashboard → `prayer_time_cache` table should have 1 row
4. Refresh the page — same row, no new Aladhan API call (check network tab)
5. Test with Aladhan unreachable (block in hosts) — should return 503, not crash

## Screenshots / evidence
<!-- Attach a screenshot of the feature working if it has a UI -->
```

### Opening the PR via CLI

```bash
gh pr create \
  --base dev \
  --title "feat(prayer-times): add Aladhan API wrapper and DB caching" \
  --body "$(cat <<'EOF'
## What this PR does
- Adds lib/aladhan.ts wrapper for the Aladhan prayer times API
- Implements DB caching in prayer_time_cache table
- Adds /api/prayer-times route with zod validation

## Implementation Plan phase
Phase 2 — Prayer Times (tasks P2.1, P2.2)

## Code Review checklist
- [x] Section 1 (Security) passed
- [x] Section 2 (TypeScript) passed
- [x] Section 3 (Database) passed
- [x] Section 4 (UI) passed
- [x] Section 5 (Tests) passed
- [x] Section 6 (Final) passed — build passes
EOF
)"
```

**Always target `--base dev`. Never `--base main`.**

---

## What Happens After the PR

This is the human's responsibility, not the agent's:

```
Agent opens PR → dev
  ↓
Human reviews PR on GitHub
  ↓
Human merges PR → dev
  ↓
Human tests dev environment
  ↓
Human opens PR: dev → main (when ready for production)
  ↓
Human merges → main → Vercel deploys to production
```

The agent's job ends when the PR is open. The agent does not:
- Merge its own PR
- Push directly to `dev` after the PR is open
- Touch `main` under any circumstances

---

## Handling Conflicts

If `dev` has moved ahead while you were working on your branch:

```bash
# 1. Fetch latest dev
git fetch origin dev

# 2. Rebase your branch onto dev (keeps history clean)
git rebase origin/dev

# 3. Resolve any conflicts file by file
# Edit conflicted files → git add <file> → git rebase --continue

# 4. Force push your branch (safe — only your branch, not dev/main)
git push --force-with-lease origin feature/your-branch
```

Never merge `dev` into your feature branch. Always rebase. Never force-push to `dev` or `main`.

---

## Versioning

SalatTrack uses **Semantic Versioning** (`MAJOR.MINOR.PATCH`).

| Version bump | When |
|---|---|
| `PATCH` (0.0.x) | Bug fixes, non-breaking tweaks |
| `MINOR` (0.x.0) | New feature added (new phase completed) |
| `MAJOR` (x.0.0) | Breaking change (schema rename, URL change, auth flow change) |

Version is tracked in `package.json`. Update it in the PR that completes a phase:
- Phase 0–1 complete → `0.1.0`
- Phase 2–3 complete → `0.2.0`
- Phase 4 complete → `0.3.0`
- Phase 5 complete → `0.4.0`
- Phase 6 complete → `0.5.0`
- Phase 7 + deploy → `1.0.0`

---

## Quick Reference Card

```
Start work:
  git checkout dev && git pull origin dev
  git checkout -b feature/<name>

Commit:
  Run CODE-REVIEW.md checklist first
  git add <specific files>
  git commit -m "type(scope): description"

Push & PR:
  git push origin feature/<name>
  gh pr create --base dev --title "..." --body "..."

Never:
  git push origin main
  git push origin dev
  git merge (use rebase instead)
  git commit -m "fix stuff"
```

# SalatTrack — Design System & Style Guide

## Agent Instructions

Read this file before writing any component, page, or layout.
- Use **only** the colors defined in this file. No Tailwind defaults like `emerald`, `green`, or `purple`.
- Use **only** the SVG icon components defined in this file. No icon libraries (no Lucide, no Heroicons, no React Icons).
- This file supersedes the color palette in `SKILLS.md`. The palette below is the source of truth.

---

## 1. Color Palette

The app is **dark-only**. No light mode. Add `class="dark"` to `<html>` and design only for dark backgrounds.

### Core Colors

| Name | Hex | Tailwind Custom Token | Role |
|---|---|---|---|
| **Background** | `#080810` | `bg-base` | Page background — deepest layer |
| **Surface** | `#12121E` | `bg-surface` | Cards, modals, nav |
| **Surface Raised** | `#1C1C2E` | `bg-raised` | Inputs, dropdowns, elevated cards |
| **Border** | `#2A2A42` | `border-subtle` | Dividers, card outlines |
| **Border Strong** | `#3D3D5C` | `border-strong` | Focus rings, active borders |

| Name | Hex | Tailwind Custom Token | Role |
|---|---|---|---|
| **Red** | `#C0272D` | `brand-red` | Primary CTA, "I Prayed" button, active nav, streaks |
| **Red Light** | `#E03038` | `brand-red-light` | Hover state for red buttons |
| **Red Muted** | `#C0272D26` | `brand-red-muted` | Red tint backgrounds (missed prayer badge bg) |
| **Blue** | `#4FC3F7` | `brand-blue` | Prayer times, analytics data, secondary info, AI text |
| **Blue Deep** | `#29B6F6` | `brand-blue-deep` | Hover state for blue elements |
| **Blue Muted** | `#4FC3F726` | `brand-blue-muted` | Blue tint backgrounds (on-time prayer badge bg) |

| Name | Hex | Tailwind Custom Token | Role |
|---|---|---|---|
| **White** | `#FFFFFF` | `text-primary` | Headings, prayer names, primary labels |
| **Off-White** | `#E8E8F0` | `text-secondary` | Body text, descriptions |
| **Muted** | `#7070A0` | `text-muted` | Timestamps, hints, placeholder |
| **Disabled** | `#3A3A58` | `text-disabled` | Disabled state text |
| **Black** | `#000000` | — | True black — use sparingly (overlays) |

### Prayer Status Colors

| Status | Background | Text | Border |
|---|---|---|---|
| `on_time` | `brand-blue-muted` (`#4FC3F726`) | `brand-blue` (`#4FC3F7`) | `brand-blue` at 30% opacity |
| `late` | `#F59E0B26` | `#F59E0B` (amber) | `#F59E0B` at 30% opacity |
| `missed` | `brand-red-muted` (`#C0272D26`) | `brand-red-light` (`#E03038`) | `brand-red` at 30% opacity |
| `pending` | `#2A2A4226` | `text-muted` (`#7070A0`) | `border-subtle` (`#2A2A42`) |

### Tailwind v4 CSS Token Registration

Add to `app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Backgrounds */
  --color-base:         #080810;
  --color-surface:      #12121E;
  --color-raised:       #1C1C2E;
  --color-subtle:       #2A2A42;
  --color-strong:       #3D3D5C;

  /* Brand — Red */
  --color-brand-red:        #C0272D;
  --color-brand-red-light:  #E03038;
  --color-brand-red-muted:  #C0272D26;

  /* Brand — Blue */
  --color-brand-blue:       #4FC3F7;
  --color-brand-blue-deep:  #29B6F6;
  --color-brand-blue-muted: #4FC3F726;

  /* Late (amber — unchanged) */
  --color-late:             #F59E0B;
  --color-late-muted:       #F59E0B26;

  /* Text */
  --color-text-primary:   #FFFFFF;
  --color-text-secondary: #E8E8F0;
  --color-text-muted:     #7070A0;
  --color-text-disabled:  #3A3A58;
}
```

Usage in components:
```tsx
<div className="bg-surface border border-subtle rounded-2xl">
  <h1 className="text-text-primary">Assalamu Alaikum</h1>
  <p className="text-text-muted">Today's prayers</p>
  <button className="bg-brand-red hover:bg-brand-red-light text-white">
    I Prayed
  </button>
</div>
```

---

## 2. Typography

Font: **Inter** (loaded via `next/font/google`)

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
```

| Role | Class | Size | Weight |
|---|---|---|---|
| App title / Logo | `text-2xl font-bold text-text-primary` | 24px | 700 |
| Page heading | `text-xl font-semibold text-text-primary` | 20px | 600 |
| Section heading | `text-base font-semibold text-text-primary` | 16px | 600 |
| Prayer name | `text-base font-medium text-text-primary` | 16px | 500 |
| Prayer time | `text-sm font-mono text-brand-blue` | 14px | 400 (monospace for time) |
| Body text | `text-sm text-text-secondary` | 14px | 400 |
| Caption / hint | `text-xs text-text-muted` | 12px | 400 |
| Button label | `text-sm font-semibold` | 14px | 600 |

---

## 3. Spacing & Sizing

| Element | Value |
|---|---|
| Page horizontal padding | `px-4` (16px) |
| Card padding | `p-4` (16px) or `p-5` (20px) |
| Card border radius | `rounded-2xl` (16px) |
| Button border radius | `rounded-xl` (12px) |
| Badge border radius | `rounded-full` |
| Minimum touch target | `min-h-[44px] min-w-[44px]` |
| Gap between prayer cards | `gap-3` (12px) |
| Bottom nav height | `h-16` (64px) + safe area inset |
| Icon size (nav) | `20px` (w-5 h-5) |
| Icon size (inline) | `16px` (w-4 h-4) |
| Icon size (large/hero) | `32px` (w-8 h-8) |

---

## 4. Component Design Patterns

### Prayer Card
```
┌────────────────────────────────────────────┐
│  🌙 Fajr              05:23               │  ← bg-surface, border-subtle
│  ─────────────────────────────────────     │
│                        [ On Time ✓ ]       │  ← brand-blue-muted badge
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  ☀️ Dhuhr             13:12               │
│  ─────────────────────────────────────     │
│                   [ I Prayed ]             │  ← brand-red button (pending state)
└────────────────────────────────────────────┘
```

### Status Badge Classes
```tsx
const statusBadge = {
  on_time: 'bg-brand-blue-muted text-brand-blue border border-brand-blue/30',
  late:    'bg-late-muted text-late border border-late/30',
  missed:  'bg-brand-red-muted text-brand-red-light border border-brand-red/30',
  pending: 'bg-subtle/40 text-text-muted border border-subtle',
}
```

### Primary Button (I Prayed / CTA)
```tsx
<button className="
  bg-brand-red hover:bg-brand-red-light active:scale-95
  text-white text-sm font-semibold
  rounded-xl px-5 py-3 min-h-[44px]
  transition-all duration-150
  disabled:opacity-40 disabled:cursor-not-allowed
  w-full
">
  I Prayed
</button>
```

### Secondary / Ghost Button
```tsx
<button className="
  bg-transparent hover:bg-raised
  text-brand-blue text-sm font-medium
  border border-brand-blue/30 hover:border-brand-blue/60
  rounded-xl px-5 py-3 min-h-[44px]
  transition-all duration-150
">
  View Details
</button>
```

### Bottom Navigation
```tsx
// Active item: brand-red icon + label
// Inactive item: text-muted icon + label
<nav className="
  fixed bottom-0 left-0 right-0
  bg-surface border-t border-subtle
  flex items-center justify-around
  h-16 pb-safe                          /* pb-safe = iOS safe area */
  z-50
">
```

---

## 5. SVG Icon Components

All icons are inline SVG React components. Place them in `components/icons/index.tsx`.

**Props interface (all icons share this):**
```tsx
interface IconProps {
  className?: string
  size?: number
}
```

**Style conventions:**
- `viewBox="0 0 24 24"`
- `stroke="currentColor"` (inherits text color via Tailwind)
- `fill="none"` unless stated
- `strokeWidth={1.5}` default (thin, modern look)
- `strokeLinecap="round" strokeLinejoin="round"`

---

### Full Icon Library

```tsx
// components/icons/index.tsx

interface IconProps {
  className?: string
  size?: number
}

// ── Branding ──────────────────────────────────────────────

export function CrescentMoonIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  )
}

export function MosqueIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M3 21h18M4 21V10l8-7 8 7v11" />
      <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
      <path d="M12 3a2 2 0 0 0 0-2 2 2 0 0 0 0 2z" fill="currentColor" stroke="none" />
      <path d="M8 10h2M14 10h2" />
    </svg>
  )
}

// ── Bottom Navigation ──────────────────────────────────────

export function HomeIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M3 12L12 3l9 9" />
      <path d="M9 21V12h6v9" />
      <path d="M5 10v11h14V10" />
    </svg>
  )
}

export function GridIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

export function CalendarIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  )
}

export function SparklesIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z" />
      <path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5L19 3z" />
    </svg>
  )
}

export function SettingsIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

// ── Prayer Status ──────────────────────────────────────────

export function CheckCircleIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </svg>
  )
}

export function ClockIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

export function XCircleIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  )
}

export function PendingCircleIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ── Prayer Time of Day ─────────────────────────────────────

export function FajrIcon({ className, size = 24 }: IconProps) {
  // Dawn — crescent + rising glow
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M17 12a5 5 0 1 1-5-5" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2" />
      <path d="M15 5l1-2" strokeOpacity="0.5" />
    </svg>
  )
}

export function DhuhrIcon({ className, size = 24 }: IconProps) {
  // Midday sun
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

export function AsrIcon({ className, size = 24 }: IconProps) {
  // Afternoon — sun lower, longer shadow
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="10" r="4" />
      <path d="M12 2v2M4.22 2.22l1.42 1.42M2 10h2M20 10h2M18.36 2.36l1.42 1.42" />
      <path d="M4 20h16" />
      <path d="M8 20v-4l4-2 4 2v4" strokeOpacity="0.5" />
    </svg>
  )
}

export function MaghribIcon({ className, size = 24 }: IconProps) {
  // Sunset
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M17 16a5 5 0 1 0-10 0" />
      <path d="M3 16h18" />
      <path d="M12 2v3M4.22 5.22l2.12 2.12M19.78 5.22l-2.12 2.12" />
      <path d="M3 20h18" strokeOpacity="0.3" />
    </svg>
  )
}

export function IshaIcon({ className, size = 24 }: IconProps) {
  // Night — moon and stars
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
      <circle cx="19" cy="4" r=".5" fill="currentColor" stroke="none" />
      <circle cx="22" cy="7" r=".5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="9" r=".5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ── UI Utility Icons ───────────────────────────────────────

export function MapPinIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M12 22s-8-6.686-8-12a8 8 0 1 1 16 0c0 5.314-8 12-8 12z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function BellIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function BellOffIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-5" />
      <path d="M2 2l20 20" />
    </svg>
  )
}

export function LogOutIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export function UserIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

export function EditIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function ChevronLeftIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export function ChevronRightIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function ChevronDownIcon({ className, size = 24 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function FlameIcon({ className, size = 24 }: IconProps) {
  // Streak indicator
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

export function LoaderIcon({ className, size = 24 }: IconProps) {
  // Spinning loader (animate-spin class)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

export function WifiOffIcon({ className, size = 24 }: IconProps) {
  // Offline indicator
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" className={className}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
    </svg>
  )
}
```

---

## 6. Icon Usage Guide

### Map prayer names to icons
```tsx
import {
  FajrIcon, DhuhrIcon, AsrIcon, MaghribIcon, IshaIcon
} from '@/components/icons'
import type { PrayerName } from '@/types'

const PRAYER_ICONS: Record<PrayerName, React.ComponentType<IconProps>> = {
  Fajr:    FajrIcon,
  Dhuhr:   DhuhrIcon,
  Asr:     AsrIcon,
  Maghrib: MaghribIcon,
  Isha:    IshaIcon,
}

// Usage
const Icon = PRAYER_ICONS[prayer.name]
<Icon size={20} className="text-brand-blue" />
```

### Map prayer status to icons
```tsx
import {
  CheckCircleIcon, ClockIcon, XCircleIcon, PendingCircleIcon
} from '@/components/icons'
import type { PrayerStatus } from '@/types'

const STATUS_ICONS: Record<PrayerStatus, React.ComponentType<IconProps>> = {
  on_time: CheckCircleIcon,
  late:    ClockIcon,
  missed:  XCircleIcon,
  pending: PendingCircleIcon,
}

const STATUS_COLORS: Record<PrayerStatus, string> = {
  on_time: 'text-brand-blue',
  late:    'text-late',
  missed:  'text-brand-red-light',
  pending: 'text-text-muted',
}
```

### Animated loader
```tsx
<LoaderIcon size={20} className="text-brand-blue animate-spin" />
```

---

## 7. Screen-Level Design Reference

### Dashboard
- Background: `bg-base`
- Greeting: `text-xl font-semibold text-text-primary`
- Date line: `text-sm text-text-muted`
- Location pill: `bg-raised border border-subtle rounded-full px-3 py-1 text-xs text-brand-blue`
- Prayer cards: `bg-surface border border-subtle rounded-2xl`
- Quick stats bar: `bg-raised rounded-2xl px-4 py-3 flex gap-4`
- Streak count: `text-brand-red font-bold` + `FlameIcon` in `text-brand-red`

### Weekly Grid
- Grid cell (on_time): `bg-brand-blue-muted border border-brand-blue/20 rounded-lg`
- Grid cell (late): `bg-late-muted border border-late/20 rounded-lg`
- Grid cell (missed): `bg-brand-red-muted border border-brand-red/20 rounded-lg`
- Grid cell (pending/future): `bg-raised border border-subtle rounded-lg opacity-40`
- Day header: `text-xs font-medium text-text-muted uppercase`
- Prayer row label: `text-xs text-text-muted`

### AI Analysis Page
- Analysis card background: `bg-surface border border-brand-blue/20 rounded-2xl`
- Streaming text color: `text-text-secondary`
- AI label badge: `bg-brand-blue-muted text-brand-blue text-xs rounded-full px-2 py-0.5`
- "Analyze" button: primary red button (same as I Prayed)

### Settings Page
- Section headers: `text-xs font-semibold text-text-muted uppercase tracking-wider`
- Setting row: `bg-surface rounded-xl px-4 py-3 flex items-center justify-between`
- Toggle on: `bg-brand-red`
- Toggle off: `bg-subtle`
- Danger zone (logout): `text-brand-red-light`

---

## 8. Animation & Transition Rules

| Element | Animation |
|---|---|
| Button press | `active:scale-95 transition-transform duration-100` |
| Page transitions | None (keep it fast, no fancy transitions) |
| Status update | `transition-colors duration-200` |
| Prayer card "I Prayed" success | Brief scale + color change (optimistic UI) |
| AI streaming text | No animation — just renders progressively |
| Loading spinner | `animate-spin` on `LoaderIcon` |
| Bottom nav active change | `transition-colors duration-150` |
| Modal / sheet entrance | `animate-in slide-in-from-bottom duration-200` (Tailwind animate plugin) |

---

## 9. Don't Do This

```tsx
// ❌ No external icon libraries
import { Moon } from 'lucide-react'
import { FiMoon } from 'react-icons/fi'

// ❌ No Tailwind default color names (emerald, green, purple, blue, etc.)
<button className="bg-emerald-500">
<p className="text-blue-400">

// ❌ No inline styles
<div style={{ color: '#4FC3F7' }}>

// ❌ No light backgrounds
<div className="bg-white text-gray-900">

// ❌ No hardcoded hex in className
<div className="text-[#4FC3F7]">   // use text-brand-blue token instead

// ✅ Always use the design tokens defined in section 1
<div className="bg-surface border border-subtle">
<p className="text-brand-blue">
<button className="bg-brand-red hover:bg-brand-red-light">
```

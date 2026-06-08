'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { requestPermissionAndSubscribe } from '@/lib/notifications'
import {
  UserIcon,
  MapPinIcon,
  BellIcon,
  BellOffIcon,
  LogOutIcon,
  LoaderIcon,
} from '@/components/icons'
import type { Profile, PrayerName, PrayerTimeOverrides, PrayerTimes } from '@/types'

const CALCULATION_METHODS: { value: number; label: string }[] = [
  { value: 1,  label: 'University of Islamic Sciences, Karachi' },
  { value: 2,  label: 'Islamic Society of North America (ISNA)' },
  { value: 3,  label: 'Muslim World League (MWL)' },
  { value: 4,  label: 'Umm Al-Qura University, Makkah' },
  { value: 5,  label: 'Egyptian General Authority of Survey' },
  { value: 8,  label: 'Gulf Region' },
  { value: 9,  label: 'Kuwait' },
  { value: 10, label: 'Qatar' },
  { value: 11, label: 'Majlis Ugama Islam Singapura' },
  { value: 12, label: 'Union des Organisations Islamiques de France' },
  { value: 13, label: 'Turkey (Diyanet İşleri Başkanlığı)' },
  { value: 14, label: 'Spiritual Administration of Muslims of Russia' },
  { value: 15, label: 'Moonsighting Committee Worldwide' },
]

const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

interface Props {
  profile: Profile
  /** Today's Aladhan times from the DB cache — shown as placeholders.
   *  Null when the cache hasn't been populated yet (user hasn't opened dashboard today). */
  aladhanTimes: Omit<PrayerTimes, 'Sunrise'> | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

async function patchSettings(fields: Record<string, unknown>): Promise<boolean> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
  return res.ok
}

export function SettingsClient({ profile, aladhanTimes }: Props) {
  const router = useRouter()

  const [fullName, setFullName]       = useState(profile.full_name ?? '')
  const [cityName, setCityName]       = useState(profile.city_name ?? '')
  const [method, setMethod]           = useState(profile.calculation_method)
  const [pushEnabled, setPushEnabled] = useState(profile.notification_enabled)
  const [emailEnabled, setEmailEnabled] = useState(profile.email_notification)

  // Prayer time overrides — keyed by prayer name, value is 'HH:mm' string or '' (not set)
  const [overrides, setOverrides] = useState<Record<PrayerName, string>>(() => {
    const saved = profile.prayer_time_overrides ?? {}
    return {
      Fajr:    saved.Fajr    ?? '',
      Dhuhr:   saved.Dhuhr   ?? '',
      Asr:     saved.Asr     ?? '',
      Maghrib: saved.Maghrib ?? '',
      Isha:    saved.Isha    ?? '',
    }
  })

  const [profileSave, setProfileSave]     = useState<SaveState>('idle')
  const [locationSave, setLocationSave]   = useState<SaveState>('idle')
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [methodSave, setMethodSave]       = useState<SaveState>('idle')
  const [overridesSave, setOverridesSave] = useState<SaveState>('idle')
  const [toggleSaving, setToggleSaving]   = useState(false)

  async function saveProfile() {
    setProfileSave('saving')
    const ok = await patchSettings({ full_name: fullName.trim() })
    setProfileSave(ok ? 'saved' : 'error')
    if (ok) setTimeout(() => setProfileSave('idle'), 2000)
  }

  async function detectLocation() {
    if (!navigator.geolocation) return
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000
        const lng = Math.round(pos.coords.longitude * 10000) / 10000
        const ok = await patchSettings({ location_lat: lat, location_lng: lng, city_name: null })
        setLocationSave(ok ? 'saved' : 'error')
        if (ok) {
          setCityName('')
          setTimeout(() => setLocationSave('idle'), 2000)
          router.refresh()
        }
        setDetectingLocation(false)
      },
      () => {
        setLocationSave('error')
        setDetectingLocation(false)
        setTimeout(() => setLocationSave('idle'), 2000)
      },
      { timeout: 8000 }
    )
  }

  async function saveCityName() {
    setLocationSave('saving')
    const ok = await patchSettings({ city_name: cityName.trim() || null })
    setLocationSave(ok ? 'saved' : 'error')
    if (ok) {
      setTimeout(() => setLocationSave('idle'), 2000)
      router.refresh()
    }
  }

  async function saveMethod(value: number) {
    setMethod(value)
    setMethodSave('saving')
    const ok = await patchSettings({ calculation_method: value })
    setMethodSave(ok ? 'saved' : 'error')
    if (ok) {
      setTimeout(() => setMethodSave('idle'), 2000)
      router.refresh() // sync dashboard prayer times to new method
    }
  }

  async function savePrayerTimeOverrides() {
    setOverridesSave('saving')
    // Build the payload: present values go as 'HH:mm', empty strings send null (clears override)
    const payload: Record<string, string | null> = {}
    for (const name of PRAYER_NAMES) {
      payload[name] = overrides[name].trim() || null
    }
    const ok = await patchSettings({ prayer_time_overrides: payload })
    setOverridesSave(ok ? 'saved' : 'error')
    if (ok) {
      setTimeout(() => setOverridesSave('idle'), 2000)
      router.refresh() // sync dashboard to new prayer times
    }
  }

  function clearOverride(name: PrayerName) {
    setOverrides((prev) => ({ ...prev, [name]: '' }))
  }

  async function togglePush(next: boolean) {
    setPushEnabled(next)
    setToggleSaving(true)
    try {
      const ok = await patchSettings({ notification_enabled: next })
      if (!ok) { setPushEnabled(!next); return }
      if (next) void requestPermissionAndSubscribe().catch(() => undefined)
    } finally {
      setToggleSaving(false)
    }
  }

  async function toggleEmail(next: boolean) {
    setEmailEnabled(next)
    setToggleSaving(true)
    try {
      const ok = await patchSettings({ email_notification: next })
      if (!ok) setEmailEnabled(!next)
    } finally {
      setToggleSaving(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ── Profile ─────────────────────────────────────────────── */}
      <section className="bg-surface border border-subtle rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-text-muted">
          <UserIcon size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Profile</span>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-secondary">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-raised border border-subtle rounded-xl px-4 py-3 text-sm
                       text-text-primary placeholder:text-text-muted focus:outline-none
                       focus:border-strong transition-colors min-h-[44px]"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-secondary">Email</label>
          <p className="text-sm text-text-muted bg-raised border border-subtle rounded-xl px-4 py-3 min-h-[44px] flex items-center">
            {profile.email}
          </p>
        </div>

        <SaveButton state={profileSave} onClick={saveProfile} label="Save profile" />
      </section>

      {/* ── Location ────────────────────────────────────────────── */}
      <section className="bg-surface border border-subtle rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-text-muted">
          <MapPinIcon size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Location</span>
        </div>

        <button
          onClick={detectLocation}
          disabled={detectingLocation}
          className="w-full flex items-center justify-center gap-2 bg-raised border border-subtle
                     hover:border-strong rounded-xl px-4 py-3 text-sm text-text-secondary
                     min-h-[44px] transition-colors disabled:opacity-50"
        >
          {detectingLocation
            ? <><LoaderIcon size={14} className="animate-spin" /> Detecting location…</>
            : <><MapPinIcon size={14} /> Re-detect my location</>}
        </button>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-text-secondary">City name (optional override)</label>
          <input
            type="text"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            placeholder="e.g. Banjul, Gambia"
            className="w-full bg-raised border border-subtle rounded-xl px-4 py-3 text-sm
                       text-text-primary placeholder:text-text-muted focus:outline-none
                       focus:border-strong transition-colors min-h-[44px]"
          />
        </div>

        <SaveButton state={locationSave} onClick={saveCityName} label="Save city" />
      </section>

      {/* ── Prayer calculation method ────────────────────────────── */}
      <section className="bg-surface border border-subtle rounded-2xl p-5 space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Calculation method
        </span>

        <div className="relative">
          <select
            value={method}
            onChange={(e) => { void saveMethod(Number(e.target.value)) }}
            className="w-full appearance-none bg-raised border border-subtle rounded-xl
                       px-4 py-3 text-sm text-text-primary focus:outline-none
                       focus:border-strong transition-colors min-h-[44px] pr-10
                       [color-scheme:dark]"
          >
            {CALCULATION_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2}>
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {methodSave !== 'idle' && (
          <p className={`text-xs ${methodSave === 'saved' ? 'text-brand-blue' : methodSave === 'error' ? 'text-brand-red-light' : 'text-text-muted'}`}>
            {methodSave === 'saving' ? 'Saving…' : methodSave === 'saved' ? 'Method updated' : 'Failed to save'}
          </p>
        )}
      </section>

      {/* ── Prayer time overrides ────────────────────────────────── */}
      <section className="bg-surface border border-subtle rounded-2xl p-5 space-y-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Prayer time overrides
          </span>
          <p className="text-xs text-text-muted mt-1">
            Override individual prayer times to match your local mosque.
            Leave a field empty to use the auto-calculated time.
          </p>
        </div>

        <div className="space-y-3">
          {PRAYER_NAMES.map((name) => {
            const placeholder = aladhanTimes
              ? `Auto: ${aladhanTimes[name]}`
              : 'Auto (open dashboard first)'
            const hasOverride = overrides[name].trim() !== ''
            return (
              <div key={name} className="flex items-center gap-3">
                <label className="w-16 shrink-0 text-sm font-medium text-text-secondary">
                  {name}
                </label>
                <input
                  type="time"
                  value={overrides[name]}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [name]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className="flex-1 bg-raised border border-subtle rounded-xl px-4 py-2.5
                             text-sm text-text-primary placeholder:text-text-muted
                             focus:outline-none focus:border-strong transition-colors
                             min-h-[44px] [color-scheme:dark]"
                />
                {hasOverride && (
                  <button
                    type="button"
                    onClick={() => clearOverride(name)}
                    title="Clear override"
                    className="shrink-0 text-text-muted hover:text-brand-red-light transition-colors
                               text-lg leading-none px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <SaveButton state={overridesSave} onClick={savePrayerTimeOverrides} label="Save prayer times" />
      </section>

      {/* ── Notifications ───────────────────────────────────────── */}
      <section className="bg-surface border border-subtle rounded-2xl p-5 space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Notifications
        </span>

        <ToggleRow
          icon={pushEnabled ? BellIcon : BellOffIcon}
          label="Push notifications"
          description="Browser alerts at prayer time"
          checked={pushEnabled}
          disabled={toggleSaving}
          onChange={(v) => { void togglePush(v) }}
        />

        <div className="h-px bg-subtle" />

        <ToggleRow
          icon={BellIcon}
          label="Daily email summary"
          description="Email if you have missed prayers"
          checked={emailEnabled}
          disabled={toggleSaving}
          onChange={(v) => { void toggleEmail(v) }}
        />
      </section>

      {/* ── Sign out ────────────────────────────────────────────── */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-surface border
                     border-brand-red/30 hover:border-brand-red text-brand-red-light
                     rounded-2xl px-5 py-4 text-sm font-medium min-h-[44px]
                     transition-colors"
        >
          <LogOutIcon size={16} />
          Sign out
        </button>
      </form>

    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SaveButton({
  state,
  onClick,
  label,
}: {
  state: SaveState
  onClick: () => void
  label: string
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={state === 'saving'}
        className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-light active:scale-95
                   text-white text-sm font-semibold rounded-xl px-5 py-2.5 min-h-[44px]
                   transition-all duration-150 disabled:opacity-40"
      >
        {state === 'saving' && <LoaderIcon size={14} className="animate-spin" />}
        {label}
      </button>
      {state === 'saved' && (
        <span className="text-xs text-brand-blue">Saved</span>
      )}
      {state === 'error' && (
        <span className="text-xs text-brand-red-light">Failed to save</span>
      )}
    </div>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Icon size={18} className={checked ? 'text-brand-blue' : 'text-text-muted'} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{label}</p>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200
                    focus:outline-none disabled:opacity-50
                    ${checked ? 'bg-brand-blue' : 'bg-subtle'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow
                      transition-transform duration-200
                      ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

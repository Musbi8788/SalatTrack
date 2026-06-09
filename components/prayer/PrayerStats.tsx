import type { MonthlyStats } from '@/types'
import { FlameIcon, InfoIcon } from '@/components/icons'

const STREAK_TOOLTIP =
  "Streaks are a motivational tool only and do not measure a person’s standing with Allah."

interface PrayerStatsProps {
  stats: MonthlyStats
}

/** CSS-only tooltip anchored to an info icon. Activates on hover and keyboard focus. */
function StreakTooltip({ id }: { id: string }) {
  return (
    <div className="relative group ml-auto" tabIndex={0} aria-describedby={id}>
      <InfoIcon
        size={10}
        className="text-text-disabled group-hover:text-text-muted group-focus:text-text-muted
                   transition-colors cursor-help"
        aria-hidden="true"
      />
      <div
        id={id}
        role="tooltip"
        className="absolute z-10 bottom-full right-0 mb-1.5 w-52 pointer-events-none
                   bg-raised border border-subtle rounded-xl px-3 py-2
                   text-xs text-text-muted leading-relaxed
                   invisible group-hover:visible group-focus:visible"
      >
        {STREAK_TOOLTIP}
      </div>
    </div>
  )
}

export function PrayerStats({ stats }: PrayerStatsProps) {
  const prayed = stats.onTime + stats.late

  return (
    <div className="space-y-3">
      {/* Row 1: Consistency + Current Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-subtle rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-1">Consistency</p>
          <p className="text-3xl font-bold text-brand-blue">{stats.consistency}%</p>
          <p className="text-xs text-text-muted mt-1">
            {prayed} of {stats.total} prayed
          </p>
        </div>
        <div className="bg-surface border border-subtle rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <FlameIcon size={12} className="text-brand-red-light" />
            <p className="text-xs text-text-muted">Streak</p>
            <StreakTooltip id="streak-current-tip" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.streak}</p>
          <p className="text-xs text-text-muted mt-1">
            day{stats.streak !== 1 ? 's' : ''} in a row
          </p>
        </div>
      </div>

      {/* Row 2: Missed + Longest Streak */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-subtle rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-1">Missed</p>
          <p className="text-3xl font-bold text-brand-red-light">{stats.missed}</p>
          <p className="text-xs text-text-muted mt-1">prayers this period</p>
        </div>
        <div className="bg-surface border border-subtle rounded-2xl p-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs text-text-muted">Best Streak</p>
            <StreakTooltip id="streak-best-tip" />
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.longestStreak}</p>
          <p className="text-xs text-text-muted mt-1">
            day{stats.longestStreak !== 1 ? 's' : ''} all 5 prayed
          </p>
        </div>
      </div>

      {/* Row 3: Best + Focus prayer */}
      {(stats.bestPrayer !== null || stats.worstPrayer !== null) && (
        <div className="grid grid-cols-2 gap-3">
          {stats.bestPrayer !== null && (
            <div className="bg-brand-blue-muted border border-brand-blue/20 rounded-2xl p-4">
              <p className="text-xs text-text-muted mb-1">Most Consistent</p>
              <p className="text-lg font-semibold text-brand-blue">{stats.bestPrayer}</p>
            </div>
          )}
          {stats.worstPrayer !== null && (
            <div className="bg-brand-red-muted border border-brand-red/20 rounded-2xl p-4">
              <p className="text-xs text-text-muted mb-1">Focus Prayer</p>
              <p className="text-lg font-semibold text-brand-red-light">{stats.worstPrayer}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <p className="text-sm text-text-muted text-center py-2">
          No prayer data for this period yet.
        </p>
      )}
    </div>
  )
}

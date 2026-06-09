import { InfoIcon } from '@/components/icons'

export function SpiritualDisclaimer() {
  return (
    <div className="flex items-start gap-2 px-1 py-2">
      <InfoIcon size={13} className="text-text-muted shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-xs text-text-muted leading-relaxed">
        Prayer data is intended for personal reflection and improvement. Only Allah fully knows a
        person&apos;s intentions, circumstances, and efforts.
      </p>
    </div>
  )
}

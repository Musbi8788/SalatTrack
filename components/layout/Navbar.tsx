import { CrescentMoonIcon } from '@/components/icons'
import { signOut } from '@/app/actions/auth'
import { LogOutIcon } from '@/components/icons'

interface Props {
  fullName: string
}

export function Navbar({ fullName }: Props) {
  const firstName = fullName.split(' ')[0] ?? fullName

  return (
    <header className="bg-surface border-b border-subtle px-4 h-14 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <CrescentMoonIcon size={20} className="text-brand-red" />
        <span className="text-base font-semibold text-text-primary">SalatTrack</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">Salaam, {firstName}</span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-text-muted hover:text-brand-red-light transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Sign out"
          >
            <LogOutIcon size={18} />
          </button>
        </form>
      </div>
    </header>
  )
}

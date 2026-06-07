'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, GridIcon, CalendarIcon, SparklesIcon, SettingsIcon } from '@/components/icons'

const NAV_ITEMS = [
  { href: '/', icon: HomeIcon, label: 'Today' },
  { href: '/weekly', icon: GridIcon, label: 'Weekly' },
  { href: '/monthly', icon: CalendarIcon, label: 'Monthly' },
  { href: '/analysis', icon: SparklesIcon, label: 'AI' },
  { href: '/settings', icon: SettingsIcon, label: 'Settings' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-subtle flex items-center justify-around h-16 z-50">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 min-w-[44px] min-h-[44px] justify-center transition-colors duration-150 ${
              isActive ? 'text-brand-red' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

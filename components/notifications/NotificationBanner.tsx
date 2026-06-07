'use client'

import { useState, useEffect } from 'react'
import { requestPermissionAndSubscribe } from '@/lib/notifications'
import { BellIcon, XCircleIcon } from '@/components/icons'

export function NotificationBanner() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default' &&
      'serviceWorker' in navigator
    ) {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const handleEnable = async () => {
    setLoading(true)
    try {
      await requestPermissionAndSubscribe()
    } finally {
      setLoading(false)
      setVisible(false)
    }
  }

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-4 flex items-center gap-3">
      <BellIcon size={18} className="text-brand-blue shrink-0" />
      <p className="text-sm text-text-secondary flex-1">
        Enable prayer time notifications?
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => { void handleEnable() }}
          disabled={loading}
          className="text-xs font-semibold text-brand-blue bg-brand-blue-muted border border-brand-blue/30 rounded-xl px-3 py-1.5 min-h-[36px] transition-all duration-150 disabled:opacity-40"
        >
          {loading ? 'Enabling…' : 'Enable'}
        </button>
        <button
          onClick={() => setVisible(false)}
          className="text-text-muted hover:text-text-secondary transition-colors duration-150"
          aria-label="Dismiss"
        >
          <XCircleIcon size={18} />
        </button>
      </div>
    </div>
  )
}

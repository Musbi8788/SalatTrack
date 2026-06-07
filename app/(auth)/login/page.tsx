'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CrescentMoonIcon, LoaderIcon } from '@/components/icons'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-base px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <CrescentMoonIcon size={40} className="text-brand-red mb-3" />
          <h1 className="text-2xl font-bold text-text-primary">SalatTrack</h1>
          <p className="text-sm text-text-muted mt-1">Track your daily prayers</p>
        </div>

        <div className="bg-surface border border-subtle rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Sign in</h2>

          {error !== null && (
            <div className="bg-brand-red-muted border border-brand-red/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-brand-red-light">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-raised border border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-strong transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-raised border border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-strong transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-brand-red-light active:scale-95 text-white text-sm font-semibold rounded-xl px-5 py-3 min-h-[44px] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoaderIcon size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-text-muted mt-4">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-brand-blue hover:text-brand-blue-deep transition-colors font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}

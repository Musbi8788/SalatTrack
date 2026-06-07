'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import type { AIAnalysisLog } from '@/types'
import { SparklesIcon, LoaderIcon, ChevronDownIcon } from '@/components/icons'

interface AIAnalysisCardProps {
  initialHistory: AIAnalysisLog[]
}

type Phase = 'idle' | 'streaming' | 'done' | 'error'

const MD_COMPONENTS: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-semibold text-text-primary mb-2 mt-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-text-primary mb-1.5 mt-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium text-text-primary mb-1 mt-2">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-2 pl-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-2 pl-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-text-secondary">{children}</li>,
  strong: ({ children }) => (
    <strong className="text-text-primary font-semibold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="text-brand-blue not-italic">{children}</em>
  ),
  hr: () => <hr className="border-subtle my-3" />,
}

export function AIAnalysisCard({ initialHistory }: AIAnalysisCardProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  async function handleAnalyze() {
    if (phase === 'streaming') return
    setPhase('streaming')
    setText('')
    setError(null)

    try {
      const res = await fetch('/api/analysis', { method: 'POST' })

      if (!res.ok || !res.body) {
        const body = (await res.json()) as { error?: string }
        const msg =
          res.status === 422
            ? 'No prayer data yet — log a few prayers first, then try again.'
            : (body.error ?? `Unexpected error (${res.status})`)
        setError(msg)
        setPhase('error')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try {
            const parsed = JSON.parse(line.slice(6)) as {
              choices?: Array<{ delta?: { content?: string } }>
            }
            const chunk = parsed.choices?.[0]?.delta?.content
            if (chunk) setText((prev) => prev + chunk)
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }

      setPhase('done')
    } catch {
      setError('Network error — check your connection and try again.')
      setPhase('error')
    }
  }

  return (
    <div className="space-y-4">
      {/* Trigger button — shown when idle or after an error */}
      {(phase === 'idle' || phase === 'error') && (
        <button
          onClick={() => { void handleAnalyze() }}
          className="w-full bg-brand-red hover:bg-brand-red-light active:scale-95
                     text-white text-sm font-semibold rounded-xl px-5 py-3 min-h-[44px]
                     transition-all duration-150 flex items-center justify-center gap-2"
        >
          <SparklesIcon size={16} />
          Analyze My Prayers
        </button>
      )}

      {/* Error message */}
      {phase === 'error' && error && (
        <div className="bg-brand-red-muted border border-brand-red/30 rounded-xl px-4 py-3">
          <p className="text-brand-red-light text-sm">{error}</p>
        </div>
      )}

      {/* Active analysis card (streaming or done) */}
      {(phase === 'streaming' || phase === 'done') && (
        <div className="bg-surface border border-brand-blue/20 rounded-2xl p-4 space-y-3">
          {/* Card header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon size={16} className="text-brand-blue" />
              <span className="text-sm font-semibold text-text-primary">
                AI Analysis
              </span>
            </div>
            <span className="bg-brand-blue-muted text-brand-blue text-xs rounded-full px-2 py-0.5">
              {phase === 'streaming' ? 'Generating…' : 'Complete'}
            </span>
          </div>

          {/* Spinner before first token arrives */}
          {phase === 'streaming' && !text && (
            <div className="flex items-center gap-2 text-text-muted py-2">
              <LoaderIcon size={16} className="animate-spin shrink-0" />
              <span className="text-sm">Analyzing your prayer data…</span>
            </div>
          )}

          {/* Progressive / final markdown */}
          {text && (
            <div className="text-text-secondary text-sm leading-relaxed">
              <ReactMarkdown components={MD_COMPONENTS}>{text}</ReactMarkdown>
            </div>
          )}

          {/* Analyze again */}
          {phase === 'done' && (
            <button
              onClick={() => { void handleAnalyze() }}
              className="text-xs text-brand-blue hover:text-brand-blue-deep transition-colors"
            >
              Analyze again
            </button>
          )}
        </div>
      )}

      {/* Past analyses accordion */}
      {initialHistory.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide pt-2">
            Past Analyses
          </h2>
          {initialHistory.map((item) => {
            const isOpen = openId === item.id
            const dateLabel = new Date(item.created_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
            return (
              <div
                key={item.id}
                className="bg-surface border border-subtle rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="w-full flex items-center justify-between px-4 py-3 min-h-[44px]
                             text-left hover:bg-raised transition-colors duration-150"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-primary">
                      {dateLabel}
                    </span>
                    <span className="text-xs text-text-muted">
                      {item.period_start} – {item.period_end}
                    </span>
                  </div>
                  <ChevronDownIcon
                    size={16}
                    className={`text-text-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-subtle text-text-secondary text-sm leading-relaxed">
                    <ReactMarkdown components={MD_COMPONENTS}>
                      {item.analysis_text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

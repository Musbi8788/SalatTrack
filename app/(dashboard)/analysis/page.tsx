import { createClient } from '@/lib/supabase/server'
import { AIAnalysisCard } from '@/components/analysis/AIAnalysisCard'
import { IntentionReminder } from '@/components/islamic/IntentionReminder'
import { SpiritualDisclaimer } from '@/components/islamic/SpiritualDisclaimer'
import type { AIAnalysisLog } from '@/types'

export default async function AnalysisPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = user
    ? await supabase
        .from('ai_analysis_logs')
        .select('id, period_start, period_end, analysis_text, model_used, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: null }

  const history = (data ?? []) as AIAnalysisLog[]

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">AI Analysis</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Personalized insights based on your last 30 days of prayer data
        </p>
      </div>

      <IntentionReminder />
      <SpiritualDisclaimer />

      <AIAnalysisCard initialHistory={history} />
    </div>
  )
}

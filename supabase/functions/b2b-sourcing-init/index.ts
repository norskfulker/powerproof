// b2b-sourcing-init v2
// SUBSCRIPTION MIGRATION: deduct_credits_custom replaced with deduct_feature_usage, bucket='sourcing'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SOURCES = ['indiamart', 'alibaba', 'made_in_china', '1688'] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = auth.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: ae } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (ae || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json()
    const { keyword, budget_max = null, force_refresh = false } = body
    if (!keyword?.trim()) return new Response(JSON.stringify({ error: 'keyword required' }), { status: 400, headers: corsHeaders })

    const kw = String(keyword).trim()
    const budgetMax: number | null = budget_max ? Number(budget_max) : null

    // Check if ALL sources are cached — if so, skip usage deduction
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()
    let allCached = false
    let existingSearchId: string | null = null

    if (!force_refresh) {
      const { data: cacheRows } = await supabase
        .from('sourcing_results')
        .select('source, search_id')
        .eq('keyword', kw.toLowerCase())
        .gte('scraped_at', cutoff)
        .in('source', SOURCES)

      const cachedSources = new Set((cacheRows ?? []).map((r: { source: string }) => r.source))
      allCached = SOURCES.every(s => cachedSources.has(s))
      existingSearchId = (cacheRows ?? [])[0]?.search_id ?? null
    }

    const searchId = existingSearchId ?? crypto.randomUUID()

    if (!allCached) {
      const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', {
        p_user_id: user.id,
        p_bucket: 'sourcing',
        p_amount: 1,
      })
      if (usageErr) {
        return new Response(JSON.stringify({ error: 'Usage error', detail: usageErr.message }), { status: 500, headers: corsHeaders })
      }
      if (!usageResult?.success) {
        const reason = usageResult?.error
        if (reason === 'no_active_subscription')
          return new Response(JSON.stringify({ error: 'No active subscription found.', code: reason }), { status: 402, headers: corsHeaders })
        if (reason === 'feature_locked')
          return new Response(JSON.stringify({ error: 'This feature is not available on your plan.', code: reason }), { status: 402, headers: corsHeaders })
        return new Response(
          JSON.stringify({ error: `Monthly sourcing limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`, code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0 }),
          { status: 402, headers: corsHeaders },
        )
      }
    }

    return new Response(
      JSON.stringify({
        search_id: searchId,
        keyword: kw,
        budget_max: budgetMax,
        from_cache: allCached,
        sources: SOURCES,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[bsi] FATAL:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

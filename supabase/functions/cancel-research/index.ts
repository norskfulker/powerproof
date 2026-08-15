// cancel-research v1
// Cancels a pending research, refunds 50% of credits
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json()
    const { opportunity_id } = body
    if (!opportunity_id)
      return new Response(JSON.stringify({ error: 'opportunity_id required' }), { status: 400, headers: corsHeaders })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data, error } = await supabase.rpc('cancel_research', {
      p_user_id: user.id,
      p_opportunity_id: opportunity_id,
    })

    if (error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.success) {
      const statusMap: Record<string, number> = {
        not_found: 404,
        unauthorized: 403,
        not_cancellable: 409,
      }
      return new Response(
        JSON.stringify({ error: result?.reason ?? 'cancel_failed', code: result?.reason }),
        { status: statusMap[result?.reason] ?? 400, headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        refunded_credits: result.refunded_credits,
        balance_after: result.balance_after,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[cancel-research] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

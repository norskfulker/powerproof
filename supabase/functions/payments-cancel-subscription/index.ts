// payments-cancel-subscription v1
// Cancels the calling user's current active/trialing/pending subscription.
//
// Contract:
//   POST, no body required (derives user from JWT, acts on their current subscription)
//   Success: { cancelled: true, status: "cancelled" }
//   Failure: { error: "error_code_or_message" } with non-2xx status
//
// Design: cancels immediately (cancel_at_cycle_end=false) rather than at period end. If
// "cancel at period end, keep access until then" is wanted later, this is the place to add
// a cancel_at_period_end=true path that keeps status='active' but sets the flag, and relies
// on a scheduled job (or the next webhook cycle event) to actually flip status to 'cancelled'
// when the period genuinely ends. Not built now since nothing asked for grace-period access.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type AuthedUser = { id: string; email?: string; role?: string }

function parseAuthenticatedJwtUser(authorizationHeader: string | null): AuthedUser | null {
  if (!authorizationHeader) return null
  const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null
  try {
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return null
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson) as { sub?: string; email?: string; role?: string; exp?: number }
    if (!payload.sub) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    if (payload.role !== 'authenticated') return null
    return { id: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

function basicAuth(user: string, pass: string) {
  return `Basic ${btoa(`${user}:${pass}`)}`
}

type ExistingSubRow = { id: string; status: string; razorpay_subscription_id: string | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authed = parseAuthenticatedJwtUser(req.headers.get('Authorization'))
  if (!authed?.id) return json({ error: 'unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

  if (!supabaseUrl || !serviceRole) return json({ error: 'server_misconfigured_supabase' }, 500)

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: existingSub } = await admin
    .from('user_subscriptions')
    .select('id, status, razorpay_subscription_id')
    .eq('user_id', authed.id)
    .in('status', ['pending', 'active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ExistingSubRow>()

  if (!existingSub) return json({ error: 'no_active_subscription' }, 404)

  // Trial has no razorpay_subscription_id (it's free) — just cancel the local row.
  if (existingSub.razorpay_subscription_id) {
    if (!razorpayKeyId || !razorpayKeySecret) return json({ error: 'server_misconfigured_razorpay' }, 500)
    const rzRes = await fetch(`https://api.razorpay.com/v1/subscriptions/${existingSub.razorpay_subscription_id}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(razorpayKeyId, razorpayKeySecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancel_at_cycle_end: false }),
    })
    const rzBody = await rzRes.json().catch(() => ({}))
    // Razorpay returns an error if the subscription is already cancelled/completed on their
    // side (e.g. our local row is stale) — don't hard-fail the user's cancel request over
    // that; proceed to reconcile our local state to 'cancelled' regardless.
    if (!rzRes.ok) {
      console.warn('[payments-cancel-subscription] Razorpay cancel returned non-ok (proceeding to cancel locally anyway):', JSON.stringify(rzBody))
    }
  }

  const { error: updateErr } = await admin
    .from('user_subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', existingSub.id)

  if (updateErr) {
    console.error('[payments-cancel-subscription] local cancel failed:', updateErr.message)
    return json({ error: 'cancel_failed' }, 500)
  }

  return json({ cancelled: true, status: 'cancelled' })
})

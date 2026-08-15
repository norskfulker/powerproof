// payments-create-subscription v4
// ADDED: pending-state tracking + resume, so a user who closes the Razorpay checkout modal
// before paying doesn't lose track of that subscription or spam-create duplicate Razorpay
// subscriptions on retry.
//
// Flow:
// - On first call for a plan: create Razorpay subscription, insert a LOCAL row with
//   status='pending' (razorpay_subscription_id set, period_start/end null until webhook
//   confirms). Return subscriptionId/keyId as before so the frontend can reopen Razorpay
//   Checkout against the SAME subscription id.
// - On a later call for the SAME plan while a 'pending' row already exists: don't create a
//   new Razorpay subscription at all — return the existing pending subscriptionId so the
//   frontend just reopens Checkout against it ("reaccess" the pending payment).
// - On a call for a DIFFERENT plan while the user has an active/trialing/pending row on
//   another plan: cancel the old one (Razorpay + local) and create fresh, as before.
// - The webhook (subscription.activated/charged) is what flips a 'pending' row to 'active'
//   with real period_start/period_end — see payments-webhook.
//
// Contract (frontend-defined, unchanged):
//   POST body: { "planId": "<subscription_plans.id UUID>" }
//   Success:   { subscriptionId, keyId, plan: { id, slug, name }, resumed?: boolean }
//   Failure:   { error: "error_code_or_message" } with non-2xx status
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

type PlanRow = {
  id: string
  slug: string
  name: string
  razorpay_plan_id: string | null
  is_active: boolean
}

type ExistingSubRow = {
  id: string
  status: string
  plan_id: string
  razorpay_subscription_id: string | null
}

async function cancelRazorpaySubscription(keyId: string, keySecret: string, razorpaySubId: string): Promise<{ ok: boolean; body: unknown }> {
  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpaySubId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(keyId, keySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ cancel_at_cycle_end: false }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, body }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authed = parseAuthenticatedJwtUser(req.headers.get('Authorization'))
  if (!authed?.id) return json({ error: 'unauthorized' }, 401)

  let body: { planId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json_body' }, 400)
  }
  const planId = String(body?.planId ?? '').trim()
  if (!planId) return json({ error: 'missing_plan_id' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

  if (!supabaseUrl || !serviceRole) return json({ error: 'server_misconfigured_supabase' }, 500)
  if (!razorpayKeyId || !razorpayKeySecret) return json({ error: 'server_misconfigured_razorpay' }, 500)

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: plan, error: planErr } = await admin
    .from('subscription_plans')
    .select('id, slug, name, razorpay_plan_id, is_active')
    .eq('id', planId)
    .single<PlanRow>()

  if (planErr || !plan) return json({ error: 'plan_not_found' }, 404)
  if (!plan.is_active) return json({ error: 'plan_not_active' }, 400)
  if (!plan.razorpay_plan_id) return json({ error: 'checkout_setup_pending' }, 400)

  const { data: existingSub } = await admin
    .from('user_subscriptions')
    .select('id, status, plan_id, razorpay_subscription_id')
    .eq('user_id', authed.id)
    .in('status', ['pending', 'active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<ExistingSubRow>()

  if (existingSub) {
    if (existingSub.plan_id === plan.id) {
      if (existingSub.status === 'pending' && existingSub.razorpay_subscription_id) {
        // Same plan, payment never completed — let them reaccess the same Razorpay
        // subscription instead of creating a duplicate one.
        return json({
          subscriptionId: existingSub.razorpay_subscription_id,
          keyId: razorpayKeyId,
          plan: { id: plan.id, slug: plan.slug, name: plan.name },
          resumed: true,
        })
      }
      // Already active/trialing on this exact plan — no-op.
      return json({ error: 'already_subscribed' }, 400)
    }

    // Switching to a different plan: cancel the old Razorpay subscription (if any — Trial
    // has none) and mark the local row cancelled, regardless of whether it was pending,
    // active, or trialing.
    if (existingSub.razorpay_subscription_id) {
      const cancelResult = await cancelRazorpaySubscription(razorpayKeyId, razorpayKeySecret, existingSub.razorpay_subscription_id)
      if (!cancelResult.ok) {
        console.error('[payments-create-subscription] failed to cancel old subscription:', JSON.stringify(cancelResult.body))
        return json({ error: 'plan_switch_cancel_failed' }, 500)
      }
    }
    const { error: cancelLocalErr } = await admin
      .from('user_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', existingSub.id)
    if (cancelLocalErr) console.error('[payments-create-subscription] failed to mark old local row cancelled:', cancelLocalErr.message)
  }

  const rzRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(razorpayKeyId, razorpayKeySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: plan.razorpay_plan_id,
      customer_notify: 1,
      total_count: 120,
      notes: {
        user_id: authed.id,
        plan_id: plan.id,
        plan_slug: plan.slug,
      },
    }),
  })

  const rzBody = await rzRes.json().catch(() => ({} as Record<string, unknown>))
  const subscriptionId = typeof rzBody.id === 'string' ? rzBody.id : ''

  if (!rzRes.ok || !subscriptionId) {
    console.error('[payments-create-subscription] Razorpay error:', JSON.stringify(rzBody))
    return json({ error: 'razorpay_subscription_creation_failed' }, rzRes.status || 500)
  }

  // Insert a pending row so the user (and this function, on a retry) can see this
  // subscription exists and is awaiting payment confirmation. The webhook flips this to
  // 'active' with real period_start/period_end once Razorpay confirms the charge.
  const { error: insertErr } = await admin.from('user_subscriptions').insert({
    user_id: authed.id,
    plan_id: plan.id,
    status: 'pending',
    razorpay_subscription_id: subscriptionId,
    cancel_at_period_end: false,
  })
  if (insertErr) {
    console.error('[payments-create-subscription] pending insert failed:', insertErr.message)
    // Don't fail the request over this — the webhook can still activate the subscription
    // via notes.user_id/plan_id even without a pre-existing pending row. But log loudly.
  }

  console.log(`[payments-create-subscription] created rzp_sub=${subscriptionId} user=${authed.id} plan=${plan.slug} switch=${!!existingSub}`)

  return json({
    subscriptionId,
    keyId: razorpayKeyId,
    plan: { id: plan.id, slug: plan.slug, name: plan.name },
  })
})

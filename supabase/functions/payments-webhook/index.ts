// payments-webhook v11
// FIX: supersession step now also cancels stray 'pending' rows for the user, not just
// active/trialing. This matters for the plan-switch + pending-resume flow: if a user had a
// pending subscription on Plan A, then successfully activates a subscription on Plan B (e.g.
// they abandoned A's checkout, came back later, and subscribed to B instead via the resume/
// switch logic in payments-create-subscription), this ensures the stale pending A row doesn't
// linger indefinitely as a phantom pending subscription.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json',
    },
  })
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toHex(digest)
}

async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return toHex(digest)
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

type RazorpaySubscriptionEntity = {
  id?: string
  status?: string
  current_start?: number
  current_end?: number
  notes?: { user_id?: string; plan_id?: string; plan_slug?: string }
}

type RazorpayPaymentEntity = { id?: string; order_id?: string }

type WebhookBody = {
  event?: string
  payload?: {
    subscription?: { entity?: RazorpaySubscriptionEntity }
    payment?: { entity?: RazorpayPaymentEntity }
  }
}

type PurchaseRow = { id: string; user_id: string; status: string; credits_bought: number }
type UserCreditsRow = { balance: number; lifetime_earned: number; lifetime_purchased: number; lifetime_spent: number }

const ACTIVE_SUB_EVENTS = new Set(['subscription.activated', 'subscription.charged'])
const ENDED_SUB_EVENTS = new Set(['subscription.cancelled', 'subscription.completed', 'subscription.halted'])

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ received: true })

  const rawBody = await req.text()
  const sentSignature = req.headers.get('x-razorpay-signature') ?? ''
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? ''
  if (!webhookSecret || !sentSignature) return json({ received: true })

  const computed = await sign(webhookSecret, rawBody)
  if (!safeEquals(computed, sentSignature)) return json({ received: true })

  let eventBody: WebhookBody
  try {
    eventBody = JSON.parse(rawBody) as WebhookBody
  } catch {
    return json({ received: true })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceRole) return json({ received: true })
  const admin = createClient(supabaseUrl, serviceRole)

  const event = String(eventBody.event ?? '')
  const razorpayEventIdHeader = req.headers.get('x-razorpay-event-id') ?? null
  const payloadHash = await sha256Hex(rawBody)

  const { error: ledgerErr } = await admin.from('razorpay_webhook_events').insert({
    razorpay_event_id: razorpayEventIdHeader,
    payload_hash: razorpayEventIdHeader ? null : payloadHash,
    event_type: event,
  })
  if (ledgerErr) {
    if (ledgerErr.code === '23505') return json({ received: true, duplicate: true })
    console.error('[payments-webhook] ledger insert failed:', ledgerErr.message)
  }

  // ---- Subscription lifecycle events ----
  if (ACTIVE_SUB_EVENTS.has(event) || ENDED_SUB_EVENTS.has(event)) {
    const sub = eventBody.payload?.subscription?.entity
    const razorpaySubId = String(sub?.id ?? '').trim()
    if (!razorpaySubId) return json({ received: true })

    const userId = String(sub?.notes?.user_id ?? '').trim()
    const planId = String(sub?.notes?.plan_id ?? '').trim()

    if (ACTIVE_SUB_EVENTS.has(event)) {
      if (!userId || !planId) {
        console.error('[payments-webhook] subscription event missing notes.user_id/plan_id', razorpaySubId)
        return json({ received: true })
      }
      const periodStart = sub?.current_start ? new Date(sub.current_start * 1000).toISOString() : new Date().toISOString()
      const periodEnd = sub?.current_end ? new Date(sub.current_end * 1000).toISOString() : null

      // Supersede any other pending/active/trialing subscription row for this user —
      // covers Trial->paid, plan switches, and cleanup of stray abandoned pending rows.
      await admin
        .from('user_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('status', ['pending', 'active', 'trialing'])
        .neq('razorpay_subscription_id', razorpaySubId)

      const { error: upsertErr } = await admin
        .from('user_subscriptions')
        .upsert(
          {
            user_id: userId,
            plan_id: planId,
            status: 'active',
            razorpay_subscription_id: razorpaySubId,
            period_start: periodStart,
            period_end: periodEnd,
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'razorpay_subscription_id' },
        )
      if (upsertErr) console.error('[payments-webhook] subscription upsert failed:', upsertErr.message)
      return json({ received: true })
    }

    if (ENDED_SUB_EVENTS.has(event)) {
      const { error: cancelErr } = await admin
        .from('user_subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('razorpay_subscription_id', razorpaySubId)
      if (cancelErr) console.error('[payments-webhook] subscription cancel failed:', cancelErr.message)
      return json({ received: true })
    }
  }

  // ---- Legacy one-time credit-purchase events (kept for historical compatibility) ----
  const paymentId = String(eventBody.payload?.payment?.entity?.id ?? '').trim()
  const razorpayOrderId = String(eventBody.payload?.payment?.entity?.order_id ?? '').trim()
  if (!razorpayOrderId) return json({ received: true })

  const { data: purchase } = await admin
    .from('credit_purchases')
    .select('id,user_id,status,credits_bought')
    .eq('razorpay_order_id', razorpayOrderId)
    .maybeSingle<PurchaseRow>()
  if (!purchase) return json({ received: true })

  if (event === 'payment.failed') {
    if (purchase.status === 'pending') {
      await admin
        .from('credit_purchases')
        .update({ status: 'failed', metadata: { source: 'payments-webhook', event } })
        .eq('id', purchase.id)
        .eq('status', 'pending')
    }
    return json({ received: true })
  }

  if (event === 'payment.captured') {
    if (purchase.status === 'completed') return json({ received: true })
    if (purchase.status !== 'pending') return json({ received: true })

    const { error: completeError } = await admin
      .from('credit_purchases')
      .update({
        status: 'completed',
        razorpay_payment_id: paymentId || null,
        completed_at: new Date().toISOString(),
        metadata: { source: 'payments-webhook', event },
      })
      .eq('id', purchase.id)
      .eq('status', 'pending')
    if (completeError) return json({ received: true })

    const { data: current } = await admin
      .from('user_credits')
      .select('balance,lifetime_earned,lifetime_purchased,lifetime_spent')
      .eq('user_id', purchase.user_id)
      .maybeSingle<UserCreditsRow>()
    const before = Number(current?.balance ?? 0)
    const added = Number(purchase.credits_bought ?? 0)
    const newBalance = before + added

    await admin.from('user_credits').upsert({
      user_id: purchase.user_id,
      balance: newBalance,
      lifetime_earned: Number(current?.lifetime_earned ?? 0),
      lifetime_purchased: Number(current?.lifetime_purchased ?? 0) + added,
      lifetime_spent: Number(current?.lifetime_spent ?? 0),
      updated_at: new Date().toISOString(),
    })

    await admin.from('credit_transactions').insert({
      user_id: purchase.user_id,
      type: 'purchase',
      amount: added,
      balance_before: before,
      balance_after: newBalance,
      feature: 'credit_package',
      metadata: { purchase_id: purchase.id, razorpay_order_id: razorpayOrderId, razorpay_payment_id: paymentId || null },
    })
  }

  return json({ received: true })
})

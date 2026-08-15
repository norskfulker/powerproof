import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders, json } from '../_shared/http.ts'
import { parseAuthenticatedJwtUser } from '../_shared/auth.ts'

const INVESTORS_LIST_PRICE_INR = 499

function basicAuth(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`)
  return `Basic ${token}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authed = parseAuthenticatedJwtUser(req.headers.get('Authorization'))
  if (!authed?.id) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
  if (!supabaseUrl || !serviceRole) return json({ error: 'Server misconfigured (Supabase)' }, 500)
  if (!razorpayKeyId || !razorpayKeySecret) {
    return json({ error: 'Server misconfigured (Razorpay)' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: profile } = await admin
    .from('profiles')
    .select('investors_list_unlocked_at, role')
    .eq('id', authed.id)
    .maybeSingle<{ investors_list_unlocked_at: string | null; role: string | null }>()

  if (
    profile?.investors_list_unlocked_at ||
    profile?.role === 'admin' ||
    profile?.role === 'super_admin'
  ) {
    return json({ alreadyUnlocked: true })
  }

  const amountPaise = INVESTORS_LIST_PRICE_INR * 100
  const receipt = `powerproof_inv_${Date.now()}`
  const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: basicAuth(razorpayKeyId, razorpayKeySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: { product: 'investors_list' },
    }),
  })
  const rzBody = await rzRes.json().catch(() => ({} as Record<string, unknown>))
  const orderId = typeof rzBody.id === 'string' ? rzBody.id : ''
  if (!rzRes.ok || !orderId) {
    return json({ error: 'Razorpay order creation failed', details: rzBody }, rzRes.status || 500)
  }

  const { data: purchase, error: insertError } = await admin
    .from('investor_list_purchases')
    .insert({
      user_id: authed.id,
      amount_paid_inr: INVESTORS_LIST_PRICE_INR,
      razorpay_order_id: orderId,
      status: 'pending',
    })
    .select('id')
    .single<{ id: string }>()
  if (insertError || !purchase) return json({ error: 'Failed to create purchase record' }, 500)

  return json({
    orderId,
    amount: amountPaise,
    priceInr: INVESTORS_LIST_PRICE_INR,
    currency: 'INR',
    keyId: razorpayKeyId,
    purchaseId: purchase.id,
    productName: 'Investors list unlock',
  })
})

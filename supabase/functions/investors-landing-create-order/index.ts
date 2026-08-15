import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders, json } from '../_shared/http.ts'

const INVESTORS_LIST_PRICE_INR = 499
const ORDERS_PER_HOUR = 8

function basicAuth(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`)
  return `Basic ${token}`
}

function clientKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? ''
  const ip = forwarded.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown'
  return ip.slice(0, 128)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
  if (!supabaseUrl || !serviceRole) return json({ error: 'Server misconfigured (Supabase)' }, 500)
  if (!razorpayKeyId || !razorpayKeySecret) {
    return json({ error: 'Server misconfigured (Razorpay)' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRole)
  const clientKey = clientKeyFromRequest(req)
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error: countError } = await admin
    .from('investor_list_purchases')
    .select('id', { count: 'exact', head: true })
    .is('user_id', null)
    .gte('created_at', since)
    .filter('metadata->>client_key', 'eq', clientKey)

  if (countError) {
    console.warn('[investors-landing-create-order] rate count error:', countError.message)
  } else if ((count ?? 0) >= ORDERS_PER_HOUR) {
    return json({ error: 'Too many checkout attempts. Please try again later.' }, 429)
  }

  const amountPaise = INVESTORS_LIST_PRICE_INR * 100
  const receipt = `powerproof_inv_guest_${Date.now()}`
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
      notes: { product: 'investors_list', source: 'investors_landing' },
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
      user_id: null,
      amount_paid_inr: INVESTORS_LIST_PRICE_INR,
      razorpay_order_id: orderId,
      status: 'pending',
      metadata: { source: 'investors_landing', client_key: clientKey },
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

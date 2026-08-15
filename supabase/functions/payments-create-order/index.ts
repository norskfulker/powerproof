import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders, json } from '../_shared/http.ts'
import { parseAuthenticatedJwtUser } from '../_shared/auth.ts'

type CreditPackageRow = {
  id: string
  name: string
  credits: number
  price_inr: number | null
  is_active: boolean
}

function basicAuth(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`)
  return `Basic ${token}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authed = parseAuthenticatedJwtUser(req.headers.get('Authorization'))
  if (!authed?.id) return json({ error: 'Unauthorized' }, 401)

  let body: { packageId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const packageId = String(body?.packageId ?? '').trim()
  if (!packageId) return json({ error: 'Missing packageId' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
  if (!supabaseUrl || !serviceRole) return json({ error: 'Server misconfigured (Supabase)' }, 500)

  const admin = createClient(supabaseUrl, serviceRole)
  const { data: pkg, error: pkgError } = await admin
    .from('credit_packages')
    .select('id,name,credits,price_inr,is_active')
    .eq('id', packageId)
    .eq('is_active', true)
    .single<CreditPackageRow>()
  if (pkgError || !pkg) return json({ error: 'Package not found' }, 404)

  const priceInr = Number(pkg.price_inr ?? 0)
  if (priceInr === 0) {
    return json({ free: true, packageId: pkg.id, credits: pkg.credits })
  }

  if (!razorpayKeyId || !razorpayKeySecret) {
    return json({ error: 'Server misconfigured (Razorpay)' }, 500)
  }

  const amountPaise = Math.max(100, Math.round(priceInr * 100))
  const receipt = `powerproof_${Date.now()}`
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
    }),
  })
  const rzBody = await rzRes.json().catch(() => ({} as Record<string, unknown>))
  const orderId = typeof rzBody.id === 'string' ? rzBody.id : ''
  if (!rzRes.ok || !orderId) {
    return json({ error: 'Razorpay order creation failed', details: rzBody }, rzRes.status || 500)
  }

  const amountInr = Math.round(amountPaise / 100)
  const { data: purchase, error: insertError } = await admin
    .from('credit_purchases')
    .insert({
      user_id: authed.id,
      package_id: pkg.id,
      credits_bought: pkg.credits,
      amount_paid_inr: amountInr,
      razorpay_order_id: orderId,
      status: 'pending',
      package_price_usd: 0,
      display_currency: 'INR',
      display_amount: amountInr,
    })
    .select('id')
    .single<{ id: string }>()
  if (insertError || !purchase) return json({ error: 'Failed to create purchase record' }, 500)

  return json({
    orderId,
    amount: amountPaise,
    priceInr: amountInr,
    currency: 'INR',
    keyId: razorpayKeyId,
    purchaseId: purchase.id,
    packageName: pkg.name,
    credits: pkg.credits,
  })
})


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
import { corsHeaders, json } from '../_shared/http.ts'

function basicAuth(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`)
  return `Basic ${token}`
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toHex(digest)
}

function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i += 1) out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return out === 0
}

type PurchaseRow = {
  id: string
  user_id: string | null
  status: string
  razorpay_order_id: string | null
  guest_email: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
  const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
  if (!supabaseUrl || !serviceRole || !razorpayKeyId || !razorpayKeySecret) {
    return json({ error: 'Server misconfigured' }, 500)
  }

  let body: {
    purchaseId?: string
    razorpay_payment_id?: string
    razorpay_order_id?: string
    razorpay_signature?: string
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const purchaseId = String(body.purchaseId ?? '').trim()
  const paymentId = String(body.razorpay_payment_id ?? '').trim()
  const orderId = String(body.razorpay_order_id ?? '').trim()
  const signature = String(body.razorpay_signature ?? '').trim()
  if (!purchaseId || !paymentId || !orderId || !signature) {
    return json({ error: 'Missing payment fields' }, 400)
  }

  const expected = await sign(razorpayKeySecret, `${orderId}|${paymentId}`)
  if (!safeEquals(expected, signature)) {
    return json({ error: 'Invalid payment signature' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const { data: purchase, error: purchaseError } = await admin
    .from('investor_list_purchases')
    .select('id, user_id, status, razorpay_order_id, guest_email')
    .eq('id', purchaseId)
    .maybeSingle<PurchaseRow>()
  if (purchaseError || !purchase) return json({ error: 'Purchase not found' }, 404)
  if (purchase.user_id !== null) return json({ error: 'Not a guest purchase' }, 400)
  if (purchase.razorpay_order_id !== orderId) return json({ error: 'Order mismatch' }, 400)
  if (purchase.status === 'completed') {
    return json({ success: true, alreadyCompleted: true, email: purchase.guest_email })
  }
  if (purchase.status !== 'pending') return json({ error: 'Invalid purchase status' }, 400)

  const payRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: basicAuth(razorpayKeyId, razorpayKeySecret) },
  })
  const payBody = await payRes.json().catch(() => ({} as Record<string, unknown>))
  const email = typeof payBody.email === 'string' ? payBody.email.trim().toLowerCase() : ''
  if (!payRes.ok || !email) {
    return json({ error: 'Could not verify payment email' }, 400)
  }

  const payOrderId = typeof payBody.order_id === 'string' ? payBody.order_id : ''
  if (payOrderId !== orderId) return json({ error: 'Payment order mismatch' }, 400)

  const { error: updateError } = await admin
    .from('investor_list_purchases')
    .update({
      status: 'completed',
      guest_email: email,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      completed_at: new Date().toISOString(),
    })
    .eq('id', purchaseId)
    .eq('status', 'pending')
  if (updateError) return json({ error: 'Failed to complete purchase' }, 500)

  await admin
    .from('investor_list_email_unlocks')
    .upsert({ email, purchase_id: purchaseId }, { onConflict: 'email' })

  await admin
    .from('profiles')
    .update({
      investors_list_unlocked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .is('investors_list_unlocked_at', null)
    .ilike('email', email)

  return json({ success: true, email })
})

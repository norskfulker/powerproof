// Deploy: npx supabase functions deploy payments-fetch --project-ref <ref>
import { corsHeaders, json } from '../_shared/http.ts'

function basicAuth(user: string, pass: string) {
  const token = btoa(`${user}:${pass}`)
  return `Basic ${token}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const provider = String(body?.provider ?? '').trim().toLowerCase()
  if (!provider) return json({ error: 'Missing provider' }, 400)

  try {
    if (provider === 'razorpay') {
      const keyId = String(body?.keyId ?? '').trim()
      const keySecret = String(body?.keySecret ?? '').trim()
      const count = Math.max(1, Math.min(Number(body?.count ?? 50) || 50, 100))
      if (!keyId || !keySecret) return json({ error: 'Missing keyId/keySecret' }, 400)

      const res = await fetch(`https://api.razorpay.com/v1/payments?count=${count}`, {
        method: 'GET',
        headers: { Authorization: basicAuth(keyId, keySecret) },
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) return json({ error: 'razorpay_error', details: data, status: res.status }, res.status)

      const items = Array.isArray(data?.items) ? data.items : []
      return json({ provider: 'razorpay', items }, 200)
    }

    if (provider === 'cashfree') {
      const env = String(body?.env ?? 'prod').trim().toLowerCase() // 'prod' | 'test'
      const baseUrl = env === 'test' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg'
      const clientId = String(body?.clientId ?? '').trim()
      const clientSecret = String(body?.clientSecret ?? '').trim()
      const apiVersion = String(body?.apiVersion ?? '2025-01-01').trim()
      const orderId = String(body?.orderId ?? '').trim()
      if (!clientId || !clientSecret) return json({ error: 'Missing clientId/clientSecret' }, 400)
      if (!orderId) return json({ error: 'Missing orderId' }, 400)

      const headers = {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': apiVersion,
      }

      const [orderRes, paymentsRes] = await Promise.all([
        fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, { headers }),
        fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, { headers }),
      ])

      const order = await orderRes.json().catch(() => ({}))
      const payments = await paymentsRes.json().catch(() => ([]))

      if (!orderRes.ok) return json({ error: 'cashfree_order_error', details: order, status: orderRes.status }, orderRes.status)
      if (!paymentsRes.ok) return json({ error: 'cashfree_payments_error', details: payments, status: paymentsRes.status }, paymentsRes.status)

      return json({ provider: 'cashfree', order, payments: Array.isArray(payments) ? payments : [] }, 200)
    }

    return json({ error: 'Unsupported provider' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})


// shopify-connect v1
// Handles Shopify OAuth: init (redirect merchant to Shopify consent) + callback (exchange code for token).
// verify_jwt=false because Shopify's callback request has no PowerProof auth header; auth is instead
// carried via the signed `state` param (HMAC'd with SHOPIFY_STATE_SECRET) set during init, where we DO
// require a valid PowerProof JWT before minting that state.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REQUIRED_SCOPES = 'write_products,read_products'

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toHex(sig)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Shopify signs callback query params (excluding `hmac` and `signature`) sorted by key, joined with '&'.
async function verifyShopifyHmac(url: URL, apiSecret: string): Promise<boolean> {
  const params = new URLSearchParams(url.search)
  const receivedHmac = params.get('hmac')
  if (!receivedHmac) return false
  params.delete('hmac')
  params.delete('signature')
  const message = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')
  const computed = await hmacHex(apiSecret, message)
  return timingSafeEqual(computed, receivedHmac)
}

function isValidShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SHOPIFY_API_KEY = Deno.env.get('SHOPIFY_API_KEY')
  const SHOPIFY_API_SECRET = Deno.env.get('SHOPIFY_API_SECRET')
  const SHOPIFY_STATE_SECRET = Deno.env.get('SHOPIFY_STATE_SECRET')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? 'https://powerproof.live'

  if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET || !SHOPIFY_STATE_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: 'Missing required secrets. Ensure SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and SHOPIFY_STATE_SECRET are set.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const url = new URL(req.url)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const redirectUri = `${SUPABASE_URL}/functions/v1/shopify-connect`

  try {
    const code = url.searchParams.get('code')

    // ---------- CALLBACK STEP (Shopify redirects back here with ?code=...&shop=...&state=...&hmac=...) ----------
    if (code) {
      const shop = url.searchParams.get('shop') ?? ''
      const stateParam = url.searchParams.get('state') ?? ''

      if (!isValidShopDomain(shop)) {
        return new Response(JSON.stringify({ error: 'Invalid shop domain' }), { status: 400, headers: corsHeaders })
      }

      const hmacOk = await verifyShopifyHmac(url, SHOPIFY_API_SECRET)
      if (!hmacOk) {
        return new Response(JSON.stringify({ error: 'HMAC verification failed' }), { status: 401, headers: corsHeaders })
      }

      // state format: "<user_id>.<signature>" where signature = HMAC(SHOPIFY_STATE_SECRET, user_id)
      const [stateUserId, stateSig] = stateParam.split('.')
      if (!stateUserId || !stateSig) {
        return new Response(JSON.stringify({ error: 'Invalid state' }), { status: 401, headers: corsHeaders })
      }
      const expectedSig = await hmacHex(SHOPIFY_STATE_SECRET, stateUserId)
      if (!timingSafeEqual(expectedSig, stateSig)) {
        return new Response(JSON.stringify({ error: 'State signature mismatch' }), { status: 401, headers: corsHeaders })
      }

      // Exchange code for access token
      const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code }),
      })
      if (!tokenRes.ok) {
        const detail = await tokenRes.text()
        return new Response(JSON.stringify({ error: 'Token exchange failed', detail: detail.slice(0, 300) }), { status: 502, headers: corsHeaders })
      }
      const tokenData = await tokenRes.json()
      const accessToken = tokenData.access_token as string
      const grantedScopes = tokenData.scope as string

      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'No access token returned by Shopify' }), { status: 502, headers: corsHeaders })
      }

      // Upsert store connection (unique on shop_domain; re-connecting the same shop updates the token)
      const { error: upsertErr } = await supabase.from('user_shopify_stores').upsert(
        {
          user_id: stateUserId,
          shop_domain: shop,
          access_token: accessToken,
          scopes: grantedScopes,
          is_active: true,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'shop_domain' },
      )

      if (upsertErr) {
        console.error('[shopify-connect] upsert failed:', upsertErr.message)
        return new Response(JSON.stringify({ error: 'Failed to save store connection', detail: upsertErr.message }), { status: 500, headers: corsHeaders })
      }

      // Redirect merchant back into PowerProof with a success flag
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: `${APP_BASE_URL}/sourcing?shopify_connected=1&shop=${encodeURIComponent(shop)}` },
      })
    }

    // ---------- INIT STEP (PowerProof calls this with a Bearer token + ?shop=xxx.myshopify.com to start OAuth) ----------
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const shop = url.searchParams.get('shop') ?? ''
    if (!isValidShopDomain(shop)) {
      return new Response(
        JSON.stringify({ error: 'shop must be a valid *.myshopify.com domain' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const stateSig = await hmacHex(SHOPIFY_STATE_SECRET, user.id)
    const state = `${user.id}.${stateSig}`

    const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authorizeUrl.searchParams.set('client_id', SHOPIFY_API_KEY)
    authorizeUrl.searchParams.set('scope', REQUIRED_SCOPES)
    authorizeUrl.searchParams.set('redirect_uri', redirectUri)
    authorizeUrl.searchParams.set('state', state)

    return new Response(
      JSON.stringify({ authorize_url: authorizeUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[shopify-connect] FATAL:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

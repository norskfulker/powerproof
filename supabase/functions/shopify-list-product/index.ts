// shopify-list-product v1
// Takes a shortlisted_products.id belonging to the caller, pushes it to the caller's connected
// Shopify store as a DRAFT product via Admin API, and records shopify_product_id back.
// Draft-only by design: PowerProof never decides to publish live on a merchant's storefront.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHOPIFY_API_VERSION = '2026-01'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json()
    const { shortlisted_product_id, is_byok = false } = body
    if (!shortlisted_product_id) {
      return new Response(JSON.stringify({ error: 'shortlisted_product_id is required' }), { status: 400, headers: corsHeaders })
    }

    // Fetch the shortlisted product, scoped to the caller (RLS would also enforce this, but service-role
    // client bypasses RLS, so we filter explicitly here).
    const { data: product, error: fetchErr } = await supabase
      .from('shortlisted_products')
      .select('*')
      .eq('id', shortlisted_product_id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !product) {
      return new Response(JSON.stringify({ error: 'Shortlisted product not found' }), { status: 404, headers: corsHeaders })
    }

    if (product.shopify_status === 'listed_draft' && product.shopify_product_id) {
      return new Response(
        JSON.stringify({ error: 'Product already listed on Shopify', shopify_product_id: product.shopify_product_id }),
        { status: 409, headers: corsHeaders },
      )
    }

    // Hard requirement: user must have set a sale price. We never fall back to source cost.
    if (product.user_price === null || product.user_price === undefined || Number(product.user_price) <= 0) {
      return new Response(
        JSON.stringify({ error: 'A sale price (user_price) must be set before listing to Shopify.' }),
        { status: 400, headers: corsHeaders },
      )
    }

    // Find the caller's connected Shopify store
    const { data: store, error: storeErr } = await supabase
      .from('user_shopify_stores')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('connected_at', { ascending: false })
      .limit(1)
      .single()

    if (storeErr || !store) {
      return new Response(JSON.stringify({ error: 'No connected Shopify store found. Connect a store first.' }), { status: 400, headers: corsHeaders })
    }

    // Usage deduction (BYOK bypasses, same pattern as b2b-sourcing / other feature edge functions)
    if (!is_byok) {
      const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', {
        p_user_id: user.id, p_bucket: 'shopify_listings', p_amount: 1,
      })
      if (usageErr) {
        return new Response(JSON.stringify({ error: 'Usage error', detail: usageErr.message }), { status: 500, headers: corsHeaders })
      }
      if (!usageResult?.success) {
        const reason = usageResult?.error
        if (reason === 'no_active_subscription')
          return new Response(JSON.stringify({ error: 'No active subscription found.', code: reason }), { status: 402, headers: corsHeaders })
        if (reason === 'feature_locked')
          return new Response(JSON.stringify({ error: 'This feature is not available on your plan.', code: reason }), { status: 402, headers: corsHeaders })
        return new Response(
          JSON.stringify({ error: `Monthly Shopify listing limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`, code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0 }),
          { status: 402, headers: corsHeaders },
        )
      }
    }

    // Build Shopify product payload
    const images = Array.isArray(product.all_images) && product.all_images.length > 0
      ? product.all_images.map((src: string) => ({ src }))
      : product.image_url ? [{ src: product.image_url }] : []

    const bodyHtml = product.product_description
      ? `<p>${product.product_description}</p>`
      : `<p>Sourced via PowerProof. Original listing: <a href="${product.product_url ?? '#'}">${product.product_url ?? ''}</a></p>`

    const shopifyPayload = {
      product: {
        title: product.title,
        body_html: bodyHtml,
        vendor: product.supplier_name || 'PowerProof Sourced',
        status: 'draft',
        images,
        tags: [product.source, product.moq ? `MOQ: ${product.moq}` : null].filter(Boolean).join(', '),
        variants: [
          {
            price: Number(product.user_price).toFixed(2),
            inventory_management: null,
          },
        ],
      },
    }

    const shopifyRes = await fetch(`https://${store.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/products.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': store.access_token,
      },
      body: JSON.stringify(shopifyPayload),
    })

    if (!shopifyRes.ok) {
      const detail = await shopifyRes.text()
      await supabase.from('shortlisted_products').update({
        shopify_status: 'error',
        shopify_error: detail.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq('id', shortlisted_product_id)
      return new Response(JSON.stringify({ error: 'Shopify product creation failed', detail: detail.slice(0, 500) }), { status: 502, headers: corsHeaders })
    }

    const shopifyData = await shopifyRes.json()
    const shopifyProductId = String(shopifyData.product?.id ?? '')

    await supabase.from('shortlisted_products').update({
      shopify_product_id: shopifyProductId,
      shopify_status: 'listed_draft',
      shopify_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', shortlisted_product_id)

    return new Response(
      JSON.stringify({ success: true, shopify_product_id: shopifyProductId, shopify_status: 'listed_draft' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[shopify-list-product] FATAL:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase'
import type { SourcingCard } from '@/lib/sourcingTypes'

export const SHOPIFY_DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/

/** Strip protocol, path, and whitespace so users can paste a full store URL. */
export function normalizeShopDomain(raw: string): string {
  let value = raw.trim().toLowerCase()
  value = value.replace(/^https?:\/\//, '')
  value = value.split('/')[0] ?? value
  value = value.split('?')[0] ?? value
  return value
}

export function isValidShopifyDomain(domain: string): boolean {
  return SHOPIFY_DOMAIN_RE.test(domain)
}

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_ANON_KEY,
  }
}

export async function startShopifyConnect(shopDomain: string): Promise<string> {
  const domain = normalizeShopDomain(shopDomain)
  if (!isValidShopifyDomain(domain)) {
    throw new Error('invalid_shop_domain')
  }

  const headers = await authHeaders()
  const url = new URL(`${SUPABASE_URL}/functions/v1/shopify-connect`)
  url.searchParams.set('shop', domain)

  const res = await fetch(url.toString(), { method: 'GET', headers })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok) {
    throw edgeApiErrorFromPayload(res.status, data, 'Could not start Shopify connection')
  }

  const authorizeUrl = typeof data.authorize_url === 'string' ? data.authorize_url : ''
  if (!authorizeUrl) {
    throw new Error('missing_authorize_url')
  }
  return authorizeUrl
}

export type ShortlistedProductInsert = {
  userId: string
  card: SourcingCard
  userPrice: number
  userCurrency: string
  sourceSearchId?: string | null
}

export async function insertShortlistedProduct(
  input: ShortlistedProductInsert,
): Promise<string> {
  const { userId, card, userPrice, userCurrency, sourceSearchId } = input

  const { data, error } = await supabase
    .from('shortlisted_products')
    .insert({
      user_id: userId,
      source_search_id: sourceSearchId || null,
      source: card.source,
      title: card.title,
      product_description: card.product_description,
      supplier_name: card.supplier_name || null,
      image_url: card.image_url,
      all_images: card.all_images ?? [],
      product_url: card.product_url,
      source_price_min: card.price_min,
      source_price_max: card.price_max,
      source_currency: card.currency_display,
      moq: card.moq,
      user_price: userPrice,
      user_currency: userCurrency,
    })
    .select('id')
    .single()

  if (error) throw error
  if (!data?.id) throw new Error('insert_failed')
  return data.id as string
}

export type ShopifyListProductResult = {
  success: true
  shopify_product_id: string
  shopify_status: string
}

export async function listProductOnShopify(
  shortlistedProductId: string,
): Promise<ShopifyListProductResult> {
  const headers = await authHeaders()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/shopify-list-product`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ shortlisted_product_id: shortlistedProductId }),
  })

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (res.status === 402) {
    throw edgeApiErrorFromPayload(res.status, data)
  }

  if (res.status === 409) {
    throw edgeApiErrorFromPayload(res.status, data, 'Already listed on your Shopify store')
  }

  if (res.status === 400) {
    throw edgeApiErrorFromPayload(res.status, data, 'Enter a valid listing price')
  }

  if (res.status === 404) {
    throw edgeApiErrorFromPayload(res.status, data, 'Product not found — try again')
  }

  if (res.status === 502) {
    throw edgeApiErrorFromPayload(
      res.status,
      data,
      "Couldn't reach Shopify, try again",
    )
  }

  if (!res.ok) {
    throw edgeApiErrorFromPayload(res.status, data, 'Could not add product to Shopify')
  }

  return {
    success: true,
    shopify_product_id: String(data.shopify_product_id ?? ''),
    shopify_status: String(data.shopify_status ?? 'listed_draft'),
  }
}

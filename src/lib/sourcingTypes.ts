export type SourcingSourceKey = 'indiamart' | 'alibaba' | 'made_in_china' | '1688'

export const SOURCE_ORDER: SourcingSourceKey[] = ['indiamart', 'alibaba', 'made_in_china', '1688']

export const SOURCE_META: Record<
  SourcingSourceKey,
  { label: string; badgeBg: string; badgeText: string; country: string }
> = {
  indiamart: {
    label: 'IndiaMart',
    badgeBg: 'hsl(28 100% 95%)',
    badgeText: 'hsl(28 80% 35%)',
    country: 'India',
  },
  alibaba: {
    label: 'Alibaba',
    badgeBg: 'hsl(38 100% 94%)',
    badgeText: 'hsl(38 85% 30%)',
    country: 'China',
  },
  made_in_china: {
    label: 'Made in China',
    badgeBg: 'hsl(0 85% 95%)',
    badgeText: 'hsl(0 70% 35%)',
    country: 'China',
  },
  '1688': {
    label: '1688',
    badgeBg: 'hsl(220 90% 95%)',
    badgeText: 'hsl(220 80% 35%)',
    country: 'China',
  },
}

export type SourcingQuantityPriceTier = {
  quantity: string
  price_usd: number
  price_cny: number
}

export type SourcingKeyValue = { key: string; value: string }

export interface SourcingCard {
  // Core
  source: SourcingSourceKey
  title: string
  supplier_name: string

  // Pricing — stored in USD internally
  price_min: number | null
  price_max: number | null
  price_unit: string | null
  currency_display: 'INR' | 'USD'
  currency_symbol: '₹' | '$'

  // Sourcing basics
  moq: string | null
  moq_type: string | null
  location: string | null

  // Images
  image_url: string | null
  image_thumb: string | null
  image_large: string | null
  all_images: string[]

  // URLs
  product_url: string
  company_url: string | null

  // Verification
  is_verified: boolean
  email_verified: boolean
  mobile_verified: boolean
  gst_verified: boolean

  // Company details (IndiaMart only, null for others)
  phone: string | null
  gst_number: string | null
  year_established: number | null
  member_since: string | null
  member_since_display: string | null
  company_alias: string | null
  city: string | null
  state: string | null
  district: string | null

  // Product details (IndiaMart only)
  product_description: string | null
  specifications: { key: string; value: string }[]
  category_names: string[]
  display_id: string | null

  // MIC only
  certifications: string[]
  /** Made-in-China productProperties (v14+). */
  product_properties?: SourcingKeyValue[]
  company_info?: SourcingKeyValue[]
  extra_info?: SourcingKeyValue[]

  // 1688-specific (null for other sources)
  quantity_prices: SourcingQuantityPriceTier[] | null
  composite_score: number | null
  goods_score: number | null
  logistics_score: number | null
  order_count: number | null
  repurchase_rate: string | null

  scraped_at: string
}

function normalizeQuantityPrices(raw: unknown): SourcingQuantityPriceTier[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null
  const tiers: SourcingQuantityPriceTier[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const quantity = typeof r.quantity === 'string' ? r.quantity : String(r.quantity ?? '')
    const price_usd = typeof r.price_usd === 'number' ? r.price_usd : Number(r.price_usd)
    const price_cny = typeof r.price_cny === 'number' ? r.price_cny : Number(r.price_cny)
    if (!quantity.trim()) continue
    if (!Number.isFinite(price_usd) || !Number.isFinite(price_cny)) continue
    tiers.push({ quantity, price_usd, price_cny })
  }
  return tiers.length ? tiers : null
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeKeyValueRows(raw: unknown): SourcingKeyValue[] {
  if (raw === null || raw === undefined) return []

  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const rows: SourcingKeyValue[] = []
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const k = String(key).trim()
      if (!k) continue
      const v =
        value === null || value === undefined
          ? ''
          : typeof value === 'string'
            ? value.trim()
            : String(value).trim()
      rows.push({ key: k, value: v })
    }
    return rows
  }

  if (!Array.isArray(raw) || raw.length === 0) return []
  const rows: SourcingKeyValue[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const key = String(r.key ?? '').trim()
    const value = String(r.value ?? '').trim()
    if (!key && !value) continue
    rows.push({ key: key || '—', value })
  }
  return rows
}

function micKeyValueFromRaw(raw: Partial<SourcingCard> & Record<string, unknown>): {
  product_properties: SourcingKeyValue[]
  company_info: SourcingKeyValue[]
  extra_info: SourcingKeyValue[]
} {
  return {
    product_properties: normalizeKeyValueRows(raw.product_properties ?? raw.productProperties),
    company_info: normalizeKeyValueRows(raw.company_info ?? raw.companyInfo),
    extra_info: normalizeKeyValueRows(raw.extra_info ?? raw.extraInfo ?? raw.others),
  }
}

/** Coerce API / cached rows into the full card shape (v6+ normalizer fields). */
export function normalizeSourcingCard(
  raw: Partial<SourcingCard> & { source: SourcingSourceKey } & Record<string, unknown>,
): SourcingCard {
  const imageUrl = raw.image_url ?? null
  const allImages = Array.isArray(raw.all_images)
    ? raw.all_images.filter((u): u is string => typeof u === 'string' && u.length > 0)
    : imageUrl
      ? [imageUrl]
      : []

  const micFields = micKeyValueFromRaw(raw)

  return {
    source: raw.source,
    title: String(raw.title ?? ''),
    supplier_name: String(raw.supplier_name ?? ''),
    price_min: raw.price_min ?? null,
    price_max: raw.price_max ?? null,
    price_unit: raw.price_unit ?? null,
    currency_display: raw.currency_display === 'INR' ? 'INR' : 'USD',
    currency_symbol: raw.currency_symbol === '₹' ? '₹' : '$',
    moq: raw.moq ?? null,
    moq_type: raw.moq_type ?? null,
    location: raw.location ?? null,
    image_url: imageUrl,
    image_thumb: raw.image_thumb ?? imageUrl,
    image_large: raw.image_large ?? imageUrl,
    all_images: allImages,
    product_url: String(raw.product_url ?? ''),
    company_url: raw.company_url ?? null,
    is_verified: Boolean(raw.is_verified),
    email_verified: Boolean(raw.email_verified),
    mobile_verified: Boolean(raw.mobile_verified),
    gst_verified: Boolean(raw.gst_verified),
    phone: raw.phone ?? null,
    gst_number: raw.gst_number ?? null,
    year_established:
      typeof raw.year_established === 'number' && Number.isFinite(raw.year_established)
        ? raw.year_established
        : null,
    member_since: raw.member_since ?? null,
    member_since_display: raw.member_since_display ?? null,
    company_alias: raw.company_alias ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    district: raw.district ?? null,
    product_description: raw.product_description ?? null,
    specifications: Array.isArray(raw.specifications)
      ? raw.specifications.filter(
          (s): s is { key: string; value: string } =>
            Boolean(s && typeof s === 'object' && 'key' in s && 'value' in s),
        )
      : [],
    category_names: Array.isArray(raw.category_names)
      ? raw.category_names.filter((c): c is string => typeof c === 'string')
      : [],
    display_id: raw.display_id ?? null,
    certifications: Array.isArray(raw.certifications)
      ? raw.certifications.filter((c): c is string => typeof c === 'string')
      : [],
    product_properties: micFields.product_properties.length ? micFields.product_properties : undefined,
    company_info: micFields.company_info.length ? micFields.company_info : undefined,
    extra_info: micFields.extra_info.length ? micFields.extra_info : undefined,
    quantity_prices: normalizeQuantityPrices(raw.quantity_prices),
    composite_score: numOrNull(raw.composite_score),
    goods_score: numOrNull(raw.goods_score),
    logistics_score: numOrNull(raw.logistics_score),
    order_count: numOrNull(raw.order_count),
    repurchase_rate:
      typeof raw.repurchase_rate === 'string' && raw.repurchase_rate.trim()
        ? raw.repurchase_rate.trim()
        : null,
    scraped_at: String(raw.scraped_at ?? new Date().toISOString()),
  }
}

export interface SourcingSourceResult {
  results: SourcingCard[]
  from_cache: boolean
  scraped_at: string
  error: string | null
}

/** Per-source progress while fan-out requests are in flight. */
export interface SourcingSourceProgress {
  results: SourcingCard[]
  loading: boolean
  error: string | null
  from_cache?: boolean
}

export type SourcingSourceResultsMap = Record<SourcingSourceKey, SourcingSourceProgress>

export function createIdleSourceResults(): SourcingSourceResultsMap {
  return Object.fromEntries(
    SOURCE_ORDER.map((key) => [key, { results: [], loading: false, error: null }]),
  ) as SourcingSourceResultsMap
}

export function createLoadingSourceResults(): SourcingSourceResultsMap {
  return Object.fromEntries(
    SOURCE_ORDER.map((key) => [key, { results: [], loading: true, error: null }]),
  ) as SourcingSourceResultsMap
}

export function buildSourcingResponse(
  meta: {
    keyword: string
    budget_max: number | null
    search_id: string
    from_cache: boolean
    credits_charged: number
  },
  sourceResults: SourcingSourceResultsMap,
): SourcingResponse {
  const sources = {} as Record<SourcingSourceKey, SourcingSourceResult>
  let total_results = 0

  for (const key of SOURCE_ORDER) {
    const s = sourceResults[key]
    sources[key] = {
      results: s.results,
      from_cache: s.from_cache ?? false,
      scraped_at: new Date().toISOString(),
      error: s.error,
    }
    total_results += s.results.length
  }

  return { ...meta, total_results, sources }
}

export interface SourcingResponse {
  keyword: string
  budget_max: number | null
  from_cache: boolean
  search_id: string
  credits_charged: number
  total_results: number
  sources: Record<SourcingSourceKey, SourcingSourceResult>
}

export interface SourcingHistoryRow {
  search_id: string
  user_id: string
  keyword: string
  budget_max: number | null
  searched_at: string
  total_results: number
  sources: string[]
  results_by_source: Record<string, SourcingCard[]>
  counts_by_source: Record<string, number>
}


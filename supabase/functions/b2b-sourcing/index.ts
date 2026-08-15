// b2b-sourcing v17
// SUBSCRIPTION MIGRATION: deduct_credits_custom replaced with deduct_feature_usage, bucket='sourcing'.
// This is the legacy monolithic sourcing search (superseded by b2b-sourcing-init + b2b-sourcing-source
// fan-out, but migrated rather than left charging real credits in case anything still calls it).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_PER_SOURCE = 40
const INR_TO_USD = 83.5
const CNY_TO_USD = 0.14

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SourceKey = 'indiamart' | 'alibaba' | 'made_in_china' | '1688'

interface QuantityPrice {
  quantity: string
  price_usd: number
  price_cny: number
}

interface NormalizedCard {
  source: SourceKey
  title: string
  supplier_name: string
  price_min: number | null
  price_max: number | null
  price_unit: string | null
  currency_display: 'INR' | 'USD'
  currency_symbol: '\u20b9' | '$'
  moq: string | null
  moq_type: string | null
  location: string | null
  image_url: string | null
  image_thumb: string | null
  image_large: string | null
  all_images: string[]
  product_url: string
  company_url: string | null
  is_verified: boolean
  email_verified: boolean
  mobile_verified: boolean
  gst_verified: boolean
  phone: string | null
  gst_number: string | null
  year_established: number | null
  member_since: string | null
  member_since_display: string | null
  company_alias: string | null
  city: string | null
  state: string | null
  district: string | null
  product_description: string | null
  specifications: { key: string; value: string }[]
  product_properties: { key: string; value: string }[]
  company_info: { key: string; value: string }[]
  extra_info: { key: string; value: string }[]
  category_names: string[]
  display_id: string | null
  certifications: string[]
  quantity_prices: QuantityPrice[] | null
  composite_score: number | null
  goods_score: number | null
  logistics_score: number | null
  order_count: number | null
  repurchase_rate: string | null
  scraped_at: string
}

async function pgRestInsert(supabaseUrl: string, serviceKey: string, table: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`pgRestInsert ${table} ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

async function runApify(apiToken: string, actorId: string, input: Record<string, unknown>, timeoutSecs = 120): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apiToken}&timeout=${timeoutSecs}&memory=256`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!res.ok) throw new Error(`Apify ${actorId} ${res.status}: ${(await res.text()).slice(0, 400)}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function parsePriceINR(raw: unknown): { min: number | null; max: number | null; unit: string | null } {
  if (raw == null) return { min: null, max: null, unit: null }
  const s = String(raw).trim()
  if (!s || /get latest|contact|n\/a|^0$/i.test(s)) return { min: null, max: null, unit: null }
  const num = parseFloat(s.replace(/,/g, ''))
  if (!isFinite(num) || num <= 0) return { min: null, max: null, unit: null }
  return { min: parseFloat((num / INR_TO_USD).toFixed(4)), max: parseFloat((num / INR_TO_USD).toFixed(4)), unit: 'piece' }
}

function parse1688Price(raw: unknown): { min: number | null; max: number | null; unit: string | null } {
  if (raw == null) return { min: null, max: null, unit: null }
  const s = String(raw).trim()
  const usdMatch = s.match(/\(\$([\d.]+)\)/)
  if (usdMatch) { const u = parseFloat(usdMatch[1]); if (isFinite(u) && u > 0) return { min: u, max: u, unit: 'piece' } }
  const cnyMatch = s.match(/^([\d.]+)/)
  if (cnyMatch) { const c = parseFloat(cnyMatch[1]); if (isFinite(c) && c > 0) return { min: parseFloat((c * CNY_TO_USD).toFixed(4)), max: parseFloat((c * CNY_TO_USD).toFixed(4)), unit: 'piece' } }
  return { min: null, max: null, unit: null }
}

function parsePriceString(raw: unknown, convertFromInr = false): { min: number | null; max: number | null; unit: string | null } {
  if (raw == null) return { min: null, max: null, unit: null }
  const s = String(raw).trim()
  if (!s || /get latest price|contact|n\/a/i.test(s)) return { min: null, max: null, unit: null }
  const unitMatch = s.match(/\/\s*([\w\s]+)$/i)
  const unit = unitMatch ? unitMatch[1].trim() : null
  const nums = s.match(/[\d,]+(?:\.\d+)?/g)
  if (!nums?.length) return { min: null, max: null, unit }
  const cleaned = nums.map(n => parseFloat(n.replace(/,/g, '')))
  let min = cleaned[0] ?? null; let max = cleaned[1] ?? cleaned[0] ?? null
  if (min !== null && max !== null && min > max) [min, max] = [max, min]
  if (convertFromInr && min !== null) min = parseFloat((min / INR_TO_USD).toFixed(4))
  if (convertFromInr && max !== null) max = parseFloat((max / INR_TO_USD).toFixed(4))
  return { min, max, unit }
}

function parseMoq(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === '0' || s.toLowerCase() === 'n/a') return null
  const n = Number(s)
  if (!isNaN(n) && n > 0) return `${n.toLocaleString()} units`
  return s.split('|')[0].trim().slice(0, 60) || null
}

function parseSpecifications(raw: unknown): { key: string; value: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.reduce<{ key: string; value: string }[]>((acc, s) => {
    const str = String(s); const idx = str.indexOf('==')
    if (idx > 0) acc.push({ key: str.slice(0, idx).trim(), value: str.slice(idx + 2).trim() })
    return acc
  }, [])
}

function flattenObject(obj: unknown, skipKeys: string[] = []): { key: string; value: string }[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.entries(obj as Record<string, unknown>)
    .filter(([k, v]) => !skipKeys.includes(k) && v != null && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'n/a')
    .map(([k, v]) => ({ key: k, value: String(v).trim().slice(0, 1000) }))
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '').trim()
}

function withinBudget(card: NormalizedCard, budgetMax: number | null): boolean {
  if (!budgetMax) return true
  if (card.price_min === null && card.price_max === null) return true
  return (card.price_min ?? card.price_max ?? 0) <= budgetMax
}

function extractEnglishFromTitle(title: string): string {
  const englishMatches = title.match(/[a-zA-Z][a-zA-Z0-9\s\-&'/.,()]{2,}/g) ?? []
  const english = englishMatches.join(' ').trim()
  const asciiRatio = title.replace(/[^\x00-\x7F]/g, '').length / title.length
  if (english.length >= 8 && asciiRatio >= 0.3) return english
  return ''
}

async function translateTitle(geminiKey: string, chineseTitle: string): Promise<string> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Translate this product title to English concisely (max 10 words, product name only, no explanation): ${chineseTitle}` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 60 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    })
    if (!res.ok) return chineseTitle
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? chineseTitle
  } catch { return chineseTitle }
}

function normalize1688QuantityPrices(raw: unknown): QuantityPrice[] {
  if (!Array.isArray(raw)) return []
  return raw.reduce<QuantityPrice[]>((acc, item) => {
    const r = item as Record<string, unknown>
    const cny = parseFloat(String(r.price ?? ''))
    const usdMatch = String(r.price_usd ?? '').match(/[\d.]+/)
    const usd = usdMatch ? parseFloat(usdMatch[0]) : isFinite(cny) ? parseFloat((cny * CNY_TO_USD).toFixed(4)) : 0
    const qty = String(r.quantity ?? '').trim()
    if (qty && usd > 0) acc.push({ quantity: qty, price_usd: usd, price_cny: isFinite(cny) ? cny : 0 })
    return acc
  }, [])
}

async function normalize1688(items: unknown[], budgetMax: number | null, geminiKey: string): Promise<NormalizedCard[]> {
  const now = new Date().toISOString()
  const raws = items as Record<string, unknown>[]
  const titleResults: string[] = []
  const translateQueue: { idx: number; title: string }[] = []
  for (let i = 0; i < raws.length; i++) {
    const rawTitle = String(raws[i].title ?? '').trim()
    const english = extractEnglishFromTitle(rawTitle)
    if (english) { titleResults[i] = english } else { titleResults[i] = rawTitle; translateQueue.push({ idx: i, title: rawTitle }) }
  }
  for (let i = 0; i < translateQueue.length; i += 8) {
    const batch = translateQueue.slice(i, i + 8)
    const translations = await Promise.all(batch.map(({ title }) => translateTitle(geminiKey, title)))
    batch.forEach(({ idx }, bi) => { titleResults[idx] = translations[bi] })
  }
  return raws.reduce<NormalizedCard[]>((acc, r, i) => {
    const title = titleResults[i]; if (!title) return acc
    const productUrl = String(r.detail_url ?? '').trim(); if (!productUrl) return acc
    const { min, max, unit } = parse1688Price(r.price)
    const qPrices = normalize1688QuantityPrices(r.quantity_prices)
    const effectiveMin = qPrices.length > 0 ? Math.min(...qPrices.map(q => q.price_usd)) : min
    const effectiveMax = qPrices.length > 0 ? Math.max(...qPrices.map(q => q.price_usd)) : max
    let moq: string | null = null
    if (qPrices.length > 0) { const m = qPrices[0].quantity.match(/^[\u2265]?(\d+)/); if (m) moq = `${parseInt(m[1]).toLocaleString()} units` }
    const province = String(r.province ?? '').trim(); const city = String(r.city ?? '').trim()
    const compositeScore = r.composite_score != null ? parseFloat(String(r.composite_score)) : null
    const card: NormalizedCard = {
      source: '1688', title, supplier_name: String(r.shop_name ?? '').trim(),
      price_min: effectiveMin, price_max: effectiveMax, price_unit: unit ?? 'piece',
      currency_display: 'USD', currency_symbol: '$', moq, moq_type: null,
      location: [city, province].filter(Boolean).join(', ') || null,
      image_url: String(r.image_url ?? '').trim() || null,
      image_thumb: String(r.image_url ?? '').trim() || null, image_large: null,
      all_images: r.image_url ? [String(r.image_url)] : [],
      product_url: productUrl, company_url: null,
      is_verified: compositeScore !== null && compositeScore >= 4.0,
      email_verified: false, mobile_verified: false, gst_verified: false,
      phone: null, gst_number: null, year_established: null,
      member_since: null, member_since_display: null,
      company_alias: String(r.member_id ?? '').trim() || null,
      city: city || null, state: province || null, district: null,
      product_description: null, specifications: [],
      product_properties: [], company_info: [], extra_info: [],
      category_names: [], display_id: r.offer_id ? String(r.offer_id) : null, certifications: [],
      quantity_prices: qPrices.length > 0 ? qPrices : null,
      composite_score: compositeScore,
      goods_score: r.goods_score != null ? parseFloat(String(r.goods_score)) : null,
      logistics_score: r.logistics_score != null ? parseFloat(String(r.logistics_score)) : null,
      order_count: r.order_count != null ? parseInt(String(r.order_count)) : null,
      repurchase_rate: String(r.repurchase_rate ?? '').trim() || null, scraped_at: now,
    }
    if (withinBudget(card, budgetMax)) acc.push(card)
    return acc
  }, [])
}

function normalizeIndiaMart(items: unknown[], _keyword: string, budgetMax: number | null): NormalizedCard[] {
  const now = new Date().toISOString()
  const AF_SKIP = ['titleUrl', 'catalogUrl', 'mainImage', 'largeImage', 'zoomedImage', 'photo1000', 'moqType', 'displayId']
  const CD_SKIP = ['gstNumber', 'yearEstablished', 'memberSince', 'memberSinceDisplay', 'companyAlias', 'city', 'state', 'district']
  return (items as Record<string, unknown>[]).reduce<NormalizedCard[]>((acc, r) => {
    const title = String(r.productName ?? '').trim(); if (!title) return acc
    const af = (r.additionalFields ?? {}) as Record<string, unknown>
    const cd = (r.companyDetails ?? {}) as Record<string, unknown>
    const ver = (r.verification ?? {}) as Record<string, unknown>
    const meta = (r.metadata ?? {}) as Record<string, unknown>
    const cat = (r.category ?? {}) as Record<string, unknown>
    const titleUrl = String(af.titleUrl ?? '').trim()
    const companyUrl = String(r.companyUrl ?? af.catalogUrl ?? '').trim() || null
    const productUrl = titleUrl || companyUrl || `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(title)}`
    const { min, max, unit } = parsePriceINR(r.price)
    const allImages = Array.isArray(r.images) ? (r.images as unknown[]).map(String).filter(s => s.startsWith('http')) : []
    const imageThumb = String(af.mainImage ?? '').trim() || allImages[0] || null
    const imageZoomed = String(af.zoomedImage ?? '').trim() || null
    const imageDisplay = String(af.largeImage ?? '').trim() || null
    const imageLarge = String(af.photo1000 ?? '').trim() || null
    const emailVerified = Boolean(ver.emailVerified)
    const mobileVerified = Boolean(ver.mobileVerified)
    const gstVerified = Boolean(ver.gstVerified)
    const phoneArr = Array.isArray(r.phone) ? r.phone : []
    const rawDesc = String(r.productDescription ?? '').trim()
    const product_description = rawDesc ? stripHtml(rawDesc).slice(0, 3000) : null
    const specifications = parseSpecifications(r.specifications)
    const product_properties = flattenObject(af, AF_SKIP)
    const company_info = flattenObject(cd, CD_SKIP)
    const VER_SKIP = ['emailVerified', 'mobileVerified', 'gstVerified']
    const extra_info = flattenObject(ver, VER_SKIP)
    const card: NormalizedCard = {
      source: 'indiamart', title,
      supplier_name: String(r.companyName ?? '').trim(),
      price_min: min, price_max: max, price_unit: unit,
      currency_display: 'INR', currency_symbol: '\u20b9',
      moq: parseMoq(r.moq), moq_type: String(af.moqType ?? '').trim() || null,
      location: String(r.location ?? '').trim() || null,
      image_url: imageZoomed ?? imageDisplay ?? imageThumb,
      image_thumb: imageThumb, image_large: imageLarge ?? imageZoomed, all_images: allImages,
      product_url: productUrl, company_url: companyUrl,
      is_verified: gstVerified || emailVerified || mobileVerified,
      email_verified: emailVerified, mobile_verified: mobileVerified, gst_verified: gstVerified,
      phone: phoneArr.length > 0 ? String(phoneArr[0]).trim() : null,
      gst_number: String(cd.gstNumber ?? '').trim() || null,
      year_established: cd.yearEstablished ? Number(cd.yearEstablished) : null,
      member_since: String(cd.memberSince ?? '').trim() || null,
      member_since_display: String(cd.memberSinceDisplay ?? '').trim() || null,
      company_alias: String(cd.companyAlias ?? '').trim() || null,
      city: String(cd.city ?? '').trim() || null, state: String(cd.state ?? '').trim() || null,
      district: String(cd.district ?? '').trim() || null, product_description, specifications,
      product_properties, company_info, extra_info,
      category_names: Array.isArray(cat.mainCategory) ? (cat.mainCategory as unknown[]).map(String) : [],
      display_id: String(meta.displayId ?? af.displayId ?? '').trim() || null, certifications: [],
      quantity_prices: null, composite_score: null, goods_score: null,
      logistics_score: null, order_count: null, repurchase_rate: null, scraped_at: now,
    }
    if (withinBudget(card, budgetMax)) acc.push(card)
    return acc
  }, [])
}

function normalizeAlibaba(items: unknown[], budgetMax: number | null): NormalizedCard[] {
  const now = new Date().toISOString()
  return (items as Record<string, unknown>[]).reduce<NormalizedCard[]>((acc, r) => {
    const title = String(r.name ?? r.productName ?? r.title ?? '').trim(); if (!title) return acc
    const productUrl = String(r.product_url ?? r.productUrl ?? r.url ?? '').trim(); if (!productUrl) return acc
    const price_min = r.price_min != null ? Number(r.price_min) : null
    const price_max = r.price_max != null ? Number(r.price_max) : null
    const mainImage = String(r.main_image ?? r.mainImage ?? r.imageUrl ?? r.image ?? r.thumbnail ?? '').trim() || null
    const allImagesRaw = r.images ?? r.image_list ?? r.imageGallery ?? []
    const allImages: string[] = Array.isArray(allImagesRaw) ? (allImagesRaw as unknown[]).map(String).filter(s => s.startsWith('http')) : []
    if (mainImage && !allImages.includes(mainImage)) allImages.unshift(mainImage)
    const companyUrl = String(r.company_url ?? r.companyUrl ?? r.supplier_url ?? '').trim() || null
    const attrRaw = r.attributes ?? r.product_attributes ?? r.properties ?? null
    const product_properties = flattenObject(attrRaw)
    const companyRaw = r.company ?? r.supplier ?? r.company_info ?? null
    const company_info = flattenObject(companyRaw)
    const card: NormalizedCard = {
      source: 'alibaba', title,
      supplier_name: String(r.company_name ?? r.companyName ?? r.supplierName ?? '').trim(),
      price_min: Number.isFinite(price_min) ? price_min : null,
      price_max: Number.isFinite(price_max) ? price_max : null,
      price_unit: 'piece', currency_display: 'USD', currency_symbol: '$',
      moq: parseMoq(r.moq), moq_type: null, location: null,
      image_url: mainImage, image_thumb: allImages[0] || mainImage, image_large: allImages[1] || null, all_images: allImages,
      product_url: productUrl, company_url: companyUrl,
      is_verified: Boolean(r.is_verified_supplier ?? r.is_trade_assurance ?? r.isVerified ?? r.trade_assurance ?? false),
      email_verified: false, mobile_verified: false, gst_verified: false,
      phone: null, gst_number: null, year_established: null,
      member_since: null, member_since_display: null, company_alias: null,
      city: null, state: null, district: null,
      product_description: String(r.description ?? r.product_description ?? '').trim() || null,
      specifications: [], product_properties, company_info, extra_info: [], category_names: [],
      display_id: String(r.product_id ?? r.productId ?? r.id ?? '').trim() || null, certifications: [],
      quantity_prices: null, composite_score: null, goods_score: null,
      logistics_score: null, order_count: null, repurchase_rate: null, scraped_at: now,
    }
    if (withinBudget(card, budgetMax)) acc.push(card)
    return acc
  }, [])
}

function normalizeMadeInChina(items: unknown[], budgetMax: number | null): NormalizedCard[] {
  const now = new Date().toISOString()
  const SKIP_PROP_KEYS = ['Q', 'A', 'Shipping Cost', 'Secure payments', 'Refund policy', 'After-sales Service', 'Warranty']
  return (items as Record<string, unknown>[]).reduce<NormalizedCard[]>((acc, r) => {
    const title = String(r.title ?? r.productName ?? r.name ?? '').trim(); if (!title) return acc
    const productUrl = String(r.productUrl ?? r.url ?? r.link ?? '').trim(); if (!productUrl) return acc
    const { min, max, unit } = parsePriceString(r.price ?? r.priceRange, false)
    const galleryRaw = r.imageGallery ?? r.image_gallery ?? r.images ?? []
    const allImages: string[] = Array.isArray(galleryRaw) ? (galleryRaw as unknown[]).map(String).filter(s => s.startsWith('http')) : []
    const primaryImage = String(r.imageUrl ?? r.mainImage ?? r.image ?? '').trim() || allImages[0] || null
    const companyUrl = String(r.supplierUrl ?? r.companyUrl ?? r.supplier_url ?? '').trim() || null
    const certsRaw = r.certifications ?? r.certification ?? []
    const certifications: string[] = Array.isArray(certsRaw)
      ? (certsRaw as unknown[]).map(String).filter(c => c.trim() && c.trim() !== 'N/A')
      : String(certsRaw).trim() && String(certsRaw).trim() !== 'N/A' ? [String(certsRaw).trim()] : []
    const product_properties = flattenObject(r.productProperties ?? r.product_properties ?? {}, SKIP_PROP_KEYS)
    const company_info = flattenObject(r.companyInfo ?? r.company_info ?? {})
    const extra_info = flattenObject(r.others ?? r.extra ?? r.additional ?? {})
    const rawDesc = String(r.description ?? r.productDescription ?? '').trim()
    const product_description = rawDesc ? stripHtml(rawDesc).slice(0, 3000) : null
    const locationStr = String(r.supplierLocation ?? r.location ?? r.city ?? '').trim()
    const locationParts = locationStr.split(',').map((s: string) => s.trim())
    const city = locationParts[0] || null; const state = locationParts[1] || null
    const yearRaw = (r.companyInfo as Record<string, unknown> | null)?.['Company Profile - Year of Establishment']
      ?? (r.companyInfo as Record<string, unknown> | null)?.['General Information - Year of Establishment']
    const yearEstablished = yearRaw ? parseInt(String(yearRaw).slice(0, 4)) || null : null
    const ratingRaw = (r.companyInfo as Record<string, unknown> | null)?.['Company Profile - Rating']
    const rating = ratingRaw ? parseFloat(String(ratingRaw)) : null
    const is_verified = certifications.length > 0 || (rating !== null && rating >= 4.5) || Boolean(r.isVerified ?? r.verified ?? false)
    const card: NormalizedCard = {
      source: 'made_in_china', title,
      supplier_name: String(r.supplierName ?? r.companyName ?? r.company ?? '').trim(),
      price_min: min, price_max: max, price_unit: unit,
      currency_display: 'USD', currency_symbol: '$',
      moq: parseMoq(r.moq), moq_type: null, location: locationStr || null,
      image_url: primaryImage, image_thumb: allImages[0] || primaryImage,
      image_large: allImages[1] || null, all_images: allImages,
      product_url: productUrl, company_url: companyUrl, is_verified,
      email_verified: false, mobile_verified: false, gst_verified: false,
      phone: null, gst_number: null, year_established: yearEstablished,
      member_since: null, member_since_display: null, company_alias: null,
      city, state, district: null, product_description,
      specifications: [], product_properties, company_info, extra_info,
      category_names: [], display_id: String(r.productId ?? r.display_id ?? '').trim() || null,
      certifications, quantity_prices: null, composite_score: null, goods_score: null,
      logistics_score: null, order_count: null, repurchase_rate: null, scraped_at: now,
    }
    if (withinBudget(card, budgetMax)) acc.push(card)
    return acc
  }, [])
}

function rankCards(cards: NormalizedCard[]): NormalizedCard[] {
  return [...cards].sort((a, b) => {
    const score = (c: NormalizedCard) => (c.is_verified ? 4 : 0) + (c.image_url ? 2 : 0) + (c.price_min !== null ? 1 : 0)
    return score(b) - score(a)
  })
}

async function scrapeIndiaMart(apiToken: string, kw: string, budgetMax: number | null): Promise<NormalizedCard[]> {
  const raw = await runApify(apiToken, 'codingfrontend~indiamart-search-scraper', { searchQueries: [kw], location: '', maxResultsPerQuery: 40, headless: true, proxyConfiguration: { useApifyProxy: true } })
  return normalizeIndiaMart(raw, kw, budgetMax)
}

async function scrapeAlibaba(apiToken: string, kw: string, budgetMax: number | null): Promise<NormalizedCard[]> {
  const input: Record<string, unknown> = { queries: [kw], max_pages: 1, start_page: 1 }
  if (budgetMax) { input.price_max = budgetMax; input.price_min = 1 }
  return normalizeAlibaba(await runApify(apiToken, 'devcake~alibaba-products-scraper', input), budgetMax)
}

async function scrapeMIC(apiToken: string, kw: string, budgetMax: number | null): Promise<NormalizedCard[]> {
  try {
    const raw = await runApify(apiToken, 'parseforge~made-in-china-scraper', { searchQuery: kw, maxItems: 40, minOrder: 1 }, 90)
    const cards = normalizeMadeInChina(raw, budgetMax)
    if (cards.length > 0) return cards
  } catch (e) { console.warn('[b2b-sourcing] MIC first attempt failed:', e) }
  try {
    return normalizeMadeInChina(await runApify(apiToken, 'parseforge~made-in-china-scraper', { searchQuery: kw, maxItems: 40, minOrder: 1 }, 90), budgetMax)
  } catch (e) { console.error('[b2b-sourcing] MIC retry failed:', e); return [] }
}

async function scrape1688(apiToken: string, kw: string, budgetMax: number | null, geminiKey: string): Promise<NormalizedCard[]> {
  const raw = await runApify(apiToken, 'songd~1688-search-scraper', { queries: [kw], sortType: 'va_rmdarkgmv30', proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] } }, 120)
  console.log(`[b2b-sourcing] 1688 raw: ${raw.length}`)
  return normalize1688(raw, budgetMax, geminiKey)
}

async function getCached(supabase: ReturnType<typeof createClient>, keyword: string, source: SourceKey): Promise<{ results: NormalizedCard[]; scraped_at: string; search_id: string } | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString()
  const { data } = await supabase.from('sourcing_results').select('results, scraped_at, search_id').eq('keyword', keyword.toLowerCase()).eq('source', source).gte('scraped_at', cutoff).order('scraped_at', { ascending: false }).limit(1).single()
  return data ? { results: data.results as NormalizedCard[], scraped_at: data.scraped_at, search_id: data.search_id } : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN')
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  if (!APIFY_TOKEN || !GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const body = await req.json()
    const { keyword, budget_max = null, force_refresh = false } = body
    if (!keyword?.trim()) return new Response(JSON.stringify({ error: 'keyword is required' }), { status: 400, headers: corsHeaders })
    const kw = String(keyword).trim()
    const budgetMax: number | null = budget_max ? Number(budget_max) : null
    const sources: SourceKey[] = ['indiamart', 'alibaba', 'made_in_china', '1688']
    const cacheChecks = force_refresh ? [null, null, null, null] : await Promise.all(sources.map(s => getCached(supabase, kw, s)))
    const cacheResults: Record<SourceKey, Awaited<ReturnType<typeof getCached>>> = {
      indiamart: cacheChecks[0], alibaba: cacheChecks[1], made_in_china: cacheChecks[2], '1688': cacheChecks[3],
    }
    const toScrape = sources.filter(s => !cacheResults[s])
    const allCached = toScrape.length === 0
    console.log(`[b2b-sourcing] v17 kw="${kw}" toScrape=${toScrape.join(',')} allCached=${allCached}`)
    if (!allCached) {
      const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', {
        p_user_id: user.id, p_bucket: 'sourcing', p_amount: 1,
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
          JSON.stringify({ error: `Monthly sourcing limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`, code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0 }),
          { status: 402, headers: corsHeaders },
        )
      }
    }
    const searchId = sources.reduce<string | null>((id, s) => id ?? cacheResults[s]?.search_id ?? null, null) ?? crypto.randomUUID()
    const scrapeResults: Record<SourceKey, NormalizedCard[]> = { indiamart: [], alibaba: [], made_in_china: [], '1688': [] }
    const scrapeErrors: Record<SourceKey, string | null> = { indiamart: null, alibaba: null, made_in_china: null, '1688': null }
    const scrapeJobs = toScrape.map(async (src) => {
      try {
        let cards: NormalizedCard[] = []
        if (src === 'indiamart') cards = await scrapeIndiaMart(APIFY_TOKEN, kw, budgetMax)
        else if (src === 'alibaba') cards = await scrapeAlibaba(APIFY_TOKEN, kw, budgetMax)
        else if (src === '1688') cards = await scrape1688(APIFY_TOKEN, kw, budgetMax, GEMINI_API_KEY)
        else cards = await scrapeMIC(APIFY_TOKEN, kw, budgetMax)
        const ranked = rankCards(cards).slice(0, MAX_PER_SOURCE)
        scrapeResults[src] = ranked
        console.log(`[b2b-sourcing] ${src} scraped ${cards.length} -> ranked ${ranked.length}`)
        await pgRestInsert(SUPABASE_URL, SUPABASE_SERVICE_KEY, 'sourcing_results', {
          search_id: searchId, user_id: user.id, keyword: kw.toLowerCase(),
          budget_max: budgetMax, source: src, results: ranked,
          raw_count: cards.length, returned_count: ranked.length,
        })
      } catch (e) {
        scrapeErrors[src] = String(e)
        console.error(`[b2b-sourcing] ${src} error:`, String(e))
        try {
          await pgRestInsert(SUPABASE_URL, SUPABASE_SERVICE_KEY, 'sourcing_results', {
            search_id: searchId, user_id: user.id, keyword: kw.toLowerCase(),
            budget_max: budgetMax, source: src, results: [], raw_count: 0, returned_count: 0,
          })
        } catch (e2) { console.error(`[b2b-sourcing] fallback insert failed ${src}:`, String(e2)) }
      }
    })
    await Promise.allSettled(scrapeJobs)
    const mk = (src: SourceKey) => ({
      results: cacheResults[src]?.results ?? scrapeResults[src],
      from_cache: !!cacheResults[src],
      scraped_at: cacheResults[src]?.scraped_at ?? new Date().toISOString(),
      error: scrapeErrors[src],
    })
    const final = { indiamart: mk('indiamart'), alibaba: mk('alibaba'), made_in_china: mk('made_in_china'), '1688': mk('1688') }
    const total = Object.values(final).reduce((n, s) => n + s.results.length, 0)
    return new Response(
      JSON.stringify({ keyword: kw, budget_max: budgetMax, from_cache: allCached, search_id: searchId, total_results: total, sources: final }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[b2b-sourcing] FATAL:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

// b2b-sourcing-source v4 — rate limited: 40/hour, 120/day
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const MAX_PER_SOURCE = 40
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const INR_TO_USD = 83.5
const CNY_TO_USD = 0.14
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
type SourceKey = 'indiamart' | 'alibaba' | 'made_in_china' | '1688'
interface QuantityPrice { quantity: string; price_usd: number; price_cny: number }
interface NormalizedCard {
  source: SourceKey; title: string; supplier_name: string
  price_min: number | null; price_max: number | null; price_unit: string | null
  currency_display: 'INR' | 'USD'; currency_symbol: '\u20b9' | '$'
  moq: string | null; moq_type: string | null; location: string | null
  image_url: string | null; image_thumb: string | null; image_large: string | null
  all_images: string[]; product_url: string; company_url: string | null
  is_verified: boolean; email_verified: boolean; mobile_verified: boolean; gst_verified: boolean
  phone: string | null; gst_number: string | null; year_established: number | null
  member_since: string | null; member_since_display: string | null; company_alias: string | null
  city: string | null; state: string | null; district: string | null
  product_description: string | null
  specifications: { key: string; value: string }[]
  product_properties: { key: string; value: string }[]
  company_info: { key: string; value: string }[]
  extra_info: { key: string; value: string }[]
  category_names: string[]; display_id: string | null; certifications: string[]
  quantity_prices: QuantityPrice[] | null
  composite_score: number | null; goods_score: number | null; logistics_score: number | null
  order_count: number | null; repurchase_rate: string | null; scraped_at: string
}

async function checkRateLimit(supabase: ReturnType<typeof createClient>, userId: string, fn: string, perHour: number, perDay: number): Promise<Response | null> {
  try {
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: fn, p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
    }
  } catch (e) { console.error('[bss] rate limit error:', e) }
  return null
}

async function pgRestInsert(url: string, key: string, table: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key, Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`pgRestInsert ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

async function runApify(token: string, actorId: string, input: Record<string, unknown>, timeoutSecs = 120): Promise<unknown[]> {
  const res = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}&memory=256`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input)
  })
  if (!res.ok) throw new Error(`Apify ${actorId} ${res.status}: ${(await res.text()).slice(0, 400)}`)
  const d = await res.json()
  return Array.isArray(d) ? d : []
}

function parsePriceINR(raw: unknown): { min: number | null; max: number | null; unit: string | null } {
  if (raw == null) return { min: null, max: null, unit: null }
  const s = String(raw).trim()
  if (!s || /get latest|contact|n\/a|^0$/i.test(s)) return { min: null, max: null, unit: null }
  const n = parseFloat(s.replace(/,/g, ''))
  if (!isFinite(n) || n <= 0) return { min: null, max: null, unit: null }
  return { min: parseFloat((n / INR_TO_USD).toFixed(4)), max: parseFloat((n / INR_TO_USD).toFixed(4)), unit: 'piece' }
}

function parseDevcake1688Price(raw: unknown): { min: number | null; max: number | null; cny: number | null } {
  if (raw == null) return { min: null, max: null, cny: null }
  const s = String(raw).trim()
  const usdMatch = s.match(/\(\$?([\d.]+)\)/)
  const usd = usdMatch ? parseFloat(usdMatch[1]) : null
  const cnyMatch = s.match(/^([\d.]+)/)
  const cny = cnyMatch ? parseFloat(cnyMatch[1]) : null
  const effectiveUsd = (usd && isFinite(usd) && usd > 0) ? usd : (cny && isFinite(cny) && cny > 0) ? parseFloat((cny * CNY_TO_USD).toFixed(4)) : null
  return { min: effectiveUsd, max: effectiveUsd, cny: cny && isFinite(cny) ? cny : null }
}

function parsePriceStr(raw: unknown): { min: number | null; max: number | null; unit: string | null } {
  if (raw == null) return { min: null, max: null, unit: null }
  const s = String(raw).trim()
  if (!s || /get latest|contact|n\/a/i.test(s)) return { min: null, max: null, unit: null }
  const unit = s.match(/\/\s*([\w\s]+)$/i)?.[1]?.trim() ?? null
  const nums = s.match(/[\d,]+(?:\.\d+)?/g)
  if (!nums?.length) return { min: null, max: null, unit }
  const [a, b] = nums.map(n => parseFloat(n.replace(/,/g, '')))
  let min = a ?? null; let max = b ?? a ?? null
  if (min !== null && max !== null && min > max) [min, max] = [max, min]
  return { min, max, unit }
}

function parseMoq(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === '0' || /^n\/a$/i.test(s)) return null
  const n = Number(s); if (!isNaN(n) && n > 0) return `${n.toLocaleString()} units`
  return s.split('|')[0].trim().slice(0, 60) || null
}

function parseSpecs(raw: unknown): { key: string; value: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.reduce<{ key: string; value: string }[]>((acc, s) => {
    const str = String(s); const i = str.indexOf('==')
    if (i > 0) acc.push({ key: str.slice(0, i).trim(), value: str.slice(i + 2).trim() })
    return acc
  }, [])
}

function flattenObj(obj: unknown, skip: string[] = []): { key: string; value: string }[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.entries(obj as Record<string, unknown>)
    .filter(([k, v]) => !skip.includes(k) && v != null && String(v).trim() !== '' && !/^n\/a$/i.test(String(v).trim()))
    .map(([k, v]) => ({ key: k, value: String(v).trim().slice(0, 1000) }))
}

function stripHtml(h: string): string { return h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '').trim() }
function withinBudget(c: NormalizedCard, max: number | null): boolean {
  if (!max) return true
  if (c.price_min === null && c.price_max === null) return true
  return (c.price_min ?? c.price_max ?? 0) <= max
}
function rankCards(cards: NormalizedCard[]): NormalizedCard[] {
  return [...cards].sort((a, b) => {
    const s = (c: NormalizedCard) => (c.is_verified ? 4 : 0) + (c.image_url ? 2 : 0) + (c.price_min !== null ? 1 : 0) + (c.order_count ? 1 : 0)
    return s(b) - s(a)
  })
}
function extractEnglish(title: string): string {
  const m = title.match(/[a-zA-Z][a-zA-Z0-9\s\-&'/.,()]{2,}/g) ?? []
  const e = m.join(' ').trim()
  const r = title.replace(/[^\x00-\x7F]/g, '').length / title.length
  return e.length >= 8 && r >= 0.3 ? e : ''
}
async function translateTitle(key: string, title: string): Promise<string> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Translate to English concisely (max 10 words, product name only): ${title}` }] }], generationConfig: { temperature: 0, maxOutputTokens: 60 }, safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }] }),
    })
    if (!res.ok) return title
    const d = await res.json()
    return d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? title
  } catch { return title }
}

function normalizeIndiaMart(items: unknown[], budgetMax: number | null): NormalizedCard[] {
  const now = new Date().toISOString()
  const AF_SKIP = ['titleUrl', 'catalogUrl', 'mainImage', 'largeImage', 'zoomedImage', 'photo1000', 'moqType', 'displayId']
  const CD_SKIP = ['gstNumber', 'yearEstablished', 'memberSince', 'memberSinceDisplay', 'companyAlias', 'city', 'state', 'district']
  const VER_SKIP = ['emailVerified', 'mobileVerified', 'gstVerified']
  return (items as Record<string, unknown>[]).reduce<NormalizedCard[]>((acc, r) => {
    const title = String(r.productName ?? '').trim(); if (!title) return acc
    const af = (r.additionalFields ?? {}) as Record<string, unknown>
    const cd = (r.companyDetails ?? {}) as Record<string, unknown>
    const ver = (r.verification ?? {}) as Record<string, unknown>
    const meta = (r.metadata ?? {}) as Record<string, unknown>
    const cat = (r.category ?? {}) as Record<string, unknown>
    const companyUrl = String(r.companyUrl ?? af.catalogUrl ?? '').trim() || null
    const productUrl = String(af.titleUrl ?? '').trim() || companyUrl || `https://www.indiamart.com/search.mp?ss=${encodeURIComponent(title)}`
    const { min, max, unit } = parsePriceINR(r.price)
    const allImages = Array.isArray(r.images) ? (r.images as unknown[]).map(String).filter(s => s.startsWith('http')) : []
    const ev = Boolean(ver.emailVerified); const mv = Boolean(ver.mobileVerified); const gv = Boolean(ver.gstVerified)
    const phones = Array.isArray(r.phone) ? r.phone : []
    const card: NormalizedCard = {
      source: 'indiamart', title, supplier_name: String(r.companyName ?? '').trim(),
      price_min: min, price_max: max, price_unit: unit, currency_display: 'INR', currency_symbol: '\u20b9',
      moq: parseMoq(r.moq), moq_type: String(af.moqType ?? '').trim() || null,
      location: String(r.location ?? '').trim() || null,
      image_url: String(af.zoomedImage ?? af.largeImage ?? af.mainImage ?? '').trim() || allImages[0] || null,
      image_thumb: String(af.mainImage ?? '').trim() || allImages[0] || null,
      image_large: String(af.photo1000 ?? af.zoomedImage ?? '').trim() || null,
      all_images: allImages, product_url: productUrl, company_url: companyUrl,
      is_verified: gv || ev || mv, email_verified: ev, mobile_verified: mv, gst_verified: gv,
      phone: phones.length > 0 ? String(phones[0]).trim() : null,
      gst_number: String(cd.gstNumber ?? '').trim() || null,
      year_established: cd.yearEstablished ? Number(cd.yearEstablished) : null,
      member_since: String(cd.memberSince ?? '').trim() || null,
      member_since_display: String(cd.memberSinceDisplay ?? '').trim() || null,
      company_alias: String(cd.companyAlias ?? '').trim() || null,
      city: String(cd.city ?? '').trim() || null, state: String(cd.state ?? '').trim() || null,
      district: String(cd.district ?? '').trim() || null,
      product_description: (() => { const d = String(r.productDescription ?? '').trim(); return d ? stripHtml(d).slice(0, 3000) : null })(),
      specifications: parseSpecs(r.specifications), product_properties: flattenObj(af, AF_SKIP),
      company_info: flattenObj(cd, CD_SKIP), extra_info: flattenObj(ver, VER_SKIP),
      category_names: Array.isArray(cat.mainCategory) ? (cat.mainCategory as unknown[]).map(String) : [],
      display_id: String(meta.displayId ?? af.displayId ?? '').trim() || null,
      certifications: [], quantity_prices: null, composite_score: null, goods_score: null,
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
    const pm = r.price_min != null ? Number(r.price_min) : null
    const px = r.price_max != null ? Number(r.price_max) : null
    const mainImg = String(r.main_image ?? r.mainImage ?? r.imageUrl ?? r.image ?? r.thumbnail ?? '').trim() || null
    const imgRaw = r.images ?? r.image_list ?? r.imageGallery ?? []
    const allImages: string[] = Array.isArray(imgRaw) ? (imgRaw as unknown[]).map(String).filter(s => s.startsWith('http')) : []
    if (mainImg && !allImages.includes(mainImg)) allImages.unshift(mainImg)
    const card: NormalizedCard = {
      source: 'alibaba', title, supplier_name: String(r.company_name ?? r.companyName ?? r.supplierName ?? '').trim(),
      price_min: Number.isFinite(pm) ? pm : null, price_max: Number.isFinite(px) ? px : null,
      price_unit: 'piece', currency_display: 'USD', currency_symbol: '$',
      moq: parseMoq(r.moq), moq_type: null, location: null,
      image_url: mainImg, image_thumb: allImages[0] || mainImg, image_large: allImages[1] || null,
      all_images: allImages, product_url: productUrl, company_url: String(r.company_url ?? r.companyUrl ?? '').trim() || null,
      is_verified: Boolean(r.is_verified_supplier ?? r.is_trade_assurance ?? r.isVerified ?? r.trade_assurance ?? false),
      email_verified: false, mobile_verified: false, gst_verified: false,
      phone: null, gst_number: null, year_established: null, member_since: null, member_since_display: null,
      company_alias: null, city: null, state: null, district: null,
      product_description: String(r.description ?? r.product_description ?? '').trim() || null,
      specifications: [], product_properties: flattenObj(r.attributes ?? r.product_attributes ?? r.properties ?? null),
      company_info: flattenObj(r.company ?? r.supplier ?? r.company_info ?? null), extra_info: [],
      category_names: [], display_id: String(r.product_id ?? r.productId ?? r.id ?? '').trim() || null,
      certifications: [], quantity_prices: null, composite_score: null, goods_score: null,
      logistics_score: null, order_count: null, repurchase_rate: null, scraped_at: now,
    }
    if (withinBudget(card, budgetMax)) acc.push(card)
    return acc
  }, [])
}

function normalizeMIC(items: unknown[], budgetMax: number | null): NormalizedCard[] {
  const now = new Date().toISOString()
  const SKIP = ['Q', 'A', 'Shipping Cost', 'Secure payments', 'Refund policy', 'After-sales Service', 'Warranty']
  return (items as Record<string, unknown>[]).reduce<NormalizedCard[]>((acc, r) => {
    const title = String(r.title ?? r.productName ?? r.name ?? '').trim(); if (!title) return acc
    const productUrl = String(r.productUrl ?? r.url ?? r.link ?? '').trim(); if (!productUrl) return acc
    const { min, max, unit } = parsePriceStr(r.price ?? r.priceRange)
    const gallery = r.imageGallery ?? r.image_gallery ?? r.images ?? []
    const allImages: string[] = Array.isArray(gallery) ? (gallery as unknown[]).map(String).filter(s => s.startsWith('http')) : []
    const primaryImg = String(r.imageUrl ?? r.mainImage ?? r.image ?? '').trim() || allImages[0] || null
    const certsRaw = r.certifications ?? r.certification ?? []
    const certs: string[] = Array.isArray(certsRaw) ? (certsRaw as unknown[]).map(String).filter(c => c.trim() && !/^n\/a$/i.test(c.trim())) : String(certsRaw).trim() && !/^n\/a$/i.test(String(certsRaw).trim()) ? [String(certsRaw).trim()] : []
    const ci = r.companyInfo as Record<string, unknown> | null
    const rating = ci?.['Company Profile - Rating'] ? parseFloat(String(ci['Company Profile - Rating'])) : null
    const yearRaw = ci?.['Company Profile - Year of Establishment'] ?? ci?.['General Information - Year of Establishment']
    const locationStr = String(r.supplierLocation ?? r.location ?? r.city ?? '').trim()
    const parts = locationStr.split(',').map((s: string) => s.trim())
    const card: NormalizedCard = {
      source: 'made_in_china', title, supplier_name: String(r.supplierName ?? r.companyName ?? r.company ?? '').trim(),
      price_min: min, price_max: max, price_unit: unit, currency_display: 'USD', currency_symbol: '$',
      moq: parseMoq(r.moq), moq_type: null, location: locationStr || null,
      image_url: primaryImg, image_thumb: allImages[0] || primaryImg, image_large: allImages[1] || null,
      all_images: allImages, product_url: productUrl, company_url: String(r.supplierUrl ?? r.companyUrl ?? '').trim() || null,
      is_verified: certs.length > 0 || (rating !== null && rating >= 4.5) || Boolean(r.isVerified ?? false),
      email_verified: false, mobile_verified: false, gst_verified: false,
      phone: null, gst_number: null, year_established: yearRaw ? parseInt(String(yearRaw).slice(0, 4)) || null : null,
      member_since: null, member_since_display: null, company_alias: null,
      city: parts[0] || null, state: parts[1] || null, district: null,
      product_description: (() => { const d = String(r.description ?? r.productDescription ?? '').trim(); return d ? stripHtml(d).slice(0, 3000) : null })(),
      specifications: [], product_properties: flattenObj(r.productProperties ?? r.product_properties ?? {}, SKIP),
      company_info: flattenObj(ci ?? {}), extra_info: flattenObj(r.others ?? r.extra ?? {}),
      category_names: [], display_id: String(r.productId ?? r.display_id ?? '').trim() || null,
      certifications: certs, quantity_prices: null, composite_score: null, goods_score: null,
      logistics_score: null, order_count: null, repurchase_rate: null, scraped_at: now,
    }
    if (withinBudget(card, budgetMax)) acc.push(card)
    return acc
  }, [])
}

async function normalize1688Devcake(items: unknown[], budgetMax: number | null, geminiKey: string): Promise<NormalizedCard[]> {
  const now = new Date().toISOString()
  const raws = items as Record<string, unknown>[]
  const titles: string[] = []; const queue: { idx: number; title: string }[] = []
  for (let i = 0; i < raws.length; i++) {
    const raw = String(raws[i].title ?? '').trim()
    if (!raw) { titles[i] = ''; continue }
    const eng = extractEnglish(raw)
    if (eng) { titles[i] = eng } else { titles[i] = raw; queue.push({ idx: i, title: raw }) }
  }
  for (let i = 0; i < queue.length; i += 8) {
    const batch = queue.slice(i, i + 8)
    const translated = await Promise.all(batch.map(({ title }) => translateTitle(geminiKey, title)))
    batch.forEach(({ idx }, bi) => { titles[idx] = translated[bi] })
  }
  return raws.reduce<NormalizedCard[]>((acc, r, i) => {
    const title = titles[i]; if (!title) return acc
    const productUrl = String(r.detail_url ?? '').trim(); if (!productUrl) return acc
    const { min: priceMin, max: priceMax } = parseDevcake1688Price(r.price)
    const qpRaw = r.quantity_prices
    const qp: QuantityPrice[] = Array.isArray(qpRaw) ? (qpRaw as Record<string, unknown>[]).reduce<QuantityPrice[]>((a, item) => {
      const qty = String(item.quantity ?? '').trim()
      const usdStr = String(item.price_usd ?? '').replace('$', '').trim()
      const cnyStr = String(item.price ?? '').trim()
      const usd = parseFloat(usdStr); const cny = parseFloat(cnyStr)
      if (qty && isFinite(usd) && usd > 0) a.push({ quantity: qty, price_usd: usd, price_cny: isFinite(cny) ? cny : 0 })
      return a
    }, []) : []
    const effMin = qp.length > 0 ? Math.min(...qp.map(q => q.price_usd)) : priceMin
    const effMax = qp.length > 0 ? Math.max(...qp.map(q => q.price_usd)) : priceMax
    let moq: string | null = null
    if (qp.length > 0) { const m = qp[0].quantity.match(/^[\u2265>=]?([\d]+)/); if (m) moq = `${parseInt(m[1]).toLocaleString()} units` }
    let repurchaseRate: string | null = String(r.repurchase_rate ?? '').trim() || null
    if (!repurchaseRate && Array.isArray(r.service_tags)) {
      const rateTag = (r.service_tags as string[]).find(t => t.includes('\u56de\u5934\u7387'))
      if (rateTag) { const m = rateTag.match(/([\d]+%)/); if (m) repurchaseRate = m[1] }
    }
    const badgeArr = Array.isArray(r.product_badges) ? (r.product_badges as string[]).filter(Boolean).map(b => ({ key: 'badge', value: b })) : []
    const serviceArr = Array.isArray(r.service_tags) ? (r.service_tags as string[]).filter(t => !t.includes('\u56de\u5934\u7387')).map(t => ({ key: 'service', value: t })) : []
    const province = String(r.province ?? '').trim(); const city = String(r.city ?? '').trim()
    const orderCount = r.order_count != null ? parseInt(String(r.order_count)) : null
    const card: NormalizedCard = {
      source: '1688', title, supplier_name: String(r.shop_name ?? '').trim(),
      price_min: effMin, price_max: effMax, price_unit: 'piece', currency_display: 'USD', currency_symbol: '$',
      moq, moq_type: null, location: [city, province].filter(Boolean).join(', ') || null,
      image_url: String(r.image_url ?? '').trim() || null, image_thumb: String(r.image_url ?? '').trim() || null,
      image_large: null, all_images: r.image_url ? [String(r.image_url)] : [],
      product_url: productUrl, company_url: null,
      is_verified: (orderCount !== null && orderCount > 10) || (repurchaseRate !== null && parseInt(repurchaseRate) >= 40),
      email_verified: false, mobile_verified: false, gst_verified: false,
      phone: null, gst_number: null, year_established: null, member_since: null, member_since_display: null,
      company_alias: null, city: city || null, state: province || null, district: null,
      product_description: null, specifications: [],
      product_properties: r.product_specs ? flattenObj(r.product_specs) : [],
      company_info: [], extra_info: [...badgeArr, ...serviceArr],
      category_names: [], display_id: null, certifications: [],
      quantity_prices: qp.length > 0 ? qp : null, composite_score: null, goods_score: null,
      logistics_score: null, order_count: (orderCount && isFinite(orderCount)) ? orderCount : null,
      repurchase_rate: repurchaseRate, scraped_at: now,
    }
    if (withinBudget(card, budgetMax)) acc.push(card)
    return acc
  }, [])
}

async function scrape(source: SourceKey, kw: string, budgetMax: number | null, apifyToken: string, geminiKey: string): Promise<NormalizedCard[]> {
  if (source === 'indiamart') return normalizeIndiaMart(await runApify(apifyToken, 'codingfrontend~indiamart-search-scraper', { searchQueries: [kw], location: '', maxResultsPerQuery: 40, headless: true, proxyConfiguration: { useApifyProxy: true } }), budgetMax)
  if (source === 'alibaba') { const input: Record<string, unknown> = { queries: [kw], max_pages: 1, start_page: 1 }; if (budgetMax) { input.price_max = budgetMax; input.price_min = 1 }; return normalizeAlibaba(await runApify(apifyToken, 'devcake~alibaba-products-scraper', input), budgetMax) }
  if (source === 'made_in_china') {
    try { const raw = await runApify(apifyToken, 'parseforge~made-in-china-scraper', { searchQuery: kw, maxItems: 40, minOrder: 1 }, 90); const cards = normalizeMIC(raw, budgetMax); if (cards.length > 0) return cards } catch (e) { console.warn('[bss] MIC attempt 1 failed:', e) }
    return normalizeMIC(await runApify(apifyToken, 'parseforge~made-in-china-scraper', { searchQuery: kw, maxItems: 40, minOrder: 1 }, 90), budgetMax)
  }
  if (source === '1688') { const raw = await runApify(apifyToken, 'devcake~1688-com-products-scraper', { queries: [kw], maxItems: 40 }, 130); return normalize1688Devcake(raw, budgetMax, geminiKey) }
  throw new Error(`Unknown source: ${source}`)
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
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = auth.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: ae } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (ae || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const limited = await checkRateLimit(supabase, user.id, 'b2b-sourcing-source', 40, 120)
    if (limited) return limited

    const body = await req.json()
    const { keyword, source, search_id, budget_max = null, force_refresh = false } = body
    if (!keyword?.trim()) return new Response(JSON.stringify({ error: 'keyword required' }), { status: 400, headers: corsHeaders })
    if (!['indiamart', 'alibaba', 'made_in_china', '1688'].includes(source)) return new Response(JSON.stringify({ error: 'invalid source' }), { status: 400, headers: corsHeaders })
    if (!search_id) return new Response(JSON.stringify({ error: 'search_id required' }), { status: 400, headers: corsHeaders })
    const kw = String(keyword).trim()
    const budgetMax: number | null = budget_max ? Number(budget_max) : null
    const src = source as SourceKey
    if (!force_refresh) {
      const cached = await getCached(supabase, kw, src)
      if (cached) return new Response(JSON.stringify({ source: src, results: cached.results, from_cache: true, scraped_at: cached.scraped_at, search_id: cached.search_id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log(`[bss] scraping: ${src} kw="${kw}"`)
    let cards: NormalizedCard[] = []; let scrapeError: string | null = null
    try { cards = await scrape(src, kw, budgetMax, APIFY_TOKEN!, GEMINI_API_KEY!) } catch (e) { scrapeError = String(e); console.error(`[bss] ${src} scrape error:`, scrapeError) }
    const ranked = rankCards(cards).slice(0, MAX_PER_SOURCE)
    try {
      await pgRestInsert(SUPABASE_URL, SUPABASE_SERVICE_KEY, 'sourcing_results', { search_id, user_id: user.id, keyword: kw.toLowerCase(), budget_max: budgetMax, source: src, results: ranked, raw_count: cards.length, returned_count: ranked.length })
    } catch (e) { console.error(`[bss] DB insert failed ${src}:`, String(e)) }
    return new Response(JSON.stringify({ source: src, results: ranked, from_cache: false, scraped_at: new Date().toISOString(), search_id, error: scrapeError }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[bss] FATAL:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

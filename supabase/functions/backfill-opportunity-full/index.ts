// backfill-opportunity-full v1
// Fills the 17 research-grade fields added to public.opportunities:
// fit_index, fit_verdict, pain_points, market_verdict, future_outlook,
// funding_options, risk_matrix, unit_economics_deep, tools_and_stack,
// setup_cost_derivation, profit_derivation, effort_scorecard, ease_score,
// saturation_level, research_style, style_addons, demand_trend, space_location
//
// Does NOT touch existing fields (title, short_desc, setup_min/max, etc).
// Modeled on backfill-market-insights' safe batch pattern.
// Derived-field math copied verbatim from research-opportunity v44 to avoid drift.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-backfill-secret, x-gemini-key'
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const DELAY_MS = 2000

const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

function strip(s) {
  return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function gemini(apiKey, prompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192, responseMimeType: 'application/json' },
          safetySettings: SAFETY
        })
      }
    )
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const d = await res.json()
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

function deriveSetupCost(breakdown) {
  const items = breakdown.map((i) => ({ label: String(i.label ?? ''), amount_usd: Number(i.amount_usd ?? 0) }))
  const subtotal = items.reduce((s, i) => s + i.amount_usd, 0)
  const optimistic = Math.round(subtotal * 0.85)
  const buffer = Math.round(subtotal * 1.2)
  const topItems = [...items].sort((a, b) => b.amount_usd - a.amount_usd).slice(0, 3).map((i) => i.label).join(', ')
  return {
    items, subtotal, optimistic, buffer,
    setup_min: optimistic, setup_max: buffer,
    note: `Summed from ${items.length} cost line-items (${topItems}${items.length > 3 ? ', more' : ''}). Range = subtotal x0.85 (optimistic) to x1.20 (with contingency buffer).`
  }
}

function deriveProfitMargin(calc, fp) {
  const rev = calc.revenue ?? {}
  const billing = String(calc.billing_model ?? 'per_unit_daily')
  const avg_bill = Number(rev.avg_bill ?? 0)
  const units_low = Number(rev.units_per_day_low ?? 0)
  const units_high = Number(rev.units_per_day_high ?? 0)
  const driver_label = String(rev.driver_label ?? 'units')
  const monthly = fp.monthly ?? {}
  const cogs_pct = Number(monthly.cogs_pct ?? 40)
  const opex = Number(monthly.opex ?? 0)
  const rev_low = billing === 'subscription_cumulative' ? avg_bill * units_low : avg_bill * units_low * 30
  const rev_high = billing === 'subscription_cumulative' ? avg_bill * units_high : avg_bill * units_high * 30
  const gross_factor = (100 - cogs_pct) / 100
  const gross_low = Math.round(rev_low * gross_factor)
  const gross_high = Math.round(rev_high * gross_factor)
  const profit_min = Math.round(gross_low - opex)
  const profit_max = Math.round(gross_high - opex)
  return {
    formula: 'Profit = Revenue x (1 - COGS%) - Fixed Opex',
    billing_model: billing, avg_bill, units_low, units_high, driver_label,
    rev_low, rev_high, cogs_pct, gross_low, gross_high, opex,
    monthly_profit_min: profit_min, monthly_profit_max: profit_max,
    note: `Revenue calc based on ${billing} model with ${cogs_pct}% COGS and $${opex} monthly opex, yielding $${profit_min}-$${profit_max} net profit.`
  }
}

function deriveEase(scorecard) {
  const weights = { capital_intensity: 0.25, skill_barrier: 0.2, regulatory_burden: 0.25, operational_complexity: 0.15, time_to_first_revenue: 0.15 }
  const clamp = (n) => Math.min(5, Math.max(1, Math.round(n)))
  const ci = clamp(scorecard.capital_intensity)
  const sb = clamp(scorecard.skill_barrier)
  const rb = clamp(scorecard.regulatory_burden)
  const oc = clamp(scorecard.operational_complexity)
  const tt = clamp(scorecard.time_to_first_revenue)
  const avg = ci * weights.capital_intensity + sb * weights.skill_barrier + rb * weights.regulatory_burden + oc * weights.operational_complexity + tt * weights.time_to_first_revenue
  const ease_score = Math.round((1 - (avg - 1) / 4) * 100)
  const ease = avg <= 2.2 ? 'Easy' : avg <= 3.6 ? 'Moderate' : 'Hard'
  return {
    ease, ease_score,
    effort_scorecard: {
      capital_intensity: ci, skill_barrier: sb, regulatory_burden: rb, operational_complexity: oc, time_to_first_revenue: tt,
      avg: Math.round(avg * 10) / 10, weights, notes: scorecard.notes ?? '',
      note: `${ease} (score ${ease_score}/100). Weighted avg effort = ${avg.toFixed(1)}/5.`
    }
  }
}

function computeFitIndex(sb) {
  if (!sb || typeof sb !== 'object') return null
  const p = Number(sb.profitability ?? 0), e = Number(sb.ease ?? 0), g = Number(sb.govt_support ?? 0), m = Number(sb.market_momentum ?? 0)
  if (p === 0 && e === 0 && g === 0 && m === 0) return null
  const scale = Math.max(p, e, g, m) > 10 ? 1 : 10
  return Math.min(100, Math.max(0, Math.round((m * scale) * 0.35 + (p * scale) * 0.3 + (e * scale) * 0.2 + (g * scale) * 0.15)))
}

function buildPrompt(opp) {
  const title = String(opp.title ?? '')
  const country = opp.source === 'india' ? 'India' : String(opp.country ?? 'India')
  const category = String(opp.category_slug ?? 'unknown')
  const shortDesc = String(opp.short_desc ?? '')
  const fullDesc = String(opp.full_desc ?? '').slice(0, 500)
  const setupMin = Number(opp.setup_min ?? 0)
  const setupMax = Number(opp.setup_max ?? 0)
  const revMin = Number(opp.monthly_rev_min ?? 0)
  const revMax = Number(opp.monthly_rev_max ?? 0)
  const isDigital = /\b(app|saas|platform|software|digital|online|website|ecommerce|marketplace|fintech|api|subscription|remote)\b/i.test(title + shortDesc)

  const spaceLocSchema = isDigital
    ? `"space_location": null,`
    : `"space_location": {"required": true, "type": "retail_front|warehouse|production_unit|shared_space|home_based|kiosk|cart|dark_store", "min_sqft": 0, "max_sqft": 0, "ideal_zone": "str", "rent_matrix": [{"tier": "Budget", "sqft": 0, "monthly_rent_usd": 0, "pros": "str", "cons": "str"}, {"tier": "Mid-range", "sqft": 0, "monthly_rent_usd": 0, "pros": "str", "cons": "str"}, {"tier": "Premium", "sqft": 0, "monthly_rent_usd": 0, "pros": "str", "cons": "str"}], "key_factors": ["str","str","str"], "red_flags": ["str","str"], "setup_tips": "str"},`

  return `You are PowerProof AI generating research-grade fields to complete an EXISTING opportunity catalog entry. Do NOT invent a new business, you are deepening the analysis of the one described below.

Business: "${title}"
Country: ${country}
Category: ${category}
Existing short description: ${shortDesc}
Existing full description: ${fullDesc}
Known setup cost range: $${setupMin}-$${setupMax} USD
Known monthly revenue range: $${revMin}-$${revMax} USD

Generate ONLY the following fields, consistent with the numbers above. Be specific to ${country}, honest not generic.

RULES:
- fit_verdict: 2 sentences on what makes this fit or not, and what a founder must do to improve it.
- pain_points: 3-5 real pains this business solves. severity=critical|high|medium|low.
- saturation_level: low=few competitors room to grow; medium=competitive but winnable; high=crowded needs differentiation; extreme=race to bottom.
- market_verdict: honest verdict on whether this matters RIGHT NOW in ${country}. urgency_score 0-100.
- future_outlook: honest 3-5 year view.
- funding_options: 4 types minimum (bootstrap, debt, equity, grant, or revenue_based), real named sources where possible for ${country}.
- risk_matrix: 5 risks minimum across operational/market/regulatory/financial/competitive.
- unit_economics_deep: whole USD integers, consistent with the known revenue range above.
- tools_and_stack: 5 tools minimum relevant to running this business.
- effort_scorecard: all scores 1 (very easy) to 5 (very hard): capital_intensity, skill_barrier, regulatory_burden, operational_complexity, time_to_first_revenue.
- setup_cost_breakdown_for_derivation: 5-8 granular USD line items summing to roughly the known setup cost range.
- calculator_config_for_derivation: billing_model (per_unit_daily|subscription_cumulative), revenue driver assumptions, and monthly cogs_pct/opex.
- demand_trend: EXACTLY 10 points: Jan 2024, Mar 2024, May 2024, Jul 2024, Sep 2024, Nov 2024, Jan 2025, Mar 2025, Jan 2026, Mar 2026. Index base 100 = Jan 2024.
- score_breakdown_for_fit: profitability, ease, govt_support, market_momentum, each 0-10.

Return ONLY valid compact JSON:
{
  "fit_verdict": "str",
  "pain_points": [{"pain":"str","severity":"critical|high|medium|low","current_workaround":"str","how_this_business_solves_it":"str","willingness_to_pay":"high|medium|low"}],
  "saturation_level": "low|medium|high|extreme",
  "market_verdict": {"verdict":"bullish|cautious|bearish","urgency_score":0,"timing_note":"str","why_now":["str","str","str"],"why_not_yet":["str"],"verdict_summary":"str"},
  "future_outlook": {"outlook":"bright|moderate|uncertain|declining","year3_potential":"str","year5_potential":"str","tailwinds":["str","str","str"],"headwinds":["str","str"],"disruption_risk":"low|medium|high","disruption_note":"str","megatrend_alignment":["str"],"future_verdict":"str"},
  "funding_options": {"summary":"str","options":[{"type":"bootstrap|debt|equity|grant|revenue_based","label":"str","source_name":"str","amount_range_usd_min":0,"amount_range_usd_max":0,"when_to_apply":"str","interest_or_dilution":"str","approval_timeline":"str","eligibility_bar":"low|medium|high","pros":["str"],"cons":["str"],"url":"https://real-url","best_for":"str"}]},
  "risk_matrix": {"overall_risk":"low|medium|high","risks":[{"category":"operational|market|regulatory|financial|competitive","risk":"str","description":"str","probability":"low|medium|high","impact":"low|medium|high","risk_score":"low|medium|high|critical","mitigation":"str","early_warning_sign":"str"}]},
  "unit_economics_deep": {"cac_by_channel":[{"channel":"str","cac_usd":0,"notes":"str"}],"avg_ltv_usd":0,"ltv_cac_ratio":0,"gross_margin_pct":0,"contribution_margin_usd":0,"break_even_units_per_month":0,"break_even_revenue_usd":0,"payback_period_months":0,"notes":"str"},
  "tools_and_stack": [{"category":"str","name":"str","purpose":"str","cost_usd_per_month":0,"free_tier_available":true,"priority":"must_have|nice_to_have","url":"https://tool-url","notes":"str"}],
  "effort_scorecard": {"capital_intensity":0,"skill_barrier":0,"regulatory_burden":0,"operational_complexity":0,"time_to_first_revenue":0,"notes":"str"},
  "setup_cost_breakdown_for_derivation": [{"label":"str","amount_usd":0,"notes":"str"}],
  "calculator_config_for_derivation": {"billing_model":"per_unit_daily|subscription_cumulative","revenue":{"avg_bill":0,"units_per_day_low":0,"units_per_day_high":0,"driver_label":"str"}},
  "financial_monthly_for_derivation": {"cogs_pct":0,"opex":0},
  "demand_trend": {"label":"str","unit":"Google Trends Index (base 100 = Jan 2024)","data":[{"period":"Jan 2024","value":100},{"period":"Mar 2024","value":0},{"period":"May 2024","value":0},{"period":"Jul 2024","value":0},{"period":"Sep 2024","value":0},{"period":"Nov 2024","value":0},{"period":"Jan 2025","value":0},{"period":"Mar 2025","value":0},{"period":"Jan 2026","value":0},{"period":"Mar 2026","value":0}],"trend_direction":"rising|falling|stable|seasonal","trend_note":"str","peak_period":"str","trough_period":"str"},
  ${spaceLocSchema}
  "score_breakdown_for_fit": {"profitability":0,"ease":0,"govt_support":0,"market_momentum":0}
}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = req.headers.get('x-backfill-secret')
  const EXPECTED = Deno.env.get('BACKFILL_SECRET') ?? 'powerproof-backfill-2026'
  if (secret !== EXPECTED) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
  }

  const PLATFORM_GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  }

  const byokKey = req.headers.get('x-gemini-key')?.trim() || null
  const geminiKey = byokKey ?? PLATFORM_GEMINI_KEY
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: 'No Gemini key available' }), { status: 500, headers: corsHeaders })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const body = await req.json().catch(() => ({}))
  const limit = Number(body.limit ?? 2)
  const offset = Number(body.offset ?? 0)
  const slugs = Array.isArray(body.slugs) ? body.slugs : null

  let query = db
    .from('opportunities')
    .select('id, slug, title, country, source, category_slug, short_desc, full_desc, setup_min, setup_max, monthly_rev_min, monthly_rev_max')
    .eq('status', 'live')
    .is('fit_index', null)
    .order('score', { ascending: false })

  if (slugs) {
    query = query.in('slug', slugs)
  } else {
    query = query.range(offset, offset + limit - 1)
  }

  const { data: rows, error: fetchErr } = await query
  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders })
  }

  const results = []
  console.log(`[backfill-opportunity-full] v1 processing ${rows?.length ?? 0} rows`)

  for (const row of (rows ?? [])) {
    const id = row.id
    const slug = row.slug
    const title = row.title
    try {
      const raw = await gemini(geminiKey, buildPrompt(row))
      const parsed = JSON.parse(strip(raw))

      let setupCostDerivation = { note: 'Fallback - no breakdown generated' }
      try {
        const rb = parsed.setup_cost_breakdown_for_derivation ?? []
        if (rb.length > 0) {
          const d = deriveSetupCost(rb)
          const { setup_min, setup_max, ...meta } = d
          setupCostDerivation = meta
        }
      } catch (e) {
        console.warn(`[backfill] deriveSetupCost failed for ${slug}:`, String(e))
      }

      let profitDerivation = { note: 'Fallback - no calculator config generated' }
      try {
        const cc = parsed.calculator_config_for_derivation ?? {}
        const fpm = parsed.financial_monthly_for_derivation ?? {}
        if (cc.revenue && fpm.cogs_pct !== undefined) {
          const d = deriveProfitMargin(cc, { monthly: fpm })
          const { monthly_profit_min, monthly_profit_max, ...meta } = d
          profitDerivation = meta
        }
      } catch (e) {
        console.warn(`[backfill] deriveProfitMargin failed for ${slug}:`, String(e))
      }

      let easeScore = 50
      let effortScorecard = { note: 'Fallback' }
      try {
        const sc = parsed.effort_scorecard
        if (sc && typeof sc.capital_intensity === 'number') {
          const d = deriveEase(sc)
          easeScore = d.ease_score
          effortScorecard = d.effort_scorecard
        }
      } catch (e) {
        console.warn(`[backfill] deriveEase failed for ${slug}:`, String(e))
      }

      let fitIndex = null
      try {
        fitIndex = computeFitIndex(parsed.score_breakdown_for_fit)
      } catch (e) {
        console.warn(`[backfill] computeFitIndex failed for ${slug}:`, String(e))
      }

      const satLevel = parsed.saturation_level ?? null

      const { error: updateErr } = await db
        .from('opportunities')
        .update({
          fit_index: fitIndex,
          fit_verdict: parsed.fit_verdict ?? null,
          pain_points: parsed.pain_points ?? null,
          market_verdict: parsed.market_verdict ?? null,
          future_outlook: parsed.future_outlook ?? null,
          funding_options: parsed.funding_options ?? null,
          risk_matrix: parsed.risk_matrix ?? null,
          unit_economics_deep: parsed.unit_economics_deep ?? null,
          tools_and_stack: parsed.tools_and_stack ?? null,
          setup_cost_derivation: setupCostDerivation,
          profit_derivation: profitDerivation,
          effort_scorecard: effortScorecard,
          ease_score: easeScore,
          saturation_level: satLevel,
          research_style: 'standard',
          style_addons: null,
          demand_trend: parsed.demand_trend ?? null,
          space_location: parsed.space_location ?? null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateErr) throw new Error(updateErr.message)
      console.log(`[backfill-opportunity-full] OK ${slug}`)
      results.push({ slug, title, status: 'ok' })
    } catch (e) {
      console.error(`[backfill-opportunity-full] FAIL ${slug}:`, e)
      results.push({ slug, title, status: 'error', error: String(e) })
    }
    await sleep(DELAY_MS)
  }

  return new Response(
    JSON.stringify({
      processed: rows?.length ?? 0,
      succeeded: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'error').length,
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

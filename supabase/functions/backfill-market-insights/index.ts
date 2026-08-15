// backfill-market-insights v2
// Processes rows in configurable batches to avoid 150s Supabase timeout
// Body params: { limit: number, offset: number } — defaults to all rows
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-backfill-secret, x-gemini-key'
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const DELAY_MS = 2000

const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

function strip(s: string): string {
  return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function gemini(apiKey: string, prompt: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
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
  } catch (e) { clearTimeout(timeout); throw e }
}

function buildBackfillPrompt(opp: Record<string, unknown>): string {
  const title = String(opp.title ?? '')
  const country = String(opp.country ?? 'India')
  const category = String(opp.category_slug ?? 'unknown')
  const shortDesc = String(opp.short_desc ?? '')
  const existingNote = opp.saturation_note ? `Existing saturation note: "${opp.saturation_note}"` : ''
  const swot = opp.market_intelligence
    ? `SWOT context: ${JSON.stringify((opp.market_intelligence as Record<string,unknown>).swot ?? {}).slice(0, 400)}`
    : ''
  return `You are PowerProof AI generating 4 market insight sections for an existing business research report.

Business: "${title}"
Country: ${country}
Category: ${category}
Description: ${shortDesc.slice(0, 300)}
${existingNote}
${swot}

Generate ONLY these 4 sections. Be specific to ${country} context. Be honest, not generic.

Rules:
- pain_points: 3-5 specific pains this business solves. severity=critical/high/medium/low. current_workaround=what people do today. willingness_to_pay=high/medium/low.
- saturation_level: low=few competitors room to grow; medium=competitive but winnable; high=crowded needs strong differentiation; extreme=race to bottom.
- market_verdict: honest verdict on whether this business matters RIGHT NOW in ${country}. verdict=bullish/cautious/bearish. urgency_score 0-100. why_now=3 reasons. why_not_yet=1-2 risks. verdict_summary=2-3 sentences.
- future_outlook: honest 3-5 year view. outlook=bright/moderate/uncertain/declining. megatrend_alignment=global/national trends. disruption_risk=low/medium/high. future_verdict=2-3 sentences.

Return ONLY valid JSON:
{
  "pain_points": [{"pain": "str", "severity": "critical|high|medium|low", "current_workaround": "str", "how_this_business_solves_it": "str", "willingness_to_pay": "high|medium|low"}],
  "saturation_level": "low|medium|high|extreme",
  "saturation_note": "str",
  "market_verdict": {"verdict": "bullish|cautious|bearish", "urgency_score": 0, "timing_note": "str", "why_now": ["str", "str", "str"], "why_not_yet": ["str"], "verdict_summary": "str"},
  "future_outlook": {"outlook": "bright|moderate|uncertain|declining", "year3_potential": "str", "year5_potential": "str", "tailwinds": ["str", "str", "str"], "headwinds": ["str", "str"], "disruption_risk": "low|medium|high", "disruption_note": "str", "megatrend_alignment": ["str"], "future_verdict": "str"}
}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = req.headers.get('x-backfill-secret')
  const EXPECTED = Deno.env.get('BACKFILL_SECRET') ?? 'powerproof-backfill-2026'
  if (secret !== EXPECTED)
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })

  const PLATFORM_GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  // Support BYOK via header
  const byokKey = req.headers.get('x-gemini-key')?.trim() || null
  const geminiKey = byokKey ?? PLATFORM_GEMINI_KEY
  if (!geminiKey)
    return new Response(JSON.stringify({ error: 'No Gemini key available' }), { status: 500, headers: corsHeaders })

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const body = await req.json().catch(() => ({}))
  const limit  = Number(body.limit  ?? 8)
  const offset = Number(body.offset ?? 0)

  // Fetch batch of complete rows missing pain_points
  const { data: rows, error: fetchErr } = await db
    .from('user_opportunities')
    .select('id, title, country, category_slug, short_desc, saturation_note, market_intelligence')
    .eq('research_status', 'complete')
    .is('pain_points', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (fetchErr)
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders })

  const results: Array<{ id: string; title: string; status: string; error?: string }> = []
  console.log(`[backfill] v2 processing ${rows?.length ?? 0} rows (offset=${offset} limit=${limit})`)

  for (const row of (rows ?? [])) {
    const id = row.id as string
    const title = row.title as string
    try {
      const raw = await gemini(geminiKey, buildBackfillPrompt(row as Record<string, unknown>))
      const parsed = JSON.parse(strip(raw))
      const satLevel = parsed.saturation_level as string | null

      const { error: updateErr } = await db
        .from('user_opportunities')
        .update({
          pain_points:      parsed.pain_points      ?? null,
          saturation_level: satLevel                ?? null,
          saturation_note:  parsed.saturation_note  ?? null,
          is_saturated:     satLevel === 'extreme' || satLevel === 'high',
          market_verdict:   parsed.market_verdict   ?? null,
          future_outlook:   parsed.future_outlook   ?? null,
          updated_at:       new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw new Error(updateErr.message)
      console.log(`[backfill] ✓ ${title}`)
      results.push({ id, title, status: 'ok' })
    } catch (e) {
      console.error(`[backfill] ✗ ${title}:`, e)
      results.push({ id, title, status: 'error', error: String(e) })
    }
    await sleep(DELAY_MS)
  }

  return new Response(
    JSON.stringify({
      processed: rows?.length ?? 0,
      succeeded: results.filter(r => r.status === 'ok').length,
      failed:    results.filter(r => r.status === 'error').length,
      results
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})

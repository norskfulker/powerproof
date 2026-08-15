// preview-research v2
// NEW: Option C vague query detection
// - Edge function: lightweight Gemini pre-check before full preview call
// - Returns { error: 'vague_query', message, suggestion } if query is too vague
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL    = 'gemini-2.5-flash-lite'
const GEMINI_TIMEOUT  = 30_000
const MAX_PER_HOUR    = 3

const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

function strip(s: string): string {
  return s.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
}

function getIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  const ip  = xff ? xff.split(',')[0].trim() : 'unknown'
  let h = 0
  for (let i = 0; i < ip.length; i++) { h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0 }
  return Math.abs(h).toString(36)
}

async function checkIpRateLimit(
  db: ReturnType<typeof createClient>,
  ipHash: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const windowStart = new Date()
    windowStart.setMinutes(0, 0, 0)
    const ws = windowStart.toISOString()
    const { data, error } = await db
      .from('preview_rate_limits')
      .select('call_count')
      .eq('ip_hash', ipHash)
      .eq('window_start', ws)
      .maybeSingle()
    if (error) return { allowed: true, remaining: MAX_PER_HOUR }
    const count = data?.call_count ?? 0
    if (count >= MAX_PER_HOUR) return { allowed: false, remaining: 0 }
    await db.from('preview_rate_limits').upsert(
      { ip_hash: ipHash, window_start: ws, call_count: count + 1 },
      { onConflict: 'ip_hash,window_start' }
    )
    return { allowed: true, remaining: MAX_PER_HOUR - (count + 1) }
  } catch {
    return { allowed: true, remaining: MAX_PER_HOUR }
  }
}

async function gemini(apiKey: string, prompt: string, maxTokens = 4096): Promise<string> {
  const ctrl = new AbortController()
  const t    = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
            responseMimeType: 'application/json'
          },
          safetySettings: SAFETY
        })
      }
    )
    clearTimeout(t)
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const d    = await res.json()
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } catch (e) { clearTimeout(t); throw e }
}

function buildVagueCheckPrompt(query: string): string {
  return `You are a query classifier for a business research platform.
A user typed this on the landing page: "${query}"

Decide if this query is specific enough to generate meaningful business research.

A query is CLEAR if it describes:
- A specific business idea, product, or service (even roughly)
- A career or skill direction
- A market or industry to enter
- A problem to solve with a business
- A strategic decision (expand, pivot, launch)

A query is VAGUE if it is:
- A single generic word with no context ("business", "money", "startup")
- Completely unrelated to business or building something ("hello", "what is ai", "who are you")
- Gibberish or random characters
- Too broad to mean anything specific ("I want to do something", "make money online", "be successful")
- A question about PowerProof itself rather than a business idea

IMPORTANT: Be generous. If there is ANY reasonable business interpretation, mark it as clear.
"food business" is CLEAR (food sector is specific enough).
"tech startup" is CLEAR (product_build persona, tech sector).
"I want to start something" is VAGUE (no domain, no sector, no direction).
"consulting" is CLEAR (professional services business).
"asjdkajsd" is VAGUE (gibberish).

Return ONLY valid JSON:
{
  "clear": true | false,
  "reason": "One sentence explaining why it is vague (only if clear=false)",
  "suggestion": "One specific example of how they could rephrase this to be clearer (only if clear=false)"
}`
}

function buildPreviewPrompt(query: string, country: string): string {
  return `You are PowerProof AI — a ruthlessly specific business research engine.
A user on the landing page typed: "${query}"
Country context: ${country}

Generate a QUICK PREVIEW — a taste of what a full PowerProof research report looks like.
Be specific, direct, and impressive. No generic filler. Real numbers, real names, real insight.

Return ONLY valid JSON with this exact shape:
{
  "title": "Punchy 5-8 word business title for this idea",
  "tagline": "One sentence that captures the opportunity or challenge honestly",
  "persona": "student|employee|entrepreneur|smb_owner|ceo_executive|government",
  "market_snapshot": "2-3 sentences: market size with a real number, who the customer is, and one surprising insight about this market in ${country}",
  "opportunity_score": <integer 0-100>,
  "saturation_verdict": "Saturated|Competitive but Viable|Blue Ocean",
  "saturation_reason": "One honest sentence about why. Name actual players if they exist.",
  "revenue_hint": "Specific monthly revenue range e.g. ₹80K–2.5L/month at steady state",
  "top_competitors": ["Name 1", "Name 2", "Name 3"],
  "one_big_risk": "The single most likely reason this fails. Be specific.",
  "one_big_opportunity": "The single best angle to win in this market right now. Be specific.",
  "roadmap_preview": {
    "total_weeks": <integer>,
    "phases": [
      { "title": "Phase name", "tagline": "What changes by end of this phase", "weeks": "Week 1-4" },
      { "title": "Phase name", "tagline": "What changes by end of this phase", "weeks": "Week 5-10" },
      { "title": "Phase name", "tagline": "What changes by end of this phase", "weeks": "Week 11-20" }
    ],
    "first_milestone": {
      "title": "First milestone title — specific and binary",
      "tasks": [
        "Exact task 1 with tool/platform named",
        "Exact task 2 with measurable output"
      ]
    }
  }
}

Rules:
- ALL numbers must be specific to ${country} (use ₹ for India)
- top_competitors must be real company/brand names, not generic descriptions
- one_big_risk and one_big_opportunity must be things a generic AI would NOT say
- roadmap phases must be named evocatively, not "Phase 1"
- Keep everything tight — this is a preview, not the full report`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: cors })

  const GEMINI_KEY       = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!GEMINI_KEY || !SUPABASE_URL || !SUPABASE_SVC_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: cors })

  const db = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

  try {
    // IP rate limit
    const ipHash = getIp(req)
    const { allowed, remaining } = await checkIpRateLimit(db, ipHash)
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'rate_limited',
          message: "You've used your 3 free previews this hour. Sign up for unlimited research.",
          code: 'preview_limit_reached'
        }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const body    = await req.json()
    const query   = String(body.query ?? '').trim()
    const country = String(body.country ?? 'India').trim()

    if (!query || query.length < 5)
      return new Response(
        JSON.stringify({
          error: 'vague_query',
          message: "That's a bit too short — what exactly are you building or exploring?",
          suggestion: 'Try something like "tiffin delivery for IT offices in Pune" or "freelance design studio"'
        }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } }
      )

    if (query.length > 300)
      return new Response(
        JSON.stringify({ error: 'query_too_long', message: 'Keep it under 300 characters — one clear idea is enough.' }),
        { status: 400, headers: cors }
      )

    // --- Vague check (lightweight Gemini pre-call) ---
    const vagueRaw    = await gemini(GEMINI_KEY, buildVagueCheckPrompt(query), 256)
    const vagueResult = JSON.parse(strip(vagueRaw))

    if (vagueResult.clear === false) {
      return new Response(
        JSON.stringify({
          error:      'vague_query',
          message:    `We couldn't quite understand what you're building. ${vagueResult.reason ?? ''}`.trim(),
          suggestion: vagueResult.suggestion ?? null,
          code:       'vague_query'
        }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    // --- Full preview call ---
    const raw    = await gemini(GEMINI_KEY, buildPreviewPrompt(query, country), 4096)
    const parsed = JSON.parse(strip(raw))

    // Save to preview_sessions
    const { data: session, error: sessionErr } = await db
      .from('preview_sessions')
      .insert({ query, country, preview_data: parsed })
      .select('session_token')
      .single()

    if (sessionErr || !session) {
      console.error('[preview] session save error:', sessionErr)
      return new Response(
        JSON.stringify({ preview: parsed, session_token: null, remaining }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ preview: parsed, session_token: session.session_token, remaining }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[preview] error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: cors }
    )
  }
})

// playbook-questions v24
// REWRITE: Operator-mode intel gathering. Two grounded passes:
//   Pass 1 — market/competitor surface (fast)
//   Pass 2 — operational ground truth: real timelines, failure modes, cost realities, hidden gatekeepers
// Output feeds generate-playbook v27 with rich contextual intel, not analyst summaries
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key'
}

const RESEARCH_MODEL = 'gemini-2.5-flash'
const EXTRACT_MODEL = 'gemini-2.5-flash-lite'
const MAX_RETRIES = 2
const RETRY_DELAYS = [3000, 8000]

async function checkRateLimit(supabase, userId, isByok) {
  try {
    const perHour = isByok ? 60 : 30
    const perDay = isByok ? 300 : 150
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId,
      p_function_name: 'playbook-questions',
      p_calls_per_hour: perHour,
      p_calls_per_day: perDay
    })
    if (rl && !rl.allowed) return new Response(JSON.stringify({
      error: rl.reason === 'hourly_limit_exceeded'
        ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
        : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
      code: rl.reason, resets_at: rl.resets_at
    }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[pq] rate limit error:', e) }
  return null
}

function stripFence(t) {
  const f = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t.trim())
  if (f?.[1]) return f[1].trim()
  return t.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}
function repairJson(s) { return s.replace(/,\s*([}\]])/g, '$1').replace(/\r\n/g, '\n') }
function extractSlice(s, o) {
  const c = o === '[' ? ']' : '}'
  const a = s.indexOf(o); const b = s.lastIndexOf(c)
  if (a < 0 || b <= a) return null
  return s.slice(a, b + 1)
}
function parseObject(text) {
  const base = stripFence(text)
  for (const c of [base, repairJson(base), extractSlice(text, '{') ?? '', extractSlice(base, '{') ?? ''].filter(Boolean)) {
    try { const p = JSON.parse(repairJson(c)); if (p && typeof p === 'object' && !Array.isArray(p)) return p } catch { }
  }
  throw new Error('JSON parse failed')
}
function sseEncode(o) { return new TextEncoder().encode(`data: ${JSON.stringify(o)}\n\n`) }
function slugify(t) { return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 60) }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function geminiPlain(apiKey, prompt, model, maxTokens = 512) {
  let e = new Error('failed')
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1])
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      })
      if (r.status === 503 || r.status === 429) { e = new Error(`${model} ${r.status}`); continue }
      if (!r.ok) throw new Error(`${model} ${r.status}`)
      const d = await r.json()
      const t = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (!t) { e = new Error('empty'); continue }
      return t
    } catch (err) { e = err instanceof Error ? err : new Error(String(err)) }
  }
  throw e
}

async function geminiGrounded(apiKey, prompt, maxTokens = 6000) {
  let e = new Error('grounded failed')
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1])
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${RESEARCH_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      })
      if (r.status === 503 || r.status === 429) { e = new Error(`grounded ${r.status}`); continue }
      if (!r.ok) throw new Error(`grounded ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const d = await r.json()
      let t = ''
      for (const ca of d.candidates ?? []) for (const p of ca?.content?.parts ?? []) if (p.text) t += p.text
      if (!t) { e = new Error('empty grounded'); continue }
      console.log(`[pq] grounded len=${t.length}`)
      return t
    } catch (err) { e = err instanceof Error ? err : new Error(String(err)) }
  }
  throw e
}

async function run(opts) {
  const { geminiKey, emit, country, model, isByok } = opts
  const desc = opts.business_description.trim()
  if (!desc) throw Object.assign(new Error('Describe your business to enter the War Room.'), { code: 'no_input', status: 400 })

  emit?.({ type: 'status', message: 'Understanding your business…', phase: 'extract' })

  const extractPrompt = `Extract structured info from this business description: "${desc}"
Country context: ${country}
Return ONLY valid JSON (null for anything not mentioned):
{
  "business_type": "2-4 word category noun (e.g. NPA acquisition, cloud kitchen, edtech platform)",
  "operational_status": "idea|planning|registered|operational|scaling",
  "city": "city or null",
  "state": "state or null",
  "capital_available": "extract any capital/funding amount mentioned, e.g. INR 1 Crore, or null",
  "team_size": "extract team size if mentioned, e.g. solo, 3 people, or null",
  "primary_goal": "one sentence — what outcome does the founder want in 12 months",
  "main_constraint": "one sentence — biggest stated constraint (money, time, regulation, competition)",
  "main_threat": "one sentence — biggest competitor or risk mentioned"
}`

  let ctx = {}
  try {
    ctx = parseObject(await geminiPlain(geminiKey, extractPrompt, EXTRACT_MODEL, 700))
    console.log(`[pq] extracted type=${ctx.business_type} stage=${ctx.operational_status}`)
  } catch (e) {
    console.warn('[pq] extract failed:', String(e))
    ctx = { business_type: 'business', operational_status: 'idea' }
  }

  const businessType = ctx.business_type ?? 'your business'
  const location = [ctx.city, ctx.state, country].filter(Boolean).join(', ')
  const stage = ctx.operational_status ?? 'unknown'
  const capitalAvailable = ctx.capital_available ?? null
  const teamSize = ctx.team_size ?? null

  emit?.({ type: 'status', message: 'Scanning the competitive landscape…', phase: 'research' })

  const marketResearchPrompt = `You are a seasoned operator and investor who has built businesses in ${country}, specifically in ${location || country}. 
You have real skin-in-the-game experience, not textbook knowledge.

A founder tells you: "${desc}"
Business: ${businessType} | Location: ${location} | Stage: ${stage}${capitalAvailable ? ` | Capital: ${capitalAvailable}` : ''}${teamSize ? ` | Team: ${teamSize}` : ''}

Search Google RIGHT NOW and give me the ground truth on this market in ${country}. I need:
1. The 3-5 real named players dominating this space in ${country} — with what actually makes them hard to beat AND their real vulnerabilities (not generic "they're big" stuff — their specific operational blind spots)
2. The real market size with a source and date
3. The specific gap that exists RIGHT NOW that a lean new entrant with limited capital could exploit — not a gap in theory, a gap you can see in the market today
4. Any major move, regulatory change, or market event in this space in the last 6 months in ${country}
5. The single most asymmetric advantage available to a scrappy new entrant — something the incumbents literally cannot copy because of their size or structure

Respond in plain text. Be specific. Name real companies, real numbers, real regulatory bodies. No fluff.`

  let marketRaw = ''
  try {
    marketRaw = await geminiGrounded(geminiKey, marketResearchPrompt, 5000)
    console.log(`[pq] market research len=${marketRaw.length}`)
  } catch (e) {
    console.warn('[pq] market research failed:', String(e))
    marketRaw = 'Market research unavailable.'
  }

  emit?.({ type: 'status', message: 'Digging into operational realities…', phase: 'ground_truth' })

  const groundTruthPrompt = `You are an operator who has done exactly this: ${businessType} in ${location || country}.
Not advised someone on it. Actually done it.

The founder: "${desc}"
Stage: ${stage}${capitalAvailable ? ` | Capital available: ${capitalAvailable}` : ''}

Search Google for the real operational picture of starting ${businessType} in ${country}. I need the unvarnished truth:

1. REGULATORY REALITY: What licenses/registrations are actually required? What's the real timeline (not what the government website says — what actually happens)? What are the common blockers no one tells you about?

2. COST REALITY: What does it actually cost to get to first rupee of revenue in this business? Break it down honestly. What costs surprise people?

3. CUSTOMER ACQUISITION REALITY: How do you actually get your first 10 customers in this space in ${country}? What channels work, which ones waste money?

4. COMMON FAILURE MODES: What are the top 3 reasons businesses like this fail in ${country} in the first 12 months? Be specific — not generic "poor management."

5. HIDDEN GATEKEEPERS: Who are the people or institutions that can make or break this business that a newcomer wouldn't know about?

6. WHAT'S ACTUALLY WORKING RIGHT NOW: What tactics or approaches are founders in this space using today in ${country} that are producing results?

Respond in plain text. Be honest. Be specific. If you don't know something, say so — don't fabricate.`

  let groundTruthRaw = ''
  try {
    groundTruthRaw = await geminiGrounded(geminiKey, groundTruthPrompt, 5000)
    console.log(`[pq] ground truth len=${groundTruthRaw.length}`)
  } catch (e) {
    console.warn('[pq] ground truth failed:', String(e))
    groundTruthRaw = 'Operational ground truth unavailable.'
  }

  emit?.({ type: 'status', message: 'Synthesizing battlefield intelligence…', phase: 'synthesize' })

  const synthesizePrompt = `You have two research documents about ${businessType} in ${location || country}. Synthesize them into a structured JSON intel package.

MARKET RESEARCH:
${marketRaw}

OPERATIONAL GROUND TRUTH:
${groundTruthRaw}

Return ONLY valid JSON:
{
  "competitors": [{"name": "real company name", "strength": "what makes them actually dangerous", "weakness": "their specific operational blind spot a lean entrant can exploit"}],
  "market_size": "specific number with source and year",
  "market_gap": "the specific gap RIGHT NOW in 2 sentences — what's not being served and why",
  "recent_threats": "any major move or regulatory change in last 6 months, 1-2 sentences",
  "asymmetric_advantage": "the one thing a lean entrant can do that incumbents literally cannot — 2 sentences",
  "stage_assessment": "idea|early|growth|scaling",
  "battlefield_summary": "3 sentences. Honest. What this market is really like to compete in right now.",
  "regulatory_reality": "what licenses are needed and what the actual timeline looks like — not the official version",
  "cost_to_first_revenue": "realistic cost breakdown to get to first paying customer",
  "customer_acquisition_reality": "how you actually get first 10 customers in this space in ${country}",
  "top_failure_modes": ["specific failure mode 1", "specific failure mode 2", "specific failure mode 3"],
  "hidden_gatekeepers": "who are the people or institutions that can make or break this, 1-2 sentences",
  "whats_working_now": "what tactics are actually working for founders in this space right now in ${country}, 2-3 sentences"
}`

  let intel = {}
  try {
    intel = parseObject(await geminiPlain(geminiKey, synthesizePrompt, RESEARCH_MODEL, 4000))
    console.log(`[pq] intel keys=${Object.keys(intel).join(',')}`)
    if (!intel.competitors && !intel.market_gap) throw new Error('empty intel')
  } catch (e) {
    console.warn('[pq] synthesis failed:', String(e))
    intel = {
      competitors: [],
      market_gap: marketRaw.slice(0, 300) || 'Could not auto-research.',
      battlefield_summary: 'Intel gathering partially failed — proceeding with available data.',
      top_failure_modes: [],
      whats_working_now: groundTruthRaw.slice(0, 200) || ''
    }
  }

  emit?.({ type: 'status', message: 'Assembling your war briefing…', phase: 'briefing' })

  const briefing = {
    business_type: businessType,
    location,
    country,
    stage: intel.stage_assessment ?? stage,
    capital_available: capitalAvailable,
    team_size: teamSize,
    competitors: intel.competitors ?? [],
    market_size: intel.market_size ?? null,
    market_gap: intel.market_gap ?? null,
    recent_threats: intel.recent_threats ?? null,
    asymmetric_advantage: intel.asymmetric_advantage ?? null,
    battlefield_summary: intel.battlefield_summary ?? null,
    regulatory_reality: intel.regulatory_reality ?? null,
    cost_to_first_revenue: intel.cost_to_first_revenue ?? null,
    customer_acquisition_reality: intel.customer_acquisition_reality ?? null,
    top_failure_modes: intel.top_failure_modes ?? [],
    hidden_gatekeepers: intel.hidden_gatekeepers ?? null,
    whats_working_now: intel.whats_working_now ?? null,
    primary_goal: ctx.primary_goal ?? null,
    main_constraint: ctx.main_constraint ?? null,
    main_threat: ctx.main_threat ?? null
  }

  return {
    mode: 'briefing',
    briefing,
    country,
    model,
    byok: isByok,
    inferred_context: {
      business_type: businessType,
      location,
      country,
      stage: intel.stage_assessment ?? stage,
      capital_available: capitalAvailable,
      team_size: teamSize,
      intel
    },
    extracted_context: {
      name: desc.slice(0, 60),
      business_type: ctx.business_type ?? null,
      category: ctx.business_type ?? null,
      city: ctx.city ?? null,
      state: ctx.state ?? null,
      country,
      description: desc,
      operational_status: ctx.operational_status ?? null,
      capital_available: capitalAvailable,
      team_size: teamSize,
      slug: slugify(ctx.business_type ?? desc) + '-' + Date.now().toString(36)
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const PK = Deno.env.get('GEMINI_API_KEY')
  const SU = Deno.env.get('SUPABASE_URL')
  const SK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const AK = Deno.env.get('SUPABASE_ANON_KEY')
  if (!PK || !SU || !SK || !AK) return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  const supabase = createClient(SU, SK)
  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = auth.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: ae } = await createClient(SU, AK).auth.getUser(token)
    if (ae || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const byokKey = req.headers.get('x-gemini-key')?.trim() || null
    const geminiKey = byokKey ?? PK
    const isByok = !!byokKey
    const limited = await checkRateLimit(supabase, user.id, isByok)
    if (limited) return limited
    const body = await req.json()
    const { business_description, country = 'India', model = 'gemini-2.5-flash-lite', stream: wantStream } = body
    if (!business_description?.trim()) return new Response(JSON.stringify({ error: 'business_description is required', code: 'no_input' }), { status: 400, headers: corsHeaders })
    console.log(`[pq] user=${user.id} country=${country} model=${model} byok=${isByok}`)
    if (wantStream) {
      const stream = new ReadableStream({
        async start(ctrl) {
          const send = (o) => { try { ctrl.enqueue(sseEncode(o)) } catch { } }
          const ping = setInterval(() => send({ type: 'ping', ts: Date.now() }), 3000)
          try {
            const r = await run({ supabase, userId: user.id, business_description, country, model, geminiKey, isByok, emit: send })
            send({ type: 'done', ...r })
          } catch (err) {
            send({ type: 'error', message: err.message, code: err.code ?? 'questions_failed' })
          } finally {
            clearInterval(ping)
            try { ctrl.close() } catch { }
          }
        }
      })
      return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
    }
    const result = await run({ supabase, userId: user.id, business_description, country, model, geminiKey, isByok })
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, code: err.code ?? 'questions_failed' }), { status: err.status ?? 500, headers: corsHeaders })
  }
})

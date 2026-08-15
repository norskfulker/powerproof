// test-the-market v5
// SUBSCRIPTION MIGRATION: deduct_research_credits replaced with deduct_feature_usage, bucket='market_test'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key'
}

const MODEL_CONFIG = {
  'gemini-2.5-flash-lite': { credits: 25, label: 'Quick Check' },
  'gemini-2.5-flash':      { credits: 48, label: 'Standard'    },
  'gemini-2.5-pro':        { credits: 64, label: 'Deep Dive'   },
}
const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_RETRIES = 2
const RETRY_DELAYS = [3000, 8000]

function strip(r) {
  return r.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}
function repairJson(s) { return s.replace(/,\s*([}\]])/g, '$1') }
function extractSlice(s, o) {
  const c = o === '[' ? ']' : '}'
  const a = s.indexOf(o); const b = s.lastIndexOf(c)
  if (a < 0 || b <= a) return null
  return s.slice(a, b + 1)
}
function parseObject(text) {
  const base = strip(text)
  for (const c of [base, repairJson(base), extractSlice(text, '{') ?? '', extractSlice(base, '{') ?? ''].filter(Boolean)) {
    try { const p = JSON.parse(repairJson(c)); if (p && typeof p === 'object' && !Array.isArray(p)) return p } catch { }
  }
  throw new Error('JSON parse failed')
}
function sseEncode(o) { return new TextEncoder().encode(`data: ${JSON.stringify(o)}\n\n`) }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function checkRateLimit(supabase, userId, isByok) {
  try {
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: 'test-the-market',
      p_calls_per_hour: isByok ? 20 : 10,
      p_calls_per_day:  isByok ? 80 : 40
    })
    if (rl && !rl.allowed) return new Response(JSON.stringify({
      error: rl.reason === 'hourly_limit_exceeded'
        ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
        : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
      code: rl.reason, resets_at: rl.resets_at
    }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[ttm] rate limit error:', e) }
  return null
}

async function geminiGrounded(apiKey, model, prompt, maxTokens = 8000) {
  let lastErr = new Error('grounded failed')
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1])
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      })
      if (r.status === 503 || r.status === 429) { lastErr = new Error(`${model} ${r.status}`); continue }
      if (!r.ok) throw new Error(`grounded ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const d = await r.json()
      let t = ''
      for (const ca of d.candidates ?? []) for (const p of ca?.content?.parts ?? []) if (p.text) t += p.text
      if (!t) { lastErr = new Error('empty grounded response'); continue }
      console.log(`[ttm] grounded model=${model} len=${t.length}`)
      return t
    } catch (err) { lastErr = err instanceof Error ? err : new Error(String(err)) }
  }
  throw lastErr
}

async function geminiJson(apiKey, model, prompt, maxTokens = 6000) {
  let lastErr = new Error('json failed')
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
      if (r.status === 503 || r.status === 429) { lastErr = new Error(`json ${r.status}`); continue }
      if (!r.ok) throw new Error(`json ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const d = await r.json()
      const t = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (!t) { lastErr = new Error('empty json response'); continue }
      return t
    } catch (err) { lastErr = err instanceof Error ? err : new Error(String(err)) }
  }
  throw lastErr
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const PLATFORM_GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

  if (!PLATFORM_GEMINI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const byokKey = req.headers.get('x-gemini-key')?.trim() || null
    const geminiKey = byokKey ?? PLATFORM_GEMINI_KEY
    const isByok = !!byokKey

    const limited = await checkRateLimit(supabase, user.id, isByok)
    if (limited) return limited

    const body = await req.json()
    const {
      query,
      country = 'India',
      user_opportunity_id = null,
      stream: wantStream,
      model: rawModel = DEFAULT_MODEL
    } = body

    if (!query?.trim())
      return new Response(JSON.stringify({ error: 'query is required' }), { status: 400, headers: corsHeaders })

    const model = MODEL_CONFIG[rawModel] ? rawModel : DEFAULT_MODEL
    const CREDITS_COST = isByok ? 0 : MODEL_CONFIG[model].credits
    const modelLabel = MODEL_CONFIG[model].label

    console.log(`[ttm] v5 user=${user.id} model=${model} query=${query.slice(0, 60)}`)

    let creditsAfter = 0
    if (!isByok) {
      const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', { p_user_id: user.id, p_bucket: 'market_test', p_amount: 1 })
      if (usageErr) return new Response(JSON.stringify({ error: 'Failed to process usage.', detail: usageErr.message }), { status: 500, headers: corsHeaders })
      if (!usageResult?.success) {
        const reason = usageResult?.error
        if (reason === 'no_active_subscription') return new Response(JSON.stringify({ error: 'No active subscription found.', code: reason }), { status: 402, headers: corsHeaders })
        if (reason === 'feature_locked') return new Response(JSON.stringify({ error: 'This feature is not available on your plan.', code: reason }), { status: 402, headers: corsHeaders })
        return new Response(JSON.stringify({
          error: `Monthly limit reached for Market Test. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`,
          code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0
        }), { status: 402, headers: corsHeaders })
      }
      creditsAfter = usageResult?.remaining ?? 0
    }

    const { data: testRow, error: insertErr } = await supabase.from('market_tests').insert({
      user_id: user.id,
      user_opportunity_id: user_opportunity_id || null,
      query: query.trim(),
      country,
      generation_status: 'pending',
      credits_used: CREDITS_COST,
      byok_used: isByok,
      model_used: model
    }).select('id').single()

    if (insertErr || !testRow) {
      return new Response(JSON.stringify({ error: `Insert failed: ${insertErr?.message}` }), { status: 500, headers: corsHeaders })
    }

    const testId = testRow.id

    async function run(emit) {
      try {
        emit?.({ type: 'status', message: 'Scanning the market for real evidence...', phase: 'research' })

        const combinedPrompt = `You are a ruthlessly honest market validation analyst. No hype. No comfort. Save founders from wasting their savings.

Idea: "${query}"
Country: ${country}
Analysis depth: ${modelLabel}

Search Google RIGHT NOW. I need two things:

== PART 1: DEMAND SIGNALS ==
Is there REAL, PROVEN demand for this in ${country}?
1. SEARCH VOLUME: Is anyone actually searching for this? What data exists?
2. EXISTING PLAYER TRACTION: Name specific companies doing this in ${country}. Growing? Any funding or revenue signals?
3. CONSUMER COMPLAINTS = UNMET DEMAND: What are people complaining about in this space on Reddit, app store reviews, forums?
4. FAILED DEMAND: Evidence that people tried to buy this and couldn't, or tried and stopped?
5. MARKET SIZE: Any real data point with source and date?

== PART 2: FAILURE & SUCCESS EVIDENCE ==
1. COMPANIES THAT TRIED AND FAILED: Name real companies, when launched, how much raised, SPECIFIC reason they failed.
2. COMPANIES THAT SUCCEEDED: Name real companies winning in this space. What specifically made them work?
3. PATTERN IN FAILURES: What do failures have in common?
4. PATTERN IN SUCCESSES: What do successes have in common?
5. THE ONE MAKE-OR-BREAK FACTOR: What single thing determines whether this works?

Be specific. Name real companies. Real numbers. If you can't find named examples, say so honestly.`

        const researchRaw = await geminiGrounded(geminiKey, model, combinedPrompt, 8000)

        emit?.({ type: 'status', message: 'Building your reality check...', phase: 'synthesize' })

        const synthesizePrompt = `You have research about market validation for: "${query}" in ${country}.

RESEARCH FINDINGS:
${researchRaw}

Synthesize into a market reality check. Brutally honest. High scores = real validated demand. Low scores = founder is hallucinating.

Return ONLY valid JSON:
{
  "verdict": "go|proceed_with_caution|red_flag",
  "verdict_label": "Short 3-5 word label e.g. 'Strong demand signals found'",
  "market_reality_score": 0,
  "honest_verdict": "3-4 sentences. What a co-founder who loves you would say before you quit your job. Reference specific named evidence. No hedging.",
  "demand_signals": [{"signal": "str", "evidence": "specific named source or data point", "strength": "strong|moderate|weak"}],
  "red_flags": [{"flag": "str", "evidence": "specific named example", "severity": "critical|high|medium"}],
  "past_failures": [{"company": "real name or null", "what_happened": "specific failure reason", "lesson": "what this means for founder"}],
  "past_successes": [{"company": "real name or null", "what_worked": "specific success factor", "lesson": "what to copy or learn"}],
  "pros": ["specific reason based on evidence"],
  "cons": ["specific reason based on evidence"]
}

SCORING (market_reality_score 0-100):
80-100: Multiple named companies with proven traction, clear search volume, obvious unmet demand
60-79: Some demand evidence, mixed signals, 1-2 companies with moderate traction
40-59: Plausible but unproven, limited direct evidence
20-39: More failures than successes, demand signals weak
0-19: Graveyard of failed attempts, no evidence, fundamentally broken

demand_signals: 3-5. red_flags: 2-4. past_failures: 2-4. past_successes: 2-4. pros: 3-5. cons: 3-5.`

        const synthesized = parseObject(await geminiJson(geminiKey, model, synthesizePrompt, 6000))

        emit?.({ type: 'status', message: 'Saving your reality check...', phase: 'save' })

        const { error: updateErr } = await supabase.from('market_tests').update({
          verdict: synthesized.verdict ?? 'proceed_with_caution',
          verdict_label: synthesized.verdict_label ?? null,
          market_reality_score: typeof synthesized.market_reality_score === 'number'
            ? Math.min(100, Math.max(0, Math.round(synthesized.market_reality_score)))
            : null,
          honest_verdict: synthesized.honest_verdict ?? null,
          demand_signals: synthesized.demand_signals ?? [],
          red_flags: synthesized.red_flags ?? [],
          past_failures: synthesized.past_failures ?? [],
          past_successes: synthesized.past_successes ?? [],
          pros: synthesized.pros ?? [],
          cons: synthesized.cons ?? [],
          generation_status: 'complete',
          updated_at: new Date().toISOString()
        }).eq('id', testId)

        if (updateErr) {
          await supabase.from('market_tests').update({ generation_status: 'failed', error_detail: updateErr.message }).eq('id', testId)
          throw new Error(`Save failed. ${updateErr.message}`)
        }

        console.log(`[ttm] complete id=${testId} verdict=${synthesized.verdict} score=${synthesized.market_reality_score} model=${model}`)

        return {
          id: testId,
          verdict: synthesized.verdict,
          verdict_label: synthesized.verdict_label,
          market_reality_score: synthesized.market_reality_score,
          honest_verdict: synthesized.honest_verdict,
          demand_signals: synthesized.demand_signals ?? [],
          red_flags: synthesized.red_flags ?? [],
          past_failures: synthesized.past_failures ?? [],
          past_successes: synthesized.past_successes ?? [],
          pros: synthesized.pros ?? [],
          cons: synthesized.cons ?? [],
          country,
          model_used: model,
          model_label: modelLabel,
          credits_used: CREDITS_COST,
          credits_remaining: creditsAfter
        }
      } catch (err) {
        await supabase.from('market_tests').update({ generation_status: 'failed', error_detail: String(err) }).eq('id', testId).catch(() => null)
        throw err
      }
    }

    if (wantStream) {
      const stream = new ReadableStream({
        async start(ctrl) {
          const send = (o) => { try { ctrl.enqueue(sseEncode(o)) } catch { } }
          const ping = setInterval(() => send({ type: 'ping', ts: Date.now() }), 3000)
          try {
            const result = await run(send)
            send({ type: 'done', ...result })
          } catch (err) {
            send({ type: 'error', message: err instanceof Error ? err.message : String(err), code: 'test_market_failed' })
          } finally {
            clearInterval(ping)
            try { ctrl.close() } catch { }
          }
        }
      })
      return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }
      })
    }

    const result = await run(null)
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('[ttm] error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err), code: 'test_market_failed' }),
      { status: 500, headers: corsHeaders }
    )
  }
})

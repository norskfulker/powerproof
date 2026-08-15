// generate-playbook v30
// SUBSCRIPTION MIGRATION: deduct_credits_custom/refund_research_credits replaced with
// deduct_feature_usage, bucket='warroom' (Pro-only via warroom_unlocked feature lock).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key'
}

const VALID_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro']
const MODEL_CREDITS = { 'gemini-2.5-flash-lite': 15, 'gemini-2.5-flash': 40, 'gemini-2.5-pro': 85 }
const MODEL_FEATURE_KEY = { 'gemini-2.5-flash-lite': 'war_room_playbook_lite', 'gemini-2.5-flash': 'war_room_playbook', 'gemini-2.5-pro': 'war_room_playbook_pro' }
const MODEL_FALLBACKS = { 'gemini-2.5-flash-lite': ['gemini-2.5-flash-lite', 'gemini-2.5-flash'], 'gemini-2.5-flash': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'], 'gemini-2.5-pro': ['gemini-2.5-pro', 'gemini-2.5-flash'] }
const MAX_RETRIES = 2
const RETRY_DELAYS = [3000, 8000]

function stripJsonFence(text) {
  const t = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t)
  if (fence?.[1]) return fence[1].trim()
  return t.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}
function repairJson(raw) { return raw.replace(/,\s*([}\]])/g, '$1') }
function extractSlice(raw, open) {
  const close = open === '[' ? ']' : '}'
  const s = raw.indexOf(open); const e = raw.lastIndexOf(close)
  if (s < 0 || e <= s) return null
  return raw.slice(s, e + 1)
}
function parseObject(text) {
  const base = stripJsonFence(text)
  for (const c of [base, repairJson(base), extractSlice(text, '{') ?? '', extractSlice(base, '{') ?? ''].filter(Boolean)) {
    try { const p = JSON.parse(repairJson(c)); if (p && typeof p === 'object' && !Array.isArray(p)) return p } catch { }
  }
  throw new Error('JSON object parse failed')
}
function sseEncode(obj) { return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`) }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function checkRateLimit(supabase, userId, isByok) {
  try {
    const perHour = isByok ? 40 : 20; const perDay = isByok ? 160 : 80
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', { p_user_id: userId, p_function_name: 'generate-playbook', p_calls_per_hour: perHour, p_calls_per_day: perDay })
    if (rl && !rl.allowed) return new Response(JSON.stringify({ error: rl.reason === 'hourly_limit_exceeded' ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.` : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`, code: rl.reason, resets_at: rl.resets_at }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[gp] rate limit error:', e) }
  return null
}

async function geminiJson(apiKey, prompt, modelChain) {
  let lastErr = new Error('Gemini failed')
  for (const model of modelChain) {
    for (let i = 0; i < MAX_RETRIES; i++) {
      if (i > 0) await sleep(RETRY_DELAYS[i - 1] ?? 8000)
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.0, maxOutputTokens: 200000, responseMimeType: 'application/json' },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      })
      if (res.status === 503 || res.status === 429 || res.status === 500) { lastErr = new Error(`${model} ${res.status}`); continue }
      if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const d = await res.json()
      if (d.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Output truncated')
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (!text) { lastErr = new Error('Empty response'); continue }
      console.log(`[gp] success model=${model}`)
      return text
    }
  }
  throw lastErr
}

function sendCompletionEmail(supabaseUrl, userId, data) {
  fetch(`${supabaseUrl}/functions/v1/send-completion-email`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature: 'warroom', user_id: userId, data })
  }).then(r => { if (!r.ok) r.text().then(t => console.error('[gp] email failed:', t)); else console.log('[gp] completion email sent') })
    .catch(e => console.error('[gp] email error:', e))
}

function buildStageGuidance(stage, capitalAvailable) {
  const capital = capitalAvailable ? ` Capital available: ${capitalAvailable}.` : ''
  switch (stage) {
    case 'idea': return `STAGE CONTEXT - IDEA STAGE:${capital} This founder has not started yet. The first 4 moves must be about validating the idea before spending a rupee on operations.`
    case 'planning': return `STAGE CONTEXT - PLANNING STAGE:${capital} This founder has validated the idea. The first 2 moves should be about closing their first deal/customer.`
    case 'registered': return `STAGE CONTEXT - REGISTERED/PRE-REVENUE:${capital} They have the legal entity but no customers yet. Obsess over getting to first revenue.`
    case 'operational': return `STAGE CONTEXT - OPERATIONAL:${capital} They're making money but not at scale. Focus on repeatability and doubling down on what works.`
    case 'scaling': return `STAGE CONTEXT - SCALING:${capital} They have product-market fit. Build systems, protect the moat, outmaneuver competitors.`
    default: return `STAGE CONTEXT:${capital} Stage unclear. Assume early-stage.`
  }
}

function buildCompetitorDirectives(competitors) {
  if (!competitors?.length) return 'No specific competitors identified.'
  return competitors.map((c, i) =>
    `COMPETITOR ${i + 1} - ${c.name}: strength=${c.strength} weakness=${c.weakness} -> NAME ${c.name} in the step that exploits this weakness.`
  ).join('\n\n')
}

async function runGeneratePlaybook(opts) {
  const { supabase, userId, geminiKey, emit, country, isByok, supabaseUrl } = opts
  const desc = typeof opts.business_description === 'string' ? opts.business_description.trim() : ''
  const model = opts.model
  const playbookCredits = MODEL_CREDITS[model]
  const featureKey = MODEL_FEATURE_KEY[model]
  const modelChain = MODEL_FALLBACKS[model]
  const intel = opts.inferred_context?.intel ?? {}
  const stage = opts.inferred_context?.stage ?? 'unknown'
  const capitalAvailable = opts.inferred_context?.capital_available ?? opts.extracted_context?.capital_available ?? null
  const teamSize = opts.inferred_context?.team_size ?? opts.extracted_context?.team_size ?? null

  let creditsAfter = 0

  if (!isByok) {
    emit?.({ type: 'status', message: `Checking your War Room access...`, phase: 'credits' })
    const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', {
      p_user_id: userId, p_bucket: 'warroom', p_amount: 1
    })
    if (usageErr) throw new Error(`Usage error: ${usageErr.message}`)
    if (!usageResult?.success) {
      const reason = usageResult?.error
      if (reason === 'feature_locked') throw Object.assign(new Error('War Room is a Pro-plan feature.'), { code: 'feature_locked', status: 402 })
      if (reason === 'no_active_subscription') throw Object.assign(new Error('No active subscription found.'), { code: 'no_active_subscription', status: 402 })
      throw Object.assign(new Error(`Monthly War Room limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`), { code: reason, status: 402 })
    }
    creditsAfter = usageResult?.remaining ?? 0
  }

  const ic = opts.inferred_context
  const businessType = String(ic?.business_type ?? 'business')
  const businessName = opts.extracted_context?.name || businessType
  const location = ic?.location ?? country
  const competitorLines = buildCompetitorDirectives(intel.competitors ?? [])

  const intelBlock = `MARKET: size=${intel.market_size ?? 'Unknown'} gap=${intel.market_gap ?? 'Unknown'} advantage=${intel.asymmetric_advantage ?? 'Unknown'}
COMPETITORS:
${competitorLines}
OPS: cost_to_first_revenue=${intel.cost_to_first_revenue ?? 'Unknown'} failure_modes=${(intel.top_failure_modes ?? []).join(' | ') || 'Unknown'} whats_working=${intel.whats_working_now ?? 'Unknown'}
FOUNDER: capital=${capitalAvailable ?? 'Not stated'} team=${teamSize ?? 'solo'}`

  const stageGuidance = buildStageGuidance(stage, capitalAvailable)

  emit?.({ type: 'status', message: 'Saving playbook draft...', phase: 'draft' })

  const { data: playbookRow, error: insertErr } = await supabase.from('user_playbooks').insert({
    user_id: userId, project_id: null, user_opportunity_id: opts.user_opportunity_id ?? null,
    business_name: businessName, business_type: businessType, business_description: desc || null,
    industry: businessType !== 'business' ? businessType : null,
    city: opts.extracted_context?.city ?? null, country,
    model_used: model, byok_used: isByok,
    context_answers: { inferred_stage: stage, inferred_location: location, inferred_business_type: businessType, capital_available: capitalAvailable, team_size: teamSize, market_gap: intel.market_gap ?? null, asymmetric_advantage: intel.asymmetric_advantage ?? null, competitors: (intel.competitors ?? []).map(c => c.name) },
    war_room_intake: Object.keys(intel).length > 0 ? intel : null,
    steps: [], generation_status: 'pending', credits_used: isByok ? 0 : playbookCredits
  }).select('id').single()

  if (insertErr || !playbookRow) {
    throw new Error(`Insert failed: ${insertErr?.message ?? 'unknown'}`)
  }

  emit?.({ type: 'status', message: 'Your co-founder is thinking...', phase: 'generate', playbook_id: playbookRow.id })

  const progressMessages = ['Reading the battlefield...', 'Mapping competitor blind spots...', 'Finding your first opening move...', 'Stress-testing the plan...', 'Calling out what could go wrong...', 'Writing your opening 30 days...']
  let progressIdx = 0
  const progressTimer = emit ? setInterval(() => { emit({ type: 'status', message: progressMessages[progressIdx++ % progressMessages.length], phase: 'generate' }) }, 7000) : null

  const prompt = `You are the founder's most valuable co-founder. Battle-scarred, direct, specific. Not a consultant.

THE FOUNDER:
Business: ${businessType}
Location: ${location}, ${country}
What they told us: "${desc}"

${stageGuidance}

${intelBlock}

Write a WAR ROOM PLAYBOOK. Voice: texting your co-founder at 11pm. Name real things.

Return ONLY valid JSON:
{
  "edge_declaration": "2 sentences. Why this specific founder has a real shot.",
  "founder_honest_take": "3-4 sentences. What they need to hear but probably don't want to.",
  "step_count_rationale": "one sentence",
  "steps": [{
    "step_order": 1,
    "war_move_name": "ALL CAPS 2-4 WORDS",
    "phase": "CAPTURE|DOMINATE|FORTIFY|SCALE",
    "phase_number": 1,
    "title": "max 8 words",
    "the_move": "3-4 sentences. Specific. Name real things.",
    "why_it_works": "1-2 sentences grounded in market reality.",
    "weapon": "specific real tool/platform/portal",
    "kill_metric": "one measurable number or milestone",
    "timeline": "Week 1-2",
    "cost_estimate_usd": 340,
    "watch_out": "specific failure mode from intel",
    "assumption_flagged": "str or null",
    "is_checked": false
  }],
  "red_flags": [{"flag": "CAPS TITLE", "detail": "2-3 sentences specific to this market."}],
  "thirty_day_sprint": {
    "week_1": "Named actions. What to do Monday morning.",
    "week_2": "What week 1 results tell you and next steps.",
    "week_3": "By now you should have X. If you don't, here is what that means.",
    "week_4": "What does success look like at end of 30 days?"
  }
}

RULES: 12-15 steps. Exactly 3 red_flags. CAPTURE=weeks 1-4, DOMINATE=month 2-3, FORTIFY=month 3-4, SCALE=month 4+`

  let playbookObj
  try {
    playbookObj = parseObject(await geminiJson(geminiKey, prompt, modelChain))
    if (!Array.isArray(playbookObj.steps) || !playbookObj.steps.length) throw new Error('Invalid steps')
  } catch (firstErr) {
    try {
      playbookObj = parseObject(await geminiJson(geminiKey, prompt + '\n\nReturn ONLY valid JSON starting with {', modelChain))
      if (!Array.isArray(playbookObj.steps) || !playbookObj.steps.length) throw new Error('Invalid steps')
    } catch (retryErr) {
      if (progressTimer) clearInterval(progressTimer)
      await supabase.from('user_playbooks').update({ generation_status: 'failed' }).eq('id', playbookRow.id)
      throw new Error(`Generation failed. ${retryErr instanceof Error ? retryErr.message : String(firstErr)}`)
    }
  } finally {
    if (progressTimer) clearInterval(progressTimer)
  }

  const steps = playbookObj.steps.map((s, i) => ({ ...s, step_order: s.step_order ?? i + 1, is_checked: false, cost_estimate_usd: typeof s.cost_estimate_usd === 'number' ? Math.round(s.cost_estimate_usd) : null, cost_estimate: null }))

  emit?.({ type: 'status', message: 'Locking in the battle plan...', phase: 'save' })

  const thirtyDaySprint = playbookObj.thirty_day_sprint
  const thirtyDaySprintStr = typeof thirtyDaySprint === 'object' && thirtyDaySprint !== null ? JSON.stringify(thirtyDaySprint) : typeof thirtyDaySprint === 'string' ? thirtyDaySprint : null

  const { error: updateErr } = await supabase.from('user_playbooks').update({
    steps, edge_declaration: playbookObj.edge_declaration ?? null, red_flags: playbookObj.red_flags ?? [],
    thirty_day_sprint: thirtyDaySprintStr, generation_status: 'complete', model_used: model, byok_used: isByok, updated_at: new Date().toISOString()
  }).eq('id', playbookRow.id)

  if (updateErr) {
    throw new Error(`Save failed. ${updateErr.message}`)
  }

  sendCompletionEmail(supabaseUrl, userId, { playbook_id: playbookRow.id, business_name: businessName, edge_declaration: playbookObj.edge_declaration ?? null, step_count: steps.length, thirty_day_sprint: thirtyDaySprintStr, country })

  return { id: playbookRow.id, steps, edge_declaration: playbookObj.edge_declaration ?? null, founder_honest_take: playbookObj.founder_honest_take ?? null, red_flags: playbookObj.red_flags ?? [], thirty_day_sprint: playbookObj.thirty_day_sprint ?? null, country, credits_used: isByok ? 0 : playbookCredits, credits_remaining: creditsAfter, model_used: model, byok_used: isByok, feature_key: featureKey }
}

function friendlyError(err) {
  const raw = err.message ?? String(err)
  if (err.code === 'insufficient_credits' || err.code === 'feature_locked' || err.code === 'no_active_subscription' || raw.includes('Not enough credits')) return { message: raw, status: err.status ?? 402, code: err.code ?? 'insufficient_credits' }
  if (raw.includes('503')) return { message: 'AI is busy. Try again.', status: 503, code: 'gemini_unavailable' }
  if (raw.includes('failed')) return { message: 'Generation failed.', status: 500, code: 'generation_failed' }
  return { message: raw, status: err.status ?? 500, code: err.code ?? 'generate_playbook_failed' }
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
    const { business_description, country = 'India', inferred_context, extracted_context, user_opportunity_id = null, stream: wantStream, model: rawModel } = body
    if (!business_description?.trim() && !inferred_context) return new Response(JSON.stringify({ error: 'business_description or inferred_context required' }), { status: 400, headers: corsHeaders })
    const model = VALID_MODELS.includes(rawModel) ? rawModel : 'gemini-2.5-flash-lite'
    console.log(`[gp] v30 user=${user.id} country=${country} model=${model} byok=${isByok}`)
    const runOpts = { supabase, userId: user.id, geminiKey, model, country, isByok, supabaseUrl: SUPABASE_URL, business_description, inferred_context, extracted_context, user_opportunity_id }
    if (wantStream) {
      const stream = new ReadableStream({
        async start(ctrl) {
          const send = (obj) => { try { ctrl.enqueue(sseEncode(obj)) } catch { } }
          const ping = setInterval(() => send({ type: 'ping', ts: Date.now() }), 3000)
          try {
            const result = await runGeneratePlaybook({ ...runOpts, emit: send })
            send({ type: 'done', ...result })
          } catch (err) {
            const { message, code } = friendlyError(err)
            send({ type: 'error', message, code })
          } finally {
            clearInterval(ping)
            try { ctrl.close() } catch { }
          }
        }
      })
      return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } })
    }
    const result = await runGeneratePlaybook(runOpts)
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    const { message, status, code } = friendlyError(err)
    return new Response(JSON.stringify({ error: message, code }), { status, headers: corsHeaders })
  }
})

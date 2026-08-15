// clarify-warroom-prompt v4
// NEW: Pre-flight input guard (Flash Lite) — rejects gibberish, abuse, too_vague, off_topic
// before any rate limit decrement or main Gemini call
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key'
}
const GEMINI_MODEL = 'gemini-2.5-flash'
const GUARD_MODEL  = 'gemini-2.5-flash-lite'
const GEMINI_TIMEOUT_MS = 30_000
const MAX_ROUNDS = 3

function strip(r) {
  return r.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
}

async function checkRateLimit(supabase, userId, isByok) {
  try {
    const perHour = isByok ? 60 : 30
    const perDay  = isByok ? 300 : 150
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: 'clarify-warroom-prompt',
      p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed)
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[clarify-wr] rate limit error:', e) }
  return null
}

async function gemini(apiKey, prompt, model = GEMINI_MODEL, maxTokens = 8192) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      }
    )
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const d = await res.json()
    const finishReason = d.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS') throw new Error('Gemini response truncated (MAX_TOKENS).')
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } catch (e) { clearTimeout(timeout); throw e }
}

// --- INPUT GUARD ---
async function runInputGuard(apiKey, query) {
  const guardPrompt = `You are a strict input validator for a professional business strategy platform.
Your ONLY job is to classify whether the user's input describes a real business, product, or venture worth building a competitive battle strategy for.

User input: "${query.slice(0, 500)}"

Classify this input into exactly one of these categories:

1. "valid" — A real business, product, service, or venture — even rough, early, or unconventional. Err heavily on the side of valid. Only reject if clearly nonsensical, offensive, or completely off-topic.

2. "gibberish" — Random characters, keyboard mashing, meaningless strings with no semantic content. Not just a bad idea — literally unreadable.

3. "abuse" — Sexually explicit, threatening, hateful, or personally offensive content. A blunt business idea is NOT abuse — only explicit harassment or sexual aggression counts.

4. "too_vague" — So devoid of content that no battle strategy direction can be inferred even with follow-up (e.g. "something", "idk", "make money"). A vague idea with at least one noun or domain is NOT too_vague.

5. "off_topic" — Clearly not about a business or venture at all. Pure philosophy, political rants, test inputs like "hello", math problems, etc.

IMPORTANT: When in doubt, classify as "valid". Only use the other categories for clear, unambiguous cases.

Return ONLY valid JSON:
{"category": "valid"|"gibberish"|"abuse"|"too_vague"|"off_topic", "reason": "one short sentence"}`

  try {
    const raw = await gemini(apiKey, guardPrompt, GUARD_MODEL, 100)
    const parsed = JSON.parse(strip(raw))
    const category = parsed.category

    if (category === 'valid' || !['gibberish','abuse','too_vague','off_topic'].includes(category)) {
      return null
    }

    const messages = {
      gibberish: "That doesn't look like a business description. Try something like: 'I run a small manufacturing unit in Surat' or 'I'm building a logistics startup competing with Delhivery'.",
      abuse:     "That's not something we can work with. Describe your business and the competitors you want to beat.",
      too_vague: "Too vague to build a battle strategy. Give us at least a business type or market — e.g. 'cloud kitchen', 'D2C skincare brand', 'SaaS for SMEs'.",
      off_topic: "War Room is built for competitive business strategy. What business are you trying to win with?",
    }

    console.log(`[clarify-wr] input guard blocked: category=${category}`)
    return new Response(
      JSON.stringify({ status: 'invalid', category, message: messages[category] }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.warn('[clarify-wr] input guard error (fail-open):', String(e))
    return null
  }
}

function buildClarifyPrompt(query, country, round, previousAnswers) {
  const answersBlock = previousAnswers.length > 0
    ? `\nAnswers so far:\n${previousAnswers.map(a =>
        `- ${a.question_text}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`
      ).join('\n')}`
    : ''
  const forceReady = round >= MAX_ROUNDS
  return `You are a battle-hardened business strategist preparing someone to enter the War Room — a brutal competitive intelligence and battle planning tool.

The user wants to stress-test and build a battle strategy for their business.

Original business description: "${query}"
Country: ${country}
Clarification round: ${round + 1} of ${MAX_ROUNDS}${answersBlock}

${
  forceReady
    ? 'You have reached the maximum clarification rounds. Return status "ready" now using all context collected.'
    : `Evaluate if you have enough context to run a War Room battle analysis. You need to know:
1. What the business actually does (product/service, who it serves)
2. What stage it is at (idea, early, operational, scaling)
3. Where it operates (city/region is important for competitor mapping)
4. The primary battle goal (beat a specific competitor? enter a new market? defend market share? raise funding?)
5. The biggest known threat or competitor they are already worried about

If still unclear, ask follow-up questions (MAX 3 questions). Otherwise return "ready".
Do NOT re-ask already answered questions. Be concise — war room users want speed, not bureaucracy.
Focus questions on what changes the battle plan most dramatically.`
}

Return ONLY valid JSON — one of these two shapes:

Shape A (more info needed):
{"status":"needs_more","questions":[{"id":"q1","text":"Short question?","type":"single_select","options":["A","B","C"],"required":true}]}

Shape B (enough context):
{"status":"ready","refined_prompt":"Specific 2-3 sentence business description ready for War Room analysis.","summary":"One sentence battle brief."}

Types: single_select (pick one), multi_select (pick many), checkbox (yes/no), text (free input).
Options required for single_select and multi_select. Keep options SHORT (max 4 words each).`
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

    const body = await req.json()
    const { query, country = 'India', round = 0, previous_answers = [] } = body

    if (!query?.trim())
      return new Response(JSON.stringify({ error: 'query is required' }), { status: 400, headers: corsHeaders })

    // --- INPUT GUARD (runs before rate limit, before main Gemini call) ---
    if (round === 0) {
      const guardResponse = await runInputGuard(geminiKey, query)
      if (guardResponse) return guardResponse
    }

    const limited = await checkRateLimit(supabase, user.id, isByok)
    if (limited) return limited

    const effectiveRound = Math.min(round, MAX_ROUNDS)
    const raw = await gemini(geminiKey, buildClarifyPrompt(query, country, effectiveRound, previous_answers), GEMINI_MODEL, 8192)
    const parsed = JSON.parse(strip(raw))

    if (parsed.status === 'needs_more') {
      const questions = (parsed.questions ?? []).slice(0, 3).map((q, i) => ({
        id: String(q.id ?? `q${i+1}`),
        text: String(q.text ?? ''),
        type: ['single_select','multi_select','checkbox','text'].includes(q.type) ? q.type : 'single_select',
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        required: Boolean(q.required ?? true)
      }))
      return new Response(
        JSON.stringify({ status: 'needs_more', round: effectiveRound, questions, byok: isByok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (parsed.status === 'ready') {
      return new Response(
        JSON.stringify({ status: 'ready', refined_prompt: String(parsed.refined_prompt ?? query), summary: String(parsed.summary ?? ''), round: effectiveRound, byok: isByok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ status: 'ready', refined_prompt: query, summary: '', round: effectiveRound, byok: isByok }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[clarify-wr] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

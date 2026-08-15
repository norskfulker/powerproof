// clarify-research-prompt v6
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

interface PreviousAnswer { question_id: string; question_text: string; answer: string | string[] }
interface ClarifyQuestion { id: string; text: string; type: 'single_select'|'multi_select'|'checkbox'|'text'; options?: string[]; required: boolean }

interface SaturationResult {
  verdict: 'Saturated' | 'Competitive but Viable' | 'Blue Ocean'
  score: number
  reasons: string[]
  show_warning: boolean
  score_penalties: { market_momentum: number; ease: number; profitability: number }
}

const SCORE_PENALTIES: Record<string, { market_momentum: number; ease: number; profitability: number }> = {
  'Saturated':              { market_momentum: -25, ease: -20, profitability: -15 },
  'Competitive but Viable': { market_momentum: -10, ease: -8,  profitability: -5  },
  'Blue Ocean':             { market_momentum: 0,   ease: 0,   profitability: 0   },
}

function strip(r: string): string {
  return r.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
}

async function checkRateLimit(supabase: ReturnType<typeof createClient>, userId: string, isByok: boolean): Promise<Response | null> {
  try {
    const perHour = isByok ? 60 : 30
    const perDay  = isByok ? 300 : 150
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: 'clarify-research-prompt',
      p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed)
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[clarify] rate limit error:', e) }
  return null
}

async function gemini(apiKey: string, prompt: string, model = GEMINI_MODEL, maxTokens = 8192): Promise<string> {
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
            { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
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
// Runs on Flash Lite before rate limit check or any main Gemini call.
// Returns null if input is acceptable, or a Response to send immediately.
async function runInputGuard(apiKey: string, query: string): Promise<Response | null> {
  const guardPrompt = `You are a strict input validator for a professional business research platform.
Your ONLY job is to classify whether the user's input is a legitimate business or career idea worth researching.

User input: "${query.slice(0, 500)}"

Classify this input into exactly one of these categories:

1. "valid" — A real business idea, product, service, career goal, or venture concept. Even rough, early, or unconventional ideas count. Err heavily on the side of valid — only reject if clearly nonsensical, offensive, or completely off-topic.

2. "gibberish" — Random characters, keyboard mashing, meaningless strings with no semantic content (e.g. "asdfghjkl", "xyzxyzxyz", "aaaa bbb ccc"). Not just a bad idea — literally unreadable.

3. "abuse" — Sexually explicit, threatening, hateful, or personally offensive content directed at users, operators, or the system. A blunt business idea about adult services is NOT abuse — only explicit harassment or sexual aggression counts.

4. "too_vague" — So devoid of content that no research direction can be inferred even with follow-up questions (e.g. "something", "idk", "make money", "do business"). A vague idea with at least one noun or domain is NOT too_vague.

5. "off_topic" — Clearly not about a business, career, or venture at all. Pure philosophy, political rants, test inputs like "hello", math problems, etc.

IMPORTANT: When in doubt, classify as "valid". Only use the other categories for clear, unambiguous cases.

Return ONLY valid JSON:
{"category": "valid"|"gibberish"|"abuse"|"too_vague"|"off_topic", "reason": "one short sentence"}`

  try {
    const raw = await gemini(apiKey, guardPrompt, GUARD_MODEL, 100)
    const parsed = JSON.parse(strip(raw))
    const category = parsed.category as string

    if (category === 'valid' || !['gibberish','abuse','too_vague','off_topic'].includes(category)) {
      return null // all good, proceed
    }

    const messages: Record<string, string> = {
      gibberish: "That doesn't look like a business idea. Type something like: 'I want to start a cloud kitchen in Pune' or 'I'm building a B2B SaaS for HR teams'.",
      abuse:     "That's not something we can work with here. Describe a business, product, or career goal and we'll get to work.",
      too_vague: "Too vague to research. Give us at least a domain or direction — e.g. 'food delivery', 'edtech for rural students', 'freelance design studio'.",
      off_topic:  "PowerProof is built for business and career research. What are you trying to build or achieve?",
    }

    console.log(`[clarify] input guard blocked: category=${category}`)
    return new Response(
      JSON.stringify({ status: 'invalid', category, message: messages[category] }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    // Guard failed — fail open, don't block the user
    console.warn('[clarify] input guard error (fail-open):', String(e))
    return null
  }
}

function buildClarifyPrompt(query: string, country: string, round: number, previousAnswers: PreviousAnswer[]): string {
  const answersBlock = previousAnswers.length > 0
    ? `\nAnswers so far:\n${previousAnswers.map(a =>
        `- ${a.question_text}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`
      ).join('\n')}`
    : ''
  const forceReady = round >= MAX_ROUNDS
  return `You are a business research assistant helping clarify a vague business idea before running deep market research.

Original idea: "${query}"
Country: ${country}
Clarification round: ${round + 1} of ${MAX_ROUNDS}${answersBlock}

${
  forceReady
    ? 'You have reached the maximum clarification rounds. Return status "ready" now using all context collected.'
    : `Evaluate if you have enough context for accurate market research. You need to know:
1. What exactly is being sold or offered
2. Who the target customer is
3. How money is made
4. Key constraints (budget, location, scale)

If still unclear, ask follow-up questions (MAX 3 questions). Otherwise return "ready".
Do NOT re-ask already answered questions. Be concise.`
}

Return ONLY valid JSON — one of these two shapes:

Shape A (more info needed):
{"status":"needs_more","questions":[{"id":"q1","text":"Short question?","type":"single_select","options":["A","B","C"],"required":true}]}

Shape B (enough context):
{"status":"ready","refined_prompt":"Specific 2-3 sentence business description.","summary":"One sentence summary."}

Types: single_select (pick one), multi_select (pick many), checkbox (yes/no), text (free input).
Options required for single_select and multi_select. Keep options SHORT (max 4 words each).`
}

function buildSaturationPrompt(refinedPrompt: string, country: string): string {
  return `You are a ruthlessly honest market analyst. Assess whether the following business idea is worth pursuing based on market saturation, not vague warnings.

Business: "${refinedPrompt}"
Country: ${country}

Your job is to give a clear, direct saturation verdict. Do NOT say things like:
- "there are many competitors"
- "regulatory hurdles exist"
- "many businesses have failed in this space"
- "it will be challenging"

Instead, say exactly WHY this market is or isn't saturated. Name specific dominant players, exact market share data if known, structural reasons entry is blocked or open. Be specific and brutally honest in 1-2 sentences per reason.

Verdicts:
- "Saturated": Market is dominated by entrenched players with massive distribution/cost advantages. New entrants cannot realistically compete without massive capital or a unique differentiator.
- "Competitive but Viable": Market has strong players but meaningful gaps exist — underserved segments, geographies, or price points a focused operator can own.
- "Blue Ocean": Low competition, emerging demand, or structural gap that a first-mover can capture.

Saturation score: 0 = completely open market, 100 = completely locked market.

Return ONLY valid JSON:
{
  "verdict": "Saturated" | "Competitive but Viable" | "Blue Ocean",
  "score": <0-100 integer>,
  "reasons": ["1-2 sentence specific reason", "1-2 sentence specific reason"],
  "show_warning": <true if verdict is Saturated or score >= 65>
}

Maximum 4 reasons. Be direct. No corporate hedging.`
}

async function runSaturationCheck(apiKey: string, refinedPrompt: string, country: string): Promise<SaturationResult> {
  try {
    const raw = await gemini(apiKey, buildSaturationPrompt(refinedPrompt, country), GEMINI_MODEL, 1024)
    const parsed = JSON.parse(strip(raw))
    const verdict = (['Saturated', 'Competitive but Viable', 'Blue Ocean'].includes(parsed.verdict)
      ? parsed.verdict
      : 'Competitive but Viable') as SaturationResult['verdict']
    const score = Math.min(100, Math.max(0, parseInt(parsed.score ?? 50)))
    const reasons: string[] = Array.isArray(parsed.reasons)
      ? parsed.reasons.slice(0, 4).map(String)
      : ['Market analysis unavailable.']
    const show_warning = parsed.show_warning === true || score >= 65
    const score_penalties = SCORE_PENALTIES[verdict]
    return { verdict, score, reasons, show_warning, score_penalties }
  } catch (e) {
    console.error('[clarify] saturation check failed:', e)
    return {
      verdict: 'Competitive but Viable',
      score: 50,
      reasons: ['Saturation analysis unavailable. Proceeding with research.'],
      show_warning: false,
      score_penalties: SCORE_PENALTIES['Competitive but Viable']
    }
  }
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
    const { query, country = 'India', round = 0, previous_answers = [] as PreviousAnswer[], draft_id } = body

    if (!query?.trim())
      return new Response(JSON.stringify({ error: 'query is required' }), { status: 400, headers: corsHeaders })

    // --- INPUT GUARD (runs before rate limit, before main Gemini call) ---
    // Only on round 0 — no need to re-check once the user is mid-clarification
    if (round === 0) {
      const guardResponse = await runInputGuard(geminiKey, query)
      if (guardResponse) return guardResponse
    }

    // Rate limit only incremented after guard passes
    const limited = await checkRateLimit(supabase, user.id, isByok)
    if (limited) return limited

    const effectiveRound = Math.min(round, MAX_ROUNDS)
    const raw = await gemini(geminiKey, buildClarifyPrompt(query, country, effectiveRound, previous_answers), GEMINI_MODEL, 8192)
    const parsed = JSON.parse(strip(raw))

    if (parsed.status === 'needs_more') {
      const questions: ClarifyQuestion[] = (parsed.questions ?? []).slice(0, 3).map(
        (q: Record<string,unknown>, i: number) => ({
          id: String(q.id ?? `q${i+1}`),
          text: String(q.text ?? ''),
          type: (['single_select','multi_select','checkbox','text'].includes(q.type as string)
            ? q.type : 'single_select') as ClarifyQuestion['type'],
          options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          required: Boolean(q.required ?? true)
        })
      )
      return new Response(
        JSON.stringify({ status: 'needs_more', round: effectiveRound, questions, byok: isByok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (parsed.status === 'ready') {
      const refinedPrompt = String(parsed.refined_prompt ?? query)
      const summary = String(parsed.summary ?? '')

      const saturation = await runSaturationCheck(geminiKey, refinedPrompt, country)

      if (draft_id) {
        try {
          await supabase
            .from('clarification_drafts')
            .update({
              saturation_verdict: saturation.verdict,
              saturation_data: saturation,
              refined_prompt: refinedPrompt,
              summary,
              status: 'ready',
              updated_at: new Date().toISOString()
            })
            .eq('id', draft_id)
            .eq('user_id', user.id)
        } catch (e) {
          console.error('[clarify] draft saturation update failed:', e)
        }
      }

      return new Response(
        JSON.stringify({ status: 'ready', refined_prompt: refinedPrompt, summary, round: effectiveRound, byok: isByok, saturation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ status: 'ready', refined_prompt: query, summary: '', round: effectiveRound, byok: isByok, saturation: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[clarify] error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    )
  }
})

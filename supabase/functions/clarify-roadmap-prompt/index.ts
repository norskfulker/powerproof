// clarify-roadmap-prompt v5
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

const PERSONA_CONTEXT = {
  student: {
    label: 'Student',
    needs: [
      'Current education level and field of study',
      'Specific goal: career direction, venture idea, or skill-to-opportunity matching',
      'Time available per week and whether there is a hard deadline (exam, graduation)',
      'Budget constraints: free resources only, or some budget available',
      'Whether they want to stay in their country or are open to abroad'
    ],
    language: 'Use encouraging, practical language. Prioritise free tools, platforms, and communities. Frame milestones as skill unlocks and portfolio wins, not just career steps. Be honest about timelines.'
  },
  employee: {
    label: 'Employee / Professional',
    needs: [
      'Current role, industry, and years of experience',
      'Goal type: career pivot, role upgrade, side venture validation, or full exit',
      'Time available outside of current job (hours per week)',
      'Whether they want to stay employed during the transition or have a runway to exit',
      'Key skill gaps or areas they want to develop'
    ],
    language: 'Be pragmatic. Account for limited time and energy after a day job. Distinguish between quick wins (3-6 months) and bigger pivots (12-24 months). Name specific roles, salary benchmarks, and companies to target.'
  },
  entrepreneur: {
    label: 'Entrepreneur',
    needs: [
      'Stage: idea only, MVP built, or already generating revenue',
      'Capital available and runway (months of expenses covered)',
      'Validation done so far: talked to customers, tested pricing, built waitlist',
      'Specific goal: validate idea, find product-market fit, raise funding, or scale',
      'Team size and key gaps'
    ],
    language: 'Be direct and ruthless about sequencing. Name the exact validation tests to run before spending money. Give specific investor names, accelerator programs, and community platforms relevant to their domain and country.'
  },
  smb_owner: {
    label: 'Small Business Owner',
    needs: [
      'Current business type, annual revenue range, and how long they have been operating',
      'Decision at hand: expand to new market, launch new product, pivot, or hold and optimise',
      'Key constraint: cash flow, staff, location, or competition',
      'Whether they want to grow organically or are open to investment/partnerships',
      'Biggest pain point in the business right now'
    ],
    language: 'Ground everything in cash flow and operational reality. Avoid startup jargon. Speak in terms of monthly revenue, margins, and payback periods. Name local resources, government schemes, and distributor networks relevant to their country.'
  },
  ceo_executive: {
    label: 'CEO / Executive',
    needs: [
      'Company size (revenue range or headcount) and industry',
      'Strategic decision: next-phase growth, new market entry, portfolio direction, or organisational pivot',
      'Key constraint: board alignment, capital, talent, or market timing',
      'Time horizon for this decision and whether there is a board or investor deadline',
      'What they have already considered and ruled out'
    ],
    language: 'Speak in strategic frameworks, not tactics. Reference market sizing, competitive moats, and board-level considerations. Be concise — executives have low tolerance for generic advice. Every recommendation needs a business case.'
  },
  government: {
    label: 'Government Body / Policy Maker',
    needs: [
      'Type of programme: livelihood, skill mission, startup ecosystem, or policy direction',
      'Target population: demographics, geography, income level, sector',
      'Budget range and implementation timeline',
      'Key success metric: jobs created, revenue generated, enterprises launched, or skill certificates issued',
      'Existing programmes this builds on or must not conflict with'
    ],
    language: 'Frame everything around impact metrics, implementation feasibility, and stakeholder alignment. Reference real-world programme benchmarks (India: MUDRA, PM Vishwakarma, Skill India; global: IFC SME programmes, GIZ livelihood missions). Be realistic about last-mile delivery challenges.'
  }
}

const VALID_PERSONAS = ['student','employee','entrepreneur','smb_owner','ceo_executive','government']

function strip(r) {
  return r.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
}

async function checkRateLimit(supabase, userId, isByok) {
  try {
    const perHour = isByok ? 60 : 30
    const perDay  = isByok ? 300 : 150
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: 'clarify-roadmap-prompt',
      p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed)
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[clarify-rm] rate limit error:', e) }
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
    if (d.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Gemini response truncated.')
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } catch (e) { clearTimeout(timeout); throw e }
}

// --- INPUT GUARD ---
async function runInputGuard(apiKey, query) {
  const guardPrompt = `You are a strict input validator for a professional career and business roadmap platform.
Your ONLY job is to classify whether the user's input describes a real goal, career aspiration, business venture, or life direction worth building a roadmap for.

User input: "${query.slice(0, 500)}"

Classify this input into exactly one of these categories:

1. "valid" — A real goal, career direction, business idea, or life aspiration. Even rough, personal, or unconventional goals count. Err heavily on the side of valid — only reject if clearly nonsensical, offensive, or completely off-topic.

2. "gibberish" — Random characters, keyboard mashing, meaningless strings with no semantic content. Not just a vague goal — literally unreadable.

3. "abuse" — Sexually explicit, threatening, hateful, or personally offensive content. A blunt or edgy goal is NOT abuse — only explicit harassment or sexual aggression counts.

4. "too_vague" — So devoid of content that no roadmap direction can be inferred even with follow-up (e.g. "something", "idk", "be successful"). A vague goal with at least one noun, domain, or direction is NOT too_vague.

5. "off_topic" — Clearly not about a career, business, or life goal at all. Pure philosophy, political rants, test inputs like "hello", math problems, etc.

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
      gibberish: "That doesn't look like a goal or idea. Try something like: 'I want to become a UX designer' or 'I'm a student looking to start a business after graduation'.",
      abuse:     "That's not something we can build a roadmap for. Tell us what you want to achieve and we'll map the path.",
      too_vague: "Too vague to map a direction. Give us something to work with — e.g. 'break into product management', 'launch a food brand', 'scale my retail business'.",
      off_topic: "PowerProof Roadmap is built for career and business goals. What are you trying to build or become?",
    }

    console.log(`[clarify-rm] input guard blocked: category=${category}`)
    return new Response(
      JSON.stringify({ status: 'invalid', category, message: messages[category] }),
      { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.warn('[clarify-rm] input guard error (fail-open):', String(e))
    return null
  }
}

function buildClarifyPrompt(query, country, round, previousAnswers, detectedPersona) {
  const answersBlock = previousAnswers.length > 0
    ? `\nAnswers so far:\n${previousAnswers.map(a =>
        `- ${a.question_text}: ${Array.isArray(a.answer) ? a.answer.join(', ') : a.answer}`
      ).join('\n')}`
    : ''
  const forceReady = round >= MAX_ROUNDS
  const personaCtx = detectedPersona ? PERSONA_CONTEXT[detectedPersona] : null
  const personaBlock = personaCtx
    ? `\nCONFIRMED PERSONA: ${personaCtx.label}\nPersona-specific context needed:\n${personaCtx.needs.map(n => `- ${n}`).join('\n')}\nTone: ${personaCtx.language}`
    : ''

  return `You are an expert roadmap architect for PowerProof — a platform for anyone building something.
PowerProof serves: Students (career/venture direction), Employees (career pivots, side ventures), Entrepreneurs (validation before investing), Small Business Owners (grow/pivot/hold), CEOs/Executives (strategic direction), and Government Bodies (impact programmes).

Original goal: "${query}"
Country: ${country}
Clarification round: ${round + 1} of ${MAX_ROUNDS}${answersBlock}${personaBlock}

${
  forceReady
    ? 'Maximum rounds reached. Return status "ready" now using all context collected. Infer any missing persona from the goal text.'
    : round === 0 && !detectedPersona
    ? `ROUND 0 — PERSONA DETECTION:
First, try to infer the persona from the goal text. If clearly obvious (e.g. "I am a student", "my startup", "our government programme"), set detected_persona and ask 1-2 substantive questions.
If ambiguous, the FIRST question MUST be the persona question with these exact options:
["Student", "Employee / Professional", "Entrepreneur", "Small Business Owner", "CEO / Executive", "Government Body"]
Then ask at most 1 more follow-up question.
Always return detected_persona in your response (null if truly ambiguous).`
    : `Evaluate if you have enough context to build a truly personalised roadmap for this ${personaCtx?.label ?? 'user'}.
You need to cover the persona-specific context listed above. Do NOT re-ask answered questions.
If enough context: return "ready". If not: ask MAX 2 focused questions specific to the ${personaCtx?.label ?? 'user'} persona.
Prioritise questions that would most change the roadmap structure.`
}

Return ONLY valid JSON — one of these shapes:

Shape A (more info needed):
{"status":"needs_more","detected_persona":"student|employee|entrepreneur|smb_owner|ceo_executive|government|null","questions":[{"id":"q1","text":"Short question?","type":"single_select","options":["A","B"],"required":true}]}

Shape B (ready):
{"status":"ready","detected_persona":"student|employee|entrepreneur|smb_owner|ceo_executive|government","refined_prompt":"Specific 2-3 sentence goal description with full context.","summary":"One sentence: who they are and what they are building toward."}

Types: single_select (pick one), multi_select (pick many), checkbox (yes/no), text (free input).
Options required for single_select and multi_select. Keep options SHORT (max 5 words each).
NEVER ask about information already provided in the answers block.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const PLATFORM_GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const SUPABASE_ANON_KEY   = Deno.env.get('SUPABASE_ANON_KEY')

  if (!PLATFORM_GEMINI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const byokKey   = req.headers.get('x-gemini-key')?.trim() || null
    const geminiKey = byokKey ?? PLATFORM_GEMINI_KEY
    const isByok    = !!byokKey

    const body = await req.json()
    const { query, country = 'India', round = 0, previous_answers = [], detected_persona = null } = body

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
    const raw    = await gemini(geminiKey, buildClarifyPrompt(query, country, effectiveRound, previous_answers, detected_persona), GEMINI_MODEL, 8192)
    const parsed = JSON.parse(strip(raw))

    const returnedPersona = VALID_PERSONAS.includes(parsed.detected_persona)
      ? parsed.detected_persona
      : detected_persona

    if (parsed.status === 'needs_more') {
      const questions = (parsed.questions ?? []).slice(0, 3).map((q, i) => ({
        id: String(q.id ?? `q${i+1}`),
        text: String(q.text ?? ''),
        type: ['single_select','multi_select','checkbox','text'].includes(q.type) ? q.type : 'single_select',
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        required: Boolean(q.required ?? true)
      }))
      return new Response(
        JSON.stringify({ status: 'needs_more', round: effectiveRound, questions, detected_persona: returnedPersona, byok: isByok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (parsed.status === 'ready') {
      return new Response(
        JSON.stringify({ status: 'ready', refined_prompt: String(parsed.refined_prompt ?? query), summary: String(parsed.summary ?? ''), detected_persona: returnedPersona, round: effectiveRound, byok: isByok }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ status: 'ready', refined_prompt: query, summary: '', detected_persona: returnedPersona, round: effectiveRound, byok: isByok }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[clarify-rm] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

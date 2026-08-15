// generate-itch v7
// Fix: stronger per-request randomness + prompt entropy
// - Uses crypto RNG instead of Math.random sort shuffles
// - Adds nonce in prompts to reduce repeated Gemini outputs
// - Expands seen-country bias by including session-shown cards
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_FALLBACK = 'gemini-2.5-flash'
const CARDS_PER_FETCH = 3

const VALID_FREQUENCIES = ['multiple_times_daily', 'daily', 'weekly', 'monthly']
const VALID_CATEGORIES = [
  'food-agri', 'retail', 'services', 'digital', 'health',
  'logistics', 'fintech', 'education', 'manufacturing', 'ev-energy',
]

const CATEGORY_CONTEXTS: Record<string, string> = {
  'food-agri': 'farmers, food manufacturers, restaurant operators, FMCG distributors, agri-input dealers, cold chain operators, mandi traders',
  'retail': 'kirana store owners, franchise operators, wholesale traders, retail chain managers, D2C brand owners, market stall operators',
  'services': 'salon owners, laundry operators, home service providers, event managers, repair shop owners, cleaning service operators',
  'digital': 'SaaS founders, freelance developers, content creators monetising online, digital agency owners, no-code tool builders',
  'health': 'clinic owners, pharmacy retailers, diagnostic lab operators, physiotherapy centre owners, medical device distributors',
  'logistics': 'truck fleet operators, courier franchise owners, last-mile delivery managers, warehouse operators, freight brokers, tempo drivers',
  'fintech': 'MSME loan DSA brokers, insurance POSP agents, mutual fund distributors, payment aggregator partners, chit fund operators, microfinance field agents',
  'education': 'coaching centre owners, preschool franchise operators, skill training institutes, private tutors running centres',
  'manufacturing': 'MSME factory owners, contract manufacturers, raw material traders, export unit managers, job-work unit operators',
  'ev-energy': 'EV charging station operators, solar installation businesses, EV fleet owners, battery swap station operators',
}

const ALL_COUNTRIES = [
  'India', 'Nigeria', 'Indonesia', 'Brazil', 'Kenya',
  'Bangladesh', 'Vietnam', 'Philippines', 'Egypt', 'Pakistan',
  'Mexico', 'Ethiopia', 'Tanzania', 'Ghana', 'Uganda',
]

async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Response | null> {
  try {
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: 'generate-itch',
      p_calls_per_hour: 20, p_calls_per_day: 100,
    })
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
    }
  } catch (e) {
    console.error('[itch] rate limit error:', e)
  }
  return null
}

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return bytes[0] % maxExclusive
}

function pickRandom<T>(arr: T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return []
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy.slice(0, Math.min(n, copy.length))
}

function makeNonce(): string {
  const bytes = new Uint32Array(2)
  crypto.getRandomValues(bytes)
  return `${Date.now().toString(36)}-${bytes[0].toString(36)}-${bytes[1].toString(36)}`
}

function buildPrompt(category: string, country: string, nonce: string): string {
  const operatorContext = CATEGORY_CONTEXTS[category] ?? 'business operators and entrepreneurs'
  return `You are ItchMyBack — a founder-intelligence system that finds DEEP, STRUCTURAL, OPERATIONAL problems faced by business operators every single day.

YOUR MISSION: Generate exactly 1 itch card.
CATEGORY: ${category}
OPERATOR TYPES IN THIS CATEGORY: ${operatorContext}
COUNTRY: ${country}
RUN_NONCE: ${nonce}

This card MUST be about an operator in ${country}. Use local currency, local geography, local platform names.
The generated complaint should be novel and avoid repeating common templates from prior runs.

===================== WHAT MAKES A GREAT ITCH =====================
Felt by a BUSINESS OPERATOR running a business — NOT a consumer's personal frustration
Structural — caused by missing infrastructure, regulation, trust gap, unit economics failure
Recurring — happens daily or multiple times a week as part of running the business
Unsolved — no product today solves it well for this specific operator
Specific — mentions real quantities, timeframes, money amounts

===================== TITLE VOICE RUBRIC (submit only 8+/10) =====================
10/10: "I drove my truck 400km to Kano, delivered the cargo, and now I'm parked here 3 days waiting for a return load — diesel is bleeding me dry"
9/10: "My FMCG distributor gives me 7-day credit but my retailers pay in 30 days — I'm floating N2M in working capital every month just to keep stock moving"
8/10: "I send repayment reminders to 60 loan clients every Monday by WhatsApp, one by one, manually, for two hours"
5/10: "Managing payments is challenging" <- REJECTED
4/10: "I need better software for my business" <- REJECTED

Return ONLY a valid JSON object. No markdown. No array.
{"title":"raw operator complaint, 8+/10 voice, specific, max 35 words","persona":"age, role, city/region in ${country}, business size","frequency":"multiple_times_daily|daily|weekly|monthly","why_unsolved":"2 sentences, exact structural barrier in ${country}","what_exists":"real local products/companies and why they fail","the_gap":"1-2 sentences, specific mechanism and channel","category_slug":"${category}","country":"${country}","nirmaan_score":70}`
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  let lastErr: Error = new Error('Gemini failed')
  for (const model of [GEMINI_MODEL, GEMINI_FALLBACK]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 4000))
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.95, topP: 0.95, maxOutputTokens: 2048, responseMimeType: 'application/json' },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
        })
        if (res.status === 503 || res.status === 429) {
          lastErr = new Error(`${model} ${res.status}`)
          break
        }
        if (!res.ok) throw new Error(`${model} ${res.status}`)
        const d = await res.json()
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        if (!text) {
          lastErr = new Error('Empty')
          continue
        }
        return text
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e))
        if (!String(e).match(/503|429|Empty/)) throw lastErr
      }
    }
  }
  throw lastErr
}

function strip(s: string): string {
  return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

function validateCard(raw: Record<string, unknown>): boolean {
  return (
    typeof raw.title === 'string' && raw.title.trim().length > 15 &&
    typeof raw.persona === 'string' && raw.persona.trim().length > 10 &&
    VALID_FREQUENCIES.includes(raw.frequency as string) &&
    typeof raw.why_unsolved === 'string' && raw.why_unsolved.trim().length > 30 &&
    typeof raw.what_exists === 'string' && raw.what_exists.trim().length > 30 &&
    typeof raw.the_gap === 'string' && raw.the_gap.trim().length > 20 &&
    typeof raw.category_slug === 'string' &&
    typeof raw.country === 'string' && raw.country.trim().length > 0 &&
    typeof raw.nirmaan_score === 'number'
  )
}

async function generateOneCard(
  apiKey: string,
  category: string,
  country: string,
  nonce: string,
): Promise<Record<string, unknown> | null> {
  try {
    const raw = await callGemini(apiKey, buildPrompt(category, country, nonce))
    const cleaned = strip(raw)
    let parsed: Record<string, unknown> | null
    if (cleaned.startsWith('[')) {
      const arr = JSON.parse(cleaned)
      parsed = Array.isArray(arr) && arr.length > 0 ? arr[0] : null
    } else {
      parsed = JSON.parse(cleaned)
    }
    if (!parsed || !validateCard(parsed)) {
      console.warn(`[itch] invalid card for ${country}/${category}`)
      return null
    }
    parsed.country = country
    parsed.category_slug = category
    return parsed
  } catch (e) {
    console.error(`[itch] failed ${country}/${category}:`, e)
    return null
  }
}

async function generateFreshCards(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  excludeCountries: string[] = [],
): Promise<Record<string, unknown>[]> {
  const fresh = ALL_COUNTRIES.filter((c) => !excludeCountries.includes(c))
  const pool = fresh.length >= CARDS_PER_FETCH ? fresh : ALL_COUNTRIES
  const countries = pickRandom(pool, CARDS_PER_FETCH)
  const categories = pickRandom(Object.keys(CATEGORY_CONTEXTS), CARDS_PER_FETCH)
  const batchNonce = makeNonce()

  console.log(`[itch] nonce=${batchNonce} generating for: ${countries.join(', ')} | cats: ${categories.join(', ')}`)

  const results = await Promise.all(
    countries.map((country, i) => generateOneCard(apiKey, categories[i], country, `${batchNonce}-${i}`)),
  )

  const valid = results.filter((c): c is Record<string, unknown> => c !== null)
  if (valid.length === 0) throw new Error('All generations failed')

  const toInsert = valid.map((c) => ({
    title: String(c.title).trim().slice(0, 300),
    persona: String(c.persona).trim().slice(0, 200),
    frequency: c.frequency as string,
    why_unsolved: String(c.why_unsolved).trim().slice(0, 1000),
    what_exists: String(c.what_exists).trim().slice(0, 1000),
    the_gap: String(c.the_gap).trim().slice(0, 500),
    category_slug: String(c.category_slug).trim(),
    country: String(c.country).trim().slice(0, 100),
    nirmaan_score: Math.min(100, Math.max(0, Math.round(Number(c.nirmaan_score)))),
    source: 'ai',
    status: 'live',
  }))

  const { data: inserted, error } = await supabase
    .from('itch_cards')
    .insert(toInsert)
    .select('*')

  if (error) throw new Error(`Insert failed: ${error.message}`)
  return (inserted ?? []).map((c: Record<string, unknown>) => ({ ...c, user_reaction: null }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const limited = await checkRateLimit(supabase, user.id)
    if (limited) return limited

    const body = await req.json().catch(() => ({}))
    const action = String(body.action ?? 'fetch')

    if (action === 'create') {
      const { title, persona, frequency, why_unsolved, what_exists, the_gap, category_slug, country, is_public = true } = body
      const missing: string[] = []
      if (!title?.trim() || title.trim().length < 10) missing.push('title (min 10 chars)')
      if (!persona?.trim() || persona.trim().length < 5) missing.push('persona')
      if (!VALID_FREQUENCIES.includes(frequency)) missing.push('frequency')
      if (!why_unsolved?.trim() || why_unsolved.trim().length < 20) missing.push('why_unsolved (min 20 chars)')
      if (!what_exists?.trim() || what_exists.trim().length < 10) missing.push('what_exists')
      if (!the_gap?.trim() || the_gap.trim().length < 10) missing.push('the_gap')
      if (!country?.trim()) missing.push('country')
      if (missing.length > 0) {
        return new Response(JSON.stringify({ error: `Missing or invalid fields: ${missing.join(', ')}` }), { status: 400, headers: corsHeaders })
      }

      const finalCategory = VALID_CATEGORIES.includes(category_slug) ? category_slug : 'services'
      const { data: inserted, error: insertErr } = await supabase.from('itch_cards').insert({
        title: String(title).trim().slice(0, 300),
        persona: String(persona).trim().slice(0, 200),
        frequency,
        why_unsolved: String(why_unsolved).trim().slice(0, 1000),
        what_exists: String(what_exists).trim().slice(0, 1000),
        the_gap: String(the_gap).trim().slice(0, 500),
        category_slug: finalCategory,
        country: String(country).trim().slice(0, 100),
        nirmaan_score: 50,
        source: 'user',
        created_by: user.id,
        is_public: Boolean(is_public),
        status: 'live',
      }).select('*').single()

      if (insertErr || !inserted) {
        return new Response(JSON.stringify({ error: insertErr?.message ?? 'Insert failed' }), { status: 500, headers: corsHeaders })
      }

      return new Response(
        JSON.stringify({ ok: true, card: { ...inserted, user_reaction: null } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'my_itches') {
      const { data: myCards, error: fetchErr } = await supabase
        .from('itch_cards')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
      if (fetchErr) return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: corsHeaders })

      const myIds = (myCards ?? []).map((c: { id: string }) => c.id)
      let reactionMap: Record<string, string> = {}
      if (myIds.length > 0) {
        const { data: reactions } = await supabase
          .from('user_itch_saves')
          .select('itch_card_id, reaction')
          .eq('user_id', user.id)
          .in('itch_card_id', myIds)
        reactionMap = Object.fromEntries((reactions ?? []).map((r: { itch_card_id: string; reaction: string }) => [r.itch_card_id, r.reaction]))
      }

      return new Response(
        JSON.stringify({
          cards: (myCards ?? []).map((c: Record<string, unknown>) => ({ ...c, user_reaction: reactionMap[c.id as string] ?? null })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'saved') {
      const { data: saveRows, error: savesErr } = await supabase
        .from('user_itch_saves')
        .select('itch_card_id, reaction, created_at')
        .eq('user_id', user.id)
        .eq('reaction', 'saved')
        .order('created_at', { ascending: false })
      if (savesErr) return new Response(JSON.stringify({ error: savesErr.message }), { status: 500, headers: corsHeaders })

      const savedIds = (saveRows ?? []).map((r: { itch_card_id: string }) => r.itch_card_id)
      if (savedIds.length === 0) {
        return new Response(JSON.stringify({ cards: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: savedCards, error: cardsErr } = await supabase.from('itch_cards').select('*').in('id', savedIds)
      if (cardsErr) return new Response(JSON.stringify({ error: cardsErr.message }), { status: 500, headers: corsHeaders })

      const cardMap = new Map((savedCards ?? []).map((c: Record<string, unknown>) => [String(c.id), c]))
      const cards = savedIds
        .map((id) => cardMap.get(id))
        .filter((c): c is Record<string, unknown> => Boolean(c))
        .map((c) => ({ ...c, user_reaction: 'saved' }))

      return new Response(
        JSON.stringify({ cards }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'delete') {
      const { itch_card_id } = body
      if (!itch_card_id) return new Response(JSON.stringify({ error: 'itch_card_id required' }), { status: 400, headers: corsHeaders })
      const { error: delErr } = await supabase.from('itch_cards').delete().eq('id', itch_card_id).eq('created_by', user.id)
      if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'react') {
      const { itch_card_id, reaction } = body
      if (!itch_card_id || !['saved', 'dismissed', 'upvoted', 'researched'].includes(reaction)) {
        return new Response(JSON.stringify({ error: 'itch_card_id and valid reaction required' }), { status: 400, headers: corsHeaders })
      }
      const { error: upsertErr } = await supabase
        .from('user_itch_saves')
        .upsert({ user_id: user.id, itch_card_id, reaction }, { onConflict: 'user_id,itch_card_id' })
      if (upsertErr) return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: seenRows } = await supabase
      .from('user_itch_saves')
      .select('itch_card_id')
      .eq('user_id', user.id)

    const today = new Date().toISOString().slice(0, 10)
    const { data: existingSession } = await supabase
      .from('user_itch_sessions')
      .select('id, shown_itch_ids')
      .eq('user_id', user.id)
      .eq('session_date', today)
      .single()

    const seenFromSaves = (seenRows ?? []).map((r: { itch_card_id: string }) => r.itch_card_id)
    const shownFromSession = (existingSession?.shown_itch_ids ?? []) as string[]
    const seenIds = [...new Set([...seenFromSaves, ...shownFromSession])]

    let seenCountries: string[] = []
    if (seenIds.length > 0) {
      const { data: seenCards } = await supabase.from('itch_cards').select('country').in('id', seenIds)
      seenCountries = [...new Set((seenCards ?? []).map((c: { country: string }) => c.country))]
    }

    const cards = await generateFreshCards(supabase, GEMINI_API_KEY, seenCountries)
    const newIds = cards.map((c: Record<string, unknown>) => c.id as string)

    if (existingSession) {
      const combined = [...new Set([...(existingSession.shown_itch_ids ?? []), ...newIds])]
      await supabase.from('user_itch_sessions').update({ shown_itch_ids: combined }).eq('id', existingSession.id)
    } else {
      await supabase.from('user_itch_sessions').insert({ user_id: user.id, session_date: today, shown_itch_ids: newIds })
    }

    return new Response(
      JSON.stringify({ cards, from_session: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[itch] FATAL:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

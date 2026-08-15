// ask-research-ai v9
// PLAN CHANGE: chat is no longer unconditionally unlimited. Starter now has a daily message
// cap (chat_daily_limit, checked via deduct_chat_message_usage); Pro/Trial remain unlimited
// (chat_unlimited=true skips the counter inside the RPC itself).
// FIX (opportunities table retired): catalog-ask path now reads from user_opportunities
// with visibility='catalog' AND status='published' instead of the retired `opportunities` table.
// FORMATTING: chat replies now instructed to use markdown (bold/bullets/headers) for nicer rendering.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key',
}
const GEMINI_MODEL   = 'gemini-2.5-flash'
const GEMINI_LITE    = 'gemini-2.5-flash-lite'
const GEMINI_TIMEOUT = 60_000
const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]
const FALLBACK_SUGGESTIONS = [
  { label: 'How do I get my first customer?',  prefill: 'What is the fastest way to get my first customer for this business?' },
  { label: 'Who are my real competitors?',      prefill: 'Who are my most dangerous competitors and how do I differentiate?' },
  { label: 'Biggest risk to address first',     prefill: 'What is the biggest risk in this business and how should I address it first?' },
  { label: 'How much capital do I need?',       prefill: 'How much capital do I realistically need to start and reach break-even?' },
]
const OPP_SELECT =
  'id, title, tagline, full_desc, category_slug, score, country, is_saturated, saturation_note, pros, cons, competitors, demand_trend, market_verdict, future_outlook, expert_tips_structured, pain_points'

function ensureArray(val) {
  if (Array.isArray(val)) return val
  if (val == null) return []
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}
function getUser(req) {
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  const token = auth.replace(/^Bearer\s+/i, '')
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub ? { id: payload.sub } : null
  } catch { return null }
}
async function geminiCall(apiKey, model, prompt, maxTokens = 4096) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens }, safetySettings: SAFETY }),
    })
    clearTimeout(t)
    if (!res.ok) throw new Error(`Gemini ${res.status}`)
    const d = await res.json()
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty response')
    return text
  } catch (e) { clearTimeout(t); throw e }
}
function buildResearchContext(opp) {
  const competitors = ensureArray(opp.competitors).map(c => `  - ${c.name ?? c}`).join('\n')
  const pros = ensureArray(opp.pros).join(' | ')
  const cons = ensureArray(opp.cons).join(' | ')
  const tips = ensureArray(opp.expert_tips_structured).map(t => `  - ${t.tip ?? t}`).join('\n')
  const painPoints = ensureArray(opp.pain_points).map(p => `  - ${p.point ?? p}`).join('\n')
  return `RESEARCH: "${opp.title}"\nQuery: ${opp.research_query ?? opp.title}\nCountry: ${opp.country ?? 'India'} | Category: ${opp.category_slug ?? 'N/A'}\nScore: ${opp.score ?? 'N/A'}/100 | Saturated: ${opp.is_saturated ? 'Yes — ' + (opp.saturation_note ?? '') : 'No'}\nTagline: ${opp.tagline ?? 'N/A'}\nSummary: ${(opp.full_desc ?? '').slice(0, 400)}\nMARKET VERDICT: ${JSON.stringify(opp.market_verdict ?? {})}\nDEMAND TREND: ${JSON.stringify(opp.demand_trend ?? {})}\nFUTURE OUTLOOK: ${JSON.stringify(opp.future_outlook ?? {})}\nCOMPETITORS:\n${competitors || '  None'}\nPAIN POINTS:\n${painPoints || '  None'}\nEXPERT TIPS:\n${tips || '  None'}\nPROS: ${pros || 'None'}\nCONS: ${cons || 'None'}`
}
async function generateSuggestions(apiKey, context, recentHistory) {
  const isInitial = recentHistory.length === 0
  const historyBlock = isInitial
    ? 'The user just opened the Ask AI panel for the first time. No conversation yet.'
    : `Recent conversation:\n${recentHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${String(m.content).slice(0, 150)}`).join('\n')}`
  const prompt = isInitial
    ? `You are generating opening suggestion chips for a user who just opened Ask AI on their research report.\n\nRESEARCH CONTEXT:\n${context}\n\n${historyBlock}\n\nGenerate exactly 4 specific, curious questions this user would genuinely want to ask about THIS specific research — referencing the actual business name, specific competitors, market score, or pain points from the data. Make them feel like they were written specifically for this report, not generic.\nUnder 8 words for label, under 20 words for prefill.\n\nReturn ONLY a JSON array, no markdown:\n[{"label": "short label", "prefill": "full question to send"}]`
    : `You are generating follow-up suggestions after a conversation about a research report.\n\nRESEARCH CONTEXT:\n${context}\n\n${historyBlock}\n\nGenerate exactly 4 specific follow-up questions the user would naturally want to ask NEXT based on what was just discussed. Reference actual data from this report.\nUnder 8 words for label, under 20 words for prefill.\n\nReturn ONLY a JSON array, no markdown:\n[{"label": "short label", "prefill": "full question to send"}]`
  try {
    const raw = await geminiCall(apiKey, GEMINI_LITE, prompt, 512)
    const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4)
  } catch { /* fall through */ }
  return FALLBACK_SUGGESTIONS
}
function buildMessagePrompt(userMessage, context, recentHistory) {
  const historyBlock = recentHistory.length > 0
    ? `\nRecent conversation:\n${recentHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${String(m.content).slice(0, 200)}`).join('\n')}`
    : ''
  return `You are PowerProof's Research AI — a sharp business analyst embedded inside a user's specific market research report.
Every answer must reference THIS specific business and market data.

${context}${historyBlock}

User: "${userMessage}"

Rules:
- Reference actual data: score, competitors, market verdict, demand trend
- Practical, specific, grounded in their market reality
- Direct. No padding. Under 300 words unless depth needed.
- Do NOT include "Next action:" or any action text inside the reply field.
- Format the "reply" field's text using markdown: **bold** key numbers/terms, use "- " bullet lists for multiple points, use short "## " headers only if the answer has distinct sections, keep paragraphs short (2-3 sentences max).

Return ONLY valid JSON (the outer object itself must NOT be wrapped in markdown fences — only the "reply" string's own content should contain markdown syntax):
{
  "reply": "Your full conversational answer here, formatted with markdown (bold, bullets, headers as appropriate). No next actions inside this field.",
  "next_actions": [
    "Specific action the user can take right now — under 12 words",
    "Second concrete action — under 12 words",
    "Third concrete action — under 12 words"
  ]
}

next_actions rules:
- Exactly 2-3 items
- Each is a complete, standalone action sentence — not a question, not a label
- Specific to THIS business and THIS user's situation from the research data
- Under 12 words each
- These will be shown as tappable chips the user can click to proceed — write them accordingly`
}
function parseMessageResponse(raw) {
  try {
    const cleaned = raw.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
    const parsed = JSON.parse(cleaned)
    if (parsed && typeof parsed.reply === 'string') {
      return {
        reply: parsed.reply.trim(),
        next_actions: Array.isArray(parsed.next_actions)
          ? parsed.next_actions.filter(a => typeof a === 'string' && a.trim()).slice(0, 3)
          : []
      }
    }
  } catch { /* fall through to text extraction */ }
  const lines = raw.split('\n')
  const actionLines = []
  const replyLines = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^next action[s]?:/i.test(trimmed)) {
      const action = trimmed.replace(/^next action[s]?:\s*/i, '').trim()
      if (action) actionLines.push(action)
    } else {
      replyLines.push(line)
    }
  }
  return {
    reply: replyLines.join('\n').trim(),
    next_actions: actionLines.slice(0, 3)
  }
}
async function checkRateLimit(db, userId, isByok) {
  try {
    const { data: rl } = await db.rpc('check_and_increment_rate_limit', { p_user_id: userId, p_function_name: 'ask-research-ai', p_calls_per_hour: isByok ? 40 : 20, p_calls_per_day: isByok ? 200 : 100 })
    if (rl && !rl.allowed) return new Response(JSON.stringify({ error: `Limit reached. Resets at ${rl.resets_at}.`, code: rl.reason }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[ask-research] rate limit:', e) }
  return null
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  try {
    const user = getUser(req)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const byokKey = req.headers.get('x-gemini-key')?.trim() || null
    const geminiKey = byokKey ?? GEMINI_API_KEY
    const isByok = !!byokKey
    const body = await req.json()
    const { mode, user_opportunity_id, opportunity_id, session_id, message, onboarding_demo } = body
    const isCatalogAsk = Boolean(opportunity_id)
    const isOnboardingDemo = onboarding_demo === true && isCatalogAsk
    if (!user_opportunity_id && !isCatalogAsk) {
      return new Response(JSON.stringify({ error: 'user_opportunity_id required' }), { status: 400, headers: corsHeaders })
    }

    let opp
    if (isCatalogAsk) {
      const { data, error: oppErr } = await db.from('user_opportunities')
        .select(OPP_SELECT)
        .eq('id', opportunity_id)
        .eq('visibility', 'catalog')
        .eq('status', 'published')
        .single()
      if (oppErr || !data) return new Response(JSON.stringify({ error: 'Opportunity not found' }), { status: 404, headers: corsHeaders })
      opp = { ...data, research_query: data.title, research_status: 'complete' }
    } else {
      const { data, error: oppErr } = await db.from('user_opportunities')
        .select('id, user_id, title, tagline, full_desc, research_query, category_slug, score, country, is_saturated, saturation_note, pros, cons, competitors, demand_trend, market_verdict, future_outlook, expert_tips_structured, pain_points, research_status')
        .eq('id', user_opportunity_id).eq('user_id', user.id).single()
      if (oppErr || !data) return new Response(JSON.stringify({ error: 'Research not found' }), { status: 404, headers: corsHeaders })
      if (data.research_status !== 'complete') return new Response(JSON.stringify({ error: 'Research not complete yet' }), { status: 400, headers: corsHeaders })
      opp = data
    }

    const context = buildResearchContext(opp)
    if (mode === 'history') {
      if (isCatalogAsk) {
        const suggestions = await generateSuggestions(geminiKey, context, [])
        return new Response(JSON.stringify({ sessions: [], suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: sessions } = await db.from('research_chat_sessions').select('id, messages, total_credits_used, created_at, updated_at').eq('user_opportunity_id', user_opportunity_id).eq('user_id', user.id).order('created_at', { ascending: false })
      const filtered = (sessions ?? []).filter(s => Array.isArray(s.messages) && s.messages.length > 0)
      const lastSession = filtered[0]
      const recentHistory = lastSession ? (lastSession.messages ?? []).slice(-4).map(m => ({ role: String(m.role), content: String(m.content).slice(0, 150) })) : []
      const suggestions = await generateSuggestions(geminiKey, context, recentHistory)
      return new Response(JSON.stringify({ sessions: filtered, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (mode === 'new_session') {
      const suggestions = await generateSuggestions(geminiKey, context, [])
      return new Response(JSON.stringify({ session_id: crypto.randomUUID(), suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (mode === 'message') {
      if (!session_id) return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders })
      if (!message?.trim()) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })
      const limited = await checkRateLimit(db, user.id, isByok || isOnboardingDemo)
      if (limited) return limited

      let chatUsage = { unlimited: true }
      if (!isByok && !isOnboardingDemo) {
        const { data: usageResult, error: usageErr } = await db.rpc('deduct_chat_message_usage', { p_user_id: user.id })
        if (usageErr) return new Response(JSON.stringify({ error: 'Usage error', detail: usageErr.message }), { status: 500, headers: corsHeaders })
        if (!usageResult?.success) {
          const reason = usageResult?.error
          if (reason === 'no_active_subscription') return new Response(JSON.stringify({ error: 'No active subscription found.', code: reason }), { status: 402, headers: corsHeaders })
          return new Response(JSON.stringify({ error: `Daily chat limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0} today. Resets tomorrow.`, code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0 }), { status: 402, headers: corsHeaders })
        }
        chatUsage = usageResult
      }

      let sessionMessages = []
      let existingSession = null
      if (isCatalogAsk) {
        const incoming = Array.isArray(body.recent_messages) ? body.recent_messages : []
        sessionMessages = incoming
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-6)
          .map((m) => ({ role: String(m.role), content: String(m.content).slice(0, 200) }))
      } else {
        const { data } = await db.from('research_chat_sessions').select('*').eq('id', session_id).eq('user_id', user.id).maybeSingle()
        existingSession = data
        if (existingSession) { sessionMessages = existingSession.messages ?? [] }
        else { await db.from('research_chat_sessions').insert({ id: session_id, user_opportunity_id, user_id: user.id, messages: [], total_credits_used: 0 }) }
      }
      const recentHistory = sessionMessages.slice(-6).map(m => ({ role: String(m.role ?? 'user'), content: String(m.content ?? '').slice(0, 200) }))
      const [rawReply, suggestions] = await Promise.all([
        geminiCall(geminiKey, GEMINI_MODEL, buildMessagePrompt(message, context, recentHistory)),
        generateSuggestions(geminiKey, context, [...recentHistory, { role: 'user', content: message }]),
      ])
      const { reply, next_actions } = parseMessageResponse(rawReply)
      if (!isCatalogAsk) {
        const newMessages = [
          ...sessionMessages,
          { role: 'user', content: message, created_at: new Date().toISOString() },
          { role: 'assistant', content: reply, next_actions, created_at: new Date().toISOString(), byok: isByok }
        ]
        await db.from('research_chat_sessions').update({
          messages: newMessages,
          updated_at: new Date().toISOString()
        }).eq('id', session_id)
      }
      return new Response(JSON.stringify({
        reply, next_actions, suggestions, byok_used: isByok,
        chat_unlimited: chatUsage.unlimited !== false,
        chat_used: chatUsage.used ?? null,
        chat_allowance: chatUsage.allowance ?? null,
        chat_remaining: chatUsage.remaining ?? null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), { status: 400, headers: corsHeaders })
  } catch (err) {
    console.error('[ask-research] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

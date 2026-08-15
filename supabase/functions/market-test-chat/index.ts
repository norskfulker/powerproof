// market-test-chat v8
// PLAN CHANGE: chat is no longer unconditionally unlimited. Starter now has a daily message
// cap via deduct_chat_message_usage; Pro/Trial remain unlimited.
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
  { label: 'Who should I target on Meta?',  prefill: 'Who should I target on Meta ads for this business?' },
  { label: 'Best subreddits to post in',    prefill: 'Which subreddits should I post in to validate this idea?' },
  { label: 'Write a LinkedIn cold DM',      prefill: 'Write me a cold DM script for LinkedIn outreach.' },
  { label: 'Google keywords to target',     prefill: 'What Google keywords should I target — paid vs organic?' },
]
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
function buildMarketTestContext(test) {
  const signals  = (test.demand_signals  ?? []).map(s => `  - ${s.signal} (${s.strength}): ${s.evidence}`).join('\n')
  const flags    = (test.red_flags       ?? []).map(f => `  - ${f.flag} (${f.severity}): ${f.evidence}`).join('\n')
  const failures = (test.past_failures   ?? []).map(f => `  - ${f.company ?? 'Unknown'}: ${f.what_happened} → ${f.lesson}`).join('\n')
  const wins     = (test.past_successes  ?? []).map(s => `  - ${s.company ?? 'Unknown'}: ${s.what_worked} → ${s.lesson}`).join('\n')
  return `MARKET TEST: "${test.query}"\nCountry: ${test.country ?? 'India'}\nVerdict: ${test.verdict_label ?? test.verdict ?? 'N/A'} | Score: ${test.market_reality_score ?? 'N/A'}/100\nHonest take: ${test.honest_verdict ?? 'N/A'}\n\nDEMAND SIGNALS:\n${signals || '  None'}\nRED FLAGS:\n${flags || '  None'}\nFAILED COMPANIES:\n${failures || '  None'}\nSUCCESSFUL COMPANIES:\n${wins || '  None'}\nPROS: ${(test.pros ?? []).join(' | ')}\nCONS: ${(test.cons ?? []).join(' | ')}`
}
async function generateSuggestions(apiKey, context, recentHistory) {
  const isInitial = recentHistory.length === 0
  const historyBlock = isInitial
    ? 'The user just opened the Ask AI panel for the first time. No conversation yet.'
    : `Recent conversation:\n${recentHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${String(m.content).slice(0, 150)}`).join('\n')}`
  const prompt = isInitial
    ? `You are generating opening suggestion chips for a user who just opened Ask AI on their market reality check report.\n\nMARKET TEST CONTEXT:\n${context}\n\n${historyBlock}\n\nGenerate exactly 4 specific, action-oriented questions this user would genuinely want to ask about THIS specific market test — referencing the actual verdict, named companies, specific demand signals, or red flags from the data.\nUnder 8 words for label, under 20 words for prefill.\n\nReturn ONLY a JSON array, no markdown:\n[{"label": "short label", "prefill": "full question to send"}]`
    : `You are generating follow-up suggestions after a conversation about a market reality check.\n\nMARKET TEST CONTEXT:\n${context}\n\n${historyBlock}\n\nGenerate exactly 4 specific follow-up questions the user would naturally want to ask NEXT. Reference actual companies, signals, or flags from this report.\nUnder 8 words for label, under 20 words for prefill.\n\nReturn ONLY a JSON array, no markdown:\n[{"label": "short label", "prefill": "full question to send"}]`
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
  return `You are PowerProof's Market Intelligence AI — a battle-tested GTM strategist embedded inside a founder's market research.
Every answer must be grounded in THIS specific idea and THIS market evidence.

${context}${historyBlock}

User: "${userMessage}"

Rules:
- Reference their actual demand signals, red flags, named companies
- Direct. No padding. Under 300 words unless depth needed.
- Do NOT include "Next action:" or any action text inside the reply field.
- Format the "reply" field's text using markdown: **bold** key terms/numbers, use "- " bullet lists for multiple points, use short "## " headers only if the answer has distinct sections, keep paragraphs short (2-3 sentences max).

Return ONLY valid JSON (the outer object itself must NOT be wrapped in markdown fences — only the "reply" string's own content should contain markdown syntax):
{
  "reply": "Your full conversational answer here, formatted with markdown (bold, bullets, headers as appropriate). No next actions inside this field.",
  "next_actions": [
    "Specific action the founder can take right now — under 12 words",
    "Second concrete action — under 12 words",
    "Third concrete action — under 12 words"
  ]
}

next_actions rules:
- Exactly 2-3 items
- Each is a complete, standalone action sentence specific to THIS market and idea
- Under 12 words each
- These will be shown as tappable chips the user can click to proceed`
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
  } catch { /* fall through */ }
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
  return { reply: replyLines.join('\n').trim(), next_actions: actionLines.slice(0, 3) }
}
async function checkRateLimit(db, userId, isByok) {
  try {
    const { data: rl } = await db.rpc('check_and_increment_rate_limit', { p_user_id: userId, p_function_name: 'market-test-chat', p_calls_per_hour: isByok ? 40 : 20, p_calls_per_day: isByok ? 200 : 100 })
    if (rl && !rl.allowed) return new Response(JSON.stringify({ error: `Limit reached. Resets at ${rl.resets_at}.`, code: rl.reason }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[mtc] rate limit:', e) }
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
    const { mode, market_test_id, session_id, message } = body
    if (!market_test_id) return new Response(JSON.stringify({ error: 'market_test_id required' }), { status: 400, headers: corsHeaders })
    const { data: test, error: testErr } = await db.from('market_tests')
      .select('id, user_id, query, country, verdict, verdict_label, market_reality_score, honest_verdict, demand_signals, red_flags, past_failures, past_successes, pros, cons, generation_status')
      .eq('id', market_test_id).eq('user_id', user.id).single()
    if (testErr || !test) return new Response(JSON.stringify({ error: 'Market test not found' }), { status: 404, headers: corsHeaders })
    if (test.generation_status !== 'complete') return new Response(JSON.stringify({ error: 'Market test not complete yet' }), { status: 400, headers: corsHeaders })
    const context = buildMarketTestContext(test)
    if (mode === 'history') {
      const { data: sessions } = await db.from('market_test_chat_sessions').select('id, messages, total_credits_used, created_at, updated_at').eq('market_test_id', market_test_id).eq('user_id', user.id).order('created_at', { ascending: false })
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
      const limited = await checkRateLimit(db, user.id, isByok)
      if (limited) return limited

      let chatUsage = { unlimited: true }
      if (!isByok) {
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
      const { data: existingSession } = await db.from('market_test_chat_sessions').select('*').eq('id', session_id).eq('user_id', user.id).maybeSingle()
      if (existingSession) { sessionMessages = existingSession.messages ?? [] }
      else { await db.from('market_test_chat_sessions').insert({ id: session_id, market_test_id, user_id: user.id, messages: [], total_credits_used: 0 }) }
      const recentHistory = sessionMessages.slice(-6).map(m => ({ role: String(m.role ?? 'user'), content: String(m.content ?? '').slice(0, 200) }))
      const [rawReply, suggestions] = await Promise.all([
        geminiCall(geminiKey, GEMINI_MODEL, buildMessagePrompt(message, context, recentHistory)),
        generateSuggestions(geminiKey, context, [...recentHistory, { role: 'user', content: message }]),
      ])
      const { reply, next_actions } = parseMessageResponse(rawReply)
      const newMessages = [
        ...sessionMessages,
        { role: 'user', content: message, created_at: new Date().toISOString() },
        { role: 'assistant', content: reply, next_actions, created_at: new Date().toISOString(), byok: isByok }
      ]
      await db.from('market_test_chat_sessions').update({
        messages: newMessages,
        updated_at: new Date().toISOString()
      }).eq('id', session_id)
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
    console.error('[market-test-chat] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

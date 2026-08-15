// ask-warroom-ai v6
// PLAN CHANGE: chat is no longer unconditionally unlimited. Starter now has a daily message
// cap via deduct_chat_message_usage; Pro/Trial remain unlimited (chat_unlimited=true skips
// the counter inside the RPC).
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
  { label: 'Which step should I do first?',   prefill: 'Which step in the playbook should I execute first and why?' },
  { label: 'What is my 30-day sprint?',        prefill: 'Break down my 30-day sprint into a week-by-week action plan.' },
  { label: 'Where am I most likely to fail?', prefill: 'Where in this playbook am I most likely to fail and how do I prevent it?' },
  { label: 'How do I validate step 1?',        prefill: 'How do I know if I have successfully completed the first step?' },
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
function buildPlaybookContext(pb) {
  const steps = (pb.steps ?? []).slice(0, 10).map(s =>
    `  Step ${s.step_order} [${s.phase}] "${s.title}"\n    Move: ${s.war_move_name ?? 'N/A'} | Timeline: ${s.timeline ?? 'N/A'} | Kill metric: ${s.kill_metric ?? 'N/A'}\n    The move: ${(s.the_move ?? '').slice(0, 200)}`
  ).join('\n')
  const redFlags = (pb.red_flags ?? []).map(f => `  - ${f.flag ?? f}`).join('\n')
  return `WAR ROOM: "${pb.business_name ?? pb.business_type ?? 'Unnamed'}"\nIndustry: ${pb.industry ?? 'N/A'} | City: ${pb.city ?? 'N/A'} | Country: ${pb.country ?? 'India'}\nEdge: ${pb.edge_declaration ?? 'N/A'}\nFounder honest take: ${(pb.founder_honest_take ?? '').slice(0, 300)}\n30-day sprint: ${(pb.thirty_day_sprint ?? '').slice(0, 300)}\n\nPLAYBOOK STEPS (first 10):\n${steps || '  None'}\n\nRED FLAGS:\n${redFlags || '  None'}`
}
async function generateSuggestions(apiKey, context, recentHistory) {
  const isInitial = recentHistory.length === 0
  const historyBlock = isInitial
    ? 'The user just opened the Ask AI panel for the first time. No conversation yet.'
    : `Recent conversation:\n${recentHistory.map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${String(m.content).slice(0, 150)}`).join('\n')}`
  const prompt = isInitial
    ? `You are generating opening suggestion chips for a user who just opened Ask AI on their War Room playbook.\n\nPLAYBOOK CONTEXT:\n${context}\n\n${historyBlock}\n\nGenerate exactly 4 specific, tactical questions this user would genuinely want to ask about THIS specific playbook — referencing actual step titles, war move names, kill metrics, or the 30-day sprint from the data.\nUnder 8 words for label, under 20 words for prefill.\n\nReturn ONLY a JSON array, no markdown:\n[{"label": "short label", "prefill": "full question to send"}]`
    : `You are generating follow-up suggestions after a conversation about a War Room playbook.\n\nPLAYBOOK CONTEXT:\n${context}\n\n${historyBlock}\n\nGenerate exactly 4 specific follow-up questions the user would naturally want to ask NEXT. Reference actual steps, war moves, or kill metrics from this playbook.\nUnder 8 words for label, under 20 words for prefill.\n\nReturn ONLY a JSON array, no markdown:\n[{"label": "short label", "prefill": "full question to send"}]`
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
  return `You are PowerProof's War Room AI — a battle-scarred co-founder embedded inside a founder's execution playbook.
Every answer must reference THIS specific playbook.

${context}${historyBlock}

User: "${userMessage}"

Rules:
- Reference actual steps, war moves, kill metrics, timelines by name
- Brutally honest about red flags
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
- Each is a complete, standalone action sentence — not a question, not a label
- Specific to THIS playbook's steps and war moves
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
    const { data: rl } = await db.rpc('check_and_increment_rate_limit', { p_user_id: userId, p_function_name: 'ask-warroom-ai', p_calls_per_hour: isByok ? 40 : 20, p_calls_per_day: isByok ? 200 : 100 })
    if (rl && !rl.allowed) return new Response(JSON.stringify({ error: `Limit reached. Resets at ${rl.resets_at}.`, code: rl.reason }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[ask-warroom] rate limit:', e) }
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
    const { mode, playbook_id, session_id, message } = body
    if (!playbook_id) return new Response(JSON.stringify({ error: 'playbook_id required' }), { status: 400, headers: corsHeaders })
    const { data: pb, error: pbErr } = await db.from('user_playbooks')
      .select('id, user_id, business_name, business_type, industry, city, country, steps, red_flags, edge_declaration, thirty_day_sprint, founder_honest_take, generation_status')
      .eq('id', playbook_id).eq('user_id', user.id).single()
    if (pbErr || !pb) return new Response(JSON.stringify({ error: 'Playbook not found' }), { status: 404, headers: corsHeaders })
    if (pb.generation_status !== 'complete') return new Response(JSON.stringify({ error: 'Playbook not complete yet' }), { status: 400, headers: corsHeaders })
    const context = buildPlaybookContext(pb)
    if (mode === 'history') {
      const { data: sessions } = await db.from('warroom_chat_sessions').select('id, messages, total_credits_used, created_at, updated_at').eq('playbook_id', playbook_id).eq('user_id', user.id).order('created_at', { ascending: false })
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
      const { data: existingSession } = await db.from('warroom_chat_sessions').select('*').eq('id', session_id).eq('user_id', user.id).maybeSingle()
      if (existingSession) { sessionMessages = existingSession.messages ?? [] }
      else { await db.from('warroom_chat_sessions').insert({ id: session_id, playbook_id, user_id: user.id, messages: [], total_credits_used: 0 }) }
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
      await db.from('warroom_chat_sessions').update({
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
    console.error('[ask-warroom] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

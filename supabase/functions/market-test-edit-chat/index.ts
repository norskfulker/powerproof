// market-test-edit-chat v2
// SUBSCRIPTION MIGRATION: deduct_task_credits/refund_task_credits replaced with deduct_feature_usage,
// bucket='edits'. cancel mode no longer refunds.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_TIMEOUT_MS = 90_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key'
}

const SECTION_MAP: Record<string, string> = {
  demand_signals:   'Demand Signals',
  red_flags:        'Red Flags',
  past_failures:    'Past Failures (similar companies)',
  past_successes:   'Past Successes (similar companies)',
  pros:             'Pros',
  cons:             'Cons',
  honest_verdict:   'Honest Verdict',
}
const SECTION_KEYS = Object.keys(SECTION_MAP)

const SUGGESTION_PREFILLS: Record<string, string> = {
  demand_signals:  'Find more demand signals with stronger evidence',
  red_flags:       'Dig deeper into the red flags and their severity',
  past_failures:   'Find more companies that failed at this and why',
  past_successes:  'Find more companies that succeeded at this and how',
  pros:            'Strengthen the pros with more specific evidence',
  cons:            'Be more honest about the cons and risks',
  honest_verdict:  'Rewrite the honest verdict with sharper reasoning',
}

const POPULAR_ANCHOR = ['demand_signals', 'red_flags']

const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

function strip(s: string): string {
  return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

async function geminiCall(apiKey: string, prompt: string, maxTokens: number, lightweight: boolean): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  try {
    const genConfig: Record<string, unknown> = { temperature: 0.6, maxOutputTokens: maxTokens }
    if (!lightweight) genConfig.responseMimeType = 'application/json'
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: genConfig, safetySettings: SAFETY })
      }
    )
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const d = await res.json()
    if (d.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new Error('Output truncated — reduce scope')
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    return text
  } catch (e) { clearTimeout(timeout); throw e }
}

async function checkRateLimit(supabase: ReturnType<typeof createClient>, userId: string, isByok: boolean): Promise<Response | null> {
  try {
    const perHour = isByok ? 40 : 20
    const perDay  = isByok ? 200 : 100
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: 'market-test-edit-chat',
      p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed)
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[market-test-edit-chat] rate limit error:', e) }
  return null
}

function buildSuggestions(
  availableSections: string[],
  recentlyEditedSections: string[],
): Array<{ label: string; prefill: string; section: string; has_data: boolean }> {
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  const recentSet = new Set(recentlyEditedSections)
  const poolA = shuffle(availableSections.filter(s => !recentSet.has(s)))
  const poolB = shuffle(availableSections.filter(s => recentSet.has(s)))
  const ordered = [...poolA, ...poolB]
  const anchorInTop = ordered.slice(0, Math.min(4, ordered.length)).some(s => POPULAR_ANCHOR.includes(s))
  if (!anchorInTop) {
    const anchor = POPULAR_ANCHOR.find(s => availableSections.includes(s) && !ordered.slice(0, 2).includes(s))
    if (anchor) {
      const anchorIdx = ordered.indexOf(anchor)
      if (anchorIdx > 1) { ordered.splice(anchorIdx, 1); ordered.splice(1, 0, anchor) }
    }
  }
  return ordered.slice(0, 4).map(key => ({
    label: SECTION_MAP[key],
    prefill: SUGGESTION_PREFILLS[key] ?? `Update the ${SECTION_MAP[key]} section`,
    section: key, has_data: true,
  }))
}

async function getRecentlyEditedSections(supabase: ReturnType<typeof createClient>, marketTestId: string, userId: string): Promise<string[]> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('market_test_section_edits').select('sections_edited')
      .eq('market_test_id', marketTestId).eq('user_id', userId)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(20)
    if (!data?.length) return []
    const allEdited = data.flatMap(r => Array.isArray(r.sections_edited) ? r.sections_edited : [])
    return [...new Set(allEdited)]
  } catch { return [] }
}

function buildMessagePrompt(userMessage: string, query: string, availableSections: string[], recentHistory: Array<{ role: string; type?: string; content: string }>): string {
  const sectionList = availableSections.map(s => `- ${s}: ${SECTION_MAP[s] ?? s}`).join('\n')
  const historyBlock = recentHistory.length > 0
    ? `\nRecent conversation (last ${recentHistory.length} messages):\n` +
      recentHistory.map(m => { const role = m.role === 'user' ? 'User' : 'Assistant'; const content = (m.content ?? '').slice(0, 120); const type = m.type ? ` [${m.type}]` : ''; return `${role}${type}: ${content}` }).join('\n')
    : ''
  return `You are a friendly AI assistant inside PowerProof — a business research platform.
Your ONLY job: help the user edit or re-research sections of their Market Reality Check report.
You are NOT a general chatbot.

Market test: "${query}"
User message: "${userMessage}"${historyBlock}

Available sections:
${sectionList}

CLASSIFY the user message into ONE of these types:

TYPE 1 — greeting/chitchat
→ Warm 1-2 sentence reply. Mention editing sections.

TYPE 2 — vague intent
→ Acknowledge. Ask which area. Mention 3-4 section names.

TYPE 3 — off-topic
→ Politely redirect.

TYPE 4 — clear edit intent
→ Infer section. Map: "signals"=demand_signals, "risks"/"warnings"=red_flags, "who failed"=past_failures, "who succeeded"=past_successes, "verdict"/"honest take"=honest_verdict

TYPE 5 — follow-up question about something already done
→ CRITICAL: if last assistant message was edit_complete, questions, or confirm — this is a follow-up.
→ Answer conversationally. No edit flow. No section inference.

Return ONLY valid JSON, no markdown:

For TYPE 1,2,3,5:
{"message_type":"chat","reply":"str","inferred_sections":[]}

For TYPE 4:
{"message_type":"confirm","inferred_sections":["key"],"confidence":"high|medium|low","confirm_question":"str","edit_intent_summary":"str","reply":""}

When in doubt between TYPE 4 and TYPE 5, prefer TYPE 5.`
}

function buildQuestionsPrompt(editIntent: string, sections: string[], query: string): string {
  return `You are an assistant for PowerProof.
Market test: "${query}"
Sections: ${sections.map(s => SECTION_MAP[s] ?? s).join(', ')}
Intent: "${editIntent}"
Ask 1-2 SHORT outcome-focused questions about direction, not data.
Good: "Focus on online or offline signals?", "More skeptical or more optimistic?"
Bad: "What is your budget?", "Who are your competitors?"
Return ONLY JSON:
{"questions":[{"id":"q1","text":"?","type":"single_select","options":["A","B","C"],"required":true}]}`
}

function buildEditPrompt(test: Record<string, unknown>, sections: string[], editIntent: string, answers: Record<string, string>): string {
  const query = test.query as string; const country = (test.country as string) || 'India'
  const answersBlock = Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '(none)'
  const existingBlock = sections.map(s => { const val = test[s]; if (!val) return `${s}: (empty — generate fresh)`; const str = JSON.stringify(val); return `${s}: ${str.slice(0, 500)}${str.length > 500 ? '...' : ''}` }).join('\n\n')
  const schemaFragments: Record<string, string> = {
    demand_signals: `"demand_signals":[{"signal":"str","strength":"weak|moderate|strong","evidence":"str"}]`,
    red_flags:      `"red_flags":[{"flag":"str","severity":"low|medium|high","evidence":"str"}]`,
    past_failures:  `"past_failures":[{"company":"str","what_happened":"str","lesson":"str"}]`,
    past_successes: `"past_successes":[{"company":"str","what_worked":"str","lesson":"str"}]`,
    pros:           `"pros":["str"]`,
    cons:           `"cons":["str"]`,
    honest_verdict: `"honest_verdict":"str"`,
  }
  const selectedSchema = sections.filter(s => schemaFragments[s]).map(s => schemaFragments[s]).join(',\n  ')
  return `You are PowerProof AI rewriting specific sections of a market reality check report.
Idea: "${query}" | Country: ${country}
Edit intent: "${editIntent}"
User answers: ${answersBlock}
Existing content (context):
${existingBlock}
Rules: Rewrite ONLY requested sections. Be evidence-grounded, not generic.
Return ONLY valid JSON:\n{\n  ${selectedSchema}\n}`
}

const SNAPSHOT_COLUMNS = [
  'demand_signals', 'red_flags', 'past_failures', 'past_successes',
  'pros', 'cons', 'honest_verdict', 'verdict', 'verdict_label', 'market_reality_score',
] as const

function buildSnapshot(test: Record<string, unknown>): Record<string, unknown> {
  const snap: Record<string, unknown> = {}
  for (const col of SNAPSHOT_COLUMNS) { if (test[col] !== undefined) snap[col] = test[col] }
  return snap
}

async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization'); if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '')
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (!payload.sub) return null
    return { id: payload.sub as string }
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const PLATFORM_GEMINI_KEY  = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!PLATFORM_GEMINI_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const user = await getUser(req)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const byokKey   = req.headers.get('x-gemini-key')?.trim() || null
    const geminiKey = byokKey ?? PLATFORM_GEMINI_KEY
    const isByok    = !!byokKey

    const body = await req.json()
    const { mode, market_test_id, session_id, message, confirmed_sections, answers, edit_intent } = body

    if (!market_test_id)
      return new Response(JSON.stringify({ error: 'market_test_id required' }), { status: 400, headers: corsHeaders })

    if (mode === 'message' || mode === 'answer' || mode === 'confirm') {
      const limited = await checkRateLimit(supabase, user.id, isByok)
      if (limited) return limited
    }

    const { data: test, error: testErr } = await supabase
      .from('market_tests').select('*')
      .eq('id', market_test_id).eq('user_id', user.id).single()
    if (testErr || !test)
      return new Response(JSON.stringify({ error: 'Market test not found' }), { status: 404, headers: corsHeaders })
    if (test.generation_status !== 'complete')
      return new Response(JSON.stringify({ error: 'Market test not complete yet' }), { status: 400, headers: corsHeaders })

    if (mode === 'history') {
      const { data: allSessions } = await supabase
        .from('market_test_edit_sessions').select('id, status, created_at, updated_at, messages')
        .eq('market_test_id', market_test_id).eq('user_id', user.id)
        .order('created_at', { ascending: false })
      const sessions = (allSessions ?? []).filter(s => Array.isArray(s.messages) && s.messages.length > 0)
      return new Response(JSON.stringify({ sessions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (mode === 'new_session') {
      const newSessionId = crypto.randomUUID()
      const availableSections = SECTION_KEYS.filter(s => test[s] !== null && test[s] !== undefined)
      const recentEdits = await getRecentlyEditedSections(supabase, market_test_id, user.id)
      const suggestions = buildSuggestions(availableSections, recentEdits)
      return new Response(JSON.stringify({ session_id: newSessionId, status: 'pending', suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!session_id)
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders })

    if (mode === 'cancel') {
      const { data: cancelSession } = await supabase.from('market_test_edit_sessions').select('id, status').eq('id', session_id).eq('user_id', user.id).single()
      if (cancelSession?.status === 'active') {
        await supabase.from('market_test_edit_sessions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', session_id)
      }
      return new Response(JSON.stringify({ type: 'cancelled', message: 'Edit cancelled.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let session: Record<string, unknown> | null = null
    const { data: existingSession } = await supabase.from('market_test_edit_sessions').select('*').eq('id', session_id).eq('user_id', user.id).maybeSingle()
    if (existingSession) {
      session = existingSession
    } else if (mode === 'message') {
      const { data: newSession, error: insertErr } = await supabase.from('market_test_edit_sessions')
        .insert({ id: session_id, market_test_id, user_id: user.id, messages: [], status: 'active' }).select('*').single()
      if (insertErr || !newSession) return new Response(JSON.stringify({ error: 'Failed to create session', detail: insertErr?.message }), { status: 500, headers: corsHeaders })
      session = newSession
    } else {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders })
    }

    const messages: unknown[] = (session.messages as unknown[]) ?? []

    if (mode === 'message') {
      if (!message?.trim()) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })
      const availableSections = SECTION_KEYS.filter(s => test[s] !== null && test[s] !== undefined)
      const recentHistory = (messages as Array<Record<string, unknown>>).slice(-4).map(m => ({ role: String(m.role ?? 'user'), type: m.type ? String(m.type) : undefined, content: String(m.content ?? m.text ?? '').slice(0, 120) }))
      const raw = await geminiCall(geminiKey, buildMessagePrompt(message, test.query as string, availableSections, recentHistory), 4096, true)
      const parsed = JSON.parse(strip(raw))
      const messageType: string = parsed.message_type ?? 'chat'
      if (messageType === 'chat') {
        const reply = parsed.reply ?? "I can help you edit any section of this market test. What would you like to change?"
        const recentEdits = await getRecentlyEditedSections(supabase, market_test_id, user.id)
        const suggestions = buildSuggestions(availableSections, recentEdits)
        const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'chat', content: reply, suggestions, created_at: new Date().toISOString() }]
        await supabase.from('market_test_edit_sessions').update({ messages: newMessages, status: 'active' }).eq('id', session_id)
        return new Response(JSON.stringify({ type: 'chat', reply, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const inferredSections: string[] = (parsed.inferred_sections ?? []).filter((s: string) => SECTION_KEYS.includes(s))
      if (!inferredSections.length) {
        const fallbackReply = "I want to make sure I update the right section. Which part would you like to change — for example, the demand signals, red flags, or the honest verdict?"
        const recentEdits = await getRecentlyEditedSections(supabase, market_test_id, user.id)
        const suggestions = buildSuggestions(availableSections, recentEdits)
        const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'chat', content: fallbackReply, suggestions, created_at: new Date().toISOString() }]
        await supabase.from('market_test_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
        return new Response(JSON.stringify({ type: 'chat', reply: fallbackReply, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const confirmQuestion = parsed.confirm_question ?? `You want me to update ${inferredSections.map((s: string) => SECTION_MAP[s] ?? s).join(' & ')} — is that right?`
      const editIntentSummary = parsed.edit_intent_summary ?? message
      const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'confirm', content: confirmQuestion, inferred_sections: inferredSections, edit_intent: editIntentSummary, created_at: new Date().toISOString() }]
      await supabase.from('market_test_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
      return new Response(JSON.stringify({ type: 'confirm', confirm_question: confirmQuestion, inferred_sections: inferredSections, inferred_labels: inferredSections.map((s: string) => SECTION_MAP[s] ?? s), edit_intent: editIntentSummary, confidence: parsed.confidence ?? 'medium' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (mode === 'confirm') {
      if (!confirmed_sections?.length || !edit_intent) return new Response(JSON.stringify({ error: 'confirmed_sections and edit_intent required' }), { status: 400, headers: corsHeaders })
      const validSections = confirmed_sections.filter((s: string) => SECTION_KEYS.includes(s))
      const raw = await geminiCall(geminiKey, buildQuestionsPrompt(edit_intent, validSections, test.query as string), 4096, true)
      const parsed = JSON.parse(strip(raw))
      const questions = (parsed.questions ?? []).slice(0, 2).map((q: Record<string, unknown>, i: number) => ({ id: String(q.id ?? `q${i + 1}`), text: String(q.text ?? ''), type: (['single_select','multi_select','text'].includes(q.type as string) ? q.type : 'single_select') as string, options: Array.isArray(q.options) ? q.options.map(String) : undefined, required: Boolean(q.required ?? true) }))
      const newMessages = [...messages, { role: 'user', type: 'confirmation', content: `Confirmed: ${validSections.map((s: string) => SECTION_MAP[s] ?? s).join(', ')}`, created_at: new Date().toISOString() }, { role: 'assistant', type: 'questions', questions, confirmed_sections: validSections, edit_intent, created_at: new Date().toISOString() }]
      await supabase.from('market_test_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
      return new Response(JSON.stringify({ type: 'questions', questions, confirmed_sections: validSections, edit_intent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (mode === 'answer') {
      if (!confirmed_sections?.length || !edit_intent) return new Response(JSON.stringify({ error: 'confirmed_sections and edit_intent required' }), { status: 400, headers: corsHeaders })
      const validSections = confirmed_sections.filter((s: string) => SECTION_KEYS.includes(s))
      const userAnswers: Record<string, string> = answers ?? {}
      let creditsAfter = 0
      if (!isByok) {
        const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', { p_user_id: user.id, p_bucket: 'edits', p_amount: 1 })
        if (usageErr) return new Response(JSON.stringify({ error: 'Usage error', detail: usageErr.message }), { status: 500, headers: corsHeaders })
        if (!usageResult?.success) {
          const reason = usageResult?.error
          if (reason === 'no_active_subscription') return new Response(JSON.stringify({ error: 'No active subscription found.', code: reason }), { status: 402, headers: corsHeaders })
          if (reason === 'feature_locked') return new Response(JSON.stringify({ error: 'Edits are not available on your plan.', code: reason }), { status: 402, headers: corsHeaders })
          return new Response(JSON.stringify({ error: `Monthly edit limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`, code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0 }), { status: 402, headers: corsHeaders })
        }
        creditsAfter = usageResult?.remaining ?? 0
      }
      const snapshot = buildSnapshot(test)
      const { data: versionRows } = await supabase.from('market_test_versions').select('version_number').eq('market_test_id', market_test_id).order('version_number', { ascending: false }).limit(1)
      const nextVersion = (versionRows?.[0]?.version_number ?? 0) + 1
      await supabase.from('market_test_versions').insert({ market_test_id, version_number: nextVersion, snapshot, edit_summary: `Before edit: ${validSections.map((s: string) => SECTION_MAP[s] ?? s).join(', ')}` })
      let parsed: Record<string, unknown>
      try {
        const raw = await geminiCall(geminiKey, buildEditPrompt(test, validSections, edit_intent, userAnswers), 16384, false)
        parsed = JSON.parse(strip(raw))
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Edit failed.', detail: String(e) }), { status: 500, headers: corsHeaders })
      }
      const { data: freshSession } = await supabase.from('market_test_edit_sessions').select('status').eq('id', session_id).single()
      if (freshSession?.status === 'cancelled') return new Response(JSON.stringify({ type: 'cancelled', message: 'Edit was cancelled.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const key of validSections) { if (parsed[key] !== undefined) updatePayload[key] = parsed[key] }
      const { error: updateErr } = await supabase.from('market_tests').update(updatePayload).eq('id', market_test_id)
      if (updateErr) { return new Response(JSON.stringify({ error: 'Save failed.', detail: updateErr.message }), { status: 500, headers: corsHeaders }) }
      await supabase.from('market_test_section_edits').insert({ user_id: user.id, market_test_id, sections_edited: validSections, user_message: edit_intent, reasoning: JSON.stringify(userAnswers), credits_charged: isByok ? 0 : 1 })
      const completionMsg = `Done! Updated ${validSections.map((s: string) => SECTION_MAP[s] ?? s).join(', ')}. Version ${nextVersion} saved — roll back anytime.`
      const newMessages = [...messages, { role: 'user', type: 'answers', content: JSON.stringify(userAnswers), created_at: new Date().toISOString() }, { role: 'assistant', type: 'edit_complete', content: completionMsg, sections_updated: validSections, version_number: nextVersion, created_at: new Date().toISOString() }]
      await supabase.from('market_test_edit_sessions').update({ messages: newMessages, status: 'idle' }).eq('id', session_id)
      return new Response(JSON.stringify({ type: 'edit_complete', sections_updated: validSections, sections_labels: validSections.map((s: string) => SECTION_MAP[s] ?? s), version_saved: nextVersion, byok_used: isByok, credits_remaining: creditsAfter, updated_data: updatePayload }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), { status: 400, headers: corsHeaders })

  } catch (err) {
    console.error('[market-test-edit-chat] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

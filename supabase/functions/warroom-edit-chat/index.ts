// warroom-edit-chat v2
// SUBSCRIPTION MIGRATION: deduct_task_credits/refund_task_credits replaced with deduct_feature_usage,
// bucket='edits'. cancel mode no longer refunds.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_TIMEOUT_MS = 90_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key'
}

const FLAT_SECTION_MAP: Record<string, string> = {
  red_flags:            'Red Flags',
  founder_honest_take:  "Founder's Honest Take",
  thirty_day_sprint:    '30-Day Sprint',
}
const FLAT_SECTION_KEYS = Object.keys(FLAT_SECTION_MAP)

const FLAT_SUGGESTION_PREFILLS: Record<string, string> = {
  red_flags:           'Add more red flags I should watch out for',
  founder_honest_take: 'Give me an even more brutally honest take',
  thirty_day_sprint:   'Make the 30-day sprint more aggressive',
}

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
      p_user_id: userId, p_function_name: 'warroom-edit-chat',
      p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed)
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[warroom-edit-chat] rate limit error:', e) }
  return null
}

type Step = Record<string, unknown>

function buildSuggestions(
  availableFlatSections: string[],
  steps: Step[],
): Array<{ label: string; prefill: string; section: string; has_data: boolean }> {
  const flatSuggestions = availableFlatSections.map(key => ({
    label: FLAT_SECTION_MAP[key],
    prefill: FLAT_SUGGESTION_PREFILLS[key] ?? `Update ${FLAT_SECTION_MAP[key]}`,
    section: key, has_data: true,
  }))
  const stepSuggestion = steps.length > 0
    ? { label: `Rework step ${steps[0].step_order}`, prefill: `Make step ${steps[0].step_order} ("${steps[0].title}") more specific and aggressive`, section: 'steps', has_data: true }
    : null
  const pool = stepSuggestion ? [stepSuggestion, ...flatSuggestions] : flatSuggestions
  return pool.slice(0, 4)
}

async function getRecentEdits(supabase: ReturnType<typeof createClient>, playbookId: string, userId: string): Promise<{ sections: string[]; steps: number[] }> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('warroom_section_edits').select('sections_edited, steps_edited')
      .eq('playbook_id', playbookId).eq('user_id', userId)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(20)
    if (!data?.length) return { sections: [], steps: [] }
    const sections = [...new Set(data.flatMap(r => Array.isArray(r.sections_edited) ? r.sections_edited : []))]
    const steps = [...new Set(data.flatMap(r => Array.isArray(r.steps_edited) ? r.steps_edited : []))]
    return { sections, steps }
  } catch { return { sections: [], steps: [] } }
}

function buildMessagePrompt(userMessage: string, businessName: string, steps: Step[], availableFlatSections: string[], recentHistory: Array<{ role: string; type?: string; content: string }>): string {
  const stepList = steps.map(s => `- Step ${s.step_order} [${s.phase}]: "${s.title}" (war move: ${s.war_move_name ?? 'N/A'})`).join('\n')
  const flatList = availableFlatSections.map(s => `- ${s}: ${FLAT_SECTION_MAP[s]}`).join('\n')
  const historyBlock = recentHistory.length > 0
    ? `\nRecent conversation (last ${recentHistory.length} messages):\n` +
      recentHistory.map(m => { const role = m.role === 'user' ? 'User' : 'Assistant'; const content = (m.content ?? '').slice(0, 120); const type = m.type ? ` [${m.type}]` : ''; return `${role}${type}: ${content}` }).join('\n')
    : ''
  return `You are a friendly AI assistant inside PowerProof — a business execution platform.
Your ONLY job: help the user edit specific steps or sections of their War Room playbook.
You are NOT a general chatbot. You do NOT regenerate the whole playbook — that happens elsewhere.

Playbook: "${businessName}"
User message: "${userMessage}"${historyBlock}

STEPS (edit target = one or more step_order numbers):
${stepList}

FLAT SECTIONS (edit target = section key):
${flatList}

CLASSIFY the user message into ONE of these types:

TYPE 1 — greeting/chitchat
→ Warm 1-2 sentence reply. Mention editing a step or a section.

TYPE 2 — vague intent
→ Acknowledge. Ask which step number or section.

TYPE 3 — off-topic
→ Politely redirect.

TYPE 4 — clear edit intent targeting one or more SPECIFIC STEPS
→ Identify the step_order number(s) referenced or clearly implied (by title, war_move_name, or phase + position). edit_target = "steps", target_steps = [numbers].

TYPE 5 — clear edit intent targeting a FLAT SECTION (red_flags, founder_honest_take, thirty_day_sprint)
→ edit_target = "flat", inferred_sections = ["key"].

TYPE 6 — follow-up question about something already done
→ CRITICAL: if last assistant message was edit_complete, questions, or confirm — this is a follow-up.
→ Answer conversationally. No edit flow.

TYPE 7 — user is asking to regenerate the ENTIRE playbook or an ENTIRE phase from scratch
→ This is out of scope here. Reply conversationally explaining that full playbook or phase regeneration is done from the War Room's main "Regenerate" option, not through chat editing — then ask if they'd instead like to tweak specific steps.

Return ONLY valid JSON, no markdown:

For TYPE 1,2,3,6,7:
{"message_type":"chat","reply":"str"}

For TYPE 4:
{"message_type":"confirm","edit_target":"steps","target_steps":[1,2],"confidence":"high|medium|low","confirm_question":"str","edit_intent_summary":"str"}

For TYPE 5:
{"message_type":"confirm","edit_target":"flat","inferred_sections":["key"],"confidence":"high|medium|low","confirm_question":"str","edit_intent_summary":"str"}

When in doubt between TYPE 4/5 and TYPE 6, prefer TYPE 6.`
}

function buildQuestionsPrompt(editIntent: string, targetLabel: string, businessName: string): string {
  return `You are an assistant for PowerProof.
Playbook: "${businessName}"
Editing: ${targetLabel}
Intent: "${editIntent}"
Ask 1-2 SHORT outcome-focused questions about direction, not data.
Good: "More aggressive or more conservative timeline?", "Bootstrap-friendly or assume funding?"
Bad: "What is your budget?", "Who are your competitors?"
Return ONLY JSON:
{"questions":[{"id":"q1","text":"?","type":"single_select","options":["A","B","C"],"required":true}]}`
}

function buildStepEditPrompt(businessName: string, targetSteps: Step[], editIntent: string, answers: Record<string, string>): string {
  const answersBlock = Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '(none)'
  const existingBlock = targetSteps.map(s => `Step ${s.step_order}: ${JSON.stringify(s)}`).join('\n\n')
  return `You are PowerProof AI rewriting specific steps of a War Room execution playbook.
Business: "${businessName}"
Edit intent: "${editIntent}"
User answers: ${answersBlock}
Existing steps (rewrite these, keep the same step_order and phase/phase_number unless the intent explicitly asks to reorder):
${existingBlock}

Rules: Preserve the exact same JSON shape as the input steps (same keys: phase, title, weapon, red_flag, the_move, timeline, is_checked, step_order, kill_metric, phase_number, why_it_works, cost_estimate, war_move_name, cost_estimate_usd). Only change content per the edit intent.
Return ONLY valid JSON:
{"steps":[ ...rewritten step objects, same count and same step_order values as input... ]}`
}

function buildFlatEditPrompt(businessName: string, sections: string[], editIntent: string, answers: Record<string, string>, existingValues: Record<string, unknown>): string {
  const answersBlock = Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '(none)'
  const existingBlock = sections.map(s => { const val = existingValues[s]; if (!val) return `${s}: (empty — generate fresh)`; const str = JSON.stringify(val); return `${s}: ${str.slice(0, 500)}${str.length > 500 ? '...' : ''}` }).join('\n\n')
  const schemaFragments: Record<string, string> = {
    red_flags:           `"red_flags":[{"flag":"str","detail":"str"}]`,
    founder_honest_take: `"founder_honest_take":"str (3-4 sentence candid co-founder assessment)"`,
    thirty_day_sprint:   `"thirty_day_sprint":"str"`,
  }
  const selectedSchema = sections.filter(s => schemaFragments[s]).map(s => schemaFragments[s]).join(',\n  ')
  return `You are PowerProof AI rewriting specific sections of a War Room playbook.
Business: "${businessName}"
Edit intent: "${editIntent}"
User answers: ${answersBlock}
Existing content (context):
${existingBlock}
Rules: Rewrite ONLY requested sections. Stay brutally honest and specific — this is a battle-scarred co-founder's voice, not generic advice.
Return ONLY valid JSON:\n{\n  ${selectedSchema}\n}`
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
    const { mode, playbook_id, session_id, message, edit_target, confirmed_sections, target_steps, answers, edit_intent } = body

    if (!playbook_id)
      return new Response(JSON.stringify({ error: 'playbook_id required' }), { status: 400, headers: corsHeaders })

    if (mode === 'message' || mode === 'answer' || mode === 'confirm') {
      const limited = await checkRateLimit(supabase, user.id, isByok)
      if (limited) return limited
    }

    const { data: pb, error: pbErr } = await supabase
      .from('user_playbooks').select('*')
      .eq('id', playbook_id).eq('user_id', user.id).single()
    if (pbErr || !pb)
      return new Response(JSON.stringify({ error: 'Playbook not found' }), { status: 404, headers: corsHeaders })
    if (pb.generation_status !== 'complete')
      return new Response(JSON.stringify({ error: 'Playbook not complete yet' }), { status: 400, headers: corsHeaders })

    const businessName = pb.business_name ?? pb.business_type ?? 'Unnamed business'
    const steps: Step[] = Array.isArray(pb.steps) ? pb.steps : []

    if (mode === 'history') {
      const { data: allSessions } = await supabase
        .from('warroom_edit_sessions').select('id, status, created_at, updated_at, messages')
        .eq('playbook_id', playbook_id).eq('user_id', user.id)
        .order('created_at', { ascending: false })
      const sessions = (allSessions ?? []).filter(s => Array.isArray(s.messages) && s.messages.length > 0)
      return new Response(JSON.stringify({ sessions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (mode === 'new_session') {
      const newSessionId = crypto.randomUUID()
      const availableFlatSections = FLAT_SECTION_KEYS.filter(s => pb[s] !== null && pb[s] !== undefined)
      const suggestions = buildSuggestions(availableFlatSections, steps)
      return new Response(JSON.stringify({ session_id: newSessionId, status: 'pending', suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!session_id)
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders })

    if (mode === 'cancel') {
      const { data: cancelSession } = await supabase.from('warroom_edit_sessions').select('id, status').eq('id', session_id).eq('user_id', user.id).single()
      if (cancelSession?.status === 'active') {
        await supabase.from('warroom_edit_sessions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', session_id)
      }
      return new Response(JSON.stringify({ type: 'cancelled', message: 'Edit cancelled.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let session: Record<string, unknown> | null = null
    const { data: existingSession } = await supabase.from('warroom_edit_sessions').select('*').eq('id', session_id).eq('user_id', user.id).maybeSingle()
    if (existingSession) {
      session = existingSession
    } else if (mode === 'message') {
      const { data: newSession, error: insertErr } = await supabase.from('warroom_edit_sessions')
        .insert({ id: session_id, playbook_id, user_id: user.id, messages: [], status: 'active' }).select('*').single()
      if (insertErr || !newSession) return new Response(JSON.stringify({ error: 'Failed to create session', detail: insertErr?.message }), { status: 500, headers: corsHeaders })
      session = newSession
    } else {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders })
    }

    const messages: unknown[] = (session.messages as unknown[]) ?? []

    if (mode === 'message') {
      if (!message?.trim()) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })
      const availableFlatSections = FLAT_SECTION_KEYS.filter(s => pb[s] !== null && pb[s] !== undefined)
      const recentHistory = (messages as Array<Record<string, unknown>>).slice(-4).map(m => ({ role: String(m.role ?? 'user'), type: m.type ? String(m.type) : undefined, content: String(m.content ?? m.text ?? '').slice(0, 120) }))
      const raw = await geminiCall(geminiKey, buildMessagePrompt(message, businessName, steps, availableFlatSections, recentHistory), 4096, true)
      const parsed = JSON.parse(strip(raw))
      const messageType: string = parsed.message_type ?? 'chat'

      if (messageType === 'chat') {
        const reply = parsed.reply ?? "I can help you tweak a specific step or update a section like red flags, the founder's take, or the 30-day sprint. What would you like to change?"
        const suggestions = buildSuggestions(availableFlatSections, steps)
        const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'chat', content: reply, suggestions, created_at: new Date().toISOString() }]
        await supabase.from('warroom_edit_sessions').update({ messages: newMessages, status: 'active' }).eq('id', session_id)
        return new Response(JSON.stringify({ type: 'chat', reply, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const editTarget: string = parsed.edit_target === 'steps' ? 'steps' : 'flat'
      const editIntentSummary = parsed.edit_intent_summary ?? message

      if (editTarget === 'steps') {
        const validSteps: number[] = (parsed.target_steps ?? []).filter((n: unknown) => typeof n === 'number' && steps.some(s => s.step_order === n))
        if (!validSteps.length) {
          const fallbackReply = "Which step number would you like me to update? You can reference it by number or by name."
          const suggestions = buildSuggestions(availableFlatSections, steps)
          const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'chat', content: fallbackReply, suggestions, created_at: new Date().toISOString() }]
          await supabase.from('warroom_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
          return new Response(JSON.stringify({ type: 'chat', reply: fallbackReply, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const stepTitles = validSteps.map(n => steps.find(s => s.step_order === n)?.title ?? `Step ${n}`)
        const confirmQuestion = parsed.confirm_question ?? `You want me to update step${validSteps.length > 1 ? 's' : ''} ${validSteps.join(', ')} (${stepTitles.join(', ')}) — is that right?`
        const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'confirm', content: confirmQuestion, edit_target: 'steps', target_steps: validSteps, edit_intent: editIntentSummary, created_at: new Date().toISOString() }]
        await supabase.from('warroom_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
        return new Response(JSON.stringify({ type: 'confirm', confirm_question: confirmQuestion, edit_target: 'steps', target_steps: validSteps, target_labels: stepTitles, edit_intent: editIntentSummary, confidence: parsed.confidence ?? 'medium' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      } else {
        const inferredSections: string[] = (parsed.inferred_sections ?? []).filter((s: string) => FLAT_SECTION_KEYS.includes(s))
        if (!inferredSections.length) {
          const fallbackReply = "Which section would you like to update — red flags, the founder's honest take, or the 30-day sprint?"
          const suggestions = buildSuggestions(availableFlatSections, steps)
          const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'chat', content: fallbackReply, suggestions, created_at: new Date().toISOString() }]
          await supabase.from('warroom_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
          return new Response(JSON.stringify({ type: 'chat', reply: fallbackReply, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const confirmQuestion = parsed.confirm_question ?? `You want me to update ${inferredSections.map((s: string) => FLAT_SECTION_MAP[s] ?? s).join(' & ')} — is that right?`
        const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'confirm', content: confirmQuestion, edit_target: 'flat', inferred_sections: inferredSections, edit_intent: editIntentSummary, created_at: new Date().toISOString() }]
        await supabase.from('warroom_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
        return new Response(JSON.stringify({ type: 'confirm', confirm_question: confirmQuestion, edit_target: 'flat', inferred_sections: inferredSections, inferred_labels: inferredSections.map((s: string) => FLAT_SECTION_MAP[s] ?? s), edit_intent: editIntentSummary, confidence: parsed.confidence ?? 'medium' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    if (mode === 'confirm') {
      if (!edit_intent) return new Response(JSON.stringify({ error: 'edit_intent required' }), { status: 400, headers: corsHeaders })
      const targetLabel = edit_target === 'steps'
        ? `Step(s) ${(target_steps ?? []).join(', ')}`
        : (confirmed_sections ?? []).map((s: string) => FLAT_SECTION_MAP[s] ?? s).join(', ')
      const raw = await geminiCall(geminiKey, buildQuestionsPrompt(edit_intent, targetLabel, businessName), 4096, true)
      const parsed = JSON.parse(strip(raw))
      const questions = (parsed.questions ?? []).slice(0, 2).map((q: Record<string, unknown>, i: number) => ({ id: String(q.id ?? `q${i + 1}`), text: String(q.text ?? ''), type: (['single_select','multi_select','text'].includes(q.type as string) ? q.type : 'single_select') as string, options: Array.isArray(q.options) ? q.options.map(String) : undefined, required: Boolean(q.required ?? true) }))
      const newMessages = [...messages, { role: 'user', type: 'confirmation', content: `Confirmed: ${targetLabel}`, created_at: new Date().toISOString() }, { role: 'assistant', type: 'questions', questions, edit_target, confirmed_sections, target_steps, edit_intent, created_at: new Date().toISOString() }]
      await supabase.from('warroom_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
      return new Response(JSON.stringify({ type: 'questions', questions, edit_target, confirmed_sections, target_steps, edit_intent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (mode === 'answer') {
      if (!edit_intent) return new Response(JSON.stringify({ error: 'edit_intent required' }), { status: 400, headers: corsHeaders })
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

      const snapshot: Record<string, unknown> = { steps: pb.steps, red_flags: pb.red_flags, founder_honest_take: pb.founder_honest_take, thirty_day_sprint: pb.thirty_day_sprint }
      const { data: versionRows } = await supabase.from('warroom_playbook_versions').select('version_number').eq('playbook_id', playbook_id).order('version_number', { ascending: false }).limit(1)
      const nextVersion = (versionRows?.[0]?.version_number ?? 0) + 1

      let updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      let sectionsForLog: string[] = []
      let stepsForLog: number[] = []
      let summaryLabel = ''

      try {
        if (edit_target === 'steps') {
          const validSteps: number[] = (target_steps ?? []).filter((n: unknown) => typeof n === 'number')
          const targetStepObjs = steps.filter(s => validSteps.includes(s.step_order as number))
          if (!targetStepObjs.length) throw new Error('No matching steps found')
          await supabase.from('warroom_playbook_versions').insert({ playbook_id, version_number: nextVersion, snapshot, edit_summary: `Before edit: Step(s) ${validSteps.join(', ')}` })
          const raw = await geminiCall(geminiKey, buildStepEditPrompt(businessName, targetStepObjs, edit_intent, userAnswers), 8192, false)
          const parsed = JSON.parse(strip(raw))
          const rewrittenSteps: Step[] = Array.isArray(parsed.steps) ? parsed.steps : []
          const mergedSteps = steps.map(s => {
            const replacement = rewrittenSteps.find(r => r.step_order === s.step_order)
            return replacement ?? s
          })
          updatePayload.steps = mergedSteps
          stepsForLog = validSteps
          summaryLabel = `Step(s) ${validSteps.join(', ')}`
        } else {
          const validSections: string[] = (confirmed_sections ?? []).filter((s: string) => FLAT_SECTION_KEYS.includes(s))
          if (!validSections.length) throw new Error('No matching sections found')
          await supabase.from('warroom_playbook_versions').insert({ playbook_id, version_number: nextVersion, snapshot, edit_summary: `Before edit: ${validSections.map(s => FLAT_SECTION_MAP[s] ?? s).join(', ')}` })
          const existingValues: Record<string, unknown> = { red_flags: pb.red_flags, founder_honest_take: pb.founder_honest_take, thirty_day_sprint: pb.thirty_day_sprint }
          const raw = await geminiCall(geminiKey, buildFlatEditPrompt(businessName, validSections, edit_intent, userAnswers, existingValues), 8192, false)
          const parsed = JSON.parse(strip(raw))
          for (const key of validSections) { if (parsed[key] !== undefined) updatePayload[key] = parsed[key] }
          sectionsForLog = validSections
          summaryLabel = validSections.map(s => FLAT_SECTION_MAP[s] ?? s).join(', ')
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Edit failed.', detail: String(e) }), { status: 500, headers: corsHeaders })
      }

      const { data: freshSession } = await supabase.from('warroom_edit_sessions').select('status').eq('id', session_id).single()
      if (freshSession?.status === 'cancelled') return new Response(JSON.stringify({ type: 'cancelled', message: 'Edit was cancelled.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

      const { error: updateErr } = await supabase.from('user_playbooks').update(updatePayload).eq('id', playbook_id)
      if (updateErr) { return new Response(JSON.stringify({ error: 'Save failed.', detail: updateErr.message }), { status: 500, headers: corsHeaders }) }

      await supabase.from('warroom_section_edits').insert({ user_id: user.id, playbook_id, sections_edited: sectionsForLog, steps_edited: stepsForLog.length ? stepsForLog : null, user_message: edit_intent, reasoning: JSON.stringify(userAnswers), credits_charged: isByok ? 0 : 1 })

      const completionMsg = `Done! Updated ${summaryLabel}. Version ${nextVersion} saved — roll back anytime.`
      const newMessages = [...messages, { role: 'user', type: 'answers', content: JSON.stringify(userAnswers), created_at: new Date().toISOString() }, { role: 'assistant', type: 'edit_complete', content: completionMsg, summary_label: summaryLabel, version_number: nextVersion, created_at: new Date().toISOString() }]
      await supabase.from('warroom_edit_sessions').update({ messages: newMessages, status: 'idle' }).eq('id', session_id)

      return new Response(JSON.stringify({ type: 'edit_complete', summary_label: summaryLabel, version_saved: nextVersion, byok_used: isByok, credits_remaining: creditsAfter, updated_data: updatePayload }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), { status: 400, headers: corsHeaders })

  } catch (err) {
    console.error('[warroom-edit-chat] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

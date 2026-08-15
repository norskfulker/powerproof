// opportunity-edit-chat v10
// SUBSCRIPTION MIGRATION: deduct_task_credits/refund_task_credits replaced with deduct_feature_usage,
// bucket='edits'. mode:'message'/'confirm' remain free (chat is unlimited); only mode:'answer' spends.
// cancel mode no longer refunds (usage counters don't roll back mid-period) — acceptable tradeoff for simplicity.
// FORMATTING: chat-type replies now instructed to use markdown (bold/bullets/headers) for nicer rendering.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_TIMEOUT_MS = 90_000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key'
}

const SECTION_MAP: Record<string, string> = {
  market_demographics:    'Market Demographics',
  market_intelligence:    'Market Intelligence / TAM SAM SOM',
  competitors:            'Competitor Analysis',
  demand_trend:           'Demand Trend',
  marketing_strategy:     'Marketing Strategy',
  revenue_streams:        'Revenue Streams',
  govt_schemes:           'Government Schemes',
  licenses_required:      'Licenses & Permits',
  space_location:         'Space & Location',
  financial_projections:  'Financial Projections',
  faqs:                   'FAQs',
  pros:                   'Pros (Advantages)',
  cons:                   'Cons (Risks)',
  expert_tips_structured: 'Expert Tips',
  setup_cost_breakdown:   'Setup Cost Breakdown',
  headcount:              'Team & Headcount',
  risk_matrix:            'Risk Matrix',
  funding_options:        'Funding Options',
  unit_economics_deep:    'Unit Economics',
  tools_and_stack:        'Tools & Tech Stack',
  machinery_list:         'Machinery & Equipment',
  raw_materials:          'Raw Materials',
  score_breakdown:        'Score Breakdown',
}
const SECTION_KEYS = Object.keys(SECTION_MAP)

const SUGGESTION_PREFILLS: Record<string, string> = {
  financial_projections:  'Make the financial projections more realistic for year 1',
  marketing_strategy:     'Rewrite the marketing strategy with better digital channels',
  competitors:            'Update the competitor analysis with more recent players',
  market_intelligence:    'Refresh the market intelligence and TAM/SAM/SOM numbers',
  market_demographics:    'Update the market demographics and customer profile',
  revenue_streams:        'Add more revenue streams and diversification options',
  risk_matrix:            'Expand the risk matrix with more detailed mitigations',
  unit_economics_deep:    'Recalculate unit economics with better LTV and CAC estimates',
  funding_options:        'Update funding options with more relevant sources',
  govt_schemes:           'Find more relevant government schemes and subsidies',
  setup_cost_breakdown:   'Update the setup cost breakdown with current market prices',
  machinery_list:         'Update the machinery list with latest equipment options',
  tools_and_stack:        'Refresh the tools and tech stack recommendations',
  expert_tips_structured: 'Add more expert tips and operational insights',
  headcount:              'Update the team structure and hiring requirements',
  licenses_required:      'Update the licenses and regulatory requirements',
  demand_trend:           'Refresh the demand trend data with latest figures',
  pros:                   'Strengthen the advantages and unique selling points',
  cons:                   'Be more honest about the risks and challenges',
  faqs:                   'Add more frequently asked questions and detailed answers',
  space_location:         'Update the space and location requirements',
  raw_materials:          'Update the raw materials list and sourcing options',
  score_breakdown:        'Recalculate the opportunity score with updated metrics',
}

const POPULAR_ANCHOR = ['financial_projections','marketing_strategy','competitors','market_intelligence']

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
      p_user_id: userId, p_function_name: 'opportunity-edit-chat',
      p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed)
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
  } catch (e) { console.error('[edit-chat] rate limit error:', e) }
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
  const anchorInTop4 = ordered.slice(0, 4).some(s => POPULAR_ANCHOR.includes(s))
  if (!anchorInTop4) {
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

async function getRecentlyEditedSections(supabase: ReturnType<typeof createClient>, opportunityId: string, userId: string): Promise<string[]> {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('opportunity_section_edits').select('sections_edited')
      .eq('opportunity_id', opportunityId).eq('user_id', userId)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(20)
    if (!data?.length) return []
    const allEdited = data.flatMap(r => Array.isArray(r.sections_edited) ? r.sections_edited : [])
    return [...new Set(allEdited)]
  } catch { return [] }
}

function buildMessagePrompt(userMessage: string, title: string, availableSections: string[], recentHistory: Array<{ role: string; type?: string; content: string }>): string {
  const sectionList = availableSections.map(s => `- ${s}: ${SECTION_MAP[s] ?? s}`).join('\n')
  const historyBlock = recentHistory.length > 0
    ? `\nRecent conversation (last ${recentHistory.length} messages):\n` +
      recentHistory.map(m => { const role = m.role === 'user' ? 'User' : 'Assistant'; const content = (m.content ?? '').slice(0, 120); const type = m.type ? ` [${m.type}]` : ''; return `${role}${type}: ${content}` }).join('\n')
    : ''
  return `You are a friendly AI assistant inside PowerProof — a business research platform.
Your ONLY job: help the user edit or re-research sections of their report.
You are NOT a general chatbot.

Report: "${title}"
User message: "${userMessage}"${historyBlock}

Available sections:
${sectionList}

CLASSIFY the user message into ONE of these types:

TYPE 1 — greeting/chitchat
→ Warm 1-2 sentence reply. Mention editing sections OR re-researching with a different style.

TYPE 2 — vague intent
→ Acknowledge. Ask which area. Mention 3-4 section names.

TYPE 3 — off-topic
→ Politely redirect.

TYPE 4 — clear edit intent
→ Infer section. Map: "financials"=financial_projections, "competition"=competitors, "market"=market_demographics or market_intelligence, "tips"=expert_tips_structured, "costs"=setup_cost_breakdown, "team"=headcount, "risks"=risk_matrix, "funding"=funding_options, "machinery"=machinery_list, "licenses"=licenses_required, "schemes"=govt_schemes, "tools"=tools_and_stack, "unit economics"=unit_economics_deep

TYPE 5 — follow-up question about something already done
→ CRITICAL: if last assistant message was edit_complete, questions, or confirm — this is a follow-up.
→ Answer conversationally. No edit flow. No section inference.

For TYPE 1, 2, 3, and 5 (all conversational "chat" replies), format the "reply" field's text using markdown: **bold** key terms, use "- " bullet lists when mentioning multiple section names or options, keep it short (1-3 sentences typically, this is a chat bubble not a report).

Return ONLY valid JSON, no markdown fences around the outer object (only the "reply" string's own content should contain markdown syntax):

For TYPE 1,2,3,5:
{"message_type":"chat","reply":"str","inferred_sections":[]}

For TYPE 4:
{"message_type":"confirm","inferred_sections":["key"],"confidence":"high|medium|low","confirm_question":"str","edit_intent_summary":"str","reply":""}

When in doubt between TYPE 4 and TYPE 5, prefer TYPE 5.`
}

function buildQuestionsPrompt(editIntent: string, sections: string[], title: string): string {
  return `You are an assistant for PowerProof.
Report: "${title}"
Sections: ${sections.map(s => SECTION_MAP[s] ?? s).join(', ')}
Intent: "${editIntent}"
Ask 1-2 SHORT outcome-focused questions about direction, not data.
Good: "Best-case, realistic, or conservative?", "Metro or Tier 2/3 towns?"
Bad: "What is your margin?", "Who are your competitors?"
Return ONLY JSON:
{"questions":[{"id":"q1","text":"?","type":"single_select","options":["A","B","C"],"required":true}]}`
}

function buildEditPrompt(opp: Record<string, unknown>, sections: string[], editIntent: string, answers: Record<string, string>): string {
  const title = opp.title as string; const country = (opp.country as string) || 'India'
  const answersBlock = Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '(none)'
  const existingBlock = sections.map(s => { const val = opp[s]; if (!val) return `${s}: (empty — generate fresh)`; const str = JSON.stringify(val); return `${s}: ${str.slice(0, 500)}${str.length > 500 ? '...' : ''}` }).join('\n\n')
  const schemaFragments: Record<string, string> = {
    market_demographics:`"market_demographics":{"market_size_cr":0,"market_cagr":0,"penetration_pct":0,"income_segment":"str","primary_buyers":"str","geography":"str","key_insight":"str","psychographic_profile":"str","buying_triggers":["str"],"segments":[{"label":"str","pct":0}]}`,
    market_intelligence:`"market_intelligence":{"market_size_unit":"usd_m","cagr_pct":0,"tam_cr":0,"sam_cr":0,"som_cr":0,"seasonality":"low|medium|high","seasonality_notes":"str","market_king":{"name":"str","why":"str","your_path":"str"},"swot":{"strengths":[],"weaknesses":[],"opportunities":[],"threats":[]},"mvp_weeks_min":0,"mvp_weeks_max":0,"mvp_milestones":[],"persona":{"age_range":"str","income_bracket":"str","pain_points":[],"decision_triggers":[],"channels":[]}}`,
    competitors:`"competitors":{"king_of_market":{"name":"str","why_they_win":"str","their_weakness":"str","your_exploit":"str"},"direct":[{"name":"str","type":"local|national|international","strength":"str","weakness":"str","pricing":"str","not_doing":"str"}],"indirect":[{"name":"str","threat_level":"low|medium|high","reason":"str"}],"your_advantages":["str"],"what_to_do":["str"]}`,
    demand_trend:`"demand_trend":{"label":"str","unit":"str","data":[{"period":"Jan 2024","value":0}],"trend_direction":"rising|falling|stable|seasonal","trend_note":"str"}`,
    marketing_strategy:`"marketing_strategy":{"primary_hook":"str","total_budget_usd":0,"channels":[{"name":"str","type":"str","budget_usd":0,"tactics":["str"],"kpi":"str"}],"guerrilla_play":{"idea":"str","execution":"str"},"launch_sequence":[{"week":"str","action":"str"}],"retention_strategy":"str"}`,
    revenue_streams:`"revenue_streams":[{"label":"str","model":"str","pct_of_revenue":0,"avg_ticket_usd":0,"frequency":"str","description":"str","growth_potential":"low|medium|high"}]`,
    govt_schemes:`"govt_schemes":[{"name":"str","benefit":"str","eligibility":"str","apply_url":"str","ministry":"str","application_process":"str"}]`,
    licenses_required:`"licenses_required":[{"name":"str","authority":"str","portal":"str","est_cost_usd":0,"est_days":0,"mandatory":true,"description":"str"}]`,
    space_location:`"space_location":{"needed":true,"type":"str","min_sqft":0,"max_sqft":0,"ideal_location":"str","avoid":"str","rent_tier1_usd":0,"rent_tier2_usd":0,"notes":"str"}`,
    financial_projections:`"financial_projections":{"_unit":"USD","monthly":{"revenue_low":0,"revenue_high":0,"opex":0,"cogs_pct":0},"assumptions":{"initial_investment":0,"loan_amount":0,"loan_interest_rate_pct":0},"year3":{"revenue":0,"ebitda":0},"year5":{"revenue":0,"ebitda":0}}`,
    faqs:`"faqs":[{"q":"str","a":"str"}]`,
    pros:`"pros":["str"]`, cons:`"cons":["str"]`,
    expert_tips_structured:`"expert_tips_structured":[{"category":"str","icon":"str","tips":["str"]}]`,
    setup_cost_breakdown:`"setup_cost_breakdown":[{"label":"str","amount_usd":0,"notes":"str"}]`,
    headcount:`"headcount":{"min":0,"max":0,"breakdown":[{"role":"str","count":0,"type":"full_time|part_time|contract"}]}`,
    risk_matrix:`"risk_matrix":{"overall_risk":"low|medium|high","risks":[{"risk":"str","likelihood":"low|medium|high","impact":"low|medium|high","mitigation":"str"}]}`,
    funding_options:`"funding_options":{"summary":"str","options":[{"type":"str","label":"str","source_name":"str","amount_range_usd_min":0,"amount_range_usd_max":0,"pros":["str"],"cons":["str"]}]}`,
    unit_economics_deep:`"unit_economics_deep":{"cac_by_channel":[{"channel":"str","cac_usd":0}],"avg_ltv_usd":0,"ltv_cac_ratio":0,"gross_margin_pct":0,"break_even_units_per_month":0,"payback_period_months":0}`,
    tools_and_stack:`"tools_and_stack":[{"category":"str","name":"str","purpose":"str","cost_usd_per_month":0,"free_tier_available":true,"priority":"must_have|nice_to_have"}]`,
    machinery_list:`"machinery_list":[{"name":"str","qty":0,"cost_approx":0,"category":"str","mandatory":"Essential|Required|Optional","purpose":"str"}]`,
    raw_materials:`"raw_materials":[{"name":"str","category":"str","cost_per_unit":"str","source":"str","unit":"str","frequency":"Daily|Weekly|Monthly"}]`,
    score_breakdown:`"score_breakdown":{"profitability":0,"ease":0,"govt_support":0,"market_momentum":0}`,
  }
  const selectedSchema = sections.filter(s => schemaFragments[s]).map(s => schemaFragments[s]).join(',\n  ')
  return `You are PowerProof AI rewriting specific sections of a business research report.
Business: "${title}" | Country: ${country}
Edit intent: "${editIntent}"
User answers: ${answersBlock}
Existing content (context):
${existingBlock}
Rules: ALL financial values = whole USD integers. TAM>SAM>SOM. Rewrite ONLY requested sections.
Return ONLY valid JSON:\n{\n  ${selectedSchema}\n}`
}

const SNAPSHOT_COLUMNS = [
  'market_demographics','market_intelligence','competitors','demand_trend',
  'marketing_strategy','revenue_streams','govt_schemes','govt_scheme_details',
  'licenses_required','space_location','financial_projections','faqs',
  'pros','cons','expert_tips_structured','setup_cost_breakdown','headcount',
  'risk_matrix','funding_options','unit_economics_deep','tools_and_stack',
  'machinery_list','raw_materials','score_breakdown',
  'setup_cost_derivation','profit_derivation','effort_scorecard',
  'title','tagline','short_desc','full_desc',
  'monthly_rev_min','monthly_rev_max','monthly_profit_min','monthly_profit_max',
  'setup_min','setup_max','ease','score',
] as const

function buildSnapshot(opp: Record<string, unknown>): Record<string, unknown> {
  const snap: Record<string, unknown> = {}
  for (const col of SNAPSHOT_COLUMNS) { if (opp[col] !== undefined) snap[col] = opp[col] }
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
    const { mode, user_opportunity_id, session_id, message, confirmed_sections, answers, edit_intent } = body

    if (!user_opportunity_id)
      return new Response(JSON.stringify({ error: 'user_opportunity_id required' }), { status: 400, headers: corsHeaders })

    // Rate limit only on modes that call Gemini
    if (mode === 'message' || mode === 'answer' || mode === 'confirm') {
      const limited = await checkRateLimit(supabase, user.id, isByok)
      if (limited) return limited
    }

    const { data: opp, error: oppErr } = await supabase
      .from('user_opportunities').select('*')
      .eq('id', user_opportunity_id).eq('user_id', user.id).single()
    if (oppErr || !opp)
      return new Response(JSON.stringify({ error: 'Research not found' }), { status: 404, headers: corsHeaders })

    if (mode === 'history') {
      const { data: allSessions } = await supabase
        .from('opportunity_edit_sessions').select('id, status, created_at, updated_at, messages')
        .eq('user_opportunity_id', user_opportunity_id).eq('user_id', user.id)
        .order('created_at', { ascending: false })
      const sessions = (allSessions ?? []).filter(s => Array.isArray(s.messages) && s.messages.length > 0)
      return new Response(JSON.stringify({ sessions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (mode === 'new_session') {
      const newSessionId = crypto.randomUUID()
      const availableSections = SECTION_KEYS.filter(s => opp[s] !== null && opp[s] !== undefined)
      const recentEdits = await getRecentlyEditedSections(supabase, user_opportunity_id, user.id)
      const suggestions = buildSuggestions(availableSections, recentEdits)
      return new Response(JSON.stringify({ session_id: newSessionId, status: 'pending', suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!session_id)
      return new Response(JSON.stringify({ error: 'session_id required' }), { status: 400, headers: corsHeaders })

    if (mode === 'cancel') {
      const { data: cancelSession } = await supabase.from('opportunity_edit_sessions').select('id, status').eq('id', session_id).eq('user_id', user.id).single()
      if (cancelSession?.status === 'active') {
        await supabase.from('opportunity_edit_sessions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', session_id)
      }
      return new Response(JSON.stringify({ type: 'cancelled', message: 'Edit cancelled.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let session: Record<string, unknown> | null = null
    const { data: existingSession } = await supabase.from('opportunity_edit_sessions').select('*').eq('id', session_id).eq('user_id', user.id).maybeSingle()
    if (existingSession) {
      session = existingSession
    } else if (mode === 'message') {
      const { data: newSession, error: insertErr } = await supabase.from('opportunity_edit_sessions')
        .insert({ id: session_id, user_opportunity_id, user_id: user.id, messages: [], status: 'active' }).select('*').single()
      if (insertErr || !newSession) return new Response(JSON.stringify({ error: 'Failed to create session', detail: insertErr?.message }), { status: 500, headers: corsHeaders })
      session = newSession
    } else {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: corsHeaders })
    }

    const messages: unknown[] = (session.messages as unknown[]) ?? []

    if (mode === 'message') {
      if (!message?.trim()) return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: corsHeaders })
      const availableSections = SECTION_KEYS.filter(s => opp[s] !== null && opp[s] !== undefined)
      const recentHistory = (messages as Array<Record<string, unknown>>).slice(-4).map(m => ({ role: String(m.role ?? 'user'), type: m.type ? String(m.type) : undefined, content: String(m.content ?? m.text ?? '').slice(0, 120) }))
      const raw = await geminiCall(geminiKey, buildMessagePrompt(message, opp.title as string, availableSections, recentHistory), 4096, true)
      const parsed = JSON.parse(strip(raw))
      const messageType: string = parsed.message_type ?? 'chat'
      if (messageType === 'chat') {
        const reply = parsed.reply ?? "I can help you edit any section of this report. What would you like to change?"
        const recentEdits = await getRecentlyEditedSections(supabase, user_opportunity_id, user.id)
        const suggestions = buildSuggestions(availableSections, recentEdits)
        const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'chat', content: reply, suggestions, created_at: new Date().toISOString() }]
        await supabase.from('opportunity_edit_sessions').update({ messages: newMessages, status: 'active' }).eq('id', session_id)
        return new Response(JSON.stringify({ type: 'chat', reply, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const inferredSections: string[] = (parsed.inferred_sections ?? []).filter((s: string) => SECTION_KEYS.includes(s))
      if (!inferredSections.length) {
        const fallbackReply = "I want to make sure I update the right section. Which part would you like to change — for example, the financials, marketing strategy, or competitor analysis?"
        const recentEdits = await getRecentlyEditedSections(supabase, user_opportunity_id, user.id)
        const suggestions = buildSuggestions(availableSections, recentEdits)
        const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'chat', content: fallbackReply, suggestions, created_at: new Date().toISOString() }]
        await supabase.from('opportunity_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
        return new Response(JSON.stringify({ type: 'chat', reply: fallbackReply, suggestions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const confirmQuestion = parsed.confirm_question ?? `You want me to update ${inferredSections.map((s: string) => SECTION_MAP[s] ?? s).join(' & ')} — is that right?`
      const editIntentSummary = parsed.edit_intent_summary ?? message
      const newMessages = [...messages, { role: 'user', content: message, created_at: new Date().toISOString() }, { role: 'assistant', type: 'confirm', content: confirmQuestion, inferred_sections: inferredSections, edit_intent: editIntentSummary, created_at: new Date().toISOString() }]
      await supabase.from('opportunity_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
      return new Response(JSON.stringify({ type: 'confirm', confirm_question: confirmQuestion, inferred_sections: inferredSections, inferred_labels: inferredSections.map((s: string) => SECTION_MAP[s] ?? s), edit_intent: editIntentSummary, confidence: parsed.confidence ?? 'medium' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (mode === 'confirm') {
      if (!confirmed_sections?.length || !edit_intent) return new Response(JSON.stringify({ error: 'confirmed_sections and edit_intent required' }), { status: 400, headers: corsHeaders })
      const validSections = confirmed_sections.filter((s: string) => SECTION_KEYS.includes(s))
      const raw = await geminiCall(geminiKey, buildQuestionsPrompt(edit_intent, validSections, opp.title as string), 4096, true)
      const parsed = JSON.parse(strip(raw))
      const questions = (parsed.questions ?? []).slice(0, 2).map((q: Record<string, unknown>, i: number) => ({ id: String(q.id ?? `q${i + 1}`), text: String(q.text ?? ''), type: (['single_select','multi_select','text'].includes(q.type as string) ? q.type : 'single_select') as string, options: Array.isArray(q.options) ? q.options.map(String) : undefined, required: Boolean(q.required ?? true) }))
      const newMessages = [...messages, { role: 'user', type: 'confirmation', content: `Confirmed: ${validSections.map((s: string) => SECTION_MAP[s] ?? s).join(', ')}`, created_at: new Date().toISOString() }, { role: 'assistant', type: 'questions', questions, confirmed_sections: validSections, edit_intent, created_at: new Date().toISOString() }]
      await supabase.from('opportunity_edit_sessions').update({ messages: newMessages }).eq('id', session_id)
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
      const snapshot = buildSnapshot(opp)
      const { data: versionRows } = await supabase.from('opportunity_report_versions').select('version_number').eq('user_opportunity_id', user_opportunity_id).order('version_number', { ascending: false }).limit(1)
      const nextVersion = (versionRows?.[0]?.version_number ?? 0) + 1
      await supabase.from('opportunity_report_versions').insert({ user_opportunity_id, version_number: nextVersion, snapshot, edit_summary: `Before edit: ${validSections.map((s: string) => SECTION_MAP[s] ?? s).join(', ')}` })
      let parsed: Record<string, unknown>
      try {
        const raw = await geminiCall(geminiKey, buildEditPrompt(opp, validSections, edit_intent, userAnswers), 24576, false)
        parsed = JSON.parse(strip(raw))
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Edit failed.', detail: String(e) }), { status: 500, headers: corsHeaders })
      }
      const { data: freshSession } = await supabase.from('opportunity_edit_sessions').select('status').eq('id', session_id).single()
      if (freshSession?.status === 'cancelled') return new Response(JSON.stringify({ type: 'cancelled', message: 'Edit was cancelled.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const key of validSections) { if (parsed[key] !== undefined) updatePayload[key] = parsed[key] }
      if (validSections.includes('govt_schemes') && parsed.govt_schemes) { const schemes = parsed.govt_schemes as Record<string, unknown>[]; updatePayload.govt_scheme_details = { schemes: schemes.map(s => ({ name: s.name ?? '', benefit: s.benefit ?? '', eligibility: s.eligibility ?? '', ministry: s.ministry ?? '', apply_url: s.apply_url ?? null, application_process: s.application_process ?? '' })) } }
      const { error: updateErr } = await supabase.from('user_opportunities').update(updatePayload).eq('id', user_opportunity_id)
      if (updateErr) { return new Response(JSON.stringify({ error: 'Save failed.', detail: updateErr.message }), { status: 500, headers: corsHeaders }) }
      await supabase.from('opportunity_section_edits').insert({ user_id: user.id, opportunity_id: user_opportunity_id, sections_edited: validSections, user_message: edit_intent, reasoning: JSON.stringify(userAnswers), credits_charged: isByok ? 0 : 1 })
      const completionMsg = `Done! Updated ${validSections.map((s: string) => SECTION_MAP[s] ?? s).join(', ')}. Version ${nextVersion} saved — roll back anytime.`
      const newMessages = [...messages, { role: 'user', type: 'answers', content: JSON.stringify(userAnswers), created_at: new Date().toISOString() }, { role: 'assistant', type: 'edit_complete', content: completionMsg, sections_updated: validSections, version_number: nextVersion, created_at: new Date().toISOString() }]
      await supabase.from('opportunity_edit_sessions').update({ messages: newMessages, status: 'idle' }).eq('id', session_id)
      return new Response(JSON.stringify({ type: 'edit_complete', sections_updated: validSections, sections_labels: validSections.map((s: string) => SECTION_MAP[s] ?? s), version_saved: nextVersion, byok_used: isByok, credits_remaining: creditsAfter, updated_data: updatePayload }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), { status: 400, headers: corsHeaders })

  } catch (err) {
    console.error('[opportunity-edit-chat] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

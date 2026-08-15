// market-test-generate-artifact v1
// Generates a full structured artifact from market test context + chat history.
// Types: ads | blog | idea | doc
// Credits: base 5 x model multiplier (same as artifact_signal tier in chat)
// Saves to market_artifacts table, appends artifact_id to chat session message.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gemini-key',
}

const MODEL_CONFIG = {
  'gemini-2.5-flash-lite': { multiplier: 1, label: 'Quick' },
  'gemini-2.5-flash':      { multiplier: 2, label: 'Standard' },
  'gemini-2.5-pro':        { multiplier: 4, label: 'Deep' },
}
const DEFAULT_MODEL  = 'gemini-2.5-flash'
const BASE_CREDITS   = 5
const MAX_RETRIES    = 2
const RETRY_DELAYS   = [3000, 8000]

const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
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

function strip(s) {
  return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}
function repairJson(s) { return s.replace(/,\s*([}\]])/g, '$1') }
function parseJson(text) {
  const base = strip(text)
  for (const c of [base, repairJson(base)].filter(Boolean)) {
    try {
      const p = JSON.parse(repairJson(c))
      if (p && typeof p === 'object') return p
    } catch { }
  }
  throw new Error('JSON parse failed')
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function geminiJson(apiKey, model, prompt, maxTokens = 8000) {
  let lastErr = new Error('gemini failed')
  for (let i = 0; i < MAX_RETRIES; i++) {
    if (i > 0) await sleep(RETRY_DELAYS[i - 1])
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
            safetySettings: SAFETY,
          }),
        }
      )
      if (res.status === 503 || res.status === 429) { lastErr = new Error(`${res.status}`); continue }
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const d = await res.json()
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (!text) { lastErr = new Error('Empty response'); continue }
      return text
    } catch (e) { lastErr = e instanceof Error ? e : new Error(String(e)) }
  }
  throw lastErr
}

function buildMarketTestContext(test) {
  const signals = (test.demand_signals ?? []).map(s => `  - ${s.signal} (${s.strength}): ${s.evidence}`).join('\n')
  const flags   = (test.red_flags ?? []).map(f => `  - ${f.flag} (${f.severity}): ${f.evidence}`).join('\n')
  const fails   = (test.past_failures ?? []).map(f => `  - ${f.company ?? 'Unknown'}: ${f.what_happened}`).join('\n')
  const wins    = (test.past_successes ?? []).map(s => `  - ${s.company ?? 'Unknown'}: ${s.what_worked}`).join('\n')
  return `Idea: "${test.query}" | Country: ${test.country ?? 'India'} | Score: ${test.market_reality_score ?? 'N/A'}/100 | Verdict: ${test.verdict_label ?? test.verdict ?? 'N/A'}
Honest take: ${test.honest_verdict ?? ''}
Demand signals:\n${signals}\nRed flags:\n${flags}\nFailed companies:\n${fails}\nSuccessful companies:\n${wins}
Pros: ${(test.pros ?? []).join(', ')}\nCons: ${(test.cons ?? []).join(', ')}`
}

function buildChatContext(messages) {
  if (!messages || messages.length === 0) return ''
  const recent = messages.slice(-10)
  return '\nRECENT CONVERSATION:\n' + recent.map(m =>
    `${m.role === 'user' ? 'User' : 'AI'}: ${String(m.content ?? '').slice(0, 400)}`
  ).join('\n')
}

// Per-type artifact prompts
function buildArtifactPrompt(kind, title, marketContext, chatContext) {
  const base = `You are PowerProof's GTM strategist. Generate a complete, specific, actionable artifact for this business.\n\nMARKET RESEARCH:\n${marketContext}${chatContext}\n\nArtifact title: "${title}"\n\n`

  if (kind === 'ads') {
    return base + `Generate a complete ad campaign plan. Return ONLY valid JSON:\n{
  "summary": "2-3 sentence campaign overview",
  "meta": {
    "audiences": [{"name": "str", "age_range": "str", "interests": ["str"], "behaviors": ["str"], "estimated_size": "str"}],
    "hook_angles": ["str"],
    "ad_formats": ["str"],
    "budget_suggestion": "str",
    "sample_headlines": ["str"],
    "sample_primary_text": "str"
  },
  "instagram": {
    "content_formats": ["str"],
    "hook_angles": ["str"],
    "posting_cadence": "str",
    "sample_captions": ["str"]
  },
  "reddit": {
    "subreddits": [{"name": "str", "why": "str", "approach": "str"}],
    "post_strategy": "str",
    "what_not_to_do": "str"
  },
  "linkedin": {
    "target_titles": ["str"],
    "content_strategy": "str",
    "cold_dm_script": "str"
  },
  "google": {
    "paid_keywords": ["str"],
    "organic_keywords": ["str"],
    "negative_keywords": ["str"]
  }
}`
  }

  if (kind === 'blog') {
    return base + `Generate a complete blog post. Return ONLY valid JSON:\n{
  "seo_title": "str",
  "meta_description": "str (under 160 chars)",
  "target_keyword": "str",
  "estimated_read_time": "str",
  "sections": [{"heading": "str", "content": "str (2-4 paragraphs)"}],
  "call_to_action": "str",
  "internal_link_suggestions": ["str"]
}`
  }

  if (kind === 'idea') {
    return base + `Generate a complete business idea document. Return ONLY valid JSON:\n{
  "executive_summary": "str",
  "problem_statement": "str",
  "solution": "str",
  "target_market": "str",
  "unique_value_proposition": "str",
  "revenue_model": ["str"],
  "go_to_market": "str",
  "competitive_advantage": "str",
  "risks": [{"risk": "str", "mitigation": "str"}],
  "next_steps": ["str"],
  "estimated_startup_cost": "str",
  "time_to_first_revenue": "str"
}`
  }

  // kind === 'doc' (general — landing page, cold outreach, strategy, etc.)
  return base + `Generate a complete document based on the title and context. Return ONLY valid JSON:\n{
  "doc_type": "str (e.g. Landing Page, Cold Outreach Script, Strategy Document)",
  "summary": "str",
  "sections": [{"title": "str", "content": "str"}],
  "key_takeaways": ["str"],
  "next_actions": ["str"]
}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const GEMINI_API_KEY       = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const user = getUser(req)
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const byokKey   = req.headers.get('x-gemini-key')?.trim() || null
    const geminiKey = byokKey ?? GEMINI_API_KEY
    const isByok    = !!byokKey

    const body = await req.json()
    const {
      market_test_id,
      kind,
      title,
      model: rawModel = DEFAULT_MODEL,
    } = body

    if (!market_test_id)
      return new Response(JSON.stringify({ error: 'market_test_id required' }), { status: 400, headers: corsHeaders })
    if (!kind || !['ads', 'blog', 'idea', 'doc'].includes(kind))
      return new Response(JSON.stringify({ error: 'kind must be ads|blog|idea|doc' }), { status: 400, headers: corsHeaders })
    if (!title?.trim())
      return new Response(JSON.stringify({ error: 'title required' }), { status: 400, headers: corsHeaders })

    const model = MODEL_CONFIG[rawModel] ? rawModel : DEFAULT_MODEL
    const creditsCost = isByok ? 0 : BASE_CREDITS * MODEL_CONFIG[model].multiplier

    // Verify market test ownership
    const { data: test, error: testErr } = await db
      .from('market_tests')
      .select('id, user_id, query, country, verdict, verdict_label, market_reality_score, honest_verdict, demand_signals, red_flags, past_failures, past_successes, pros, cons, generation_status')
      .eq('id', market_test_id)
      .eq('user_id', user.id)
      .single()

    if (testErr || !test)
      return new Response(JSON.stringify({ error: 'Market test not found' }), { status: 404, headers: corsHeaders })
    if (test.generation_status !== 'complete')
      return new Response(JSON.stringify({ error: 'Market test not complete' }), { status: 400, headers: corsHeaders })

    // Deduct credits upfront (artifact generation is expensive)
    let creditsAfter = 0
    if (!isByok) {
      const { data: creditResult, error: creditErr } = await db.rpc('deduct_task_credits', {
        p_user_id: user.id, p_credits: creditsCost, p_feature: 'market_test_artifact',
      })
      if (creditErr)
        return new Response(JSON.stringify({ error: 'Credit error', detail: creditErr.message }), { status: 500, headers: corsHeaders })
      if (!creditResult?.success)
        return new Response(JSON.stringify({
          error: `Not enough credits. Need ${creditsCost}, have ${creditResult?.current ?? 0}.`,
          code: 'insufficient_credits', required_credits: creditsCost,
        }), { status: 402, headers: corsHeaders })
      creditsAfter = creditResult?.credits_after ?? 0
    }

    // Fetch chat session for context
    const { data: session } = await db
      .from('market_test_chat_sessions')
      .select('messages')
      .eq('market_test_id', market_test_id)
      .eq('user_id', user.id)
      .maybeSingle()

    const marketContext = buildMarketTestContext(test)
    const chatContext   = buildChatContext(session?.messages ?? [])
    const prompt        = buildArtifactPrompt(kind, title, marketContext, chatContext)

    let content
    try {
      const raw = await geminiJson(geminiKey, model, prompt, 8000)
      content = parseJson(raw)
    } catch (genErr) {
      // Refund on generation failure
      if (!isByok) await db.rpc('refund_research_credits', { p_user_id: user.id, p_credits: creditsCost }).catch(() => null)
      throw genErr
    }

    // Save artifact
    const { data: artifact, error: insertErr } = await db
      .from('market_artifacts')
      .insert({
        market_test_id,
        user_id: user.id,
        type: kind,
        title: title.trim(),
        content,
        status: 'draft',
        model_used: model,
        credits_used: creditsCost,
      })
      .select('id, type, title, status, created_at')
      .single()

    if (insertErr || !artifact) {
      if (!isByok) await db.rpc('refund_research_credits', { p_user_id: user.id, p_credits: creditsCost }).catch(() => null)
      throw new Error(`Failed to save artifact: ${insertErr?.message}`)
    }

    // Append artifact reference to chat session
    if (session) {
      const artifactMsg = {
        role: 'assistant',
        content: `Artifact created: "${title}"`,
        created_at: new Date().toISOString(),
        artifact_id: artifact.id,
        artifact_type: kind,
        artifact_title: title,
        credits_used: creditsCost,
      }
      const updatedMessages = [...(session.messages ?? []), artifactMsg]
      await db.from('market_test_chat_sessions').update({
        messages: updatedMessages,
        total_credits_used: db.rpc ? undefined : undefined, // updated via trigger or manual
        updated_at: new Date().toISOString(),
      }).eq('market_test_id', market_test_id).eq('user_id', user.id)
    }

    console.log(`[mtga] v1 artifact created id=${artifact.id} kind=${kind} model=${model} credits=${creditsCost}`)

    return new Response(
      JSON.stringify({
        artifact_id: artifact.id,
        type: kind,
        title: artifact.title,
        content,
        status: 'draft',
        model_used: model,
        credits_used: creditsCost,
        credits_remaining: creditsAfter,
        url: `/market-test/${market_test_id}/artifact/${artifact.id}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[market-test-generate-artifact] error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: corsHeaders }
    )
  }
})

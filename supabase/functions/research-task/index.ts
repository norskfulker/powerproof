// research-task v9
// SUBSCRIPTION MIGRATION: deduct_task_credits/refund_task_credits replaced with deduct_feature_usage,
// bucket='edits' (ponder tasks deepen an existing report, grouped with section edits per product decision).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const GEMINI_TIMEOUT_MS = 120_000
const VALID_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'] as const
type ValidModel = typeof VALID_MODELS[number]
const MODEL_FALLBACKS: Record<ValidModel, string[]> = {
  'gemini-2.5-flash-lite': ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
  'gemini-2.5-flash': ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  'gemini-2.5-pro': ['gemini-2.5-pro', 'gemini-2.5-flash'],
}
function strip(s: string): string { return s.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim() }

async function checkRateLimit(supabase: ReturnType<typeof createClient>, userId: string, fn: string, perHour: number, perDay: number): Promise<Response | null> {
  try {
    const { data: rl } = await supabase.rpc('check_and_increment_rate_limit', {
      p_user_id: userId, p_function_name: fn, p_calls_per_hour: perHour, p_calls_per_day: perDay,
    })
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({
        error: rl.reason === 'hourly_limit_exceeded'
          ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
          : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
        code: rl.reason, resets_at: rl.resets_at,
      }), { status: 429, headers: corsHeaders })
    }
  } catch (e) { console.error('[rt] rate limit error:', e) }
  return null
}

async function geminiWithChain(apiKey: string, prompt: string, modelChain: string[], maxTokens = 16384): Promise<string> {
  let lastErr: Error = new Error('All models failed')
  for (const model of modelChain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 4000))
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            ],
          }),
        })
        clearTimeout(timeout)
        if (r.status === 503 || r.status === 429) { lastErr = new Error(`${model} ${r.status}`); break }
        if (!r.ok) throw new Error(`${model} ${r.status}: ${(await r.text()).slice(0, 300)}`)
        const d = await r.json()
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        if (!text) { lastErr = new Error('Empty response'); continue }
        return text
      } catch (e) {
        clearTimeout(timeout)
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.includes('AbortError') || msg.includes('aborted')) throw new Error('TIMEOUT: Gemini exceeded 120s')
        lastErr = e instanceof Error ? e : new Error(msg)
        if (!msg.match(/503|429|Empty/)) throw lastErr
      }
    }
  }
  throw lastErr
}

type TaskType = 'ponder_marketing' | 'ponder_competitors' | 'ponder_financials' | 'ponder_operations' | 'ponder_custom'

function buildPonderPrompt(taskType: TaskType, opp: Record<string, unknown>, customPrompt: string | null, model: ValidModel): string {
  const title = opp.title as string
  const query = (opp.research_query as string) || title
  const country = opp.country as string || 'India'
  const category = opp.category_slug as string
  const score = opp.score as number
  const marketing = JSON.stringify(opp.marketing_strategy || {}, null, 2)
  const competitors = JSON.stringify(opp.competitors || {}, null, 2)
  const demographics = JSON.stringify(opp.market_demographics || {}, null, 2)
  const intelligence = JSON.stringify(opp.market_intelligence || {}, null, 2)
  const revenue = JSON.stringify(opp.revenue_streams || [], null, 2)
  const financials = JSON.stringify(opp.financial_projections || {}, null, 2)
  const proInstruction = model === 'gemini-2.5-pro'
    ? `\nYou are operating at McKinsey Senior Partner level. Every insight must be backed by real market data, named competitors, specific numbers, and frameworks used by top-tier consulting firms.\n` : ''
  const baseContext = `${proInstruction}\nBusiness: "${query}" ("${title}")\nCountry: ${country} | Category: ${category} | Score: ${score}/100\nMonthly revenue: $${opp.monthly_rev_min}-$${opp.monthly_rev_max} USD\n`

  if (taskType === 'ponder_marketing') return `You are a world-class marketing strategist. Deep PONDER on marketing strategy.\n${baseContext}\nMarketing: ${marketing}\nDemographics: ${demographics}\nCompetitors: ${competitors}\n${customPrompt ? `User request: "${customPrompt}"` : ''}\nReturn ONLY valid JSON:{"ponder_summary":"str","real_world_benchmarks":[{"company":"str","country":"str","what_they_did":"str","result":"str","apply_here":"str"}],"enhanced_channels":[{"name":"str","type":"ugc|short_form_video|influencer|community|instant_site|flyout|social|digital_ads|guerrilla|referral|event|pr","why_now":"str","exact_playbook":"str","budget_usd":0,"expected_roi":"str","content_ideas":["str"],"failure_traps":["str"]}],"short_form_video_playbook":{"hook_bank":["str"],"content_calendar_week1":[{"day":"str","format":"str","topic":"str","cta":"str"}],"trending_sounds_strategy":"str","collab_play":"str"},"influencer_showreel":{"ideal_creator_profile":"str","outreach_script":"str","brief":"str","kpi_targets":"str","platforms_priority":["str"]},"ugc_engine":{"trigger_moment":"str","ask_template":"str","incentive_structure":"str","repurpose_map":{"instagram":"str","whatsapp":"str","website":"str","ads":"str"}},"community_blueprint":{"platform":"str","name":"str","founding_member_strategy":"str","weekly_content_cadence":[{"day":"str","content":"str","goal":"str"}],"monetisation_flywheel":"str"},"revised_budget_plan":{"month_1":{"total_usd":0,"priority":"str","actions":["str"]},"month_3":{"total_usd":0,"priority":"str","actions":["str"]},"month_6":{"total_usd":0,"priority":"str","actions":["str"]},"month_12":{"total_usd":0,"priority":"str","actions":["str"]}},"psychological_triggers":[{"trigger":"str","why_it_works_here":"str","implementation":"str"}],"30_day_action_plan":[{"day":"str","task":"str","channel":"str","expected_output":"str"}]}`
  if (taskType === 'ponder_competitors') return `You are a world-class competitive intelligence analyst. Deep PONDER on competitive landscape.\n${baseContext}\nCompetitors: ${competitors}\nIntelligence: ${intelligence}\n${customPrompt ? `User request: "${customPrompt}"` : ''}\nReturn ONLY valid JSON:{"ponder_summary":"str","deep_competitor_profiles":[{"name":"str","founded":"str","funding_stage":"bootstrapped|angel|seed|series_a|ipo|unknown","revenue_est":"str","team_size_est":0,"product_strengths":["str"],"product_weaknesses":["str"],"marketing_playbook":"str","pricing_breakdown":"str","customer_complaints":["str"],"exploit_strategy":"str"}],"whitespace_opportunities":[{"gap":"str","why_unclaimed":"str","how_to_claim":"str","urgency":"low|medium|high"}],"blue_ocean_moves":[{"move":"str","inspiration":"str","execution":"str"}],"competitive_moat_to_build":{"type":"network_effects|brand|switching_costs|cost_advantage|unique_asset","how_to_build":"str","timeline":"str"},"first_mover_checklist":["str"]}`
  if (taskType === 'ponder_financials') return `You are a world-class CFO. Deep PONDER financial analysis.\n${baseContext}\nFinancials: ${financials}\nRevenue streams: ${revenue}\n${customPrompt ? `User request: "${customPrompt}"` : ''}\nReturn ONLY valid JSON:{"ponder_summary":"str","unit_economics":{"cac_estimate_usd":0,"ltv_estimate_usd":0,"ltv_cac_ratio":0.0,"payback_period_months":0,"gross_margin_pct":0,"net_margin_pct":0,"burn_rate_monthly_usd":0},"sensitivity_analysis":[{"variable":"str","base_case":"str","bear_case":"str","bull_case":"str","impact":"str"}],"revenue_acceleration":[{"lever":"str","current_value":"str","target_value":"str","action":"str","revenue_impact_usd":0}],"cost_reduction_opportunities":[{"cost_item":"str","current_est_usd":0,"reduction_strategy":"str","saving_est_usd":0}],"funding_strategy":{"recommended_path":"bootstrapped|angel|loan|govt_scheme|vc","amount_to_raise_usd":0,"use_of_funds":[{"item":"str","amount_usd":0,"rationale":"str"}],"investor_pitch_hook":"str"},"18_month_p_and_l":[{"month":"str","revenue_usd":0,"cogs_usd":0,"opex_usd":0,"ebitda_usd":0}]}`
  if (taskType === 'ponder_operations') return `You are a world-class operations expert. Deep PONDER operational analysis.\n${baseContext}\nCategory: ${category}, Country: ${country}\n${customPrompt ? `User request: "${customPrompt}"` : ''}\nReturn ONLY valid JSON:{"ponder_summary":"str","day_1_checklist":["str"],"week_1_checklist":["str"],"sop_templates":[{"process":"str","steps":["str"],"frequency":"daily|weekly|monthly"}],"tech_stack":[{"tool":"str","purpose":"str","cost_per_month_usd":0,"why_this_one":"str"}],"hiring_plan":[{"role":"str","month_to_hire":0,"salary_usd":0,"first_task":"str"}],"vendor_negotiation_tips":["str"],"quality_control_framework":{"key_metrics":["str"],"review_cadence":"str","red_flags_to_watch":["str"]},"scale_triggers":[{"milestone":"str","what_to_do_next":"str","investment_required_usd":0}]}`
  const proDepth = model === 'gemini-2.5-pro' ? `\nMcKinsey-grade: Porter's Five Forces, BCG Matrix, JTBD. Real competitors. 3 scenarios. Named owner + timeline + metric per action.\n` : ''
  return `You are performing a deep PONDER analysis.\n${proDepth}${baseContext}\nUser custom request: "${customPrompt || 'Comprehensive strategic deep-dive'}"\nMarketing: ${marketing.slice(0, 600)}...\nCompetitors: ${competitors.slice(0, 600)}...\nReturn ONLY valid JSON:{"task_title":"str","ponder_summary":"str","key_findings":[{"finding":"str","evidence":"str","action":"str","priority":"high|medium|low"}],"strategic_frameworks_applied":[{"framework":"str","insight":"str","implication":"str"}],"real_world_examples":[{"company":"str","market":"str","what_they_did":"str","result":"str","apply_here":"str"}],"scenarios":{"base_case":{"assumption":"str","outcome":"str","revenue_12m_usd":0},"bear_case":{"assumption":"str","outcome":"str","revenue_12m_usd":0},"bull_case":{"assumption":"str","outcome":"str","revenue_12m_usd":0}},"action_plan":[{"step":0,"action":"str","owner":"Founder|Team|Vendor","timeline":"str","success_metric":"str"}],"warnings":["str"],"quick_wins":["str"]}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const limited = await checkRateLimit(supabase, user.id, 'research-task', 10, 40)
    if (limited) return limited
    const body = await req.json()
    const { opportunity_id, task_type, task_label, custom_prompt = null, model: rawModel } = body
    const validTaskTypes: TaskType[] = ['ponder_marketing', 'ponder_competitors', 'ponder_financials', 'ponder_operations', 'ponder_custom']
    if (!opportunity_id || !task_type || !validTaskTypes.includes(task_type))
      return new Response(JSON.stringify({ error: 'opportunity_id and valid task_type required' }), { status: 400, headers: corsHeaders })
    const model: ValidModel = VALID_MODELS.includes(rawModel as ValidModel) ? rawModel as ValidModel : 'gemini-2.5-flash-lite'
    const modelChain = MODEL_FALLBACKS[model]
    const { data: opp, error: fetchErr } = await supabase.from('user_opportunities').select('*').eq('id', opportunity_id).eq('user_id', user.id).single()
    if (fetchErr || !opp) return new Response(JSON.stringify({ error: 'Research not found' }), { status: 404, headers: corsHeaders })

    const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', { p_user_id: user.id, p_bucket: 'edits', p_amount: 1 })
    if (usageErr) return new Response(JSON.stringify({ error: 'Usage error', detail: usageErr.message }), { status: 500, headers: corsHeaders })
    if (!usageResult?.success) {
      const reason = usageResult?.error
      if (reason === 'no_active_subscription') return new Response(JSON.stringify({ error: 'No active subscription found.', code: reason }), { status: 402, headers: corsHeaders })
      if (reason === 'feature_locked') return new Response(JSON.stringify({ error: 'This feature is not available on your plan.', code: reason }), { status: 402, headers: corsHeaders })
      return new Response(JSON.stringify({ error: `Monthly edit limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`, code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0, model }), { status: 402, headers: corsHeaders })
    }

    const { data: taskRow, error: taskInsertErr } = await supabase.from('research_tasks').insert({
      user_id: user.id, user_opportunity_id: opportunity_id, task_type,
      task_label: task_label || task_type, custom_prompt,
      status: 'pending',
      credits_used: 1
    }).select('id').single()
    if (taskInsertErr || !taskRow) {
      return new Response(JSON.stringify({ error: 'Failed to create task' }), { status: 500, headers: corsHeaders })
    }
    let result: Record<string, unknown>
    try {
      result = JSON.parse(strip(await geminiWithChain(GEMINI_API_KEY, buildPonderPrompt(task_type as TaskType, opp, custom_prompt, model), modelChain)))
    } catch (e) {
      await supabase.from('research_tasks').update({ status: 'failed', error_detail: String(e), updated_at: new Date().toISOString() }).eq('id', taskRow.id)
      return new Response(JSON.stringify({ error: 'Task failed.', detail: String(e) }), { status: 500, headers: corsHeaders })
    }
    const { error: updateErr } = await supabase.from('research_tasks').update({ status: 'complete', result, updated_at: new Date().toISOString() }).eq('id', taskRow.id)
    if (updateErr) {
      return new Response(JSON.stringify({ error: 'Save failed.', detail: updateErr.message }), { status: 500, headers: corsHeaders })
    }
    return new Response(JSON.stringify({ status: 'complete', task_id: taskRow.id, task_type, model_used: model, credits_remaining: usageResult?.remaining ?? 0, result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[rt] FATAL:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

// generate-roadmap v12
// SUBSCRIPTION MIGRATION: inline deductCredits() (direct user_credits table writes) replaced
// with deduct_feature_usage RPC, bucket='roadmap'. This bucket is Pro-only (roadmap_unlocked)
// so the RPC's feature_locked check now gates Starter users automatically.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-gemini-key'}
const MODELS={'flash-lite':{id:'gemini-2.5-flash-lite',credits:15},'flash':{id:'gemini-2.5-flash',credits:25},'pro':{id:'gemini-2.5-pro',credits:50}}
const DEFAULT_MODEL='flash'
const PERSONA_INSTRUCTIONS={student:`PERSONA: Student — Choosing what to build, career direction, or venture ideas.\nINSTRUCTIONS:\n- Prioritise free or low-cost tools, platforms, and communities\n- Frame milestones as skill unlocks, portfolio wins, and proof points — not just career steps\n- Be honest about realistic timelines given study commitments\n- Name specific platforms (Coursera, GitHub, Internshala, LinkedIn, Y Combinator, etc.) relevant to their country\n- Emotional nodes should acknowledge imposter syndrome, peer pressure, and the fear of picking the wrong path\n- Decision nodes should address: stay in current path vs. pivot, study more vs. ship now\n- Every task must have a free or under ₹500/month tool option`,employee:`PERSONA: Employee / Professional — Career pivot, role transition, or side venture validation.\nINSTRUCTIONS:\n- Account for limited time (evenings + weekends only — assume max 10-15 hrs/week available)\n- Distinguish clearly: quick wins achievable in 3-6 months vs. bigger pivots needing 12-24 months\n- Name specific job titles to target, salary benchmarks, and companies/platforms to engage with\n- Side venture tasks must fit within the legal/contractual constraints of employment\n- Emotional nodes should acknowledge the fear of leaving security and the energy drain of doing two things at once\n- Decision nodes: stay employed and build vs. quit and commit, which skill to develop first\n- Include a 'transition trigger' milestone — the exact measurable signal that says it's safe to make the move`,entrepreneur:`PERSONA: Entrepreneur — Validating before investing, finding market fit, selecting direction.\nINSTRUCTIONS:\n- Be ruthless about sequencing: validate BEFORE building, build BEFORE scaling\n- Every phase must have a binary pass/fail validation gate before spending more money\n- Name specific validation methods: customer interviews, landing page tests, waitlists, pre-sales, pilot contracts\n- Name specific investors, accelerators, and communities relevant to their domain and country\n- Emotional nodes should address the constant doubt, advice overload, and the sunk cost trap\n- Decision nodes: build vs. buy, pivot vs. persevere, raise vs. bootstrap\n- Include specific metrics: conversion rate thresholds, CAC limits, revenue targets before next phase`,smb_owner:`PERSONA: Small Business Owner — Expand, pivot, or hold decisions.\nINSTRUCTIONS:\n- Ground everything in cash flow and operational reality — no startup jargon\n- Speak in monthly revenue, margins, payback periods, and headcount, not ARR or burn rate\n- Name local resources: government schemes, district-level banks, industry associations, distributor networks\n- Every action must be executable without a full-time team — assume the owner is doing most things\n- Emotional nodes should address decision fatigue, family pressure, and the fear of disrupting what already works\n- Decision nodes: expand current vs. launch new, hire vs. outsource, go digital vs. stay offline\n- Include cash flow impact analysis for each major phase transition`,ceo_executive:`PERSONA: CEO / Executive — Strategic direction at scale, portfolio direction, organisational pivots.\nINSTRUCTIONS:\n- Speak in strategic frameworks: market sizing, competitive moats, portfolio theory, organisational design\n- Every recommendation needs a business case: market opportunity, risk, and expected ROI\n- Be concise — executives have zero tolerance for generic advice or padding\n- Name specific frameworks where relevant (BCG matrix, Jobs-to-be-Done, OKRs, etc.) but only when genuinely applicable\n- Emotional nodes should address board alignment pressure, fear of disrupting existing revenue, and the isolation of senior decision-making\n- Decision nodes: organic growth vs. acquisition, build vs. partner, market expansion vs. product depth\n- Include stakeholder alignment steps: who needs to be convinced and what evidence they need`,government:`PERSONA: Government Body / Policy Maker — Impact-first programme design.\nINSTRUCTIONS:\n- Frame everything around impact metrics: jobs created, revenue generated, enterprises launched, skill certificates issued\n- Reference real-world programme benchmarks (India: MUDRA, PM Vishwakarma, Skill India, PMEGP; global: IFC SME programmes, GIZ livelihood missions)\n- Every phase must include implementation feasibility assessment and last-mile delivery plan\n- Name specific ministries, agencies, NGO partners, and technology platforms for delivery\n- Emotional nodes should address inter-departmental friction, political timelines, and the pressure of public accountability\n- Decision nodes: centralised vs. decentralised delivery, technology-first vs. human-first, pilot vs. full rollout\n- Include a monitoring and evaluation framework with specific KPIs and review cadence`}
function strip(r){return r.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()}
async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function checkRateLimit(db,userId){try{const{data:rl}=await db.rpc('check_and_increment_rate_limit',{p_user_id:userId,p_function_name:'generate-roadmap',p_calls_per_hour:20,p_calls_per_day:80});if(rl&&!rl.allowed)return new Response(JSON.stringify({error:rl.reason==='hourly_limit_exceeded'?`Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`:`Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,code:rl.reason,resets_at:rl.resets_at}),{status:429,headers:cors})}catch(e){console.error('[roadmap] rate limit error:',e)}return null}
async function gemini(apiKey,modelId,prompt){for(let attempt=0;attempt<3;attempt++){if(attempt>0)await sleep(attempt===1?5000:15000);const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),120_000);try{const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:ctrl.signal,body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:65536,responseMimeType:'application/json'},safetySettings:[{category:'HARM_CATEGORY_HARASSMENT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_HATE_SPEECH',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_DANGEROUS_CONTENT',threshold:'BLOCK_NONE'}]})});clearTimeout(t);if(res.status===429||res.status===503)continue;if(!res.ok)throw new Error(`Gemini ${res.status}: ${await res.text()}`);const d=await res.json();const text=d.candidates?.[0]?.content?.parts?.[0]?.text??'';if(!text)throw new Error('Empty Gemini response');return text}catch(e){clearTimeout(t);if(attempt===2)throw e}}throw new Error('Gemini failed after 3 attempts')}
function buildCountryContext(country){if(!country||country.toLowerCase()==='global')return '';return `COUNTRY: ${country}. Every resource, platform, institution, regulation, exam, currency, salary figure, and compliance step must be specific to ${country}. Never give generic global advice when ${country}-specific data exists.`}
function roadmapPrompt(goal,country,persona){
  const countryCtx=buildCountryContext(country)
  const personaBlock=persona&&PERSONA_INSTRUCTIONS[persona]?`\n${'='.repeat(20)} PERSONA INSTRUCTIONS ${'='.repeat(20)}\n${PERSONA_INSTRUCTIONS[persona]}\n`:''
  return `You are the most brutally specific roadmap generator ever built. Your job is NOT to give advice someone could Google. Your job is to give them the EXACT path that a top 1% mentor with 20 years of experience in their field would give them privately — specific names, exact numbers, precise weeks, real tools, honest emotional warnings.\n\n${countryCtx}${personaBlock}\nUSER GOAL: "${goal}"\n\n${'='.repeat(20)} PARSE THE USER FIRST ${'='.repeat(20)}\nBefore building anything, extract:\n1. WHO they are (experience level, current situation, what they actually have)\n2. WHAT the real goal is (not what they said — what they actually need to achieve)\n3. WHAT DOMAIN: academic | professional | product_build | personal | general\n4. KEY CONSTRAINTS: time, money, knowledge gaps, geography, competition\n5. HIDDEN RISKS: things they haven't mentioned that will actually kill their progress\n\nNow build a roadmap so specific it could only be for THIS person.\n\n${'='.repeat(20)} SPECIFICITY LAWS — VIOLATING ANY = FAILURE ${'='.repeat(20)}\n\n\u274c BANNED PHRASES (never use these):\n- "Conduct interviews" → instead: "Run 15 structured 45-min Zoom calls with [specific target user type] using Typeform screener. Record with Otter.ai. Look for 3 patterns: job-to-be-done, current workaround, willingness to pay."\n- "Research the market" → instead: "Spend 3 hours on [specific platform/source] mapping the top 10 players. Build a comparison sheet tracking: pricing model, acquisition channel, NPS proxy, and 1 thing they do badly."\n- "Build your network" → instead: "DM 5 [specific job title] on LinkedIn every week with [specific opening line]. Target: [specific company types]. Goal: 2 coffee chats per month."\n- "Study consistently" → instead: "2 hours daily: 6-7:30am NCERT [specific chapters], 8-9pm [specific question bank] — 40 MCQs timed at 90 sec each. Track weak topics in a Notion table."\n- "Stay motivated" → instead: [skip motivation platitudes — address the real emotional state honestly]\n- Any advice that applies to 1,000,000 different people → it must apply to THIS person only\n\n\u2705 EVERY ACTION ITEM MUST HAVE:\n- Exact time allocation ("90 minutes", "2 hours daily", "1 weekend")\n- Specific tool/platform/book/person/website (real, named, URL where helpful)\n- Measurable output ("until you have X", "score above Y", "earn \u20b9Z")\n- A concrete trigger for when to move on\n\n\u2705 EVERY MILESTONE MUST HAVE:\n- A binary pass/fail test ("you pass this milestone when ___")\n- A specific number (score, revenue, users, hours logged, pages read)\n- A date or week anchor\n\n${'='.repeat(20)} STRUCTURE ${'='.repeat(20)}\n- 3-5 PHASES (broad stages. name them evocatively, not generically)\n- Each phase: 2-4 MILESTONES (binary: done or not done)\n- Each milestone: 3-6 TASKS (specific actions with exact outputs)\n- 1-2 DECISION nodes per phase (real fork points with measurable conditions)\n- 1 EMOTIONAL node per phase (honest. name the exact feeling they will have.)\n\nNode types: phase | milestone | task | decision | emotional\n\n${'='.repeat(20)} GRAPH POSITIONING ${'='.repeat(20)}\nPhases: x=0,350,700,1050,1400 y=0\nMilestones under phase: x=phase.x+80, y=0,250,500...\nTasks under milestone: x=milestone.x+60, y=milestone.y+180,360...\nDecision: x=phase.x+180, y=last_milestone.y+120\nEmotional: x=phase.x+60, y=last_child.y+140\n\n${'='.repeat(20)} JSON FIELD RULES — CRITICAL ${'='.repeat(20)}\n\u274c action_items MUST be a flat array of plain text strings ONLY. Example: ["Read NCERT Ch 1-3 daily for 2 hours", "Solve 40 MCQs timed at 90 sec each"]\n\u274c NEVER put milestone objects, task objects, or any JSON objects inside action_items. Child nodes belong in milestones[] or tasks[] arrays on the parent node, NOT in action_items.\n\u274c resources MUST be a flat array of plain text strings. Example: ["MTG Objective Biology (₹350)", "https://pw.live"]\n\u274c decision_branches is only for decision nodes: [{"label": "Option A", "condition": "if score > 600"}]\n\nCORRECT nesting structure:\n- phase node → has milestones[] array containing milestone nodes\n- milestone node → has tasks[] array containing task nodes\n- phase/milestone nodes → action_items is [] or plain string bullets summarising what happens\n- task nodes → action_items contains the specific step-by-step plain text instructions\n\n${'='.repeat(20)} OUTPUT ${'='.repeat(20)}\nReturn ONLY valid JSON, no markdown fences:\n{\n  "title": "Punchy title that describes THIS person's journey",\n  "subtitle": "One sentence: who they are + what they're actually going to do",\n  "domain": "academic|professional|product_build|personal|general",\n  "context_summary": "3 sentences: who they are, what they have right now, what they need to overcome",\n  "total_weeks": 0,\n  "difficulty": "beginner|intermediate|advanced|expert",\n  "opening_message": "2-3 sentences. Tell them one thing about their situation that surprises them.",\n  "closing_message": "2 sentences. What they'll be capable of. Concrete, not inspirational fluff.",\n  "success_vision": "1 sentence. Ultra-specific: what does winning look like in measurable terms.",\n  "tags": ["specific-tag"],\n  "nodes": [\n    {\n      "temp_id": "p1",\n      "parent_temp_id": null,\n      "node_type": "phase",\n      "title": "Evocative phase name",\n      "description": "What changes in the person by end of this phase.",\n      "action_items": [],\n      "resources": [],\n      "emotional_tag": null,\n      "emotional_note": null,\n      "timeline_week_start": 1,\n      "timeline_week_end": 10,\n      "duration_label": "10 weeks",\n      "position_x": 0,\n      "position_y": 0,\n      "sort_order": 0,\n      "is_critical_path": true,\n      "is_optional": false,\n      "decision_branches": [],\n      "milestones": [\n        {\n          "temp_id": "p1_m1",\n          "parent_temp_id": "p1",\n          "node_type": "milestone",\n          "title": "Milestone name",\n          "description": "Binary pass/fail: done when X is achieved.",\n          "action_items": [],\n          "resources": [],\n          "timeline_week_start": 1,\n          "timeline_week_end": 3,\n          "duration_label": "3 weeks",\n          "position_x": 80,\n          "position_y": 0,\n          "sort_order": 0,\n          "is_critical_path": true,\n          "is_optional": false,\n          "decision_branches": [],\n          "tasks": [\n            {\n              "temp_id": "p1_m1_t1",\n              "parent_temp_id": "p1_m1",\n              "node_type": "task",\n              "title": "Specific task name",\n              "description": "Detailed what and how.",\n              "action_items": ["Plain text step 1", "Plain text step 2"],\n              "resources": ["Tool name (cost)"],\n              "exact_time_allocation": "2 hours daily",\n              "specific_tool_platform": "Named tool",\n              "measurable_output": "Concrete deliverable",\n              "trigger_to_move_on": "Measurable signal",\n              "timeline_week_start": 1,\n              "timeline_week_end": 2,\n              "duration_label": "2 weeks",\n              "position_x": 140,\n              "position_y": 180,\n              "sort_order": 0,\n              "is_critical_path": true,\n              "is_optional": false,\n              "decision_branches": []\n            }\n          ]\n        }\n      ]\n    }\n  ]\n}`
}
const NESTED_CHILD_KEYS=['milestones','tasks','decisions','emotionals','children']
function flattenRoadmapNodes(rawNodes){
  const flat=[]
  function isNodeObject(v){
    return v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.node_type==='string'
  }
  function tryParseNodeString(v){
    if(typeof v!=='string')return null
    const t=v.trim()
    if(!t.startsWith('{'))return null
    try{const p=JSON.parse(t);return isNodeObject(p)?p:null}catch{return null}
  }
  function walk(node,inheritedParentTempId){
    if(!node||typeof node!=='object')return
    const nested=[]
    for(const key of NESTED_CHILD_KEYS){
      const arr=node[key]
      if(Array.isArray(arr)){
        for(const child of arr){
          if(isNodeObject(child))nested.push(child)
        }
      }
    }
    const rawActionItems=Array.isArray(node.action_items)?node.action_items:[]
    const rescuedFromActionItems=[]
    const cleanActionItems=[]
    for(const item of rawActionItems){
      if(isNodeObject(item)){
        nested.push(item)
        rescuedFromActionItems.push(item)
      } else {
        const parsed=tryParseNodeString(item)
        if(parsed){
          nested.push(parsed)
          rescuedFromActionItems.push(parsed)
        } else if(typeof item==='string'&&item.trim()){
          cleanActionItems.push(item.trim())
        }
      }
    }
    const rest={...node}
    for(const key of NESTED_CHILD_KEYS)delete rest[key]
    rest.action_items=cleanActionItems
    const parent_temp_id=rest.parent_temp_id??inheritedParentTempId??null
    rest.parent_temp_id=parent_temp_id
    flat.push(rest)
    const parentTemp=rest.temp_id??inheritedParentTempId??null
    for(const child of nested){
      walk(child,child.parent_temp_id??parentTemp)
    }
  }
  for(const node of rawNodes)walk(node,null)
  return flat
}
function sanitizeActionItems(arr){
  if(!Array.isArray(arr))return []
  return arr.filter(item=>{
    if(typeof item!=='string')return false
    const t=item.trim()
    if(!t)return false
    if(t.startsWith('{')&&t.endsWith('}'))return false
    if(t.startsWith('[')&&t.endsWith(']'))return false
    return true
  })
}
function buildNodeMetadata(node){const meta={...(node.metadata??{})};if(node.temp_id)meta.temp_id=node.temp_id;if(node.parent_temp_id)meta.parent_temp_id=node.parent_temp_id;for(const key of['exact_time_allocation','specific_tool_platform','measurable_output','trigger_to_move_on']){if(typeof node[key]==='string'&&node[key].trim())meta[key]=node[key].trim()}return meta}
function assignPositions(nodes){const phases=nodes.filter(n=>n.node_type==='phase');phases.forEach((p,i)=>{if(!p.position_x&&i>0)p.position_x=i*350;const children=nodes.filter(n=>n.parent_temp_id===p.temp_id);children.forEach((c,j)=>{if(!c.position_x)c.position_x=(p.position_x??0)+80;if(!c.position_y&&j>0)c.position_y=j*250;nodes.filter(n=>n.parent_temp_id===c.temp_id).forEach((g,k)=>{if(!g.position_x)g.position_x=(c.position_x??0)+60;if(!g.position_y)g.position_y=(c.position_y??0)+(k+1)*180})})});return nodes}
function getDepth(node,all,depth=0){if(!node.parent_temp_id)return depth;const parent=all.find(n=>n.temp_id===node.parent_temp_id);return parent?getDepth(parent,all,depth+1):depth}
function sendCompletionEmail(supabaseUrl,userId,data){fetch(`${supabaseUrl}/functions/v1/send-completion-email`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({feature:'roadmap',user_id:userId,data})}).then(r=>{if(!r.ok)r.text().then(t=>console.error('[roadmap] email failed:',t));else console.log('[roadmap] completion email sent')}).catch(e=>console.error('[roadmap] email error:',e))}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  const GEMINI_API_KEY=Deno.env.get('GEMINI_API_KEY');const SUPABASE_URL=Deno.env.get('SUPABASE_URL');const SUPABASE_SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');const SUPABASE_ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')
  if(!GEMINI_API_KEY||!SUPABASE_URL||!SUPABASE_SERVICE_KEY||!SUPABASE_ANON_KEY)return new Response(JSON.stringify({error:'Missing env vars'}),{status:500,headers:cors})
  const authHeader=req.headers.get('Authorization')??'';const token=authHeader.replace(/^Bearer\s+/i,'');const{data:{user},error:authErr}=await createClient(SUPABASE_URL,SUPABASE_ANON_KEY).auth.getUser(token)
  if(authErr||!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors})
  const db=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY);const limited=await checkRateLimit(db,user.id);if(limited)return limited
  const body=await req.json().catch(()=>({}))
  const{goal_input,roadmap_id,model:modelKey=DEFAULT_MODEL,country='India',persona=null}=body
  const isRegenerate=!!roadmap_id
  if(!goal_input&&!isRegenerate)return new Response(JSON.stringify({error:'goal_input required'}),{status:400,headers:cors})
  const selectedModel=MODELS[modelKey]??MODELS[DEFAULT_MODEL];const creditCost=selectedModel.credits

  // SUBSCRIPTION MIGRATION: was a balance pre-check against user_credits + inline deductCredits().
  // Now a single deduct_feature_usage call handles both the check and the increment, and also
  // enforces the roadmap_unlocked (Pro-only) feature lock.
  const{data:usageResult,error:usageErr}=await db.rpc('deduct_feature_usage',{p_user_id:user.id,p_bucket:'roadmap',p_amount:1})
  if(usageErr)return new Response(JSON.stringify({error:'Usage error',detail:usageErr.message}),{status:500,headers:cors})
  if(!usageResult?.success){
    const reason=usageResult?.error
    if(reason==='no_active_subscription')return new Response(JSON.stringify({error:'No active subscription found.',code:reason}),{status:402,headers:cors})
    if(reason==='feature_locked')return new Response(JSON.stringify({error:'Roadmap is a Pro-plan feature.',code:reason}),{status:402,headers:cors})
    return new Response(JSON.stringify({error:`Monthly roadmap limit reached. Used ${usageResult?.used??0}/${usageResult?.allowance??0}.`,code:reason,used:usageResult?.used??0,allowance:usageResult?.allowance??0}),{status:402,headers:cors})
  }

  let rmId,goalText,countryText=country,effectivePersona=persona
  try{
    if(isRegenerate){
      const{data:rm,error:rmErr}=await db.from('user_roadmaps').select('id,goal_input,user_id,metadata,persona').eq('id',roadmap_id).single()
      if(rmErr||!rm)return new Response(JSON.stringify({error:'Roadmap not found'}),{status:404,headers:cors})
      if(rm.user_id!==user.id)return new Response(JSON.stringify({error:'Forbidden'}),{status:403,headers:cors})
      rmId=rm.id;goalText=rm.goal_input;countryText=rm.metadata?.country??country;effectivePersona=persona??rm.persona??null
      await db.from('user_roadmaps').update({generation_status:'processing',error_detail:null}).eq('id',rmId)
      await db.from('roadmap_nodes').delete().eq('roadmap_id',rmId)
    }else{
      goalText=goal_input
      const{data:newRm,error:createErr}=await db.from('user_roadmaps').insert({user_id:user.id,goal_input:goalText,title:goalText.slice(0,80),domain:'general',generation_status:'processing',credits_used:creditCost,persona:effectivePersona,metadata:{model:modelKey,country:countryText,persona:effectivePersona}}).select('id').single()
      if(createErr||!newRm)return new Response(JSON.stringify({error:'Failed to create roadmap: '+(createErr?.message??'unknown')}),{status:500,headers:cors})
      rmId=newRm.id
    }
  }catch(shellErr){return new Response(JSON.stringify({error:'Setup failed: '+String(shellErr)}),{status:500,headers:cors})}
  try{
    console.log(`[roadmap] v12 model=${selectedModel.id} country=${countryText} persona=${effectivePersona} rm=${rmId}`)
    const raw=await gemini(GEMINI_API_KEY,selectedModel.id,roadmapPrompt(goalText,countryText,effectivePersona))
    const parsed=JSON.parse(strip(raw))
    if(!parsed.nodes||!Array.isArray(parsed.nodes))throw new Error('No nodes array')
    const flatNodes=flattenRoadmapNodes(parsed.nodes)
    const nodes=assignPositions(flatNodes)
    console.log(`[roadmap] v12 got ${parsed.nodes.length} raw -> ${nodes.length} flat nodes`)
    await db.from('user_roadmaps').update({title:(parsed.title??goalText).slice(0,200),subtitle:parsed.subtitle??null,domain:parsed.domain??'general',context_summary:parsed.context_summary??null,total_phases:nodes.filter(n=>n.node_type==='phase').length,total_milestones:nodes.filter(n=>n.node_type==='milestone').length,total_tasks:nodes.filter(n=>n.node_type==='task').length,total_weeks:Number(parsed.total_weeks)||0,difficulty:parsed.difficulty??'intermediate',opening_message:parsed.opening_message??null,closing_message:parsed.closing_message??null,success_vision:parsed.success_vision??null,tags:Array.isArray(parsed.tags)?parsed.tags:[],persona:effectivePersona,generation_status:'complete',credits_used:creditCost,metadata:{model:modelKey,country:countryText,persona:effectivePersona,generated_nodes:nodes}}).eq('id',rmId)
    const tempToReal={}
    const sorted=[...nodes].sort((a,b)=>getDepth(a,nodes)-getDepth(b,nodes))
    for(const node of sorted){
      const parentRealId=node.parent_temp_id?(tempToReal[node.parent_temp_id]??null):null
      const{data:inserted,error:insertErr}=await db.from('roadmap_nodes').insert({
        roadmap_id:rmId,
        parent_id:parentRealId,
        node_type:node.node_type,
        title:String(node.title??'').slice(0,500),
        description:node.description??null,
        action_items:sanitizeActionItems(node.action_items),
        resources:Array.isArray(node.resources)?node.resources.filter(r=>typeof r==='string'):[],
        emotional_tag:node.emotional_tag??null,
        emotional_note:node.emotional_note??null,
        timeline_week_start:node.timeline_week_start??null,
        timeline_week_end:node.timeline_week_end??null,
        duration_label:node.duration_label??null,
        position_x:Number(node.position_x)||0,
        position_y:Number(node.position_y)||0,
        sort_order:Number(node.sort_order)||0,
        is_critical_path:Boolean(node.is_critical_path),
        is_optional:Boolean(node.is_optional),
        decision_branches:Array.isArray(node.decision_branches)?node.decision_branches:[],
        metadata:buildNodeMetadata(node)
      }).select('id').single()
      if(insertErr)console.error(`[roadmap] node err ${node.temp_id}:`,insertErr.message)
      else if(inserted)tempToReal[node.temp_id]=inserted.id
    }
    console.log(`[roadmap] v12 done. ${Object.keys(tempToReal).length}/${nodes.length} inserted`)
    sendCompletionEmail(SUPABASE_URL,user.id,{roadmap_id:rmId,title:parsed.title??goalText,total_weeks:Number(parsed.total_weeks)||0,difficulty:parsed.difficulty??'intermediate',success_vision:parsed.success_vision??null,opening_message:parsed.opening_message??null,persona:effectivePersona,country:countryText})
    return new Response(JSON.stringify({status:'ok',roadmap_id:rmId,title:parsed.title,total_nodes:nodes.length,model:modelKey,country:countryText,persona:effectivePersona,credits_used:creditCost}),{headers:{...cors,'Content-Type':'application/json'}})
  }catch(genErr){
    console.error('[roadmap] gen error:',genErr)
    await db.from('user_roadmaps').update({generation_status:'failed',error_detail:String(genErr)}).eq('id',rmId).catch(()=>null)
    return new Response(JSON.stringify({error:String(genErr)}),{status:500,headers:cors})
  }
})

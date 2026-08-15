// research-opportunity v53
// v53 FIX: v52 set status:'live' for catalog rows, but user_opportunities_status_check only
// allows 'draft'|'published'|'archived' (different vocabulary than the old opportunities table
// which used 'live'). This caused every catalog-visibility generation to fail at the final write
// with a check-constraint violation. Fixed to use 'published'. RLS policy on user_opportunities
// was also corrected to match (status='published' instead of status='live').
//
// v52: Added `visibility` param ('private' | 'catalog'). Catalog visibility is server-side
// gated to admin/super_admin roles only (checked via profiles.role) — client-supplied
// visibility is never trusted directly. Catalog generations skip deduct_feature_usage
// (admin populating the public catalog shouldn't spend their own credit allowance).
// Catalog rows get clean, globally-unique public slugs (no -v{n}-{timestamp} suffix);
// private rows keep the existing internal slug format unchanged.
//
// SUBSCRIPTION MIGRATION: credit deduction replaced with deduct_feature_usage RPC.
// Bucket = 'reports_standard' or 'reports_premium' depending on research_style.
// CREDITS_COST / STYLE_CREDITS retained only for informational logging/email payload,
// no longer gates spend.

const GEMINI_TIMEOUT_MS = 140_000
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'
const sseHeaders={'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-gemini-key'}
const corsHeaders={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-gemini-key'}
const GEMINI_FLASH_LITE='gemini-2.5-flash-lite'
const GEMINI_FLASH='gemini-2.5-flash'
const GEMINI_PRO='gemini-2.5-pro'
const VALID_MODELS=[GEMINI_FLASH_LITE,GEMINI_FLASH,GEMINI_PRO]
const MODEL_FALLBACK={[GEMINI_FLASH_LITE]:GEMINI_FLASH,[GEMINI_FLASH]:GEMINI_FLASH_LITE,[GEMINI_PRO]:GEMINI_FLASH}
const MODEL_MULTIPLIERS={[GEMINI_FLASH_LITE]:0.6,[GEMINI_FLASH]:1,[GEMINI_PRO]:2}
const MAX_RETRIES=3
const RETRY_DELAYS_MS=[5000,15000]
const FX={INR:83.5,JPY:149,SGD:1.35,KRW:1320,TZS:2650,AED:3.67,GBP:0.79,EUR:0.92,AUD:1.53,USD:1,GHS:15.5,NGN:1580,KES:130,BDT:110,VND:25000,PHP:57,EGP:50,PKR:280,BRL:5.1,MXN:17,IDR:16000}
const STYLE_CREDITS={standard:25,kpmg:45,mckinsey:100,bcg:100,bain:100,goldman_sachs:100,jp_morgan:100}
const PREMIUM_STYLES=new Set(['kpmg','mckinsey','bcg','bain','goldman_sachs','jp_morgan'])
const CURRENCY_MAP={'₵':'Ghana','₦':'Nigeria','₹':'India','GHS':'Ghana','NGN':'Nigeria','KES':'Kenya','TZS':'Tanzania','BDT':'Bangladesh','VND':'Vietnam','PHP':'Philippines','EGP':'Egypt','PKR':'Pakistan','BRL':'Brazil','MXN':'Mexico','IDR':'Indonesia'}
const COUNTRY_PATTERNS=[[/\b(ghana|accra|kumasi|volta|ashanti|tamale|cedis?)\b/i,'Ghana'],[/\b(nigeria|lagos|abuja|kano|ibadan|naira)\b/i,'Nigeria'],[/\b(india|mumbai|delhi|bengaluru|bangalore|chennai|hyderabad|pune|kolkata|rupee|rupees)\b/i,'India'],[/\b(kenya|nairobi|mombasa|kisumu|shilling|ksh)\b/i,'Kenya'],[/\b(indonesia|jakarta|surabaya|bali|bandung|rupiah)\b/i,'Indonesia'],[/\b(brazil|são paulo|rio|brasilia|real|reais)\b/i,'Brazil'],[/\b(bangladesh|dhaka|chittagong|sylhet|taka)\b/i,'Bangladesh'],[/\b(vietnam|hanoi|ho chi minh|saigon|dong|vnd)\b/i,'Vietnam'],[/\b(philippines|manila|cebu|davao|peso|php)\b/i,'Philippines'],[/\b(egypt|cairo|alexandria|giza|egp)\b/i,'Egypt'],[/\b(pakistan|karachi|lahore|islamabad|pkr)\b/i,'Pakistan'],[/\b(mexico|mexico city|guadalajara|monterrey|mxn)\b/i,'Mexico'],[/\b(ethiopia|addis ababa|birr)\b/i,'Ethiopia'],[/\b(tanzania|dar es salaam|dodoma|tshs?)\b/i,'Tanzania'],[/\b(uganda|kampala|ugx)\b/i,'Uganda'],[/\b(usa|united states|new york|california|texas|florida)\b/i,'USA']]
function detectCountry(q){for(const[sym,c]of Object.entries(CURRENCY_MAP))if(q.includes(sym))return c;for(const[re,c]of COUNTRY_PATTERNS)if(re.test(q))return c;return null}
const LOCAL_PLATFORMS={India:'ShareChat, Moj, Josh, Koo, Telegram groups, LinkedIn India',Nigeria:'Telegram, Twitter/X Nigeria, Facebook groups, WhatsApp broadcast lists',Indonesia:'LINE, Tokopedia, Shopee, GoFood, Instagram Indonesia',Brazil:'WhatsApp, Telegram, TikTok Brasil, Kwai, LinkedIn Brasil',Kenya:'Twitter/X Kenya, Facebook groups, Telegram, M-Pesa communities',Bangladesh:'Facebook (dominant), YouTube Bangla, WhatsApp groups',Vietnam:'Zalo, Facebook Vietnam, TikTok Vietnam, YouTube Vietnam',Philippines:'Facebook (dominant), TikTok PH, Viber, Kumu',Egypt:'Facebook Egypt, TikTok Egypt, WhatsApp broadcast, LinkedIn MENA',Pakistan:'Facebook Pakistan, TikTok Pakistan, WhatsApp, LinkedIn Pakistan',Mexico:'WhatsApp, TikTok Mexico, Facebook Mexico, LinkedIn Mexico',Ethiopia:'Telegram, Facebook Ethiopia, YouTube Ethiopia',Tanzania:'WhatsApp, Facebook Tanzania, Telegram, TikTok TZ',Ghana:'WhatsApp, Facebook Ghana, Twitter/X Ghana, TikTok GH',Uganda:'WhatsApp, Facebook Uganda, Twitter/X Uganda, Telegram',USA:'Reddit, LinkedIn, X/Twitter, Discord, YouTube, Nextdoor, Substack'}
function localPlatforms(c){return LOCAL_PLATFORMS[c]??'WhatsApp, Facebook, LinkedIn, Telegram, YouTube'}
function localSymbol(c){const m={India:'₹',Japan:'¥',Singapore:'S$','South Korea':'₩',Tanzania:'TSh',UAE:'AED',UK:'£',Germany:'€',France:'€',Australia:'A$',USA:'$',Ghana:'₵',Nigeria:'₦',Kenya:'KSh',Indonesia:'Rp',Brazil:'R$',Bangladesh:'৳',Vietnam:'₫',Philippines:'₱',Egypt:'E£',Pakistan:'₨',Mexico:'MX$',Ethiopia:'Br',Uganda:'USh'};return m[c]??'$'}
function localCurrency(c){const m={India:'INR',Japan:'JPY',Singapore:'SGD','South Korea':'KRW',Tanzania:'TZS',UAE:'AED',UK:'GBP',Germany:'EUR',France:'EUR',Australia:'AUD',USA:'USD',Ghana:'GHS',Nigeria:'NGN',Kenya:'KES',Indonesia:'IDR',Brazil:'BRL',Bangladesh:'BDT',Vietnam:'VND',Philippines:'PHP',Egypt:'EGP',Pakistan:'PKR',Mexico:'MXN',Ethiopia:'ETB',Uganda:'UGX'};return m[c]??'USD'}
function fxRate(c){return FX[localCurrency(c)]??1}
function isDigital(q){return/\b(app|saas|platform|software|digital|online|website|ecommerce|e-commerce|marketplace|fintech|edtech|api|mobile|subscription|remote)\b/i.test(q)}
function slugify(t){return t.toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim().slice(0,80)}
function strip(r){return r.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()}
async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function sseEvent(type,data){return`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`}
function normalizeScore(raw){const n=Number(raw);if(!isFinite(n)||n<0)return null;if(n<=10)return Math.round(n*10);if(n<=100)return Math.round(n);return 100}
function computeFitIndex(sb){if(!sb||typeof sb!=='object')return null;const p=Number(sb.profitability??0),e=Number(sb.ease??0),g=Number(sb.govt_support??0),m=Number(sb.market_momentum??0);if(p===0&&e===0&&g===0&&m===0)return null;const scale=Math.max(p,e,g,m)>10?1:10;return Math.min(100,Math.max(0,Math.round((m*scale)*0.35+(p*scale)*0.30+(e*scale)*0.20+(g*scale)*0.15)))}
function buildGovtSchemeDetails(schemes){return{schemes:schemes.map(s=>({name:s.name??'',benefit:s.benefit??'',eligibility:s.eligibility??'',ministry:s.ministry??'',apply_url:s.apply_url??s.url??null,application_process:s.application_process??''}))}}
async function checkRateLimit(supabase,userId,isByok){try{const perHour=isByok?20:10;const perDay=isByok?100:50;const{data:rl}=await supabase.rpc('check_and_increment_rate_limit',{p_user_id:userId,p_function_name:'research-opportunity',p_calls_per_hour:perHour,p_calls_per_day:perDay});if(rl&&!rl.allowed)return new Response(JSON.stringify({error:rl.reason==='hourly_limit_exceeded'?`Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`:`Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,code:rl.reason,resets_at:rl.resets_at}),{status:429,headers:corsHeaders})}catch(e){console.error('[research] rate limit error:',e)}return null}
function deriveSetupCost(breakdown){const items=breakdown.map(i=>({label:String(i.label??''),amount_usd:Number(i.amount_usd??0)}));const subtotal=items.reduce((s,i)=>s+i.amount_usd,0);const optimistic=Math.round(subtotal*0.85);const buffer=Math.round(subtotal*1.20);const topItems=[...items].sort((a,b)=>b.amount_usd-a.amount_usd).slice(0,3).map(i=>i.label).join(', ');return{items,subtotal,optimistic,buffer,setup_min:optimistic,setup_max:buffer,note:`Summed from ${items.length} cost line-items (${topItems}${items.length>3?', …':''}). Range = subtotal ×0.85 (optimistic) to ×1.20 (with contingency buffer).`}}
function deriveProfitMargin(calc,fp){const rev=calc.revenue??{};const billing=String(calc.billing_model??'per_unit_daily');const avg_bill=Number(rev.avg_bill??0);const units_low=Number(rev.units_per_day_low??0);const units_high=Number(rev.units_per_day_high??0);const driver_label=String(rev.driver_label??'units');const monthly=fp.monthly??{};const cogs_pct=Number(monthly.cogs_pct??40);const opex=Number(monthly.opex??0);const rev_low=billing==='subscription_cumulative'?avg_bill*units_low:avg_bill*units_low*30;const rev_high=billing==='subscription_cumulative'?avg_bill*units_high:avg_bill*units_high*30;const gross_factor=(100-cogs_pct)/100;const gross_low=Math.round(rev_low*gross_factor);const gross_high=Math.round(rev_high*gross_factor);const profit_min=Math.round(gross_low-opex);const profit_max=Math.round(gross_high-opex);return{formula:'Profit = Revenue × (1 − COGS%) − Fixed Opex',billing_model:billing,avg_bill,units_low,units_high,driver_label,rev_low,rev_high,cogs_pct,gross_low,gross_high,opex,monthly_profit_min:profit_min,monthly_profit_max:profit_max,note:`Revenue: ${billing==='subscription_cumulative'?`${units_low}–${units_high} active subscribers × $${avg_bill}/mo`:`${units_low}–${units_high} ${driver_label}/day × $${avg_bill} × 30 days`} = $${rev_low}–$${rev_high}. Gross margin after ${cogs_pct}% COGS = $${gross_low}–$${gross_high}. Minus $${opex} fixed monthly opex = $${profit_min}–$${profit_max} net profit.`}}
function deriveEase(scorecard){const weights={capital_intensity:0.25,skill_barrier:0.20,regulatory_burden:0.25,operational_complexity:0.15,time_to_first_revenue:0.15};const clamp=n=>Math.min(5,Math.max(1,Math.round(n)));const ci=clamp(scorecard.capital_intensity);const sb=clamp(scorecard.skill_barrier);const rb=clamp(scorecard.regulatory_burden);const oc=clamp(scorecard.operational_complexity);const tt=clamp(scorecard.time_to_first_revenue);const avg=ci*weights.capital_intensity+sb*weights.skill_barrier+rb*weights.regulatory_burden+oc*weights.operational_complexity+tt*weights.time_to_first_revenue;const ease_score=Math.round((1-(avg-1)/4)*100);const ease=avg<=2.2?'Easy':avg<=3.6?'Moderate':'Hard';const topDriver=Object.entries({capital_intensity:ci,skill_barrier:sb,regulatory_burden:rb,operational_complexity:oc,time_to_first_revenue:tt}).sort((a,b)=>b[1]-a[1])[0];const driverLabels={capital_intensity:'Capital intensity',skill_barrier:'Skill barrier',regulatory_burden:'Regulatory burden',operational_complexity:'Operational complexity',time_to_first_revenue:'Time to first revenue'};return{ease,ease_score,effort_scorecard:{capital_intensity:ci,skill_barrier:sb,regulatory_burden:rb,operational_complexity:oc,time_to_first_revenue:tt,avg:Math.round(avg*10)/10,weights,notes:scorecard.notes??'',note:`${ease} (score ${ease_score}/100). Weighted avg effort = ${avg.toFixed(1)}/5. Primary driver: ${driverLabels[topDriver[0]]} (${topDriver[1]}/5). ${scorecard.notes??''}`}}}
function stylePersonaBlock(style){switch(style){case 'mckinsey':return`RESEARCH PERSONA: McKinsey & Company Senior Partner\nMECE framework. Porter's Five Forces. 3-horizon growth.\nYou MUST include style_addons with: strategic_frameworks, transformation_roadmap, porters_five_forces.`;case 'bcg':return`RESEARCH PERSONA: BCG Principal\nHypothesis-driven. Growth-Share Matrix.\nYou MUST include style_addons with: strategic_frameworks, transformation_roadmap, porters_five_forces.`;case 'bain':return`RESEARCH PERSONA: Bain & Company Manager\nResults-delivery. NPS-driven.\nYou MUST include style_addons with: strategic_frameworks, transformation_roadmap, porters_five_forces.`;case 'goldman_sachs':return`RESEARCH PERSONA: Goldman Sachs Equity Research Analyst\nReturns, multiples, exit scenarios.\nYou MUST include style_addons with: valuation_model, investor_memo, capital_efficiency_metrics.`;case 'jp_morgan':return`RESEARCH PERSONA: JP Morgan IB Analyst\nMacro context. Credit risk.\nYou MUST include style_addons with: valuation_model, investor_memo, capital_efficiency_metrics.`;case 'kpmg':return`RESEARCH PERSONA: KPMG Advisory Partner\nRisks, controls, compliance.\nYou MUST include style_addons with: risk_register, compliance_checklist, internal_controls_framework.`;default:return''}}
function styleAddonsSchema(style){const strategy=`"style_addons":{"strategic_frameworks":{"mece_issue_tree":["i1","i2"],"three_horizons":{"h1_core":"str","h2_emerging":"str","h3_future":"str"},"value_chain_analysis":[{"stage":"str","value_created":"str","pain_point":"str","opportunity":"str"}]},"porters_five_forces":{"competitive_rivalry":{"rating":"low|medium|high","analysis":"str"},"supplier_power":{"rating":"low|medium|high","analysis":"str"},"buyer_power":{"rating":"low|medium|high","analysis":"str"},"threat_of_substitutes":{"rating":"low|medium|high","analysis":"str"},"threat_of_new_entrants":{"rating":"low|medium|high","analysis":"str"},"overall_attractiveness":"low|medium|high","strategic_implication":"str"},"transformation_roadmap":[{"phase":"Phase 1 (0-90 days)","theme":"str","initiatives":["str"],"kpis":["str"],"investment_usd":0}]}`;const banking=`"style_addons":{"valuation_model":{"dcf":{"wacc_pct":0,"terminal_growth_rate_pct":0,"projection_years":5,"year1_fcf_usd":0,"year3_fcf_usd":0,"year5_fcf_usd":0,"implied_valuation_usd":0},"comparables":[{"company":"str","ev_revenue_multiple":0,"ev_ebitda_multiple":0,"implied_value_usd":0}],"scenarios":{"bear":{"revenue_year3_usd":0,"ebitda_margin_pct":0,"valuation_usd":0,"key_assumption":"str"},"base":{"revenue_year3_usd":0,"ebitda_margin_pct":0,"valuation_usd":0,"key_assumption":"str"},"bull":{"revenue_year3_usd":0,"ebitda_margin_pct":0,"valuation_usd":0,"key_assumption":"str"}}},"investor_memo":{"investment_thesis":"str","key_risks":[{"risk":"str","mitigation":"str","probability":"low|medium|high"}],"exit_options":[{"type":"str","timeline":"str","value_driver":"str"}],"why_now":"str"},"capital_efficiency_metrics":{"irr_est_pct":0,"moic_est":0,"payback_months":0,"cac_usd":0,"ltv_usd":0,"ltv_cac_ratio":0,"gross_margin_pct":0,"burn_multiple":0}}`;const audit=`"style_addons":{"risk_register":[{"risk_id":"R01","category":"Operational","description":"str","probability":"low|medium|high","impact":"low|medium|high","risk_score":"low|medium|high|critical","controls_in_place":"str","remediation":"str","owner":"str"}],"compliance_checklist":[{"area":"str","requirement":"str","jurisdiction":"str","status_at_launch":"required_before_launch","penalty_for_non_compliance":"str","action_required":"str"}],"internal_controls_framework":[{"process":"str","control":"str","frequency":"monthly","owner":"str","evidence_required":"str","failure_indicator":"str"}]}`;if(['mckinsey','bcg','bain'].includes(style))return strategy;if(['goldman_sachs','jp_morgan'].includes(style))return banking;if(style==='kpmg')return audit;return''}
function researchPrompt(query,country,currency,badge,badge_label,style,context){const rate=fxRate(country),sym=localSymbol(country),localCur=localCurrency(country);const digital=isDigital(query);const contextStr=context?`\nUser context:\n${Object.entries(context).map(([k,v])=>`- ${k}: ${v}`).join('\n')}`:'';const badgeStr=badge_label?`Primary badge: ${badge_label}`:'' ;const persona=stylePersonaBlock(style),addonsSchema=styleAddonsSchema(style),hasAddons=addonsSchema.length>0;const platforms=localPlatforms(country);const spaceLoc=digital?`"space_location":null,`:`"space_location":{"required":true,"type":"retail_front|warehouse|production_unit|shared_space|home_based|kiosk|cart|dark_store","min_sqft":0,"max_sqft":0,"ideal_zone":"str","rent_matrix":[{"tier":"Budget","sqft":0,"monthly_rent_usd":0,"pros":"str","cons":"str"},{"tier":"Mid-range","sqft":0,"monthly_rent_usd":0,"pros":"str","cons":"str"},{"tier":"Premium","sqft":0,"monthly_rent_usd":0,"pros":"str","cons":"str"}],"key_factors":["str","str","str"],"red_flags":["str","str"],"setup_tips":"str"},`;const billingModelRule=`CALCULATOR BILLING MODEL RULE:\nDetermine billing_model based on how revenue is actually generated:\n- per_unit_daily: revenue = units sold/served TODAY x avg_bill. Use for physical businesses.\n- subscription_cumulative: revenue = TOTAL active subscribers x avg_bill per month. Use for SaaS/apps.`;const effortScorecardSchema=`"effort_scorecard":{"capital_intensity":0,"skill_barrier":0,"regulatory_burden":0,"operational_complexity":0,"time_to_first_revenue":0,"notes":"1-2 sentence rationale"}`;const effortRule=`EFFORT SCORECARD RULE (all scores 1=very easy to 5=very hard): capital_intensity, skill_barrier, regulatory_burden, operational_complexity, time_to_first_revenue. Be honest.`;const painPointsSchema=`"pain_points":[{"pain":"str","severity":"low|medium|high|critical","current_workaround":"str","how_this_business_solves_it":"str","willingness_to_pay":"low|medium|high"}]`;const saturationSchema=`"saturation_level":"low|medium|high|extreme","saturation_note":"str"`;const marketVerdictSchema=`"market_verdict":{"verdict":"bullish|cautious|bearish","urgency_score":0,"timing_note":"str","why_now":["str","str","str"],"why_not_yet":["str"],"verdict_summary":"str"}`;const futureOutlookSchema=`"future_outlook":{"outlook":"bright|moderate|uncertain|declining","year3_potential":"str","year5_potential":"str","tailwinds":["str","str","str"],"headwinds":["str","str"],"disruption_risk":"low|medium|high","disruption_note":"str","megatrend_alignment":["str"],"future_verdict":"str"}`;const stateTiersRule=`STATE_TAGS RULE: List 3-6 Indian states where this business has highest traction. Be specific.`;const locationTiersRule=`LOCATION_TIERS RULE: For each of Tier 1, Tier 2, Tier 3 cities provide honest suitability. tier_score = 1-10.`;const expertTipsRule=`EXPERT_TIPS_STRUCTURED RULE: 4-6 hard-won operator tips. Each tip must have a short title (5 words max) and 2-3 sentence body.`;const targetPillsRule=`TARGET_CUSTOMER_PILLS RULE: 4-8 short customer segment labels. Max 4 words each.`;return`${persona?persona+'\n\n':''}You are PowerProof AI — a ruthlessly execution-focused MSME business intelligence engine.\n\nBusiness idea: "${query}"\nCountry: ${country} | Currency: ${localCur} (${sym}, 1 USD = ${rate} ${localCur})\n${badgeStr}${contextStr}\n\n========== CRITICAL RULES ==========\n1. ALL financial values = whole USD integers.\n2. Schemes/regulations = ${country} ONLY. Real names, real URLs, NEVER placeholders.\n3. ${digital?'space_location: null':'space_location: MANDATORY, NEVER null. 3-tier rent matrix.'}\n4. demand_trend = EXACTLY 10 points: Jan 2024, Mar 2024, May 2024, Jul 2024, Sep 2024, Nov 2024, Jan 2025, Mar 2025, Jan 2026, Mar 2026.\n5. monthly_rev_min/max = REALISTIC first-year solo operator month 3-6.\n6. marketing_strategy: UGC, Short-form Reels, Influencer Reach, Guerrilla, Instant Site, WhatsApp Flyout + 1 local ${country} platform from: ${platforms}. Min 8 channels.\n7. full_desc = 3 paragraphs: what+money, why NOW in ${country}, first 90 days.\n8. score_breakdown: each 0-10. ALL must be integers, never null, never strings.\n9. TAM > SAM > SOM (USD millions). SOM = 5-10% of SAM. market_size_unit = usd_m.\n10. BUDGET CURVE: month_1 HIGHEST > month_6 > month_12 > month_18 LOWEST.\n11. GOVT SCHEMES: real apply_url, no placeholders. 3-5 schemes minimum.\n12. funding_options: 4 types minimum.\n13. risk_matrix: 5 risks minimum.\n14. unit_economics_deep: ALL values whole USD integers.\n15. tools_and_stack: 5 tools minimum.\n16. ${billingModelRule}\n17. ${effortRule}\n18. setup_cost_breakdown MUST include ALL line-items. Be granular (5-8 items minimum).\n19. pain_points: 3-5 real pains this business solves.\n20. saturation_level: low=few competitors; medium=competitive but winnable; high=crowded; extreme=race to bottom.\n21. market_verdict: honest verdict. urgency_score 0-100.\n22. future_outlook: honest 3-5 year projection.\n23. market_intelligence.swot: 3-4 items each.\n24. tags: 8-12 short keyword tags.\n25. ${stateTiersRule}\n26. ${locationTiersRule}\n27. ${expertTipsRule}\n28. ${targetPillsRule}\n${style!=='standard'?`29. Write as ${style.replace('_',' ').toUpperCase()} analyst`:''}\n\nReturn ONLY valid compact JSON:\n{"title":"str","tagline":"str","full_desc":"str","category_slug":"food-agri|retail|services|manufacturing|digital|education|healthcare|fintech-finance|ev-energy|logistics-mobility|franchise|daily-cashflow|textile","badge_label":"${badge_label}","country":"${country}","monthly_rev_min":0,"monthly_rev_max":0,"payback_months_min":0,"payback_months_max":0,"score":0,"score_breakdown":{"profitability":0,"ease":0,"govt_support":0,"market_momentum":0},${effortScorecardSchema},"fit_verdict":"str",${saturationSchema},${painPointsSchema},${marketVerdictSchema},${futureOutlookSchema},"pros":["s1","s2","s3","s4"],"cons":["s1","s2","s3"],"tags":["tag1","tag2","tag3"],"state_tags":["State1","State2","State3"],"location_tiers":{"tier1":{"tier_score":0,"suitability":"excellent|good|moderate|poor","rationale":"str","best_cities":["City1","City2"],"challenges":"str"},"tier2":{"tier_score":0,"suitability":"excellent|good|moderate|poor","rationale":"str","best_cities":["City1","City2"],"challenges":"str"},"tier3":{"tier_score":0,"suitability":"excellent|good|moderate|poor","rationale":"str","best_cities":["City1","City2"],"challenges":"str"}},"expert_tips_structured":[{"title":"str","body":"str"}],"target_customer_pills":["Segment 1","Segment 2","Segment 3","Segment 4"],"faqs":[{"q":"str","a":"str"}],"headcount":{"min":0,"max":0,"breakdown":[{"role":"str","type":"full_time|part_time|contract","count":0}]},"licenses_required":[{"name":"str","authority":"str","portal":"str","est_cost_usd":0,"est_days":0,"mandatory":true,"process":"online|offline|both","common_issues":"str","description":"str"}],"machinery_list":[{"name":"str","qty":0,"cost_approx":0,"category":"str","mandatory":"Essential|Required|Optional","new_or_used":"New|Either|Used","purpose":"str","sourcing":"str"}],"raw_materials":[{"name":"str","category":"str","cost_per_unit":"str","source":"str","notes":"str","unit":"str","frequency":"Daily|Weekly|Monthly"}],"setup_cost_breakdown":[{"label":"str","amount_usd":0,"notes":"str"}],"financial_projections":{"_unit":"USD","_converted":true,"monthly":{"revenue_low":0,"revenue_high":0,"opex":0,"cogs_pct":0},"assumptions":{"initial_investment":0,"loan_amount":0,"loan_interest_rate_pct":0,"loan_tenure_options":[36,60]},"year3":{"revenue":0,"ebitda":0},"year5":{"revenue":0,"ebitda":0}},"calculator_config":{"billing_model":"per_unit_daily|subscription_cumulative","cogs_label":"str","cogs_editable":true,"cogs_slider_min":0,"cogs_slider_max":0,"revenue":{"avg_bill":0,"units_per_day_low":0,"units_per_day_high":0,"driver_label":"str"},"emi":{"default_loan_amount":0,"interest_rate_pct":0}},"revenue_streams":[{"label":"str","model":"str","pct_of_revenue":0,"avg_ticket_usd":0,"frequency":"str","description":"str","growth_potential":"low|medium|high","dependency":"str","unlock_at":"str"}],"market_demographics":{"market_size_cr":0,"market_cagr":0,"penetration_pct":0,"income_segment":"str","primary_buyers":"str","geography":"str","key_insight":"str","psychographic_profile":"str","buying_triggers":["t1","t2","t3"],"media_consumption":"str","price_sensitivity":"low|medium|high","price_range":"str","decision_timeline":"str","segments":[{"label":"str","pct":0}]},"market_intelligence":{"market_size_unit":"usd_m","cagr_pct":0,"seasonality":"low|medium|high","seasonality_notes":"str","tam_cr":0,"sam_cr":0,"som_cr":0,"market_king":{"name":"str","why":"str","your_path":"str","positioning":"str"},"swot":{"strengths":["s1","s2","s3","s4"],"weaknesses":["w1","w2","w3","w4"],"opportunities":["o1","o2","o3","o4"],"threats":["t1","t2","t3","t4"]},"mvp_weeks_min":0,"mvp_weeks_max":0,"mvp_milestones":["Week 1: str","Week 2-3: str","Week 4: str","Week 6-8: str"],"persona":{"age_range":"str","income_bracket":"str","gender_skew":"male|female|neutral","education":"str","psychographics":"str","pain_points":["p1","p2","p3"],"decision_triggers":["d1","d2","d3"],"channels":["c1","c2","c3"],"jtbd":"str"}},"competitors":{"king_of_market":{"name":"str","why_they_win":"str","their_weakness":"str","your_exploit":"str"},"direct":[{"name":"str","type":"local|national|international","strength":"str","weakness":"str","market_share_est":"str","pricing":"str","not_doing":"str"}],"indirect":[{"name":"str","threat_level":"low|medium|high","reason":"str"}],"your_advantages":["str"],"what_to_do":["str"],"threats":["str"],"badge_context":"str"},"demand_trend":{"label":"str","unit":"Google Trends Index (base 100 = Jan 2024)","data":[{"period":"Jan 2024","value":100},{"period":"Mar 2024","value":0},{"period":"May 2024","value":0},{"period":"Jul 2024","value":0},{"period":"Sep 2024","value":0},{"period":"Nov 2024","value":0},{"period":"Jan 2025","value":0},{"period":"Mar 2025","value":0},{"period":"Jan 2026","value":0},{"period":"Mar 2026","value":0}],"trend_direction":"rising|falling|stable|seasonal","trend_note":"str","peak_period":"str","trough_period":"str"},${spaceLoc}"marketing_strategy":{"total_budget_usd":0,"budget_split":"str","primary_hook":"str","social_proof_angles":["str","str","str"],"psychology_levers":[{"lever":"str","application":"str"}],"budget_milestones":{"month_1":{"total_usd":0,"focus":"Aggressive launch","channels":[{"name":"str","budget_usd":0,"action":"str"}]},"month_6":{"total_usd":0,"focus":"Conversion","channels":[{"name":"str","budget_usd":0,"action":"str"}]},"month_12":{"total_usd":0,"focus":"Retention","channels":[{"name":"str","budget_usd":0,"action":"str"}]},"month_18":{"total_usd":0,"focus":"Loyalty","channels":[{"name":"str","budget_usd":0,"action":"str"}]}},"channels":[{"name":"str","type":"str","budget_usd":0,"priority":"primary","rationale":"str","platform_setup":"str","ad_creative_idea":"str","tactics":["str"],"dos":["str"],"donts":["str"],"success_rate":"high","failure_mode":"str","timeline":"str","kpi":"str"}],"guerrilla_play":{"idea":"str","execution":"str","expected_impact":"str"},"launch_sequence":[{"week":"Week 1","action":"str","goal":"str"}],"retention_strategy":"str","referral_mechanic":"str"},"govt_schemes":[{"name":"str","benefit":"str","eligibility":"str","apply_url":"https://official-url","ministry":"str","application_process":"str"}],"govt_scheme_details":{"schemes":[{"name":"str","benefit":"str","eligibility":"str","ministry":"str","apply_url":"https://official-url","application_process":"str"}]},"funding_options":{"summary":"str","options":[{"type":"bootstrap|debt|equity|grant|revenue_based","label":"str","source_name":"str","amount_range_usd_min":0,"amount_range_usd_max":0,"when_to_apply":"str","interest_or_dilution":"str","approval_timeline":"str","eligibility_bar":"low|medium|high","pros":["str"],"cons":["str"],"url":"https://real-url","best_for":"str"}]},"risk_matrix":{"overall_risk":"low|medium|high","risks":[{"category":"operational|market|regulatory|financial|competitive","risk":"str","description":"str","probability":"low|medium|high","impact":"low|medium|high","risk_score":"low|medium|high|critical","mitigation":"str","early_warning_sign":"str"}]},"unit_economics_deep":{"cac_by_channel":[{"channel":"str","cac_usd":0,"notes":"str"}],"avg_ltv_usd":0,"ltv_cac_ratio":0,"gross_margin_pct":0,"contribution_margin_usd":0,"break_even_units_per_month":0,"break_even_revenue_usd":0,"payback_period_months":0,"notes":"str"},"tools_and_stack":[{"category":"str","name":"str","purpose":"str","cost_usd_per_month":0,"free_tier_available":true,"priority":"must_have|nice_to_have","url":"https://tool-url","notes":"str"}],"is_saturated":false${hasAddons?`,${addonsSchema}`:''}}`}
function sendCompletionEmail(supabaseUrl,userId,feature,data){fetch(`${supabaseUrl}/functions/v1/send-completion-email`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({feature,user_id:userId,data})}).then(r=>{if(!r.ok)r.text().then(t=>console.error(`[research] email failed ${r.status}:`,t));else console.log('[research] completion email sent')}).catch(e=>console.error('[research] email error:',e))}

// ============================================================
// v44 progressive partial-write helpers (unchanged)
// ============================================================

const PROGRESSIVE_KEYS = [
  'title','tagline','score_breakdown','market_intelligence','competitors',
  'pain_points','market_verdict','future_outlook','financial_projections',
  'risk_matrix','funding_options',
]

function extractCompleteKey(buffer, key) {
  const marker = `"${key}"`
  const idx = buffer.indexOf(marker)
  if (idx === -1) return undefined
  let i = idx + marker.length
  while (i < buffer.length && (buffer[i]===' '||buffer[i]==='\n'||buffer[i]==='\t')) i++
  if (buffer[i] !== ':') return undefined
  i++
  while (i < buffer.length && (buffer[i]===' '||buffer[i]==='\n'||buffer[i]==='\t')) i++
  const start = i
  const opener = buffer[i]
  if (opener === undefined) return undefined
  if (opener !== '{' && opener !== '[' && opener !== '"') {
    let j = i
    while (j < buffer.length && buffer[j] !== ',' && buffer[j] !== '}' && buffer[j] !== '\n') j++
    if (j >= buffer.length) return undefined
    const raw = buffer.slice(start, j).trim()
    if (!raw) return undefined
    try { return { value: JSON.parse(raw) } } catch { return undefined }
  }
  let depth = 0, inStr = false, esc = false
  for (let j = i; j < buffer.length; j++) {
    const c = buffer[j]
    if (esc) { esc = false; continue }
    if (c === '\\') { esc = true; continue }
    if (c === '"') {
      inStr = !inStr
      if (opener === '"' && !inStr) {
        const raw = buffer.slice(start, j + 1)
        try { return { value: JSON.parse(raw) } } catch { return undefined }
      }
      continue
    }
    if (inStr) continue
    if (c === '{' || c === '[') depth++
    if (c === '}' || c === ']') {
      depth--
      if (depth === 0) {
        const raw = buffer.slice(start, j + 1)
        try { return { value: JSON.parse(raw) } } catch { return undefined }
      }
    }
  }
  return undefined
}

const BATCH_FLUSH_MS = 1500

function makeProgressiveWriter(supabase, id) {
  let pendingBatch = {}
  let batchTimer = null

  async function flush() {
    if (Object.keys(pendingBatch).length === 0) return
    const toWrite = pendingBatch
    pendingBatch = {}
    try {
      const { error } = await supabase.from('user_opportunities').update(toWrite).eq('id', id)
      if (error) console.warn('[research] partial write failed (non-fatal):', error.message)
    } catch (e) {
      console.warn('[research] partial write threw (non-fatal):', e instanceof Error ? e.message : String(e))
    }
  }

  function scheduleFlush() {
    if (batchTimer !== null) return
    batchTimer = setTimeout(() => { batchTimer = null; flush() }, BATCH_FLUSH_MS)
  }

  return {
    check(accumulated, writtenKeys) {
      for (const key of PROGRESSIVE_KEYS) {
        if (writtenKeys.has(key)) continue
        const result = extractCompleteKey(accumulated, key)
        if (result !== undefined) {
          writtenKeys.add(key)
          pendingBatch[key] = result.value
        }
      }
      if (Object.keys(pendingBatch).length > 0) scheduleFlush()
    },
    async flushNow() {
      if (batchTimer !== null) { clearTimeout(batchTimer); batchTimer = null }
      await flush()
    },
  }
}

// ============================================================
// End v44 additions
// ============================================================

// ============================================================
// v52 addition: catalog slug uniqueness helper
// ============================================================
async function uniqueCatalogSlug(supabase, base) {
  let candidate = base
  let suffix = 2
  // Cap attempts to avoid pathological loops; falls back to a timestamp suffix if truly exhausted.
  for (let i = 0; i < 50; i++) {
    const { data: existing } = await supabase.from('user_opportunities').select('id').eq('slug', candidate).maybeSingle()
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix++
  }
  return `${base}-${Date.now().toString(36)}`
}
// ============================================================
// End v52 addition
// ============================================================

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  const PLATFORM_GEMINI_KEY=Deno.env.get('GEMINI_API_KEY');const SUPABASE_URL=Deno.env.get('SUPABASE_URL');const SUPABASE_SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');const SUPABASE_ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')
  if(!PLATFORM_GEMINI_KEY||!SUPABASE_URL||!SUPABASE_SERVICE_KEY||!SUPABASE_ANON_KEY)return new Response(JSON.stringify({error:'Missing env vars'}),{status:500,headers:corsHeaders})
  const supabase=createClient(SUPABASE_URL,SUPABASE_SERVICE_KEY)
  let userId,isByok,geminiKey,query,country,currency,badge,badge_label,context,style,selectedModel,CREDITS_COST,creditsAfter,validatedProjectId,version,id,pendingSlug,actualModelUsed,usageBucket,visibility
  try{
    const authHeader=req.headers.get('Authorization');if(!authHeader)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:corsHeaders})
    const token=authHeader.replace(/^Bearer\s+/i,'');const{data:{user},error:authErr}=await createClient(SUPABASE_URL,SUPABASE_ANON_KEY).auth.getUser(token)
    if(authErr||!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:corsHeaders})
    const byokKey=req.headers.get('x-gemini-key')?.trim()||null
    geminiKey=byokKey??PLATFORM_GEMINI_KEY;isByok=!!byokKey;userId=user.id
    const limited=await checkRateLimit(supabase,userId,isByok);if(limited)return limited
    const body=await req.json()
    let{query:q,country:c,currency:cur='USD',badge:b='',badge_label:bl='',context:ctx,research_style='standard',model:modelRaw=null,project_id=null,visibility:visibilityRaw='private'}=body
    query=q;currency=cur;badge=b;badge_label=bl;context=ctx

    // v52: server-side gate for catalog visibility. Never trust client-supplied visibility directly —
    // only admin/super_admin roles may generate catalog (public) rows. Anything else is forced private.
    visibility='private'
    if(visibilityRaw==='catalog'){
      const{data:profile,error:profileErr}=await supabase.from('profiles').select('role').eq('id',userId).single()
      const role=profile?.role
      if(!profileErr&&(role==='admin'||role==='super_admin')){
        visibility='catalog'
      }else{
        console.warn(`[research] user ${userId} requested catalog visibility without admin role (role=${role}); forcing private`)
      }
    }

    if(!c||c==='India'){const detected=detectCountry(q??'');country=detected??'India'}else country=c
    const validStyles=['standard','mckinsey','bcg','bain','goldman_sachs','jp_morgan','kpmg']
    style=validStyles.includes(research_style)?research_style:'standard'
    selectedModel=VALID_MODELS.includes(modelRaw)?modelRaw:GEMINI_FLASH
    const styleBase=STYLE_CREDITS[style]
    const modelMult=MODEL_MULTIPLIERS[selectedModel]
    CREDITS_COST=Math.round(styleBase*modelMult)
    usageBucket=PREMIUM_STYLES.has(style)?'reports_premium':'reports_standard'
    console.log(`[research] style=${style} model=${selectedModel} bucket=${usageBucket} visibility=${visibility}`)
    if(!query?.trim())return new Response(JSON.stringify({error:'query is required'}),{status:400,headers:corsHeaders})
    if(project_id){const{data:proj}=await supabase.from('projects').select('id').eq('id',project_id).eq('user_id',userId).single();if(proj)validatedProjectId=proj.id}
    creditsAfter=0
    // v52: catalog (admin-generated public) rows skip usage/credit deduction entirely.
    if(!isByok && visibility!=='catalog'){
      const{data:usageResult,error:usageErr}=await supabase.rpc('deduct_feature_usage',{p_user_id:userId,p_bucket:usageBucket,p_amount:1})
      if(usageErr)return new Response(JSON.stringify({error:'Failed to process usage.',detail:usageErr.message}),{status:500,headers:corsHeaders})
      if(!usageResult?.success){
        const reason=usageResult?.error
        if(reason==='no_active_subscription')return new Response(JSON.stringify({error:'No active subscription found.',code:reason}),{status:402,headers:corsHeaders})
        if(reason==='feature_locked')return new Response(JSON.stringify({error:'This feature is not available on your plan.',code:reason,feature:usageResult?.feature}),{status:402,headers:corsHeaders})
        return new Response(JSON.stringify({error:`Monthly limit reached for this feature. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`,code:reason,used:usageResult?.used??0,allowance:usageResult?.allowance??0}),{status:402,headers:corsHeaders})
      }
      creditsAfter=usageResult?.remaining??0
    }
    const{data:ver}=await supabase.rpc('next_research_version',{p_user_id:userId,p_query:query})
    version=ver

    // v52: catalog rows get a clean, globally-unique public slug (no version/timestamp suffix).
    // Private rows keep the existing internal slug format unchanged.
    if(visibility==='catalog'){
      pendingSlug=await uniqueCatalogSlug(supabase,slugify(query))
    }else{
      pendingSlug=`${slugify(query)}-v${version??1}-${Date.now().toString(36)}`
    }

    const{data:pendingRow,error:insertErr}=await supabase.from('user_opportunities').insert({user_id:userId,slug:pendingSlug,title:query.slice(0,80),research_query:query,research_status:'pending',research_version:version??1,research_context:context??null,credits_used:isByok?0:CREDITS_COST,country,status:'draft',badge:badge||null,badge_label:badge_label||null,research_style:style,model_used:selectedModel,byok_used:isByok,project_id:validatedProjectId??null,visibility}).select('id,slug').single()
    if(insertErr||!pendingRow){
      return new Response(JSON.stringify({error:`Insert failed: ${insertErr?.message}`}),{status:500,headers:corsHeaders})
    }
    id=pendingRow.id
  }catch(err){
    console.error('[research] pre-stream error:',err)
    return new Response(JSON.stringify({error:String(err)}),{status:500,headers:corsHeaders})
  }
  const stream=new ReadableStream({
    async start(controller){
      const enc=new TextEncoder()
      const send=(type,data)=>{try{controller.enqueue(enc.encode(sseEvent(type,data)))}catch(_){}}
      send('started',{id,slug:pendingSlug,credits_used:isByok?0:CREDITS_COST,credits_remaining:creditsAfter,model:selectedModel,visibility})

      const progressiveWriter = makeProgressiveWriter(supabase, id)
      const writtenKeys = new Set()
      let lastParseAttempt = 0
      const PARSE_RATE_LIMIT_MS = 1000

      try{
        let lastError=new Error('Unknown error')
        const fallback=MODEL_FALLBACK[selectedModel]
        const models=[selectedModel,fallback]
        let accumulated=''
        let succeeded=false
        actualModelUsed=selectedModel
        outer:for(const model of models){
          for(let attempt=0;attempt<MAX_RETRIES;attempt++){
            if(attempt>0)await sleep(RETRY_DELAYS_MS[attempt-1]??15000)
            const controller2=new AbortController()
            const timeout=setTimeout(()=>controller2.abort(),GEMINI_TIMEOUT_MS)
            try{
              const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller2.signal,body:JSON.stringify({contents:[{role:'user',parts:[{text:researchPrompt(query,country,currency,badge,badge_label,style,context)}]}],generationConfig:{temperature:0.7,maxOutputTokens:200000},safetySettings:[{category:'HARM_CATEGORY_HARASSMENT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_HATE_SPEECH',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold:'BLOCK_NONE'},{category:'HARM_CATEGORY_DANGEROUS_CONTENT',threshold:'BLOCK_NONE'}]})})
              if(res.status===503||res.status===429){clearTimeout(timeout);lastError=new Error(`${model} ${res.status}`);continue}
              if(!res.ok){clearTimeout(timeout);const t=await res.text();throw new Error(`${model} ${res.status}: ${t}`)}
              const reader=res.body.getReader()
              const decoder=new TextDecoder()
              let buffer=''
              let finishReason=null
              let charsSinceLastProgress=0
              accumulated=''
              while(true){
                const{done,value}=await reader.read()
                if(done)break
                buffer+=decoder.decode(value,{stream:true})
                const lines=buffer.split('\n')
                buffer=lines.pop()??''
                for(const line of lines){
                  if(line.startsWith('data: ')){
                    const raw=line.slice(6).trim()
                    if(raw==='[DONE]')break
                    try{
                      const chunk=JSON.parse(raw)
                      const part=chunk.candidates?.[0]?.content?.parts?.[0]?.text
                      if(part){accumulated+=part;charsSinceLastProgress+=part.length}
                      const fr=chunk.candidates?.[0]?.finishReason
                      if(fr)finishReason=fr
                    }catch(_){}
                  }
                }
                if(charsSinceLastProgress>=200){
                  send('progress',{chars:accumulated.length});charsSinceLastProgress=0
                  const now=Date.now()
                  if(now-lastParseAttempt>=PARSE_RATE_LIMIT_MS){
                    lastParseAttempt=now
                    progressiveWriter.check(accumulated,writtenKeys)
                  }
                }
              }
              clearTimeout(timeout)
              if(finishReason==='MAX_TOKENS')throw new Error('Output truncated')
              if(!accumulated)throw new Error('Empty response')
              actualModelUsed=model
              console.log(`[research] stream complete model=${model} chars=${accumulated.length}`)
              succeeded=true
              break outer
            }catch(e){
              clearTimeout(timeout)
              const msg=e instanceof Error?e.message:String(e)
              if(msg.includes('AbortError')||msg.includes('aborted'))throw new Error('TIMEOUT: Gemini exceeded 140s')
              if(msg.includes('503')||msg.includes('429')){lastError=e instanceof Error?e:new Error(msg);continue}
              throw e
            }
          }
        }
        if(!succeeded)throw lastError

        await progressiveWriter.flushNow()

        const parsed=JSON.parse(strip(accumulated))
        for(const k of['market_demographics','market_intelligence','calculator_config','marketing_strategy','competitors','demand_trend','space_location']){if(parsed[k]&&typeof parsed[k]==='object')delete parsed[k].RULE}
        let setup_min=0,setup_max=0,setupDerivationMeta={note:'Fallback'}
        try{const rb=parsed.setup_cost_breakdown??[];if(rb.length>0){const d=deriveSetupCost(rb);setup_min=d.setup_min;setup_max=d.setup_max;const{setup_min:_a,setup_max:_b,...m}=d;setupDerivationMeta=m}else{setup_min=Number(parsed.setup_min??0);setup_max=Number(parsed.setup_max??0)}}catch(e){console.warn('[research] deriveSetupCost:',String(e))}
        let monthly_profit_min=0,monthly_profit_max=0,profitDerivationMeta={note:'Fallback'}
        try{const cc=parsed.calculator_config??{};const fpm=parsed.financial_projections?.monthly??{};if(cc.revenue&&fpm.cogs_pct!==undefined){const d=deriveProfitMargin(cc,{monthly:fpm});monthly_profit_min=d.monthly_profit_min;monthly_profit_max=d.monthly_profit_max;const{monthly_profit_min:_a,monthly_profit_max:_b,...m}=d;profitDerivationMeta=m}}catch(e){console.warn('[research] deriveProfitMargin:',String(e))}
        let ease='Moderate',ease_score=50,effort_scorecard_final={note:'Fallback'}
        try{const rs=parsed.effort_scorecard;if(rs&&typeof rs.capital_intensity==='number'){const d=deriveEase(rs);ease=d.ease;ease_score=d.ease_score;effort_scorecard_final=d.effort_scorecard}else{ease=String(parsed.ease??'Moderate');ease_score=ease==='Easy'?80:ease==='Hard'?25:50}}catch(e){console.warn('[research] deriveEase:',String(e))}
        let normalizedScore=null;try{normalizedScore=normalizeScore(parsed.score)}catch(e){console.warn('[research] normalizeScore:',String(e))}
        let fitIndex=null;try{fitIndex=computeFitIndex(parsed.score_breakdown)}catch(e){console.warn('[research] computeFitIndex:',String(e))}
        let builtSchemeDetails={schemes:[]}
        try{const rs2=parsed.govt_schemes??[];const gsd=parsed.govt_scheme_details;builtSchemeDetails=buildGovtSchemeDetails(gsd?.schemes??rs2)}catch(e){console.warn('[research] buildGovtSchemeDetails:',String(e))}

        // v52: final slug also branches on visibility — catalog rows must re-derive a clean unique
        // slug from the FINAL title (which may differ from the original query), private rows keep
        // the existing versioned/timestamped format.
        let finalSlug
        if(visibility==='catalog'){
          finalSlug=await uniqueCatalogSlug(supabase,slugify(parsed.title||query))
        }else{
          finalSlug=`${slugify(parsed.title||query)}-v${version??1}-${Date.now().toString(36)}`
        }

        const satLevel=parsed.saturation_level
        const isSat=satLevel?satLevel==='extreme'||satLevel==='high':(parsed.is_saturated??false)
        if(parsed.market_intelligence&&typeof parsed.market_intelligence==='object')parsed.market_intelligence.market_size_unit='usd_m'
        const{error:updateErr}=await supabase.from('user_opportunities').update({
          slug:finalSlug,title:parsed.title,tagline:parsed.tagline,full_desc:parsed.full_desc,
          category_slug:parsed.category_slug,badge:badge||null,badge_label:parsed.badge_label||badge_label||null,
          country:parsed.country??country,
          monthly_rev_min:parsed.monthly_rev_min,monthly_rev_max:parsed.monthly_rev_max,
          monthly_profit_min,monthly_profit_max,profit_derivation:profitDerivationMeta,
          setup_min,setup_max,setup_cost_derivation:setupDerivationMeta,
          payback_months_min:parsed.payback_months_min,payback_months_max:parsed.payback_months_max,
          score:normalizedScore,score_breakdown:parsed.score_breakdown,fit_index:fitIndex,fit_verdict:parsed.fit_verdict??null,
          ease,ease_score,effort_scorecard:effort_scorecard_final,
          pros:parsed.pros,cons:parsed.cons,
          tags:parsed.tags??null,state_tags:parsed.state_tags??null,location_tiers:parsed.location_tiers??null,
          expert_tips_structured:parsed.expert_tips_structured??null,target_customer_pills:parsed.target_customer_pills??null,
          is_saturated:isSat,saturation_level:satLevel??null,saturation_note:parsed.saturation_note??null,
          pain_points:parsed.pain_points??null,market_verdict:parsed.market_verdict??null,future_outlook:parsed.future_outlook??null,
          faqs:parsed.faqs,headcount:parsed.headcount,licenses_required:parsed.licenses_required,machinery_list:parsed.machinery_list,
          raw_materials:parsed.raw_materials,setup_cost_breakdown:parsed.setup_cost_breakdown,
          financial_projections:parsed.financial_projections,calculator_config:parsed.calculator_config,
          revenue_streams:parsed.revenue_streams,market_demographics:parsed.market_demographics,market_intelligence:parsed.market_intelligence,
          competitors:parsed.competitors,demand_trend:parsed.demand_trend,space_location:parsed.space_location??null,
          marketing_strategy:parsed.marketing_strategy,govt_schemes:parsed.govt_schemes,govt_scheme_details:builtSchemeDetails,
          funding_options:parsed.funding_options??null,risk_matrix:parsed.risk_matrix??null,
          unit_economics_deep:parsed.unit_economics_deep??null,tools_and_stack:parsed.tools_and_stack??null,
          style_addons:parsed.style_addons??null,research_style:style,model_used:actualModelUsed,byok_used:isByok,
          research_status:'complete',research_error:null,status:visibility==='catalog'?'published':'draft',project_id:validatedProjectId??null,updated_at:new Date().toISOString()
        }).eq('id',id)
        if(updateErr){
          console.error('[research] update failed:',updateErr.message)
          await supabase.from('user_opportunities').update({research_status:'failed',research_error:updateErr.message.slice(0,500)}).eq('id',id)
          send('error',{message:'Save failed.',refunded:false})
          controller.close();return
        }
        console.log(`[research] complete id=${id} slug=${finalSlug} model=${actualModelUsed} visibility=${visibility}`)
        send('complete',{id,slug:finalSlug,research_style:style,model_used:actualModelUsed,byok_used:isByok,credits_used:isByok?0:CREDITS_COST,credits_remaining:creditsAfter,visibility})
        sendCompletionEmail(SUPABASE_URL,userId,'research',{opportunity_id:id,slug:finalSlug,title:parsed.title,score:normalizedScore,saturation_verdict:satLevel,tagline:parsed.tagline,monthly_rev_min:parsed.monthly_rev_min,monthly_rev_max:parsed.monthly_rev_max,one_big_opportunity:parsed.market_verdict?.verdict_summary??null,country})
      }catch(e){
        const errMsg=e instanceof Error?e.message:String(e)
        console.error('[research] stream error:',errMsg)
        await supabase.from('user_opportunities').update({research_status:'failed',research_error:errMsg.slice(0,500)}).eq('id',id)
        send('error',{message:isByok?'Research failed. Check your API key.':'Research failed.',refunded:false,detail:errMsg.slice(0,200)})
      }
      controller.close()
    }
  })
  return new Response(stream,{headers:sseHeaders})
})

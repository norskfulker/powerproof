// generate-idea-chips v20
// FIXED: market_test prompt tightened; 10 new market_test seeds added
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL          = 'gemini-2.5-flash-lite'
const BATCH_SIZE     = 20
const RETURN_SIZE    = 5
const MIN_POOL_SIZE  = 20
const MAX_POOL_SIZE  = 120
const TIMEOUT_MS     = 15000

const SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
]

const SOURCING_CATEGORIES = [
  'consumer electronics accessories','PCB circuit boards','LED lighting modules','CCTV surveillance cameras',
  'solar panels and inverters','lithium battery cells','RF wireless modules','industrial sensors',
  'servo motors and drives','power supply units','touchscreen displays','Arduino Raspberry Pi components',
  'capacitors and resistors','fiber optic cables','EV charging equipment','drone components and frames',
  'cotton fabric by the yard','polyester sportswear fabric','embroidery thread and supplies',
  'denim fabric rolls','lace and trim accessories','wool yarn for knitting','silk fabric wholesale',
  'sublimation blank t-shirts','school uniform fabric','safety workwear and PPE','swimwear fabric lycra',
  'non-woven polypropylene fabric','bamboo fiber cloth','printed cotton muslin','stretch velvet fabric',
  'freeze-dried fruit powder','cold-pressed coconut oil','organic spices bulk','plant-based protein powder',
  'food flavoring extracts','edible packaging materials','commercial kitchen equipment','food-grade silicone molds',
  'beverage dispensing equipment','vacuum packaging machines','commercial ice cream makers','bakery proofing equipment',
  'food dehydrators industrial','fermentation tanks stainless','grain milling equipment','honey filling machines',
  'industrial epoxy adhesive','water treatment chemicals','construction waterproofing membrane','paint pigments wholesale',
  'activated charcoal powder','zinc oxide industrial grade','citric acid food grade','sodium hydroxide lye',
  'silicone sealant cartridges','polyurethane foam chemicals','carbon black pigment','titanium dioxide pigment',
  'resin casting supplies','industrial lubricants','acetone solvent drums','hydrochloric acid industrial',
  'kraft paper bags wholesale','biodegradable food containers','shrink wrap film rolls','aluminum foil pouches',
  'custom printed sticker rolls','bubble wrap rolls bulk','plastic clamshell packaging','glass dropper bottles',
  'tin cans and lids','paper tube cores','rigid gift box cardboard','vacuum seal bags mylar',
  'woven polypropylene sacks','tamper evident labels','foam inserts for packaging','wooden crates wholesale',
  'galvanized steel pipes','ceramic floor tiles wholesale','Portland cement bags','plywood sheets marine grade',
  'aluminum extrusion profiles','anchor bolts and fasteners','PVC conduit and fittings','glass wool insulation',
  'construction safety netting','concrete admixtures','roof membrane EPDM','wire mesh panels',
  'granite countertop slabs','door hinges and locks','gypsum plasterboard','expansion joints rubber',
  'automotive LED headlights','car seat covers wholesale','brake pads and rotors aftermarket',
  'engine oil filters bulk','rubber floor mats automotive','car audio speakers','EV conversion parts',
  'tire repair equipment','auto body filler putty','windshield glass wholesale','truck tarpaulin covers',
  'hydraulic jack equipment','spark plugs wholesale','radiator hoses bulk','catalytic converter parts',
  'drip irrigation kits','greenhouse polycarbonate panels','vegetable seeds wholesale',
  'NPK fertilizer granules','agricultural sprayer equipment','seedling trays wholesale','mushroom grow bags',
  'beekeeping equipment and suits','hydroponic grow lights','poultry feed supplements','aquaculture aeration equipment',
  'cold storage refrigeration units','soil moisture sensors','vermicompost production supplies','bird netting rolls',
  'nitrile examination gloves','surgical mask N95 wholesale','stethoscopes wholesale','blood pressure monitors OEM',
  'herbal extract powders','medical disposable syringes','wheelchair and mobility aids','orthopedic supports wholesale',
  'UV sterilization equipment','dental supply wholesale','massage therapy equipment','fitness resistance bands',
  'bamboo kitchenware sets','stainless steel cookware wholesale','scented candle supplies','essential oil diffusers',
  'memory foam mattress toppers','curtain fabric velvet','ceramic planters wholesale','rattan furniture components',
  'LED strip lights RGB','smart home switches','bathroom accessories sets','storage organizer bins',
  'wall art canvas wholesale','electric blankets OEM','air purifier HEPA filters','water filter cartridges',
  'conveyor belt systems','hydraulic cylinders custom','pneumatic fittings wholesale','industrial weighing scales',
  'laser cutting machine parts','CNC router bits','welding wire and electrodes','forklift spare parts',
  'industrial air compressors','heat exchangers plate type','gear pumps and motors','safety valves industrial',
  'industrial fans and blowers','metal detector conveyor','palletizer machine parts','cooling tower fill media',
  'custom notebook printing','gel pen refills wholesale','adhesive labels rolls','laminating pouches',
  'whiteboard markers bulk','presentation folders custom','stamp and ink pads','paper clips binders wholesale',
  'cosmetic jar containers wholesale','hair extension bundles','nail art supplies wholesale','eyeshadow palette OEM',
  'loofah bath sponges','bamboo toothbrush wholesale','soap base melt pour','empty lip gloss tubes',
  'hair straightener OEM','facial mask sheet blank','shampoo bottle wholesale','wax strips hair removal',
  'yoga mat wholesale EVA','camping tent fabric','gym equipment weight plates','cycling accessories wholesale',
  'fishing tackle wholesale','inflatable kayak OEM','sports water bottles','foam roller wholesale',
  'wooden toy parts wholesale','plush toy stuffing material','baby monitor OEM','educational puzzle wholesale',
  'silicone baby teethers','play mat foam tiles','rc car parts wholesale','sensory toy supplies',
  'pallet stretch wrap film','strapping band and tools','hand truck dollies wholesale','warehouse shelving racking',
  'cargo net straps','loading dock equipment','tote bins and crates','label printer thermal rolls',
  'restaurant furniture wholesale','hotel linen wholesale','exhibition display stands','trade show booth materials',
  'security camera housings','access control systems','fire alarm equipment','emergency lighting wholesale',
  'pet collar and leash wholesale','aquarium equipment wholesale','pet food packaging','veterinary supplies wholesale',
  'solar water heater components','heat pump systems','geothermal pipe fittings','wind turbine blades small',
  'rubber gaskets and seals','PTFE tape industrial','O-rings bulk assortment','mechanical seals pumps',
  'laboratory glassware wholesale','pH meters and electrodes','centrifuge tubes bulk','pipette tips wholesale',
]

const RESEARCH_VERTICALS = [
  'AI agent for small business WhatsApp automation','AI voice calling for appointment booking SMBs',
  'AI-generated personalised video marketing for D2C brands','AI document summarisation for legal and CA firms',
  'AI resume screening tool for Indian HR teams','AI-powered inventory forecasting for kirana stores',
  'automated GST reconciliation SaaS for accountants','AI meeting notes and CRM sync for sales teams',
  'AI content localisation for regional language markets','AI underwriting assistant for micro-insurance agents',
  'AI fraud detection for UPI payment flows','voice AI for vernacular customer support outsourcing',
  'carbon credit origination platform for Indian farms','rooftop solar subscription with zero upfront cost',
  'EV fleet management SaaS for last-mile logistics','plastic waste buyback platform for FMCG brands',
  'biogas plant installation service for restaurants','green building materials marketplace for tier-2 developers',
  'electric two-wheeler subscription for delivery gig workers','solar-powered cold storage as a service for farmers',
  'circular economy platform for industrial B2B waste','EV charging network franchise for highway dhabas',
  'PCOS nutrition and lifestyle subscription brand','ayurveda personalisation using at-home blood tests',
  'mental health app for vernacular rural users','sleep health wearable subscription for urban professionals',
  'fertility tracking app for Indian women tier-2','preventive health check subscription for families',
  'chronic disease management platform for diabetics','corporate mental wellness program for SME employees',
  'home physiotherapy booking via WhatsApp','health insurance claim navigation assistant',
  'MSME working capital loan via ERP data underwriting','revenue-based financing for D2C brands',
  'micro-insurance for gig economy delivery workers','invoice discounting platform for SME suppliers',
  'buy now pay later for agricultural inputs','gold loan digital platform for rural households',
  'embedded finance for B2B wholesale transactions','fractional real estate investment platform',
  'newsletter monetisation platform for Indian creators','micro-course marketplace in regional languages',
  'creator merchandise drop fulfilment platform India','short-form video commerce for fashion D2C brands',
  'influencer analytics platform for micro-influencer campaigns','live shopping platform for Indian ethnic brands',
  'dark store micro-fulfillment inside gated apartments','cross-border export aggregator for Indian handicraft makers',
  'hyperlocal B2B delivery network for restaurant suppliers','freight audit and payment automation for shippers',
  'cold chain monitoring SaaS for pharma logistics','truck load aggregation platform for spot freight',
  'customs clearance automation for import-heavy SMBs','reverse logistics platform for e-commerce returns',
  'rural last-mile delivery network using two-wheelers','shared cold storage marketplace for perishable sellers',
  'vocational skilling platform for blue-collar job placement','spoken English app using AI roleplay for rural learners',
  'upskilling platform for manufacturing shop floor workers','skill credentialing platform linked to hiring marketplaces',
  'vernacular beauty brand for north-east Indian consumers','affordable protein supplement brand for tier-2 gyms',
  'subscription meal kit for diabetic-friendly Indian cooking','upcycled fashion brand using textile industry waste',
  'personalised Ayurvedic hair oil subscription','refillable home cleaning products delivery service',
  'ERP for Indian textile and garment manufacturers','compliance automation for MSME exporters BIS FSSAI',
  'procurement automation for hospital pharmacy chains','restaurant management SaaS for dark kitchen operators',
  'field sales tracking app for FMCG distributors','quality inspection SaaS for Indian garment exporters',
  'farm-to-brand direct sourcing platform for organic inputs','precision farming advisory using satellite and IoT data',
  'millet processing and export brand for global markets','agricultural drone service franchise network',
  'co-living space operator for working professionals tier-2','construction material marketplace for self-build homeowners',
  'prefab modular office space rental for startups','building energy audit and retrofit service',
  'B2B marketplace for recycled industrial packaging materials','AI-powered demand forecasting for FMCG distributors',
  'hyperlocal ambulance booking via WhatsApp for tier-3 cities','vernacular podcast monetisation platform for regional creators',
  'subscription laundry for PG and hostel clusters','community solar micro-grid for rural cooperative housing',
  'AI proctoring for government competitive exam prep platforms','carbon footprint tracking SaaS for Indian exporters',
  'phygital retail enablement for kiranas using QR and ONDC','mental wellness platform for Indian armed forces families',
]

const WARROOM_COMBOS = [
  { industry: 'cloud kitchen', weapon: 'location lock before aggregators map the zone' },
  { industry: 'EV charging', weapon: 'exclusive venue contracts before competitors arrive' },
  { industry: 'school uniform supply', weapon: 'institutional contracts before season opens' },
  { industry: 'kirana wholesale supply', weapon: 'credit terms competitors cannot match' },
  { industry: 'MSME loan DSA', weapon: 'data partnerships to find leads before banks do' },
  { industry: 'tiffin service', weapon: 'office building exclusive deals before Swiggy scales' },
  { industry: 'salon supply chain', weapon: 'monthly subscription lock-in before FMCG reps arrive' },
  { industry: 'preschool franchise', weapon: 'parent WhatsApp community before competitors open nearby' },
  { industry: 'medical supplies to clinics', weapon: 'next-day delivery moat in underserved zones' },
  { industry: 'event photography', weapon: 'corporate retainer contracts before freelancers consolidate' },
  { industry: 'car detailing', weapon: 'apartment complex exclusivity before aggregators onboard' },
  { industry: 'home cleaning service', weapon: 'subscription model before UrbanClap floods the market' },
  { industry: 'coaching centre', weapon: 'government exam result PR before other centres react' },
  { industry: 'agri input retail', weapon: 'farmer credit lines before fintech DSAs find the route' },
  { industry: 'packaging supply', weapon: 'same-day delivery to D2C brands before marketplaces offer it' },
  { industry: 'laundry service', weapon: 'PG and hostel bulk contracts before aggregators onboard' },
  { industry: 'pet care grooming', weapon: 'apartment society tie-ups before Heads Up For Tails expands' },
  { industry: 'export of handicrafts', weapon: 'Amazon Global ready listings before artisan cooperatives wake up' },
  { industry: 'solar installation', weapon: 'housing society bulk deals before national installers quote' },
  { industry: 'pharmacy retail', weapon: 'chronic prescription auto-refill before 1mg delivers same-day' },
  { industry: 'gym and fitness', weapon: 'corporate wellness contracts before cult.fit enters tier-2' },
  { industry: 'food truck', weapon: 'tech park and college canteen slot exclusivity' },
  { industry: 'security guard services', weapon: 'gated community lock-in before large agencies restructure pricing' },
  { industry: 'driving school', weapon: 'fleet deal with cab aggregators for driver licence pipeline' },
  { industry: 'courier franchise', weapon: 'e-commerce return volume contracts before DTDC captures them' },
  { industry: 'used car dealership', weapon: 'refurb certifications before Spinny enters the city' },
  { industry: 'cold storage', weapon: 'agri cooperative contracts before government warehouses modernise' },
  { industry: 'wedding catering', weapon: 'venue exclusivity deals before aggregator platforms consolidate' },
  { industry: 'real estate brokerage', weapon: 'builder pre-launch access before PropTech platforms scale' },
  { industry: 'school bus service', weapon: 'parent safety app before aggregators commoditise the route' },
  { industry: 'water purifier rental', weapon: 'apartment complex bulk contracts before Kent expands doorstep' },
  { industry: 'online tuition', weapon: 'school tie-up for after-hours batch before Byju re-emerges' },
  { industry: 'furniture rental', weapon: 'co-living operator contracts before Furlenco scales B2B' },
  { industry: 'industrial canteen', weapon: 'SEZ and factory cluster exclusivity before Sodexo quotes' },
]

const ROADMAP_SEEDS = [
  { goal: 'crack NEET', who: '10th grade student with 8.5 CGPA', timeline: '2 years' },
  { goal: 'crack JEE Advanced', who: '11th grade student, strong in maths', timeline: '18 months' },
  { goal: 'clear UPSC CSE in first attempt', who: 'fresh engineering graduate', timeline: '2 years' },
  { goal: 'get into IIM via CAT', who: 'working professional 3 years experience', timeline: '14 months' },
  { goal: 'clear CA Final', who: 'CA Intermediate student, articleship ongoing', timeline: '18 months' },
  { goal: 'get a full scholarship to study abroad', who: 'final year engineering student', timeline: '12 months' },
  { goal: 'crack GATE for PSU or M.Tech', who: 'final year ECE student', timeline: '10 months' },
  { goal: 'pass CFA Level 1', who: 'finance analyst 2 years experience', timeline: '6 months' },
  { goal: 'become a data scientist at a top tech company', who: 'software engineer 2 years Python experience', timeline: '12 months' },
  { goal: 'transition from IT to product management', who: 'developer 4 years, MBA aspirant', timeline: '10 months' },
  { goal: 'launch a D2C skincare brand in India', who: 'marketer 5 years, ₹15L savings', timeline: '12 months' },
  { goal: 'build and launch a SaaS product for SME GST compliance', who: 'developer and CA co-founders', timeline: '9 months' },
  { goal: 'raise a seed round for a logistics tech startup', who: 'founder with working MVP', timeline: '6 months' },
  { goal: 'get fit enough to run a full marathon', who: '32-year-old office worker, currently sedentary', timeline: '6 months' },
  { goal: 'become financially independent before 40', who: '28-year-old with ₹8L savings', timeline: '10 years' },
  { goal: 'write and publish a non-fiction book', who: 'domain expert, no writing experience', timeline: '10 months' },
  { goal: 'become a certified yoga teacher', who: 'yoga practitioner 2 years, wants to teach', timeline: '8 months' },
  { goal: 'build a YouTube channel to 100K subscribers', who: 'software developer, wants to create content', timeline: '18 months' },
  { goal: 'land a product design job at a top startup', who: 'graphic designer 3 years, learning UX', timeline: '8 months' },
  { goal: 'start a profitable dropshipping business', who: 'college student, ₹50K budget', timeline: '6 months' },
  { goal: 'open a cloud kitchen from scratch', who: 'home cook, ₹3L capital, tier-2 city', timeline: '4 months' },
  { goal: 'become a freelance full-stack developer', who: 'BCA graduate, knows basic JavaScript', timeline: '10 months' },
  { goal: 'build a micro-SaaS to ₹1L MRR', who: 'solo developer, nights and weekends only', timeline: '12 months' },
  { goal: 'clear IELTS with 8+ band score', who: 'working professional, wants to migrate to Canada', timeline: '3 months' },
]

const MARKET_TEST_SEEDS = [
  { idea: 'cloud kitchen for regional Indian cuisine', location: 'tier-2 city', segment: 'working professionals' },
  { idea: 'AI-powered CA and tax filing assistant', location: 'India', segment: 'small business owners' },
  { idea: 'subscription box for organic Indian snacks', location: 'metro cities', segment: 'health-conscious families' },
  { idea: 'WhatsApp-based appointment booking for salons', location: 'tier-3 towns', segment: 'local salon owners' },
  { idea: 'vernacular edtech for class 6-10 students', location: 'rural India', segment: 'government school students' },
  { idea: 'solar rooftop installation for housing societies', location: 'tier-2 cities', segment: 'apartment residents' },
  { idea: 'D2C protein supplement brand for gym beginners', location: 'India', segment: 'first-time gym goers' },
  { idea: 'hyperlocal grocery delivery in 10 minutes', location: 'tier-2 cities', segment: 'busy urban households' },
  { idea: 'online used car inspection service', location: 'India', segment: 'second-hand car buyers' },
  { idea: 'B2B packaging supplier for D2C brands', location: 'India', segment: 'early-stage e-commerce brands' },
  { idea: 'mental health therapy app in Hindi', location: 'India', segment: 'tier-2 city young adults' },
  { idea: 'home-cooked tiffin subscription for bachelors', location: 'metro cities', segment: 'single working professionals' },
  { idea: 'agri drone spraying service for farmers', location: 'Punjab and Haryana', segment: 'mid-size farm owners' },
  { idea: 'co-working space in tier-2 city', location: 'Jaipur or Indore', segment: 'remote workers and freelancers' },
  { idea: 'UPSC coaching via live WhatsApp classes', location: 'India', segment: 'rural aspirants with smartphones' },
  { idea: 'jewellery rental subscription for weddings', location: 'India', segment: 'wedding guests on a budget' },
  { idea: 'EV two-wheeler rental for daily commuters', location: 'metro outskirts', segment: 'last-mile commuters' },
  { idea: 'home beauty service via app', location: 'tier-2 cities', segment: 'women 25-45' },
  { idea: 'resale fashion platform for Indian brands', location: 'India', segment: 'Gen Z fashion buyers' },
  { idea: 'millet-based packaged food brand', location: 'India', segment: 'health-conscious urban consumers' },
  { idea: 'pet grooming home visit service', location: 'metro cities', segment: 'urban pet owners' },
  { idea: 'SaaS for kirana store inventory management', location: 'India', segment: 'small grocery store owners' },
  { idea: 'custom printed corporate gifting service', location: 'India', segment: 'HR managers and companies' },
  { idea: 'skill certification platform for blue-collar workers', location: 'India', segment: 'ITI graduates and vocational trainees' },
  // 10 new seeds
  { idea: 'affordable IVF and fertility clinic chain', location: 'tier-2 cities', segment: 'couples 28-38 facing fertility issues' },
  { idea: 'vernacular legal document drafting service', location: 'rural and semi-urban India', segment: 'first-generation property buyers' },
  { idea: 'subscription meal prep for office lunch', location: 'Bengaluru and Pune', segment: 'IT professionals with no cooking time' },
  { idea: 'EV auto-rickshaw fleet for women-only rides', location: 'tier-2 cities', segment: 'working women and college students' },
  { idea: 'B2B laundry service for restaurants and hotels', location: 'metro cities', segment: 'F&B and hospitality operators' },
  { idea: 'modular prefab home builder for self-build plots', location: 'tier-3 cities and rural areas', segment: 'landowners with ₹15-30L budget' },
  { idea: 'AI tutor for NEET preparation in regional languages', location: 'South India', segment: 'rural students from Tamil and Telugu medium schools' },
  { idea: 'doorstep vehicle insurance renewal service', location: 'India', segment: 'two-wheeler owners in tier-2 cities' },
  { idea: 'organic cotton baby clothing D2C brand', location: 'India', segment: 'new parents aged 25-35 in metros' },
  { idea: 'SaaS for managing PG and hostel operations', location: 'India', segment: 'PG owners with 20+ beds' },
]

function pickRandom(arr, n) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

function strip(s) {
  return s.replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/```\s*$/i,'').trim()
}

function buildSourcingPrompt() {
  const seeds = pickRandom(SOURCING_CATEGORIES, BATCH_SIZE)
  return `Generate exactly ${BATCH_SIZE} specific B2B wholesale product sourcing keywords — one per category below.
You MUST generate a keyword for each of these categories (in order):
${seeds.map((s, i) => `${i + 1}. ${s}`).join('\n')}
Rules:
- Specific product within that category. NOT the category name itself.
- 2-6 words. Technical and specific. Include grade/spec/size when relevant.
- NO intent words: no find, source, buy, need, supplier, wholesale, bulk.
- Make each one feel like something a real B2B buyer would type into Alibaba.
Return ONLY a JSON array of exactly ${BATCH_SIZE} strings. No other text.
["keyword1","keyword2",...]`
}

function buildResearchPrompt() {
  const seeds = pickRandom(RESEARCH_VERTICALS, BATCH_SIZE)
  const angles = [
    'Focus on tier-2/3 Indian cities and underserved markets.',
    'Focus on B2B SaaS and enterprise angles.',
    'Focus on consumer D2C and subscription models.',
    'Focus on climate, sustainability, and green economy.',
    'Focus on fintech, credit, and financial inclusion.',
    'Focus on health, wellness, and preventive care.',
    'Focus on edtech, skilling, and career transitions.',
    'Focus on agri-tech, rural economy, and supply chains.',
  ]
  const angle = angles[Math.floor(Math.random() * angles.length)]
  return `Generate ${BATCH_SIZE} specific, investable business ideas for 2025-2026 India.
Angle for this batch: ${angle}
Derive ONE fresh, sharper idea from each vertical below (in order):
${seeds.map((s, i) => `${i + 1}. ${s}`).join('\n')}
Rules:
- More specific than the seed. Add a sharper niche, geography, customer segment, or delivery mechanism.
- 5-10 words. Sounds like a YC batch title or Sequoia India thesis bullet.
- Do NOT repeat the seed word-for-word. Every idea must feel distinct.
- No two chips should sound similar to each other.
Return ONLY a JSON array of exactly ${BATCH_SIZE} strings. No other text.
["idea1","idea2",...]`
}

function buildWarroomPrompt() {
  const combos = pickRandom(WARROOM_COMBOS, Math.min(BATCH_SIZE, WARROOM_COMBOS.length))
  const styles = [
    'Write like a general issuing battle orders.',
    'Write like a street-smart operator who has seen every mistake.',
    'Write like a VC partner giving a founder one brutal piece of advice.',
    'Write like a chess player calling the move that wins in 3 steps.',
  ]
  const style = styles[Math.floor(Math.random() * styles.length)]
  return `You are a ruthless business strategist. ${style}
Write ${combos.length} war-mode domination orders — one per industry + weapon combo below:
${combos.map((c, i) => `${i + 1}. Industry: ${c.industry} | Weapon: ${c.weapon}`).join('\n')}
Rules:
- 6-12 words each. Punchy, urgent, specific. No filler.
- Each must feel like a different war in a different market.
- Vary the sentence structure — not every chip should start the same way.
Return ONLY a JSON array of exactly ${combos.length} strings. No other text.
["idea1","idea2",...]`
}

function buildRoadmapPrompt() {
  const seeds = pickRandom(ROADMAP_SEEDS, Math.min(BATCH_SIZE, ROADMAP_SEEDS.length))
  const openers = [
    'Vary the opening — some start with a time constraint, some with the obstacle, some with the end goal.',
    'Some chips should start with "As a...", some with a verb, some with the timeline.',
    'Write some as challenges ("I only have X months and..."), some as declarations ("Going from X to Y by...").',
  ]
  const opener = openers[Math.floor(Math.random() * openers.length)]
  return `Generate exactly ${seeds.length} ready-to-use roadmap goal prompts — one derived from each seed below.
For each seed, write ONE natural-language goal statement a user would type into a roadmap tool.
Seeds (goal | who | timeline):
${seeds.map((s, i) => `${i + 1}. Goal: ${s.goal} | Who: ${s.who} | Timeline: ${s.timeline}`).join('\n')}
Rules:
- Write it as the user would speak it — first person, with their context baked in.
- 15-35 words each. Specific enough to generate a real roadmap.
- ${opener}
- Do NOT start every chip with "I want to". That's boring.
Return ONLY a JSON array of exactly ${seeds.length} strings. No other text.
["prompt1","prompt2",...]`
}

function buildMarketTestPrompt() {
  const seeds = pickRandom(MARKET_TEST_SEEDS, BATCH_SIZE)
  const angles = [
    'Focus on ideas where the founder is unsure if India is ready for it yet.',
    'Focus on ideas that sound obvious but might be harder than they look.',
    'Focus on ideas where timing is everything — too early or too late is fatal.',
    'Focus on ideas targeting underserved segments most founders overlook.',
    'Focus on ideas that are working abroad but untested in India.',
  ]
  const angle = angles[Math.floor(Math.random() * angles.length)]
  return `You are helping founders validate business ideas before spending money.
Generate exactly ${BATCH_SIZE} market validation prompts — one per seed below.
Each prompt is what a founder would type when they want to know: "Is there real demand for this in India right now?"
Angle: ${angle}

Seeds (idea | location | target customer):
${seeds.map((s, i) => `${i + 1}. ${s.idea} | ${s.location} | ${s.segment}`).join('\n')}

Rules:
- Write in first person as the founder — bake in location and target customer naturally.
- 12-28 words each. Specific and grounded — not generic market research questions.
- Vary structure: some start with the idea, some with the customer, some with the location, some with a doubt.
- Do NOT use "Is there a market for" — that is too generic. Be specific about who, where, and what problem.
- Do NOT add numbering, bullets, or labels. Return ONLY the JSON array.

Return ONLY a valid JSON array of exactly ${BATCH_SIZE} strings. No markdown, no explanation, no other text.
["prompt1","prompt2",...]`
}

async function callGemini(apiKey, prompt) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.4, maxOutputTokens: 1024, responseMimeType: 'application/json' },
          safetySettings: SAFETY,
        }),
      },
    )
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty Gemini response')
    const parsed = JSON.parse(strip(text))
    if (!Array.isArray(parsed) || !parsed.length) throw new Error('Invalid response shape')
    console.log(`[gic v20] Flash Lite OK: ${parsed.length} chips`)
    return parsed.slice(0, BATCH_SIZE).map(String)
  } finally {
    clearTimeout(timer)
  }
}

async function generateChips(apiKey, context) {
  const prompt =
    context === 'sourcing'    ? buildSourcingPrompt()
    : context === 'research'  ? buildResearchPrompt()
    : context === 'warroom'   ? buildWarroomPrompt()
    : context === 'market_test' ? buildMarketTestPrompt()
    : buildRoadmapPrompt()
  return callGemini(apiKey, prompt)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const GEMINI_API_KEY       = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const SUPABASE_ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')

  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY)
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: ae } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (ae || !user)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const body    = await req.json().catch(() => ({}))
    const context = String(body.context ?? 'sourcing').toLowerCase()
    const mode    = String(body.mode    ?? 'fetch').toLowerCase()

    if (!['sourcing', 'warroom', 'research', 'roadmap', 'market_test'].includes(context))
      return new Response(JSON.stringify({ error: 'Invalid context' }), { status: 400, headers: corsHeaders })

    if (mode === 'fetch') {
      const { count: poolCount } = await db
        .from('idea_chips_pool')
        .select('id', { count: 'exact', head: true })
        .eq('context', context)

      if (!poolCount || poolCount === 0) {
        console.log(`[gic v20] pool empty for ${context}, generating`)
        const allChips = await generateChips(GEMINI_API_KEY, context)
        const toReturn = allChips.slice(0, RETURN_SIZE)
        db.from('idea_chips_pool')
          .insert(allChips.map(chip => ({ context, chip })))
          .then(() => console.log(`[gic v20] pool seeded: ${allChips.length} chips for ${context}`))
          .catch(e => console.error('[gic v20] pool write failed:', e))
        return new Response(
          JSON.stringify({ chips: toReturn, context, count: toReturn.length, source: 'generated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const { data: rows, error: fetchErr } = await db.rpc('get_idea_chips', {
        p_context: context,
        p_count: RETURN_SIZE,
      })

      if (fetchErr || !rows?.length) {
        console.error('[gic v20] pool fetch failed:', fetchErr)
        return new Response(JSON.stringify({ error: 'Pool fetch failed' }), { status: 500, headers: corsHeaders })
      }

      const chips = rows.map((r) => r.chip)

      if (poolCount <= MIN_POOL_SIZE) {
        console.log(`[gic v20] pool low (${poolCount}) for ${context}, triggering top-up`)
        ;(async () => {
          try {
            const newChips = await generateChips(GEMINI_API_KEY, context)
            await db.from('idea_chips_pool').insert(newChips.map(chip => ({ context, chip })))
            const { data: allIds } = await db
              .from('idea_chips_pool').select('id').eq('context', context)
              .order('created_at', { ascending: true })
            if (allIds && allIds.length > MAX_POOL_SIZE) {
              const toDelete = allIds.slice(0, allIds.length - MAX_POOL_SIZE).map((r) => r.id)
              await db.from('idea_chips_pool').delete().in('id', toDelete)
            }
            console.log(`[gic v20] top-up done: +${newChips.length} for ${context}`)
          } catch (e) { console.error(`[gic v20] top-up failed:`, e) }
        })()
      }

      return new Response(
        JSON.stringify({ chips, context, count: chips.length, pool_size: poolCount, source: 'pool' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // mode: generate
    try {
      const { data: rl } = await db.rpc('check_and_increment_rate_limit', {
        p_user_id: user.id, p_function_name: 'generate-idea-chips',
        p_calls_per_hour: 60, p_calls_per_day: 300,
      })
      if (rl && !rl.allowed) {
        return new Response(JSON.stringify({
          error: rl.reason === 'hourly_limit_exceeded'
            ? `Hourly limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`
            : `Daily limit of ${rl.limit} reached. Resets at ${rl.resets_at}.`,
          code: rl.reason, resets_at: rl.resets_at,
        }), { status: 429, headers: corsHeaders })
      }
    } catch (e) { console.error('[gic v20] rate limit error:', e) }

    const allChips = await generateChips(GEMINI_API_KEY, context)
    const toReturn = allChips.slice(0, RETURN_SIZE)

    const { error: insertErr } = await db
      .from('idea_chips_pool')
      .insert(allChips.map(chip => ({ context, chip })))
    if (insertErr) console.error('[gic v20] pool insert failed:', insertErr)

    const { data: allIds } = await db
      .from('idea_chips_pool').select('id').eq('context', context)
      .order('created_at', { ascending: true })
    if (allIds && allIds.length > MAX_POOL_SIZE) {
      const toDelete = allIds.slice(0, allIds.length - MAX_POOL_SIZE).map((r) => r.id)
      await db.from('idea_chips_pool').delete().in('id', toDelete)
    }

    return new Response(
      JSON.stringify({ chips: toReturn, context, count: toReturn.length, source: 'generated' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    console.error('[gic v20]:', String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

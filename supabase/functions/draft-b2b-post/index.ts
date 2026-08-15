// draft-b2b-post v2 — rate limited: 20/hour, 100/day
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  } catch (e) { console.error(`[${fn}] rate limit error:`, e) }
  return null
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

    const limited = await checkRateLimit(supabase, user.id, 'draft-b2b-post', 20, 100)
    if (limited) return limited

    const body = await req.json()
    const { title, post_type = 'buy', listing_kind = 'deal', category = '' } = body
    if (!title?.trim()) return new Response(JSON.stringify({ error: 'title is required' }), { status: 400, headers: corsHeaders })

    const prompt = [
      'You are a B2B trade post assistant. Draft a concise, professional post based on the title below.',
      `Title: ${title.trim()}`,
      `Post type: ${post_type} (buy = looking to purchase, sell = offering to sell, partner = seeking business collaboration)`,
      `Listing kind: ${listing_kind} (deal = bulk/wholesale deal, service_offer = offering a service, request_quote = asking for quotes, collab = partnership/JV)`,
      category ? `Category hint: ${category}` : '',
      'Return ONLY a valid JSON object with these exact keys — no markdown, no explanation:',
      '{"description":"2-3 sentence professional description. Max 200 chars.","price_unit":"most likely unit","suggested_category":"most fitting category from: Food & Beverage, Raw Materials, Textiles & Apparel, Electronics, Machinery, Chemicals, Construction, Packaging, Logistics, Agriculture, Healthcare, Services, Retail, Technology, Other","keywords":["3 to 5 keywords"]}',
    ].filter(Boolean).join('\n')

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512, responseMimeType: 'application/json' },
        safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }, { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }],
      }),
    })
    if (!res.ok) return new Response(JSON.stringify({ error: 'AI generation failed' }), { status: 502, headers: corsHeaders })
    const geminiData = await res.json()
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!raw) return new Response(JSON.stringify({ error: 'Empty AI response' }), { status: 502, headers: corsHeaders })
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(raw.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()) }
    catch { return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 502, headers: corsHeaders }) }
    return new Response(JSON.stringify({
      description: String(parsed.description ?? '').trim(),
      price_unit: String(parsed.price_unit ?? 'piece').trim(),
      suggested_category: String(parsed.suggested_category ?? '').trim(),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[draft-b2b-post]:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

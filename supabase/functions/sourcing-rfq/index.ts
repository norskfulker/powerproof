// sourcing-rfq v2
// SUBSCRIPTION MIGRATION: deduct_credits_custom replaced with deduct_feature_usage, bucket='sourcing'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function gemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const d = await res.json()
  return d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
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

    const body = await req.json()
    const {
      title, supplier_name, source, location,
      price_min, price_max, moq, keyword,
      buyer_name, buyer_company, buyer_country,
      quantity_needed, target_price, additional_notes,
    } = body

    if (!title || !source) return new Response(JSON.stringify({ error: 'title and source required' }), { status: 400, headers: corsHeaders })

    const { data: usageResult, error: usageErr } = await supabase.rpc('deduct_feature_usage', {
      p_user_id: user.id,
      p_bucket: 'sourcing',
      p_amount: 1,
    })
    if (usageErr) {
      return new Response(JSON.stringify({ error: 'Usage error', detail: usageErr.message }), { status: 500, headers: corsHeaders })
    }
    if (!usageResult?.success) {
      const reason = usageResult?.error
      if (reason === 'no_active_subscription')
        return new Response(JSON.stringify({ error: 'No active subscription found.', code: reason }), { status: 402, headers: corsHeaders })
      if (reason === 'feature_locked')
        return new Response(JSON.stringify({ error: 'This feature is not available on your plan.', code: reason }), { status: 402, headers: corsHeaders })
      return new Response(
        JSON.stringify({ error: `Monthly sourcing limit reached. Used ${usageResult?.used ?? 0}/${usageResult?.allowance ?? 0}.`, code: reason, used: usageResult?.used ?? 0, allowance: usageResult?.allowance ?? 0 }),
        { status: 402, headers: corsHeaders },
      )
    }

    const sourceLabel = source === 'indiamart' ? 'IndiaMart' : source === 'alibaba' ? 'Alibaba' : 'Made in China'
    const priceStr = price_min != null ? `USD $${price_min}${price_max && price_max !== price_min ? ` – $${price_max}` : ''} per unit` : 'as listed'

    const prompt = `You are an expert B2B trade writer. Write a professional Request for Quotation (RFQ) email for a business buyer to send to a supplier found on ${sourceLabel}.

Product: ${keyword ?? title}
Listing: ${title}
Supplier: ${supplier_name || 'Supplier'}
Supplier location: ${location || 'China'}
Listed price: ${priceStr}
Listed MOQ: ${moq || 'not specified'}

Buyer details:
Name: ${buyer_name || '[Your Name]'}
Company: ${buyer_company || '[Your Company]'}
Country: ${buyer_country || 'India'}
Quantity needed: ${quantity_needed || '[quantity]'} units
Target price: ${target_price ? `USD $${target_price} per unit` : 'open to negotiation'}
${additional_notes ? `Additional context: ${additional_notes}` : ''}

Write a professional RFQ email that:
1. Introduces the buyer credibly (don't sound desperate or amateurish)
2. States the specific product requirements clearly
3. Asks for: unit price at their quantity, MOQ flexibility, sample availability + cost, lead time, payment terms accepted, certifications available
4. Mentions target price naturally without sounding cheap
5. Ends with a clear next step

Tone: Professional, direct, like an experienced importer. Not overly formal. Not sycophantic.
Length: 150-200 words. No unnecessary padding.
Do NOT include a subject line — just the email body starting from the greeting.`

    const rfq = await gemini(GEMINI_API_KEY, prompt)

    return new Response(
      JSON.stringify({ rfq }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[sourcing-rfq]:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

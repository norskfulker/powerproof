// sourcing-ai-brief v1
// Free — generates AI sourcing brief for a supplier card
// No credits charged. Cached in sourced_suppliers.ai_brief if card is saved.
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
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

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY).auth.getUser(token)
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const body = await req.json()
    const { title, supplier_name, source, location, price_min, price_max, moq, certifications, keyword, is_verified } = body

    if (!title || !source) return new Response(JSON.stringify({ error: 'title and source required' }), { status: 400, headers: corsHeaders })

    const sourceLabel = source === 'indiamart' ? 'IndiaMart (India)' : source === 'alibaba' ? 'Alibaba (China)' : 'Made in China'
    const priceStr = price_min != null ? `$${price_min}${price_max && price_max !== price_min ? ` – $${price_max}` : ''}` : 'not listed'
    const certsStr = Array.isArray(certifications) && certifications.length > 0 ? certifications.join(', ') : 'none listed'

    const prompt = `You are an expert B2B sourcing advisor helping an Indian MSME entrepreneur evaluate a supplier listing.

Product being sourced: "${keyword ?? title}"
Listing title: ${title}
Supplier: ${supplier_name || 'Unknown'}
Source platform: ${sourceLabel}
Location: ${location || 'Not specified'}
Price: ${priceStr}
MOQ: ${moq || 'Not specified'}
Verified supplier: ${is_verified ? 'Yes' : 'No'}
Certifications: ${certsStr}

Generate a practical sourcing brief with these exact sections:

## What to Verify
3-4 specific things to confirm before contacting this supplier (certifications to request, quality checks, factory audit, sample policy). Be specific to this product category.

## Red Flags to Watch
3 common fraud or quality issues specific to this product type and source country. Practical and actionable.

## Negotiation Levers
3 specific things that typically move on price or terms for this product category (MOQ flexibility, payment terms, lead time, exclusivity, branding fees).

## Realistic Lead Time
What lead time to actually expect for this product from this region (not what's advertised). Include sample lead time and bulk order lead time separately.

## One Smart Question to Ask First
The single most revealing question to ask this supplier that will instantly tell you if they're worth pursuing.

Keep each section concise — 2-4 sentences max per point. No fluff. Write for a smart first-time importer.`

    const brief = await gemini(GEMINI_API_KEY, prompt)

    return new Response(
      JSON.stringify({ brief }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[sourcing-ai-brief]:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

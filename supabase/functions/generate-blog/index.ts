// generate-blog v1
// Generates SEO-optimised blog posts for PowerProof using Gemini.
// verify_jwt: false — called server-side with service key in Authorization header.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_TIMEOUT_MS = 120_000

function strip(r: string): string {
  return r.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function gemini(apiKey: string, prompt: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(attempt === 1 ? 5000 : 15000)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 65536,
              responseMimeType: 'application/json'
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        }
      )
      clearTimeout(timeout)
      if (res.status === 503 || res.status === 429) continue
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
      const d = await res.json()
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (!text) throw new Error('Empty Gemini response')
      return text
    } catch (e) {
      clearTimeout(timeout)
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('AbortError') || msg.includes('aborted')) throw new Error('TIMEOUT')
      if (attempt === 2) throw e
    }
  }
  throw new Error('Gemini failed after 3 attempts')
}

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 80)
}

function estimateReadingTime(content: string): number {
  return Math.max(1, Math.round(content.split(/\s+/).length / 200))
}

function blogPrompt(topic: string, cluster: string, linkedOpportunityContext: string): string {
  const clusterGuide: Record<string, string> = {
    'how-to': 'Step-by-step setup guide with real costs, timelines, licenses. High-intent, actionable.',
    'franchise': 'Deep-dive into a specific franchise: investment, margins, real vs advertised returns, who should do it.',
    'market': 'Market sizing, demand data, growth numbers, key players, opportunity white space.',
    'city-guide': 'City-specific business guide: best areas, permits, demand, what works in this city.',
    'trends': 'Trend analysis: why NOW, market signals, who is winning, entry opportunity.'
  }
  return `You are PowerProof Research Desk — India\'s sharpest MSME business intelligence writer.
Your job: write a dense, specific, number-rich, SEO-optimised blog post for aspiring entrepreneurs and small business owners in India.

Topic: "${topic}"
Cluster: ${cluster} — ${clusterGuide[cluster] ?? 'General business intelligence'}
${linkedOpportunityContext}

========== RULES ==========
1. Write 1500-2000 words minimum. Dense, specific, NO fluff.
2. Use REAL numbers: costs in ₹, margins in %, timelines in weeks/months. No vague ranges.
3. Primary keyword must appear in: H1, first 100 words, at least 2 subheadings, and naturally throughout.
4. Structure: H1 → intro (hook + what you\'ll learn) → 4-6 H2 sections → summary → CTA.
5. Every H2 must have ≥2 specific facts/numbers.
6. FAQs: 5 questions people actually search for. Answers 2-3 sentences each, number-dense.
7. Tags: 5-8 short keyword tags.
8. Target keywords: primary + 3-4 secondary LSI keywords.
9. Content must be original research-quality — not generic advice anyone can Google.
10. Excerpt: 150 chars max, compelling, includes primary keyword.
11. SEO title: 55-60 chars, primary keyword first.
12. SEO description: 140-155 chars, includes keyword + benefit + mild CTA.
13. Reading level: confident, direct, slightly conversational. No corporate-speak.
14. DO NOT mention PowerProof in the body text — this is editorial content, not marketing.

Return ONLY valid JSON:
{
  "title": "exact H1 title",
  "seo_title": "55-60 char SEO title",
  "seo_description": "140-155 char meta description",
  "excerpt": "under 150 chars",
  "content": "full markdown blog post — use ## for H2, ### for H3, **bold** for key terms, bullet lists where appropriate. 1500+ words.",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "target_keywords": ["primary keyword","secondary1","secondary2","secondary3"],
  "reading_time_mins": 0,
  "faqs": [{"q":"question","a":"2-3 sentence number-dense answer"}]
}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500, headers: corsHeaders })
  }

  // Auth: service role only
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (token !== SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    const body = await req.json()
    const { topic, cluster, linked_opportunity_slug, author_name, author_title } = body

    if (!topic || !cluster) {
      return new Response(JSON.stringify({ error: 'topic and cluster are required' }), { status: 400, headers: corsHeaders })
    }

    // Fetch linked opportunity context if provided
    let linkedOpportunityContext = ''
    if (linked_opportunity_slug) {
      const { data: opp } = await supabase
        .from('opportunities')
        .select('title, short_desc, setup_min, setup_max, monthly_rev_min, monthly_rev_max')
        .eq('slug', linked_opportunity_slug)
        .single()
      if (opp) {
        linkedOpportunityContext = `\nLinked opportunity context (reference naturally, don\'t copy verbatim):\n- Business: ${opp.title}\n- Summary: ${opp.short_desc}\n- Setup cost: ₹${((opp.setup_min ?? 0) * 83.5).toLocaleString('en-IN')} – ₹${((opp.setup_max ?? 0) * 83.5).toLocaleString('en-IN')}\n- Monthly revenue: ₹${((opp.monthly_rev_min ?? 0) * 83.5).toLocaleString('en-IN')} – ₹${((opp.monthly_rev_max ?? 0) * 83.5).toLocaleString('en-IN')}`
      }
    }

    const raw = await gemini(GEMINI_API_KEY, blogPrompt(topic, cluster, linkedOpportunityContext))
    const parsed = JSON.parse(strip(raw))

    const slug = slugify(parsed.title ?? topic)
    const wordCount = parsed.content?.split(/\s+/).length ?? 0
    const readingTime = parsed.reading_time_mins ?? estimateReadingTime(parsed.content ?? '')
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        status: 'live',
        title: parsed.title,
        seo_title: parsed.seo_title,
        seo_description: parsed.seo_description,
        excerpt: parsed.excerpt,
        content: parsed.content,
        cluster,
        tags: parsed.tags ?? [],
        target_keywords: parsed.target_keywords ?? [],
        linked_opportunity_slug: linked_opportunity_slug ?? null,
        author_name: author_name ?? 'PowerProof Research Desk',
        author_title: author_title ?? 'Business Intelligence',
        reading_time_mins: readingTime,
        word_count: wordCount,
        faqs: parsed.faqs ?? [],
        published_at: now,
        updated_at: now
      })
      .select('id, slug, title')
      .single()

    if (error) {
      // Handle duplicate slug gracefully
      if (error.code === '23505') {
        return new Response(JSON.stringify({ error: 'Duplicate slug', slug }), { status: 409, headers: corsHeaders })
      }
      throw error
    }

    return new Response(
      JSON.stringify({ status: 'ok', id: data.id, slug: data.slug, title: data.title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[generate-blog] error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})

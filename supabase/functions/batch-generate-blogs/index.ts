// batch-generate-blogs v3
// Auth: secret in body JSON
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const BATCH_TRIGGER_SECRET = 'powerproof_batch_2025_b34a01436de5946b'

function strip(r: string): string {
  return r.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function gemini(apiKey: string, prompt: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(attempt === 1 ? 8000 : 20000)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 180000)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 65536, responseMimeType: 'application/json' },
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
      if (res.status === 503 || res.status === 429) { await sleep(10000); continue }
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
      const d = await res.json()
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      if (!text) throw new Error('Empty Gemini response')
      return text
    } catch (e) {
      clearTimeout(timeout)
      if (attempt === 2) throw e
    }
  }
  throw new Error('Gemini failed')
}

function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().slice(0, 80)
}

function estimateReadingTime(content: string): number {
  return Math.max(1, Math.round(content.split(/\s+/).length / 200))
}

function blogPrompt(topic: string, cluster: string, oppContext: string): string {
  const clusterGuide: Record<string, string> = {
    'how-to': 'Step-by-step setup guide. Real ₹ costs, timelines, licenses. Actionable.',
    'franchise': 'Deep-dive: investment, real margins vs advertised, who should do it.',
    'market': 'Market sizing, demand, CAGR, key players. India-specific numbers.',
    'city-guide': 'City guide: top opportunities, permits, real estate costs, demand.',
    'trends': 'Trend: why now, who is winning, market signals, how to enter.'
  }
  return `You are PowerProof Research Desk — India's sharpest MSME intelligence writer.
Write a dense, specific, number-rich, SEO-optimised blog post for aspiring Indian entrepreneurs.

Topic: "${topic}"
Cluster: ${cluster} — ${clusterGuide[cluster] ?? 'Business intelligence'}
${oppContext}

RULES:
- 1600-2200 words. Zero fluff.
- India-specific numbers in ₹. Margins in %. Timelines in weeks/months.
- Primary keyword in H1, first 100 words, 2+ subheadings.
- Structure: H1 → intro → 5-7 H2 sections → summary → CTA.
- Every H2: ≥2 specific data points.
- 5 FAQs people search. 2-4 sentence answers, number-dense.
- 6-8 short keyword tags.
- SEO title: 55-60 chars, primary keyword FIRST.
- SEO description: 140-155 chars, keyword + benefit + soft CTA.
- Confident, direct, slightly conversational tone. No corporate-speak.
- DO NOT mention PowerProof in body.
- Include markdown comparison table if appropriate.
- Reference GST, FSSAI, MSME, MCA where real.

Return ONLY valid JSON (no markdown fences):
{"title":"exact H1","seo_title":"55-60 chars","seo_description":"140-155 chars","excerpt":"<155 chars","content":"full markdown 1600+ words","tags":["t1","t2","t3","t4","t5","t6"],"target_keywords":["primary","s1","s2","s3"],"reading_time_mins":8,"faqs":[{"q":"question","a":"answer"}]}`
}

interface Topic { topic: string; cluster: string; linked?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing env' }), { status: 500, headers: corsHeaders })
  }

  const body = await req.json()

  // Auth: accept service key in Authorization OR secret in body
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const bodySecret = body.secret ?? ''
  if (token !== SUPABASE_SERVICE_KEY && bodySecret !== BATCH_TRIGGER_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: existing } = await supabase.from('blog_posts').select('slug')
  const existingSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug))

  const topics: Topic[] = body.topics ?? []
  if (!topics.length) return new Response(JSON.stringify({ error: 'topics required' }), { status: 400, headers: corsHeaders })

  const results: Array<{topic: string; status: string; slug?: string; error?: string}> = []

  for (const t of topics) {
    console.log(`[batch-blog] generating: ${t.topic.slice(0, 60)}`)
    try {
      let oppContext = ''
      if (t.linked) {
        const { data: opp } = await supabase
          .from('opportunities')
          .select('title, short_desc, setup_min, setup_max, monthly_rev_min, monthly_rev_max, monthly_profit_min, monthly_profit_max')
          .eq('slug', t.linked).single()
        if (opp) {
          oppContext = `\nContext from linked opportunity:\n- ${opp.title}: ${opp.short_desc}\n- Setup: ₹${(opp.setup_min ?? 0).toLocaleString('en-IN')}–₹${(opp.setup_max ?? 0).toLocaleString('en-IN')} | Rev: ₹${(opp.monthly_rev_min ?? 0).toLocaleString('en-IN')}–₹${(opp.monthly_rev_max ?? 0).toLocaleString('en-IN')}/mo | Profit: ₹${(opp.monthly_profit_min ?? 0).toLocaleString('en-IN')}–₹${(opp.monthly_profit_max ?? 0).toLocaleString('en-IN')}/mo`
        }
      }

      const raw = await gemini(GEMINI_API_KEY, blogPrompt(t.topic, t.cluster, oppContext))
      const parsed = JSON.parse(strip(raw))

      let slug = slugify(parsed.title ?? t.topic)
      if (existingSlugs.has(slug)) slug = slug.slice(0, 72) + '-2025'
      if (existingSlugs.has(slug)) slug = slug.slice(0, 70) + '-india'

      const wordCount = parsed.content?.split(/\s+/).length ?? 0
      const readingTime = parsed.reading_time_mins > 0 ? parsed.reading_time_mins : estimateReadingTime(parsed.content ?? '')
      const now = new Date().toISOString()

      const { data, error } = await supabase.from('blog_posts').insert({
        slug, status: 'live',
        title: parsed.title, seo_title: parsed.seo_title, seo_description: parsed.seo_description,
        excerpt: parsed.excerpt, content: parsed.content, cluster: t.cluster,
        tags: parsed.tags ?? [], target_keywords: parsed.target_keywords ?? [],
        linked_opportunity_slug: t.linked ?? null,
        author_name: 'PowerProof Research Desk', author_title: 'Business Intelligence',
        reading_time_mins: readingTime, word_count: wordCount,
        faqs: parsed.faqs ?? [], published_at: now, updated_at: now
      }).select('id, slug, title').single()

      if (error) {
        results.push({ topic: t.topic, status: 'error', error: error.message })
      } else {
        existingSlugs.add(slug)
        results.push({ topic: t.topic, status: 'ok', slug: data.slug })
        console.log(`[batch-blog] ✅ ${data.slug} (${wordCount}w)`)
      }
      await sleep(2500)
    } catch (err) {
      console.error(`[batch-blog] ❌`, err)
      results.push({ topic: t.topic, status: 'error', error: String(err) })
    }
  }

  const ok = results.filter(r => r.status === 'ok').length
  const failed = results.filter(r => r.status !== 'ok').length
  return new Response(JSON.stringify({ summary: { ok, failed, total: results.length }, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})

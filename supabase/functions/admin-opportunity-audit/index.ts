// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, json } from '../_shared/http.ts'
import { parseAuthenticatedJwtUser } from '../_shared/auth.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { generateGeminiText, toGeminiContents } from '../_shared/gemini.ts'

// Workspace TS config doesn't include Deno libs; runtime does.
declare const Deno: {
  env: { get: (key: string) => string | undefined }
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
}

type ReqBody = {
  opportunity: Record<string, unknown>
}

function requireString(v: unknown): string {
  return typeof v === 'string' ? v : String(v ?? '')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authed = parseAuthenticatedJwtUser(req.headers.get('Authorization'))
  if (!authed?.id) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const apiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
  if (!supabaseUrl || !serviceKey || !apiKey) return json({ error: 'Server misconfigured' }, 500)

  // Admin gate via profiles
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)
  const { data: prof } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', authed.id)
    .maybeSingle()
  const role = requireString(prof?.role).toLowerCase()
  if (!['admin', 'super_admin', 'super-admin'].includes(role)) {
    return json({ error: 'Forbidden' }, 403)
  }

  let body: ReqBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const opp = body?.opportunity
  if (!opp || typeof opp !== 'object') return json({ error: 'Missing opportunity' }, 400)

  const system = `You output a single JSON object only. No markdown fences, no commentary.

You are an admin editor copilot. You MUST return a fully fixed and fine-tuned payload for an "opportunity" record.
This is not a "teller audit" — you produce:
1) A complete fixed JSON object (can be partial, but aim to fill missing/weak fields).
2) SQL UPDATE statements that apply those fixes to public.opportunities by id.

Schema:
- fixed_json: object (the improved opportunity payload; include id if present in input)
- sql: { statement: string, notes?: string|null }[]
- notes: string[] (short bullets describing what you improved)

Rules:
- Do not fabricate exact market stats (TAM/CAGR/etc.) unless input already has them; you may rewrite qualitative trends.
- You MAY improve writing quality (tagline, short_desc, full_desc) and add missing structure.
- For JSONB fields, keep valid JSON structures.
- Prefer additive fixes. Do not delete fields. Do not change "slug" unless it is missing or obviously invalid.
- SQL must be valid Postgres, using single quotes. JSONB values must be cast with ::jsonb.
- If opportunity.id is missing, sql must be empty and notes must include that it cannot generate SQL without id.`

  const user = `Opportunity JSON:\n${JSON.stringify(opp).slice(0, 60000)}`

  const out = await generateGeminiText({
    apiKey,
    system,
    contents: toGeminiContents([{ role: 'user', content: user }]),
    maxOutputTokens: 1800,
    model: (Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-2.5-flash-lite').replace(/^models\//, ''),
    modelFallbacks: (Deno.env.get('GEMINI_MODEL_FALLBACKS') ?? '')
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  })

  if (!out.ok) return json({ error: out.error ?? 'Gemini error' }, out.status ?? 502)

  let parsed: any = null
  try {
    const raw = String(out.text || '')
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim()

    // Gemini sometimes returns extra tokens before/after JSON.
    // Try full parse, then fall back to extracting the first JSON object.
    try {
      parsed = JSON.parse(raw)
    } catch {
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start >= 0 && end > start) {
        parsed = JSON.parse(raw.slice(start, end + 1))
      } else {
        throw new Error('no_json_object_found')
      }
    }
  } catch {
    return json(
      {
        error: 'Failed to parse AI JSON',
        // helpful for debugging prompt/model issues (trim to avoid huge payloads)
        debug_text: String(out.text || '').slice(0, 2000),
      },
      502,
    )
  }

  return json({ success: true, ...parsed }, 200)
})


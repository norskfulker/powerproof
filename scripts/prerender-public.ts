// scripts/prerender-public.ts
// Generates static HTML snapshots from Supabase data — no Puppeteer, no Chrome needed.

import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import {
  PRERENDER_PAGE_SEO_ENTRIES,
  type PageSeoEntry,
} from '../src/lib/seo/pageSeoConfig'

const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL || 'https://hoqdmbsimyizfbwyoqru.supabase.co'
).replace(/\/$/, '')

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWRtYnNpbXlpemZid3lvcXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTMxMDUsImV4cCI6MjA4ODk2OTEwNX0.kiN0v_MOn-fp4ACQALWrVsQjzlcYtgzflqSBDycPrJc'

const DIST_DIR = path.resolve('dist')
const BASE_URL = 'https://powerproof.live'
const MAX_ROUTES = process.env.PRERENDER_MAX_ROUTES
  ? parseInt(process.env.PRERENDER_MAX_ROUTES)
  : Infinity

const EXCLUDED_OPPORTUNITY_SLUGS = new Set(['ancggh'])

if (process.env.SKIP_PRERENDER === '1') {
  console.log('[prerender] Skipped (SKIP_PRERENDER=1)')
  process.exit(0)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Read the Vite-built index.html as the shell
const indexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8')

function injectHead(html: string, tags: string): string {
  return html.replace('</head>', `${tags}\n</head>`)
}

function injectBody(html: string, content: string): string {
  return html.replace(
    '<div id="root"></div>',
    `<div id="root">${content}</div>`,
  )
}

function escapeHtml(str: string): string {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function parseJsonField(raw: unknown): unknown {
  if (raw == null) return null
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

type ResearchCompetitorsShape = {
  king_of_market?: {
    name?: string
    why_they_win?: string
    their_weakness?: string
    your_exploit?: string
  }
  direct?: Array<{
    name?: string
    strength?: string
    weakness?: string
    pricing?: string
  }>
  indirect?: Array<{
    name?: string
    threat_level?: string
    reason?: string
  }>
  your_advantages?: string[]
  what_to_do?: string[]
}

function parseCompetitors(raw: unknown): ResearchCompetitorsShape | null {
  const parsed = parseJsonField(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  return parsed as ResearchCompetitorsShape
}

function buildCompetitorsSection(raw: unknown): string {
  const data = parseCompetitors(raw)
  if (!data) return ''

  const lines: string[] = ['<h2>Competitive landscape</h2>']

  const king = data.king_of_market
  if (king?.name) {
    lines.push(`<h3>Market leader: ${escapeHtml(king.name)}</h3>`)
    if (king.why_they_win) {
      lines.push(`<p>${escapeHtml(king.why_they_win)}</p>`)
    }
    if (king.their_weakness) {
      lines.push(`<p>Weakness: ${escapeHtml(king.their_weakness)}</p>`)
    }
    if (king.your_exploit) {
      lines.push(`<p>How to win: ${escapeHtml(king.your_exploit)}</p>`)
    }
  }

  const direct = safeArray(data.direct)
  if (direct.length > 0) {
    lines.push('<h3>Direct competitors</h3><ul>')
    for (const competitor of direct) {
      const name = escapeHtml(String(competitor.name ?? 'Competitor'))
      const detail = [competitor.strength, competitor.weakness, competitor.pricing]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join(' — ')
      lines.push(
        `<li><strong>${name}</strong>${detail ? `: ${escapeHtml(detail)}` : ''}</li>`,
      )
    }
    lines.push('</ul>')
  }

  const indirect = safeArray(data.indirect)
  if (indirect.length > 0) {
    lines.push('<h3>Indirect threats</h3><ul>')
    for (const threat of indirect) {
      const name = escapeHtml(String(threat.name ?? 'Alternative'))
      const reason = String(threat.reason ?? '').trim()
      const level = String(threat.threat_level ?? '').trim()
      const detail = [level ? `${level} threat` : '', reason].filter(Boolean).join(': ')
      lines.push(`<li><strong>${name}</strong>${detail ? `: ${escapeHtml(detail)}` : ''}</li>`)
    }
    lines.push('</ul>')
  }

  const advantages = safeArray<string>(data.your_advantages).map(String).filter(Boolean)
  if (advantages.length > 0) {
    lines.push('<h3>Your advantages</h3><ul>')
    for (const advantage of advantages) {
      lines.push(`<li>${escapeHtml(advantage)}</li>`)
    }
    lines.push('</ul>')
  }

  const actions = safeArray<string>(data.what_to_do).map(String).filter(Boolean)
  if (actions.length > 0) {
    lines.push('<h3>What to do</h3><ul>')
    for (const action of actions) {
      lines.push(`<li>${escapeHtml(action)}</li>`)
    }
    lines.push('</ul>')
  }

  return lines.length > 1 ? lines.join('\n') : ''
}

function writeHtml(routePath: string, html: string) {
  const filePath =
    routePath === '/'
      ? path.join(DIST_DIR, 'index.html')
      : path.join(DIST_DIR, routePath.replace(/^\//, ''), 'index.html')
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, html, 'utf-8')
}

function buildOpportunityBody(opp: Record<string, unknown>): string {
  const lines: string[] = []

  lines.push(`<h1>${escapeHtml(String(opp.title ?? ''))}</h1>`)
  if (opp.tagline) {
    lines.push(`<p><strong>${escapeHtml(String(opp.tagline))}</strong></p>`)
  }

  if (opp.full_desc) {
    lines.push(`<p>${escapeHtml(String(opp.full_desc))}</p>`)
  }

  const setupMin = opp.setup_min
    ? `₹${Number(opp.setup_min).toLocaleString('en-IN')}`
    : '?'
  const setupMax = opp.setup_max
    ? `₹${Number(opp.setup_max).toLocaleString('en-IN')}`
    : '?'
  const profitMin = opp.monthly_profit_min
    ? `₹${Number(opp.monthly_profit_min).toLocaleString('en-IN')}`
    : '?'
  const profitMax = opp.monthly_profit_max
    ? `₹${Number(opp.monthly_profit_max).toLocaleString('en-IN')}`
    : '?'
  lines.push(
    `<p>Setup cost: ${setupMin}–${setupMax} | Monthly profit: ${profitMin}–${profitMax}/month</p>`,
  )

  if (opp.score) {
    lines.push(
      `<p>PowerProof Opportunity Score: ${opp.score}/100 | Ease of entry: ${opp.ease ?? 'Moderate'}</p>`,
    )
  }

  if (opp.country) {
    lines.push(`<p>Market: ${escapeHtml(String(opp.country))}</p>`)
  }

  if (Array.isArray(opp.pros) && opp.pros.length > 0) {
    lines.push('<h2>Why this business works</h2><ul>')
    for (const pro of safeArray(opp.pros)) {
      lines.push(`<li>${escapeHtml(String(pro))}</li>`)
    }
    lines.push('</ul>')
  }

  if (Array.isArray(opp.cons) && opp.cons.length > 0) {
    lines.push('<h2>Challenges to consider</h2><ul>')
    for (const con of safeArray(opp.cons)) {
      lines.push(`<li>${escapeHtml(String(con))}</li>`)
    }
    lines.push('</ul>')
  }

  const competitorsSection = buildCompetitorsSection(opp.competitors)
  if (competitorsSection) lines.push(competitorsSection)

  if (Array.isArray(opp.faqs) && opp.faqs.length > 0) {
    lines.push('<h2>Frequently Asked Questions</h2>')
    for (const faq of opp.faqs) {
      const item = faq as { q?: string; a?: string; question?: string; answer?: string }
      const q = item.q ?? item.question
      const a = item.a ?? item.answer
      if (q) lines.push(`<h3>${escapeHtml(String(q))}</h3>`)
      if (a) lines.push(`<p>${escapeHtml(String(a))}</p>`)
    }
  }

  if (Array.isArray(opp.tags) && opp.tags.length > 0) {
    lines.push(
      `<p>Related: ${safeArray(opp.tags).map((t) => escapeHtml(String(t))).join(', ')}</p>`,
    )
  }

  return lines.join('\n')
}

function buildOpportunityHtml(opp: Record<string, unknown>): string {
  const title =
    (typeof opp.seo_title === 'string' && opp.seo_title.trim()) ||
    `${opp.title} — Setup Cost, Profit & Business Plan | PowerProof`
  const description =
    (typeof opp.seo_description === 'string' && opp.seo_description.trim()) ||
    `${opp.tagline ?? ''}. Setup cost: ₹${opp.setup_min ?? '?'}–₹${opp.setup_max ?? '?'}. Monthly profit: ₹${opp.monthly_profit_min ?? '?'}–₹${opp.monthly_profit_max ?? '?'}. Full business plan on PowerProof.`
  const slug = String(opp.slug ?? '')
  const canonical = `${BASE_URL}/o/${slug}`

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opp.title,
    description: opp.tagline ?? description,
    url: canonical,
    dateModified: opp.updated_at ?? opp.published_at,
    publisher: {
      '@type': 'Organization',
      name: 'PowerProof',
      url: BASE_URL,
    },
  })

  const headTags = `
  <title>${escapeHtml(String(title))}</title>
  <meta name="description" content="${escapeHtml(String(description))}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(String(title))}" />
  <meta property="og:description" content="${escapeHtml(String(description))}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="article" />
  <script type="application/ld+json">${jsonLd}</script>`

  let html = injectHead(indexHtml, headTags)
  html = injectBody(html, buildOpportunityBody(opp))
  return html
}

function buildBlogHtml(post: Record<string, unknown>): string {
  const title = `${post.title} | PowerProof Blog`
  const description =
    (typeof post.seo_description === 'string' && post.seo_description.trim()) ||
    (typeof post.excerpt === 'string' && post.excerpt.trim()) ||
    String(post.title ?? '')
  const slug = String(post.slug ?? '')
  const canonical = `${BASE_URL}/blog/${slug}`

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description,
    url: canonical,
    datePublished: post.published_at,
    publisher: {
      '@type': 'Organization',
      name: 'PowerProof',
      url: BASE_URL,
    },
  })

  const headTags = `
  <title>${escapeHtml(String(title))}</title>
  <meta name="description" content="${escapeHtml(String(description))}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(String(title))}" />
  <meta property="og:description" content="${escapeHtml(String(description))}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:type" content="article" />
  <script type="application/ld+json">${jsonLd}</script>`

  const bodyContent = `
    <h1>${escapeHtml(String(post.title ?? ''))}</h1>
    <p>${escapeHtml(String(description))}</p>
    ${post.excerpt ? `<p>${escapeHtml(String(post.excerpt))}</p>` : ''}
  `

  let html = injectHead(indexHtml, headTags)
  html = injectBody(html, bodyContent)
  return html
}


function buildStaticHtml(entry: PageSeoEntry, bodyHtml?: string): string {
  const canonical = `${BASE_URL}${entry.canonicalPath}`
  const ogTitle = entry.ogTitle ?? entry.title
  const ogDescription = entry.ogDescription ?? entry.description

  const headTags = `
  <title>${escapeHtml(entry.title)}</title>
  <meta name="description" content="${escapeHtml(entry.description)}" />
  ${entry.keywords ? `<meta name="keywords" content="${escapeHtml(entry.keywords)}" />` : ''}
  ${entry.noIndex ? '<meta name="robots" content="noindex, nofollow" />' : ''}
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:url" content="${canonical}" />`

  let html = injectHead(indexHtml, headTags)
  if (bodyHtml) {
    html = injectBody(html, bodyHtml)
  }
  return html
}

const PRERENDER_BODY_BY_PATH: Partial<Record<string, () => string>> = {}

async function main() {
  console.log('[prerender] Starting direct HTML generation (no Puppeteer)')

  for (const entry of PRERENDER_PAGE_SEO_ENTRIES) {
    const bodyBuilder = PRERENDER_BODY_BY_PATH[entry.path]
    const html = buildStaticHtml(entry, bodyBuilder?.())
    writeHtml(entry.path, html)
  }
  console.log(`[prerender] ${PRERENDER_PAGE_SEO_ENTRIES.length} static routes done`)

  const { data: opportunities, error: oppErr } = await supabase
    .from('user_opportunities')
    .select('*')
    .eq('visibility', 'catalog')
    .eq('status', 'published')
    .eq('research_status', 'complete')
    .order('slug')
    .limit(MAX_ROUTES)

  if (oppErr) throw new Error(`Opportunities fetch failed: ${oppErr.message}`)

  let oppCount = 0
  for (const opp of opportunities ?? []) {
    const slug = String(opp.slug ?? '').trim()
    if (!slug || EXCLUDED_OPPORTUNITY_SLUGS.has(slug) || opp.seo_noindex === true) {
      continue
    }
    const html = buildOpportunityHtml(opp)
    writeHtml(`/o/${slug}`, html)
    oppCount++
  }
  console.log(`[prerender] ${oppCount} opportunity pages done`)

  const { data: posts, error: blogErr } = await supabase
    .from('blog_posts')
    .select('slug, title, excerpt, seo_description, published_at')
    .eq('status', 'live')
    .order('slug')

  if (blogErr) throw new Error(`Blog posts fetch failed: ${blogErr.message}`)

  let blogCount = 0
  for (const post of posts ?? []) {
    const slug = String(post.slug ?? '').trim()
    if (!slug) continue
    const html = buildBlogHtml(post)
    writeHtml(`/blog/${slug}`, html)
    blogCount++
  }
  console.log(`[prerender] ${blogCount} blog pages done`)

  // SPA fallback for paths with no static file — enables refresh on /room, /profile, etc.
  const rootIndex = path.join(DIST_DIR, 'index.html')
  const spaFallback = path.join(DIST_DIR, '404.html')
  fs.copyFileSync(rootIndex, spaFallback)
  console.log('[prerender] Wrote dist/404.html SPA fallback')

  console.log(
    `[prerender] Done: ${PRERENDER_PAGE_SEO_ENTRIES.length} static + ${oppCount} opportunities + ${blogCount} blog posts → ${PRERENDER_PAGE_SEO_ENTRIES.length + oppCount + blogCount} routes`,
  )
}

main().catch((err) => {
  console.error('[prerender] Fatal:', err)
  process.exit(1)
})

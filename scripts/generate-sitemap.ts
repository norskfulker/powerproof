import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const BASE_URL = (
  process.env.VITE_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://powerproof.live'
).replace(/\/$/, '')

const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL || 'https://hoqdmbsimyizfbwyoqru.supabase.co'
).replace(/\/$/, '')

const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcWRtYnNpbXlpemZid3lvcXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTMxMDUsImV4cCI6MjA4ODk2OTEwNX0.kiN0v_MOn-fp4ACQALWrVsQjzlcYtgzflqSBDycPrJc'

const STATIC_PATHS = [
  { path: '/blog', priority: '0.7', changefreq: 'weekly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
]

const EXCLUDED_SLUGS = new Set(['ancggh'])
const PAGE_SIZE = 1000

type SitemapUrl = {
  path: string
  priority: string
  changefreq: string
  lastmod?: string
}

function formatLastmod(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

function urlEntry({ path, priority, changefreq, lastmod }: SitemapUrl): string {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
  return `
  <url>
    <loc>${BASE_URL}${path}</loc>${lastmodLine}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

async function fetchOpportunityPreviewUrls(): Promise<SitemapUrl[]> {
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()
  const supabase = createClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY)
  const urls: SitemapUrl[] = []

  let offset = 0
  while (true) {
    const { data, error } = await supabase
      .from('user_opportunities')
      .select('slug, updated_at')
      .eq('visibility', 'catalog')
      .eq('status', 'published')
      .eq('research_status', 'complete')
      .not('slug', 'is', null)
      .order('slug', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.warn(`[sitemap] Could not fetch opportunities: ${error.message}`)
      break
    }

    if (!data?.length) break

    for (const row of data) {
      const slug = String(row.slug ?? '').trim()
      if (!slug || EXCLUDED_SLUGS.has(slug)) continue

      urls.push({
        path: `/o/${encodeURIComponent(slug)}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: formatLastmod(row.updated_at),
      })
    }

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  return urls
}

async function fetchBlogPostUrls(supabase: ReturnType<typeof createClient>): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = []
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, published_at')
    .eq('status', 'live')
    .order('published_at', { ascending: false })

  if (error) {
    console.warn(`[sitemap] Could not fetch blog posts: ${error.message}`)
    return urls
  }

  for (const row of data ?? []) {
    const slug = String(row.slug ?? '').trim()
    if (!slug) continue
    urls.push({
      path: `/blog/${encodeURIComponent(slug)}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: formatLastmod(row.updated_at ?? row.published_at),
    })
  }

  return urls
}

async function generate() {
  const today = new Date().toISOString().slice(0, 10)
  const staticUrls: SitemapUrl[] = STATIC_PATHS.map((p) => ({
    ...p,
    lastmod: today,
  }))
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_KEY?.trim()
  const supabase = createClient(SUPABASE_URL, serviceKey || SUPABASE_ANON_KEY)
  const opportunityUrls = await fetchOpportunityPreviewUrls()
  const blogUrls = await fetchBlogPostUrls(supabase)
  const allUrls = [...staticUrls, ...opportunityUrls, ...blogUrls]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(urlEntry).join('')}
</urlset>
`

  const outPath = join(root, 'public', 'sitemap.xml')
  writeFileSync(outPath, xml, 'utf8')
  console.log(
    `Sitemap written: ${staticUrls.length} static + ${opportunityUrls.length} opportunity previews + ${blogUrls.length} blog posts → ${outPath}`,
  )
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})

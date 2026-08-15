import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, ArrowRight, Calendar, Clock, HelpCircle, Share2, User } from '@/lib/icons'
import { NotFoundState } from '@/components/NotFoundState'
import { AppFloatingPageRoot } from '@/components/layout/AppFloatingShell'
import { FaqAccordionModule } from '@/components/FaqAccordionModule'
import { cardSurface } from '@/lib/cardSurface'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

const blogHeroTitleClass =
  'landing-hero-headline mx-auto inline-block max-w-full text-center font-sans text-[clamp(2.25rem,8.5vw,3.75rem)] font-medium leading-[1.1] tracking-tight text-foreground text-pretty max-[389px]:text-[clamp(2.5rem,10vw,4rem)] max-layout-md:text-[clamp(2.75rem,6.5vw,4.25rem)] layout-md:text-[clamp(2.5rem,4.25vw,4rem)] layout-md:leading-[1.12] text-left'

const blogHeroDescriptionClass =
  'mx-auto mt-2 w-full max-w-lg text-center text-pretty text-[clamp(0.8125rem,1.1vw,0.9375rem)] leading-[1.5] !text-foreground sm:mt-2.5'
import { SeoMetaReadyMarker } from '@/components/seo/SeoMetaReadyMarker'
import './blog.css'

type Post = {
  id: string
  slug: string
  title: string
  seo_title: string
  seo_description: string
  content: string
  excerpt: string
  cluster: string
  tags: string[]
  faqs: { q: string; a: string }[]
  reading_time_mins: number
  word_count: number
  author_name: string
  author_title: string
  linked_opportunity_slug: string | null
  published_at: string
  updated_at: string
}

type RelatedPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  cluster: string
  reading_time_mins: number
  published_at: string
}

const CLUSTER_LABELS: Record<string, string> = {
  'how-to': 'How-To',
  franchise: 'Franchise',
  market: 'Market',
  'city-guide': 'City Guide',
  trends: 'Trends',
}

const CLUSTER_BADGE_CLASS: Record<string, string> = {
  'how-to': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  franchise: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  market: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  'city-guide': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  trends: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

const PAGE_INSET = 'mx-auto w-full max-w-landing px-4 layout-sm:px-6 layout-lg:px-8'

const CLUSTER_ACCENT: Record<string, string> = {
  'how-to': 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  franchise: 'from-amber-500/20 via-amber-500/5 to-transparent',
  market: 'from-rose-500/20 via-rose-500/5 to-transparent',
  'city-guide': 'from-indigo-500/20 via-indigo-500/5 to-transparent',
  trends: 'from-sky-500/20 via-sky-500/5 to-transparent',
}

/* ─── Markdown component overrides ─────────────────────────────────────────── */

function slugifyHeading(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children, id }) => (
    <h1 id={id} className="font-display font-bold tracking-title">
      {children}
    </h1>
  ),
  h2: ({ children, id }) => {
    const text = Array.isArray(children) ? children.join('') : String(children ?? '')
    return (
      <h2 id={id ?? slugifyHeading(text)} className="font-display font-bold tracking-heading">
        {children}
      </h2>
    )
  },
  h3: ({ children, id }) => {
    const text = Array.isArray(children) ? children.join('') : String(children ?? '')
    return (
      <h3 id={id ?? slugifyHeading(text)} className="font-display font-medium tracking-heading">
        {children}
      </h3>
    )
  },
  h4: ({ children }) => (
    <h4 className="font-display font-medium tracking-heading">{children}</h4>
  ),
  h5: ({ children }) => <h5 className="font-display font-medium">{children}</h5>,
  h6: ({ children }) => <h6 className="font-display font-medium">{children}</h6>,
  a: ({ href, children }) => {
    const isExternal = typeof href === 'string' && /^https?:\/\//.test(href)
    return (
      <a href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>
        {children}
      </a>
    )
  },
  table: ({ children }) => (
    <div className="blog-table-wrapper">
      <table>{children}</table>
    </div>
  ),
  img: ({ src, alt }) => (
    <figure>
      <img src={src} alt={alt ?? ''} loading="lazy" />
      {alt ? <figcaption>{alt}</figcaption> : null}
    </figure>
  ),
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function BlogPostShell({ children }: { children: React.ReactNode }) {
  return (
    <AppFloatingPageRoot>
      <header className={cn(PAGE_INSET, 'flex h-14 items-center justify-between sm:h-16')}>
        <Link to="/" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
          ← Home
        </Link>
        <Link to="/blog" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Blog
        </Link>
      </header>
      {children}
    </AppFloatingPageRoot>
  )
}

function useReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      setProgress(docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return progress
}

/* ─── Main component ──────────────────────────────────────────────────────── */

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [related, setRelated] = useState<RelatedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [shareCopied, setShareCopied] = useState(false)
  const progress = useReadingProgress()

  useEffect(() => {
    if (!slug) return
    window.scrollTo(0, 0)
    setLoading(true)
    supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'live')
      .single()
      .then(async ({ data }) => {
        setPost(data)
        setLoading(false)
        if (data?.cluster) {
          const { data: more } = await supabase
            .from('blog_posts')
            .select('id, slug, title, excerpt, cluster, reading_time_mins, published_at')
            .eq('status', 'live')
            .eq('cluster', data.cluster)
            .neq('id', data.id)
            .order('published_at', { ascending: false })
            .limit(3)
          setRelated(more ?? [])
        }
      })
  }, [slug])

  const faqItems = useMemo(
    () =>
      (post?.faqs ?? [])
        .filter((f) => f?.q?.trim() && f?.a?.trim())
        .map((f) => ({ question: f.q, answer: f.a })),
    [post?.faqs],
  )

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (!url) return
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title ?? '', url })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        window.setTimeout(() => setShareCopied(false), 1800)
      }
    } catch {
      /* user cancelled or denied */
    }
  }

  if (loading) {
    return (
      <BlogPostShell>
        <div className="blog-loading">Loading...</div>
      </BlogPostShell>
    )
  }

  if (!post) {
    return (
      <BlogPostShell>
        <main>
          <div className={cn(PAGE_INSET, 'pb-8 pt-2')}>
            <h1 className="font-display text-3xl font-medium tracking-tight text-foreground">Post not found</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This post may have been removed or the URL is incorrect.
            </p>
          </div>
          <div className="blog-loading flex min-h-[30dvh] items-center justify-center px-4">
            <NotFoundState message="This post may have been removed or the URL is incorrect.">
              <Link to="/blog" className="text-primary underline hover:text-primary/90">
                Back to blog
              </Link>
            </NotFoundState>
          </div>
        </main>
      </BlogPostShell>
    )
  }

  const pageTitle = post.seo_title?.trim() || `${post.title} | PowerProof Blog`
  const metaDescription = post.seo_description?.trim() || post.excerpt?.trim() || post.title

  const faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  } : null

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: metaDescription,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: post.author_name },
    publisher: { '@type': 'Organization', name: 'PowerProof', url: 'https://powerproof.live' },
    mainEntityOfPage: `https://powerproof.live/blog/${post.slug}`,
    wordCount: post.word_count,
    keywords: post.tags?.join(', '),
  }

  const accent = CLUSTER_ACCENT[post.cluster] ?? 'from-primary/15 via-primary/5 to-transparent'
  const badgeClass = CLUSTER_BADGE_CLASS[post.cluster] ?? 'bg-muted text-muted-foreground'

  return (
    <BlogPostShell>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={`https://powerproof.live/blog/${post.slug}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://powerproof.live/blog/${post.slug}`} />
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:modified_time" content={post.updated_at} />
        {post.tags?.length > 0 ? (
          <meta property="article:tag" content={post.tags.join(', ')} />
        ) : null}
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        {faqSchema ? <script type="application/ld+json">{JSON.stringify(faqSchema)}</script> : null}
      </Helmet>
      <SeoMetaReadyMarker />

      <div
        className="blog-progress-track"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="blog-progress-fill"
          style={{ ['--progress' as string]: `${progress}%` }}
        />
      </div>

      <main data-seo-ready="true">
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <div className={cn(PAGE_INSET, 'pb-8 pt-2')}>
            <Link to="/blog" className="blog-back-link self-start">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Blog
            </Link>

            <div className="blog-post-header mt-4">
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', badgeClass)}>
                {CLUSTER_LABELS[post.cluster] ?? post.cluster}
              </span>
              <span className="blog-reading-time">
                {post.reading_time_mins ?? 7} min read
              </span>
            </div>

            <h1 className={cn(blogHeroTitleClass, 'text-left')}>{post.title}</h1>

            <div
              className={cn(
                blogHeroDescriptionClass,
                'flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1',
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" aria-hidden />
                {post.author_name}
              </span>
              <span aria-hidden className="meta-dot h-1 w-1 rounded-full bg-current opacity-40" />
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
                {formatLongDate(post.published_at)}
              </span>
              {post.updated_at && post.updated_at !== post.published_at ? (
                <>
                  <span aria-hidden className="meta-dot h-1 w-1 rounded-full bg-current opacity-40" />
                  <span className="text-xs opacity-80">
                    Updated {formatLongDate(post.updated_at)}
                  </span>
                </>
              ) : null}
            </div>

            {post.tags?.length > 0 ? (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-border-subtle bg-card px-2.5 py-0.5 text-[11px] font-normal text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                aria-label={shareCopied ? 'Link copied' : 'Copy article link'}
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {shareCopied ? 'Link copied' : 'Share'}
              </button>
            </div>
          </div>

        {/* ─── Article cover strip ──────────────────────────────────────── */}
        <div className={cn(PAGE_INSET, 'mb-2')}>
          <div
            className={cn(
              'relative h-32 w-full overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br sm:h-40',
              accent,
            )}
            aria-hidden
          >
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />
            <div className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-border-subtle/70 bg-card/80 px-3 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
              <Clock className="h-3 w-3" aria-hidden />
              {post.reading_time_mins ?? 7} min · {post.word_count ? `${Math.round(post.word_count / 200)} min` : ''}
            </div>
          </div>
        </div>

        {/* ─── Article body ────────────────────────────────────────────── */}
        <div className="blog-post-page">
          <div className="blog-post-container">
            <article className="blog-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={MARKDOWN_COMPONENTS}
              >
                {post.content}
              </ReactMarkdown>
            </article>

            {faqItems.length > 0 ? (
              <>
                <hr className="blog-divider" />
                <section aria-labelledby="blog-faqs-heading">
                  <div className="blog-faqs-heading">
                    <span className="blog-faqs-heading-icon" aria-hidden>
                      <HelpCircle className="h-5 w-5" />
                    </span>
                    <h2 id="blog-faqs-heading">Frequently Asked Questions</h2>
                  </div>
                  <FaqAccordionModule items={faqItems} idPrefix={`blog-${post.slug}`} itemDivided />
                </section>
              </>
            ) : null}

            <hr className="blog-divider" />

            {/* ─── End CTA ─────────────────────────────────────────────── */}
            <div className="blog-cta">
              {post.linked_opportunity_slug ? (
                <>
                  <span className="blog-cta-eyebrow">Go deeper</span>
                  <p>
                    Want the full picture? We've built a detailed research report on this exact
                    opportunity — costs, suppliers, govt schemes, and financials.
                  </p>
                  <Link to={`/o/${post.linked_opportunity_slug}`} className="blog-cta-btn">
                    View Full Research Report
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </>
              ) : (
                <>
                  <span className="blog-cta-eyebrow">Explore</span>
                  <p>
                    Find your next business — explore a growing catalog of vetted opportunities
                    with real numbers, margins, and setup guides.
                  </p>
                  <Link to="/" className="blog-cta-btn">
                    Explore Opportunities
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── Related posts ──────────────────────────────────────────── */}
        {related.length > 0 ? (
          <section className="blog-related" aria-label="More from the blog">
            <div className="blog-related-header">
              <h2>More from the blog</h2>
              <Link to="/blog">
                All posts
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <ul
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
              role="list"
            >
              {related.map((r) => (
                <li key={r.id} className="list-none">
                  <Link
                    to={`/blog/${r.slug}`}
                    className={cn(
                      cardSurface,
                      'group flex h-full flex-col p-5 transition-[border-color,box-shadow,transform] duration-200',
                      'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_10px_30px_-16px_hsl(var(--primary)/0.18)]',
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-medium',
                        CLUSTER_BADGE_CLASS[r.cluster] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {CLUSTER_LABELS[r.cluster] ?? r.cluster}
                    </span>
                    <h3 className="mt-3 font-display text-[16.5px] font-medium leading-snug tracking-heading text-foreground line-clamp-2">
                      {r.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted-foreground line-clamp-3">
                      {r.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
                      <span>{r.reading_time_mins ?? 7} min read</span>
                      <span className="inline-flex items-center gap-1 font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5">
                        Read
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </BlogPostShell>
  )
}
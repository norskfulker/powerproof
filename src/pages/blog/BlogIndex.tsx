import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Sparkles } from '@/lib/icons'
import { Seo } from '@/components/Seo'
import { AppFloatingPageRoot } from '@/components/layout/AppFloatingShell'
import { cardSurface } from '@/lib/cardSurface'
import { supabase } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'

const PAGE_INSET = 'mx-auto w-full max-w-landing px-4 layout-sm:px-6 layout-lg:px-8'

function BlogChrome({ children }: { children: React.ReactNode }) {
  return (
    <AppFloatingPageRoot>
      <Seo pagePath="/blog" />
      <header className={cn(PAGE_INSET, 'flex h-14 items-center justify-between sm:h-16')}>
        <Link to="/" className="text-sm font-medium text-foreground transition-colors hover:text-primary">
          ← Home
        </Link>
        <span className="text-sm text-muted-foreground">Blog</span>
      </header>
      {children}
    </AppFloatingPageRoot>
  )
}

type BlogPost = {
  id: string
  slug: string
  title: string
  excerpt: string
  cluster: string
  tags: string[]
  reading_time_mins: number
  published_at: string
  author_name: string
}

const CLUSTERS = [
  { key: 'all', label: 'All' },
  { key: 'how-to', label: 'How-To' },
  { key: 'franchise', label: 'Franchise' },
  { key: 'market', label: 'Market' },
  { key: 'city-guide', label: 'City Guide' },
  { key: 'trends', label: 'Trends' },
] as const

const CLUSTER_BADGE_CLASS: Record<string, string> = {
  'how-to': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  franchise: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  market: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  'city-guide': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  trends: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

/** Cluster accent — background mesh color for the card cover gradient. */
const CLUSTER_ACCENT: Record<string, string> = {
  'how-to': 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  franchise: 'from-amber-500/20 via-amber-500/5 to-transparent',
  market: 'from-rose-500/20 via-rose-500/5 to-transparent',
  'city-guide': 'from-indigo-500/20 via-indigo-500/5 to-transparent',
  trends: 'from-sky-500/20 via-sky-500/5 to-transparent',
}

function clusterLabel(key: string) {
  return CLUSTERS.find((c) => c.key === key)?.label ?? key
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const accent = CLUSTER_ACCENT[post.cluster] ?? 'from-primary/15 via-primary/5 to-transparent'
  const badgeClass = CLUSTER_BADGE_CLASS[post.cluster] ?? 'bg-muted text-muted-foreground'

  return (
    <Link
      to={`/blog/${post.slug}`}
      className={cn(
        cardSurface,
        'group relative flex h-full flex-col overflow-hidden transition-[border-color,box-shadow,transform] duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_14px_40px_-18px_hsl(var(--primary)/0.25)]',
        featured && 'sm:col-span-2',
      )}
    >
      {/* Cover area — gradient mesh (no external images required) */}
      <div
        className={cn(
          'relative h-32 w-full overflow-hidden bg-gradient-to-br',
          accent,
          featured && 'sm:h-44',
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute right-4 top-4">
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-medium', badgeClass)}>
            {clusterLabel(post.cluster)}
          </span>
        </div>
        {featured ? (
          <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            Featured
          </div>
        ) : null}
      </div>

      <div className={cn('flex flex-1 flex-col p-5', featured && 'sm:p-6')}>
        <h2
          className={cn(
            'font-display font-medium leading-snug tracking-heading text-foreground line-clamp-2',
            featured ? 'text-xl sm:text-2xl' : 'text-[17px]',
          )}
        >
          {post.title}
        </h2>
        <p
          className={cn(
            'mt-2 flex-1 text-[14.5px] leading-relaxed text-muted-foreground line-clamp-3',
            featured && 'sm:line-clamp-4',
          )}
        >
          {post.excerpt}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.reading_time_mins ?? 7} min read
            <span aria-hidden className="mx-1.5 h-1 w-1 rounded-full bg-border-strong" />
            {formatDate(post.published_at)}
          </span>
          <span
            className="inline-flex items-center gap-1 font-medium text-primary transition-transform duration-200 group-hover:translate-x-0.5"
          >
            Read
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCluster, setActiveCluster] = useState<string>('all')

  useEffect(() => {
    supabase
      .from('blog_posts')
      .select('id, slug, title, excerpt, cluster, tags, reading_time_mins, published_at, author_name')
      .eq('status', 'live')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        setPosts(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(
    () => (activeCluster === 'all' ? posts : posts.filter((p) => p.cluster === activeCluster)),
    [posts, activeCluster],
  )

  const [featured, ...rest] = filtered

  return (
    <BlogChrome>
      <main data-seo-ready={loading ? undefined : 'true'}>
        <div className={cn(PAGE_INSET, 'pb-4 pt-2 sm:pb-6')}>
          <h1 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Business intelligence blog
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Research-grade guides for operators — real numbers, real margins, and execution notes you can take to partners and lenders.
          </p>
        </div>

        <div className={cn(PAGE_INSET, 'pb-16 sm:pb-20 md:pb-24 lg:pb-28')}>
          {/* Cluster filter — pill track */}
          <div
            className="mb-10 flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="Filter posts by topic"
          >
            {CLUSTERS.map((c) => {
              const isActive = activeCluster === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCluster(c.key)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-[13px] transition-all duration-200',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--primary)/0.5)]'
                      : 'border-border-subtle bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground',
                  )}
                >
                  {c.label}
                </button>
              )
            })}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? 'post' : 'posts'}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(cardSurface, 'h-72 animate-pulse bg-muted/30 sm:h-80')}
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={cn(cardSurface, 'p-10 text-center')}>
              <p className="text-base text-foreground">No posts in this category yet.</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Try a different topic — or browse all posts.
              </p>
            </div>
          ) : (
            <ul
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
              role="list"
            >
              {featured ? (
                <li className="list-none sm:col-span-2 lg:col-span-3">
                  <PostCard post={featured} featured />
                </li>
              ) : null}
              {rest.map((post) => (
                <li key={post.id} className="list-none">
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </BlogChrome>
  )
}
import type { RoadmapNode } from './roadmapTypes'

export type RoadmapResource = RoadmapNode['resources'][number]

type ResourceTypeMeta = {
  badgeLabel: string
  badgeClass: string
}

const RESOURCE_TYPE_META: Record<string, ResourceTypeMeta> = {
  tool: { badgeLabel: 'Tool', badgeClass: 'bg-badge-new-bg text-badge-new-text' },
  website: { badgeLabel: 'Website', badgeClass: 'bg-primary/10 text-primary' },
  community: { badgeLabel: 'Community', badgeClass: 'bg-badge-trending-bg text-badge-trending-text' },
  book: { badgeLabel: 'Book', badgeClass: 'bg-badge-low-bg text-badge-low-text' },
  course: { badgeLabel: 'Course', badgeClass: 'bg-badge-low-bg text-badge-low-text' },
}

/** Known labels → canonical URLs when the model omits or shortens links. */
const KNOWN_RESOURCE_URLS: Record<string, string> = {
  'google forms': 'https://forms.google.com',
  'otter.ai': 'https://otter.ai',
  'nsdc portal': 'https://www.nsdcindia.org',
  'skill india portal': 'https://www.skillindia.gov.in',
  'whatsapp for business': 'https://business.whatsapp.com',
  'whatsapp business api': 'https://business.whatsapp.com',
  'linkedin premium': 'https://www.linkedin.com/premium',
  'linkedin premium (sales navigator trial)': 'https://www.linkedin.com/sales',
  'startup india model agreements': 'https://www.startupindia.gov.in',
  'startup india: legal & compliance guide': 'https://www.startupindia.gov.in',
  'mca website': 'https://www.mca.gov.in',
  'razorpay': 'https://razorpay.com',
  'razorpay (indian payment gateway)': 'https://razorpay.com',
  instamojo: 'https://www.instamojo.com',
  'instamojo (indian payment gateway)': 'https://www.instamojo.com',
  learndash: 'https://www.learndash.com',
  'learndash (wordpress lms)': 'https://www.learndash.com',
  digitalocean: 'https://www.digitalocean.com',
  'digitalocean (for wordpress hosting)': 'https://www.digitalocean.com',
  'upwork india': 'https://www.upwork.com',
  'google analytics 4': 'https://analytics.google.com',
  hotjar: 'https://www.hotjar.com',
  'hotjar (user behavior analytics)': 'https://www.hotjar.com',
  canva: 'https://www.canva.com',
  'facebook ads manager': 'https://www.facebook.com/adsmanager',
  'google optimize': 'https://optimize.google.com',
  mixpanel: 'https://mixpanel.com',
  amplitude: 'https://amplitude.com',
  surveymonkey: 'https://www.surveymonkey.com',
  jira: 'https://www.atlassian.com/software/jira',
  trello: 'https://trello.com',
  testbook: 'https://testbook.com',
}

function normalizeKey(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function ensureHttps(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed}`
}

export function resolveResourceUrl(resource: RoadmapResource): string {
  const direct = ensureHttps(resource.url ?? '')
  if (direct) return direct

  const label = (resource.label ?? '').trim()
  if (!label) return ''

  const known = KNOWN_RESOURCE_URLS[normalizeKey(label)]
  if (known) return known

  return `https://www.google.com/search?q=${encodeURIComponent(label)}`
}

export function formatResourceSource(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    if (parsed.pathname === '/' || parsed.pathname === '') return host
    const path = parsed.pathname.replace(/\/$/, '')
    return `${host}${path.length > 28 ? `${path.slice(0, 28)}…` : path}`
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
}

export function resourceTypeMeta(type: string | null | undefined): ResourceTypeMeta {
  const safeType = (type ?? 'link').trim() || 'link'
  const key = normalizeKey(safeType)
  return (
    RESOURCE_TYPE_META[key] ?? {
      badgeLabel: safeType.charAt(0).toUpperCase() + safeType.slice(1),
      badgeClass: 'bg-surface-hover text-muted-foreground',
    }
  )
}

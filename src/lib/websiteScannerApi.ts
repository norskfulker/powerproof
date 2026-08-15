import { byokRequestHeaders } from '@/lib/byok'
import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase'
import type { DbWebsiteScanHistory } from '@/types/database'

export type ScannerSectionKey = 'seo' | 'business' | 'competitor' | 'roadmap'

export type SeoAuditFinding = {
  title: string
  severity: 'good' | 'warn' | 'bad'
  detail: string
}

export type SeoAudit = {
  score: number
  title: string | null
  description: string | null
  keywords: string | null
  author: string | null
  canonical: string | null
  language: string | null
  robots: string | null
  googlebot: string | null
  geoRegion: string | null
  geoCountry: string | null
  ogType: string | null
  ogSiteName: string | null
  ogLocale: string | null
  ogUrl: string | null
  ogTitle: string | null
  ogDescription: string | null
  ogImage: string | null
  ogImageAlt: string | null
  twitterCard: string | null
  twitterSite: string | null
  twitterCreator: string | null
  twitterTitle: string | null
  twitterDescription: string | null
  twitterImage: string | null
  h1: string[]
  headingsCount: Record<'h1' | 'h2' | 'h3', number>
  imagesMissingAlt: number
  imagesTotal: number
  hasViewport: boolean
  hasFavicon: boolean
  hasAppleTouchIcon: boolean
  hasManifest: boolean
  hasJsonLd: boolean
  jsonLdTypes: string[]
  siteVerification: string[]
  analytics: string[]
  preloadImages: string[]
  wordCount: number
  internalLinks: number
  externalLinks: number
  findings: SeoAuditFinding[]
}

export type BusinessAudit = {
  score: number
  summary: string
  valueProposition: string
  audience: string
  differentiators: string[]
  weaknesses: string[]
  callToActions: string[]
  monetizationSignals: string[]
  socialProof: string[]
  trustSignals: string[]
  findings: SeoAuditFinding[]
}

export type CompetitorMention = {
  name: string
  context: string
}

export type CompetitorAudit = {
  score: number
  summary: string
  mentions: CompetitorMention[]
  likelyCompetitors: string[]
  positioning: string
  gaps: string[]
  findings: SeoAuditFinding[]
}

export type RoadmapStep = {
  title: string
  detail: string
  effort: 'low' | 'medium' | 'high'
}

export type RoadmapAudit = {
  score: number
  summary: string
  horizonDays: 30 | 60 | 90
  steps: RoadmapStep[]
  quickWins: string[]
  bigBets: string[]
  findings: SeoAuditFinding[]
}

export type CrawledPageSummary = {
  url: string
  title: string | null
  status: number
  charCount: number
  snippet: string
}

export type CrawlSummary = {
  totalPages: number
  pages: CrawledPageSummary[]
}

export type Stage = 'pre-seed' | 'seed' | 'growth' | 'mature'
export type SwitchingCosts = 'low' | 'medium' | 'high'

export type StageEstimate = {
  label: Stage
  evidence: string
}

export type SwitchingCostsEstimate = {
  level: SwitchingCosts
  evidence: string
}

export type ThreatCompetitor = {
  name: string
  whyThreat: string
}

export type CompetitorAngle = {
  name: string
  whatSiteSays: string
}

export type BusinessInsights = {
  businessModel: string
  stage: StageEstimate | null
  geography: string
  jobToBeDone: string
  pricingStrategy: string
  funnelPath: string
  objectionsUnhandled: string[]
  copyPatterns: string[]
  brandSignals: string[]
}

export type CompetitorInsights = {
  category: string
  directCompetitors: ThreatCompetitor[]
  indirectCompetitors: ThreatCompetitor[]
  competitorAngles: CompetitorAngle[]
  unspokenGaps: string[]
  switchingCosts: SwitchingCostsEstimate | null
  buyerAlternatives: string[]
  wedge: string
}

export type Insights = {
  industry: string
  standoutInsights: string[]
  business: BusinessInsights
  competitor: CompetitorInsights
}

export type ScanProgressStatus = 'running' | 'complete' | 'error'

export type ScanSectionId = 'seo' | 'business' | 'competitor' | 'roadmap' | 'insights'

export type WebsiteScanReport = {
  id: string
  url: string
  normalizedUrl: string
  finalUrl: string | null
  status: number
  /** Progressive scan lifecycle (distinct from HTTP `status`). */
  scanStatus?: ScanProgressStatus
  /** Sections still waiting on Gemini while `scanStatus === 'running'`. */
  pendingSections?: ScanSectionId[]
  fetchedAt: string
  durationMs: number
  crawl: CrawlSummary
  seo: SeoAudit
  business: BusinessAudit
  competitor: CompetitorAudit
  roadmap: RoadmapAudit
  insights: Insights
  meta: {
    title: string | null
    description: string | null
    language: string | null
  }
}

export type ScanWebsiteOptions = {
  signal?: AbortSignal
  /**
   * When true, the server skips its 24h cache lookup and re-runs Firecrawl.
   * Defaults to false (use cached crawl if available).
   */
  forceFresh?: boolean
  /** Called when the stub row is inserted and the detail page can open. */
  onStarted?: (report: WebsiteScanReport) => void
  /** Called after each Gemini section lands. */
  onSection?: (section: ScanSectionId, report: WebsiteScanReport) => void
}

const SCANNER_FUNCTION = 'website-scanner'

export type ScanWebsiteError = Error & {
  status?: number
  code?: string
}

function buildError(status: number | undefined, payload: unknown, fallback: string): ScanWebsiteError {
  const err = edgeApiErrorFromPayload(status, payload, fallback) as unknown as ScanWebsiteError
  return err
}

export type WebsiteScanStreamEvent =
  | { type: 'started'; scanId: string; report: WebsiteScanReport }
  | {
      type: 'section'
      section: ScanSectionId
      scanId: string
      report: WebsiteScanReport
    }
  | { type: 'done'; scanId: string; report: WebsiteScanReport }
  | { type: 'error'; message: string; code?: string }

export async function scanWebsite(
  url: string,
  options: ScanWebsiteOptions = {},
): Promise<WebsiteScanReport> {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new Error('Please enter a URL to scan.')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }

  // Fire-and-forget on the server: response returns as soon as crawl+SEO stub
  // is saved. Gemini continues via EdgeRuntime.waitUntil; detail page polls.
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${SCANNER_FUNCTION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      ...byokRequestHeaders(),
    },
    body: JSON.stringify({
      url: trimmed,
      forceFresh: options.forceFresh === true,
      stream: false,
    }),
    signal: options.signal,
  })

  if (!res.ok) {
    let payload: unknown = {}
    try {
      payload = await res.json()
    } catch {
      payload = {}
    }
    throw buildError(res.status, payload, `Scan failed (${res.status})`)
  }

  const data = (await res.json()) as WebsiteScanStreamEvent | WebsiteScanReport
  const reportRaw =
    data &&
    typeof data === 'object' &&
    'type' in data &&
    (data as WebsiteScanStreamEvent).type === 'started' &&
    'report' in data
      ? (data as Extract<WebsiteScanStreamEvent, { type: 'started' }>).report
      : (data as WebsiteScanReport)

  const report = normalizeScanReport(reportRaw)
  options.onStarted?.(report)
  return report
}

/** Non-streaming fallback (single JSON response). Kept for debugging / older deploys. */
export async function scanWebsiteOnce(
  url: string,
  options: Omit<ScanWebsiteOptions, 'onStarted' | 'onSection'> = {},
): Promise<WebsiteScanReport> {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new Error('Please enter a URL to scan.')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('not_authenticated')
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${SCANNER_FUNCTION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
      ...byokRequestHeaders(),
    },
    body: JSON.stringify({
      url: trimmed,
      forceFresh: options.forceFresh === true,
      stream: false,
    }),
    signal: options.signal,
  })

  if (!res.ok) {
    let payload: unknown = {}
    try {
      payload = await res.json()
    } catch {
      payload = {}
    }
    throw buildError(res.status, payload, `Scan failed (${res.status})`)
  }

  const data = (await res.json()) as WebsiteScanReport
  return normalizeScanReport(data)
}

export function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** Canonical shape for any partial/missing nested keys. */
const EMPTY_INSIGHTS: Insights = {
  industry: 'Not enough signal',
  standoutInsights: [],
  business: {
    businessModel: 'Not enough signal',
    stage: null,
    geography: 'Not enough signal',
    jobToBeDone: 'Not enough signal',
    pricingStrategy: 'Not enough signal',
    funnelPath: 'Not enough signal',
    objectionsUnhandled: [],
    copyPatterns: [],
    brandSignals: [],
  },
  competitor: {
    category: 'Not enough signal',
    directCompetitors: [],
    indirectCompetitors: [],
    competitorAngles: [],
    unspokenGaps: [],
    switchingCosts: null,
    buyerAlternatives: [],
    wedge: 'Not enough signal',
  },
}

/** Safe defaults for the audit sections so the page never crashes on a
 * partial response (e.g. older cached rows written before a field was added). */
const EMPTY_AUDIT: Pick<WebsiteScanReport, 'seo' | 'business' | 'competitor' | 'roadmap'> = {
  seo: {
    score: 0,
    title: null,
    description: null,
    keywords: null,
    author: null,
    canonical: null,
    language: null,
    robots: null,
    googlebot: null,
    geoRegion: null,
    geoCountry: null,
    ogType: null,
    ogSiteName: null,
    ogLocale: null,
    ogUrl: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogImageAlt: null,
    twitterCard: null,
    twitterSite: null,
    twitterCreator: null,
    twitterTitle: null,
    twitterDescription: null,
    twitterImage: null,
    h1: [],
    headingsCount: { h1: 0, h2: 0, h3: 0 },
    imagesMissingAlt: 0,
    imagesTotal: 0,
    hasViewport: false,
    hasFavicon: false,
    hasAppleTouchIcon: false,
    hasManifest: false,
    hasJsonLd: false,
    jsonLdTypes: [],
    siteVerification: [],
    analytics: [],
    preloadImages: [],
    wordCount: 0,
    internalLinks: 0,
    externalLinks: 0,
    findings: [],
  },
  business: {
    score: 0,
    summary: '',
    valueProposition: '',
    audience: '',
    differentiators: [],
    weaknesses: [],
    callToActions: [],
    monetizationSignals: [],
    socialProof: [],
    trustSignals: [],
    findings: [],
  },
  competitor: {
    score: 0,
    summary: '',
    mentions: [],
    likelyCompetitors: [],
    positioning: '',
    gaps: [],
    findings: [],
  },
  roadmap: {
    score: 0,
    summary: '',
    horizonDays: 90,
    steps: [],
    quickWins: [],
    bigBets: [],
    findings: [],
  },
}

/** Fill in any missing nested fields from the canonical empty shape so the
 * page never crashes on a partial API response. Server already deep-merges,
 * but this is the belt-and-suspenders for that contract.
 *
 * IMPORTANT: empty defaults are the *base*; the real report overlays them.
 * Calling this the other way around replaces real findings/scores with blanks.
 */
function normalizeScanReport(report: WebsiteScanReport): WebsiteScanReport {
  const defaults: WebsiteScanReport = {
    id: '',
    url: '',
    normalizedUrl: '',
    finalUrl: null,
    status: 0,
    scanStatus: 'complete',
    pendingSections: [],
    fetchedAt: '',
    durationMs: 0,
    crawl: { totalPages: 0, pages: [] },
    meta: { title: null, description: null, language: null },
    ...EMPTY_AUDIT,
    insights: EMPTY_INSIGHTS,
  }
  const merged = deepMergeObject(defaults, report)
  const business = {
    ...merged.business,
    summary: asDisplayText(merged.business.summary),
    valueProposition: asDisplayText(merged.business.valueProposition),
    audience: asDisplayText(merged.business.audience),
    differentiators: asDisplayTextList(merged.business.differentiators),
    weaknesses: asDisplayTextList(merged.business.weaknesses),
    callToActions: asDisplayTextList(merged.business.callToActions),
    monetizationSignals: asDisplayTextList(merged.business.monetizationSignals),
    socialProof: asDisplayTextList(merged.business.socialProof),
    trustSignals: asDisplayTextList(merged.business.trustSignals),
    findings: normalizeFindings(merged.business.findings),
  }
  const competitor = {
    ...merged.competitor,
    summary: asDisplayText(merged.competitor.summary),
    positioning: asDisplayText(merged.competitor.positioning),
    likelyCompetitors: asDisplayTextList(merged.competitor.likelyCompetitors),
    gaps: asDisplayTextList(merged.competitor.gaps),
    mentions: normalizeMentions(merged.competitor.mentions),
    findings: normalizeFindings(merged.competitor.findings),
  }
  const roadmap = normalizeRoadmapAudit(merged.roadmap)
  const insights = normalizeInsights(merged.insights)

  const scanStatus: ScanProgressStatus =
    merged.scanStatus === 'running' ||
    merged.scanStatus === 'complete' ||
    merged.scanStatus === 'error'
      ? merged.scanStatus
      : 'complete'

  const pendingSections = Array.isArray(merged.pendingSections)
    ? merged.pendingSections.filter(
        (s): s is ScanSectionId =>
          s === 'seo' ||
          s === 'business' ||
          s === 'competitor' ||
          s === 'roadmap' ||
          s === 'insights',
      )
    : []

  return {
    ...merged,
    scanStatus,
    pendingSections,
    seo: {
      ...merged.seo,
      keywords: asDisplayText(merged.seo.keywords) || null,
      author: asDisplayText(merged.seo.author) || null,
      language: asDisplayText(merged.seo.language) || null,
      googlebot: asDisplayText(merged.seo.googlebot) || null,
      geoRegion: asDisplayText(merged.seo.geoRegion) || null,
      geoCountry: asDisplayText(merged.seo.geoCountry) || null,
      ogType: asDisplayText(merged.seo.ogType) || null,
      ogSiteName: asDisplayText(merged.seo.ogSiteName) || null,
      ogLocale: asDisplayText(merged.seo.ogLocale) || null,
      ogUrl: asDisplayText(merged.seo.ogUrl) || null,
      ogImageAlt: asDisplayText(merged.seo.ogImageAlt) || null,
      twitterCard: asDisplayText(merged.seo.twitterCard) || null,
      twitterSite: asDisplayText(merged.seo.twitterSite) || null,
      twitterCreator: asDisplayText(merged.seo.twitterCreator) || null,
      twitterTitle: asDisplayText(merged.seo.twitterTitle) || null,
      twitterDescription: asDisplayText(merged.seo.twitterDescription) || null,
      twitterImage: asDisplayText(merged.seo.twitterImage) || null,
      hasAppleTouchIcon: Boolean(merged.seo.hasAppleTouchIcon),
      hasManifest: Boolean(merged.seo.hasManifest),
      hasJsonLd: Boolean(merged.seo.hasJsonLd),
      jsonLdTypes: asDisplayTextList(merged.seo.jsonLdTypes),
      siteVerification: asDisplayTextList(merged.seo.siteVerification),
      analytics: asDisplayTextList(merged.seo.analytics),
      preloadImages: asDisplayTextList(merged.seo.preloadImages),
      findings: normalizeFindings(merged.seo.findings),
    },
    business,
    competitor,
    roadmap,
    insights,
  }
}

const EMPTY_SIGNAL_RE = /^(not enough signal|unclear|n\/a|none|null|undefined|—|-|–)$/i
const EMPTY_SIGNAL_CONTAINS_RE = /not enough signal/i

/** Gemini occasionally returns nested objects where a string is expected
 * (e.g. roadmap.summary shaped like `{ steps, bigBets, horizon, quickWins }`). */
function asDisplayText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || EMPTY_SIGNAL_RE.test(trimmed) || EMPTY_SIGNAL_CONTAINS_RE.test(trimmed)) {
      return fallback
    }
    return trimmed
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function asDisplayTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (typeof item === 'number' || typeof item === 'boolean') return String(item)
      if (isPlainObject(item)) {
        const titled =
          asDisplayText(item.title) ||
          asDisplayText(item.text) ||
          asDisplayText(item.detail) ||
          asDisplayText(item.name)
        if (titled) return titled
      }
      return ''
    })
    .filter(
      (item) =>
        Boolean(item) && !EMPTY_SIGNAL_RE.test(item) && !EMPTY_SIGNAL_CONTAINS_RE.test(item),
    )
}

/** Gemini returns high/medium/low (and Title Case) instead of good/warn/bad. */
function coerceFindingSeverity(raw: unknown): SeoAuditFinding['severity'] {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (['good', 'ok', 'positive', 'success'].includes(s)) return 'good'
  if (['warn', 'warning', 'medium', 'low', 'info', 'minor'].includes(s)) return 'warn'
  if (['bad', 'high', 'critical', 'error', 'severe'].includes(s)) return 'bad'
  return 'warn'
}

function normalizeFindings(value: unknown): SeoAuditFinding[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!isPlainObject(item)) return null
      const title = asDisplayText(item.title)
      const detail = asDisplayText(item.detail)
      if (!title && !detail) return null
      return {
        title: title || 'Finding',
        detail,
        severity: coerceFindingSeverity(item.severity),
      }
    })
    .filter((item): item is SeoAuditFinding => item != null)
}

function normalizeMentions(
  value: unknown,
): WebsiteScanReport['competitor']['mentions'] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!isPlainObject(item)) return null
      const name = asDisplayText(item.name)
      if (!name) return null
      return { name, context: asDisplayText(item.context) }
    })
    .filter((item): item is { name: string; context: string } => item != null)
}

function coerceHorizonDays(raw: unknown): 30 | 60 | 90 {
  if (raw === 30 || raw === 60 || raw === 90) return raw
  if (Array.isArray(raw)) {
    const nums = raw
      .map((item) => (typeof item === 'number' ? item : Number(item)))
      .filter((n): n is 30 | 60 | 90 => n === 30 || n === 60 || n === 90)
    if (nums.length) return Math.max(...nums) as 30 | 60 | 90
  }
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (n === 30 || n === 60 || n === 90) return n
  return 90
}

function normalizeRoadmapAudit(roadmap: RoadmapAudit): RoadmapAudit {
  const raw = roadmap as unknown as Record<string, unknown>
  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : []
  const steps: RoadmapStep[] = stepsRaw.map((step, index) => {
    if (!isPlainObject(step)) {
      return { title: asDisplayText(step, `Step ${index + 1}`), detail: '', effort: 'medium' }
    }
    const effort =
      step.effort === 'low' || step.effort === 'medium' || step.effort === 'high'
        ? step.effort
        : 'medium'
    return {
      title: asDisplayText(step.title, `Step ${index + 1}`),
      detail: asDisplayText(step.detail),
      effort,
    }
  })

  return {
    score: typeof raw.score === 'number' && Number.isFinite(raw.score) ? raw.score : 0,
    summary: asDisplayText(raw.summary),
    horizonDays: coerceHorizonDays(raw.horizonDays ?? raw.horizon),
    steps,
    quickWins: asDisplayTextList(raw.quickWins),
    bigBets: asDisplayTextList(raw.bigBets),
    findings: normalizeFindings(raw.findings),
  }
}

function normalizeInsights(insights: Insights): Insights {
  const stageRaw = insights.business?.stage
  let stage: Insights['business']['stage'] = null
  if (stageRaw && isPlainObject(stageRaw as unknown as object)) {
    const label = (stageRaw as { label?: unknown }).label
    if (label === 'pre-seed' || label === 'seed' || label === 'growth' || label === 'mature') {
      stage = {
        label,
        evidence: asDisplayText((stageRaw as { evidence?: unknown }).evidence),
      }
    }
  }

  const switchingRaw = insights.competitor?.switchingCosts
  let switchingCosts: Insights['competitor']['switchingCosts'] = null
  if (switchingRaw && isPlainObject(switchingRaw as unknown as object)) {
    const level = (switchingRaw as { level?: unknown }).level
    if (level === 'low' || level === 'medium' || level === 'high') {
      switchingCosts = {
        level,
        evidence: asDisplayText((switchingRaw as { evidence?: unknown }).evidence),
      }
    }
  }

  return {
    industry: asDisplayText(insights.industry),
    standoutInsights: asDisplayTextList(insights.standoutInsights),
    business: {
      businessModel: asDisplayText(insights.business?.businessModel),
      stage,
      geography: asDisplayText(insights.business?.geography),
      jobToBeDone: asDisplayText(insights.business?.jobToBeDone),
      pricingStrategy: asDisplayText(insights.business?.pricingStrategy),
      funnelPath: asDisplayText(insights.business?.funnelPath),
      objectionsUnhandled: asDisplayTextList(insights.business?.objectionsUnhandled),
      copyPatterns: asDisplayTextList(insights.business?.copyPatterns),
      brandSignals: asDisplayTextList(insights.business?.brandSignals),
    },
    competitor: {
      category: asDisplayText(insights.competitor?.category),
      directCompetitors: normalizeThreatList(insights.competitor?.directCompetitors),
      indirectCompetitors: normalizeThreatList(insights.competitor?.indirectCompetitors),
      competitorAngles: normalizeAngles(insights.competitor?.competitorAngles),
      unspokenGaps: asDisplayTextList(insights.competitor?.unspokenGaps),
      switchingCosts,
      buyerAlternatives: asDisplayTextList(insights.competitor?.buyerAlternatives),
      wedge: asDisplayText(insights.competitor?.wedge),
    },
  }
}

function normalizeThreatList(
  value: unknown,
): Insights['competitor']['directCompetitors'] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!isPlainObject(item)) return null
      const name = asDisplayText(item.name)
      if (!name) return null
      return { name, whyThreat: asDisplayText(item.whyThreat) }
    })
    .filter((item): item is { name: string; whyThreat: string } => item != null)
}

function normalizeAngles(
  value: unknown,
): Insights['competitor']['competitorAngles'] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!isPlainObject(item)) return null
      const name = asDisplayText(item.name)
      if (!name) return null
      return { name, whatSiteSays: asDisplayText(item.whatSiteSays) }
    })
    .filter((item): item is { name: string; whatSiteSays: string } => item != null)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep-merge `override` onto `fallback`. Plain objects recurse; arrays and
 * scalars from `override` win. `undefined` in override keeps the fallback. */
function deepMergeObject<T>(fallback: T, override: unknown): T {
  if (override === undefined) return fallback
  if (!isPlainObject(fallback) || !isPlainObject(override)) {
    return override as T
  }
  const out: Record<string, unknown> = { ...fallback }
  for (const key of Object.keys(override)) {
    const a = (fallback as Record<string, unknown>)[key]
    const b = override[key]
    if (b === undefined) continue
    out[key] = isPlainObject(a) && isPlainObject(b) ? deepMergeObject(a, b) : b
  }
  return out as T
}

export type WebsiteScanHistoryRow = Omit<DbWebsiteScanHistory, 'report'>

/** Strip the full report blob for the list view (heavy) — use `loadScanHistory` to fetch the full row. */
export type WebsiteScanHistorySummary = WebsiteScanHistoryRow

const HISTORY_LIST_COLUMNS =
  'id, user_id, url, normalized_url, final_url, status, duration_ms, page_count, site_title, seo_score, business_score, competitor_score, roadmap_score, crawl_source, crawl_at, created_at'

function toHistorySummary(row: DbWebsiteScanHistory): WebsiteScanHistorySummary {
  const { report: _report, ...rest } = row
  return rest
}

export async function listScanHistory(
  userId: string,
  limit = 5,
): Promise<WebsiteScanHistorySummary[]> {
  const { data, error } = await supabase
    .from('website_scan_history')
    .select(HISTORY_LIST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data ?? []).map((row) => toHistorySummary(row as DbWebsiteScanHistory))
}

export async function loadScanHistory(id: string, userId: string): Promise<WebsiteScanReport | null> {
  const primary = await supabase
    .from('website_scan_history')
    .select('report, scan_status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  let row = primary.data as { report?: unknown; scan_status?: string } | null
  if (primary.error || !row) {
    const fallback = await supabase
      .from('website_scan_history')
      .select('report')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (fallback.error || !fallback.data) return null
    row = fallback.data as { report?: unknown; scan_status?: string }
  }

  const report = normalizeScanReport(row.report as WebsiteScanReport)
  const rowStatus = row.scan_status
  if (rowStatus === 'running' || rowStatus === 'complete' || rowStatus === 'error') {
    report.scanStatus = rowStatus
  }
  return report
}

export async function deleteScanHistory(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('website_scan_history')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  return !error
}

export async function deleteScanHistoryMany(
  ids: string[],
  userId: string,
): Promise<boolean> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return true
  const { error } = await supabase
    .from('website_scan_history')
    .delete()
    .in('id', unique)
    .eq('user_id', userId)
  return !error
}

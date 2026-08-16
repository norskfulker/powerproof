import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, cardTopSlotRowClass } from '@/components/ui/card'
import { detailHeroCardClassName } from '@/components/opportunity/detail/detailSectionClasses'
import { TabsContent } from '@/components/ui/tabs'
import {
  InternalPageDataTabs,
  internalPageTabPanelClass,
} from '@/components/shared/InternalPageDataTabs'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { hostnameFromLooseUrl } from '@/lib/siteFavicon'
import {
  Activity,
  AlertCircle,
  Bookmark,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  Layers,
  Loader2,
  Map,
  Radar,
  Rocket,
  Search,
  TrendingUp,
  XCircle,
  Zap,
} from '@/lib/icons'
import type {
  CrawledPageSummary,
  Insights,
  RoadmapAudit,
  RoadmapStep,
  ScanSectionId,
  SeoAudit,
  SeoAuditFinding,
  Stage,
  WebsiteScanReport,
} from '@/lib/websiteScannerApi'
import { cn } from '@/lib/utils'

export const SCAN_REPORT_SECTIONS: {
  key: 'seo' | 'business' | 'competitor' | 'roadmap'
  id: string
  label: string
  icon: typeof Search
  helper: string
}[] = [
  {
    key: 'seo',
    id: 'scan-seo',
    label: 'SEO',
    icon: Search,
    helper: 'Meta, headings, links, and on-page signals.',
  },
  {
    key: 'business',
    id: 'scan-business',
    label: 'Business',
    icon: Building2,
    helper: 'Value proposition, audience, CTAs, and trust signals.',
  },
  {
    key: 'competitor',
    id: 'scan-competitor',
    label: 'Competitor',
    icon: TrendingUp,
    helper: 'Positioning, gaps, and likely rivals.',
  },
  {
    key: 'roadmap',
    id: 'scan-roadmap',
    label: 'Roadmap',
    icon: Map,
    helper: 'Prioritized fixes and growth bets.',
  },
]

// ─── Tone helpers ────────────────────────────────────────────────

type ScoreTone = 'green' | 'amber' | 'red' | 'gray'

function scoreToneVariant(score: number): ScoreTone {
  if (score >= 75) return 'green'
  if (score >= 55) return 'amber'
  return 'red'
}

function scoreBadgeVariant(tone: ScoreTone): 'green' | 'amber' | 'red' | 'gray' {
  if (tone === 'green') return 'green'
  if (tone === 'amber') return 'amber'
  if (tone === 'red') return 'red'
  return 'gray'
}

type FindingKind = 'good' | 'warn' | 'bad'

const FINDING_KIND_META: Record<
  FindingKind,
  {
    label: string
    icon: typeof CheckCircle2
    rank: number
    accentClass: string
    chipClass: string
    dotClass: string
  }
> = {
  bad: {
    label: 'Critical',
    icon: XCircle,
    rank: 0,
    accentClass: 'border-l-red-500/70',
    chipClass: 'border-red-500/25 bg-red-500/10 text-red-600',
    dotClass: 'bg-red-500',
  },
  warn: {
    label: 'Needs check',
    icon: AlertCircle,
    rank: 1,
    accentClass: 'border-l-amber-500/70',
    chipClass: 'border-amber-500/25 bg-amber-500/10 text-amber-600',
    dotClass: 'bg-amber-500',
  },
  good: {
    label: 'Healthy',
    icon: CheckCircle2,
    rank: 2,
    accentClass: 'border-l-emerald-500/70',
    chipClass: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
    dotClass: 'bg-emerald-500',
  },
}

function findingKind(severity: string): FindingKind {
  const s = severity.trim().toLowerCase()
  if (s === 'good' || s === 'ok' || s === 'positive') return 'good'
  if (s === 'warn' || s === 'warning' || s === 'medium' || s === 'low' || s === 'info') return 'warn'
  return 'bad'
}

type FieldStatus = 'good' | 'warn' | 'bad'

const FIELD_STATUS_META: Record<
  FieldStatus,
  { icon: typeof CheckCircle2; iconClass: string; accentClass: string; dotClass: string; label: string }
> = {
  good: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    accentClass: 'border-l-emerald-500/70',
    dotClass: 'bg-emerald-500',
    label: 'Valid',
  },
  warn: {
    icon: AlertCircle,
    iconClass: 'text-amber-600',
    accentClass: 'border-l-amber-500/70',
    dotClass: 'bg-amber-500',
    label: 'Needs check',
  },
  bad: {
    icon: XCircle,
    iconClass: 'text-rose-600',
    accentClass: 'border-l-rose-500/70',
    dotClass: 'bg-rose-500',
    label: 'Missing or invalid',
  },
}

function effortVariant(effort: RoadmapStep['effort']): ScoreTone {
  if (effort === 'low') return 'green'
  if (effort === 'medium') return 'amber'
  return 'red'
}

function stageVariant(stage: Stage | null): ScoreTone {
  if (stage === 'mature' || stage === 'growth') return 'green'
  if (stage === 'seed') return 'amber'
  return 'gray'
}

function switchingCostsVariant(level: 'low' | 'medium' | 'high'): ScoreTone {
  if (level === 'high') return 'red'
  if (level === 'medium') return 'amber'
  return 'green'
}

// ─── Value helpers ───────────────────────────────────────────────

function isBlankInsightText(value: string | null | undefined): boolean {
  if (!value) return true
  return /^(not enough signal|unclear|n\/a|none|—|-|–)$/i.test(value.trim())
}

function isBusinessInsightsEmpty(insights: Insights['business']): boolean {
  return (
    !insights.stage &&
    isBlankInsightText(insights.businessModel) &&
    isBlankInsightText(insights.geography) &&
    isBlankInsightText(insights.jobToBeDone) &&
    isBlankInsightText(insights.pricingStrategy) &&
    isBlankInsightText(insights.funnelPath) &&
    insights.objectionsUnhandled.length === 0 &&
    insights.copyPatterns.length === 0 &&
    insights.brandSignals.length === 0
  )
}

function isCompetitorInsightsEmpty(insights: Insights['competitor']): boolean {
  return (
    isBlankInsightText(insights.category) &&
    isBlankInsightText(insights.wedge) &&
    !insights.switchingCosts &&
    insights.directCompetitors.length === 0 &&
    insights.indirectCompetitors.length === 0 &&
    insights.competitorAngles.length === 0 &&
    insights.unspokenGaps.length === 0 &&
    insights.buyerAlternatives.length === 0
  )
}

function cleanItems(items: string[] | undefined): string[] {
  return (Array.isArray(items) ? items : [])
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => Boolean(item) && !/not enough signal/i.test(item))
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function formatCharCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 chars'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k chars`
  return `${n} chars`
}

function splitUrlParts(raw: string): { host: string; path: string } {
  try {
    const url = new URL(raw)
    const path = `${url.pathname}${url.search}`.replace(/\/+$/, '') || '/'
    return { host: url.host.replace(/^www\./, ''), path }
  } catch {
    return { host: '', path: raw }
  }
}

/** Matches http(s) URLs and protocol-relative //host/... forms. */
const URL_IN_TEXT_RE =
  /(?:https?:\/\/|\/\/)[^\s<>"'`)\]]+/gi

function trimUrlMatch(raw: string): { href: string; display: string } {
  const display = raw.replace(/[.,;:!?)]+$/g, '')
  const href = display.startsWith('//') ? `https:${display}` : display
  return { href, display }
}

function isStandaloneUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  if (/^(https?:\/\/|\/\/)/i.test(trimmed)) return true
  // Bare domain / path that browsers can open (e.g. example.com/path or www.…)
  if (/^(www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:[/:?#][^\s]*)?$/i.test(trimmed)) {
    return true
  }
  return false
}

function toHref(raw: string): string {
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  return `https://${trimmed}`
}

function ExternalTextLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        'inline break-all font-medium text-primary underline-offset-2 hover:underline',
        className,
      )}
    >
      {children}
    </a>
  )
}

/** Turns URLs inside a string into clickable links; leaves other text alone. */
function linkifyText(text: string, linkClassName?: string): ReactNode {
  const value = text ?? ''
  if (!value) return value

  if (isStandaloneUrl(value)) {
    const display = value.trim().replace(/[.,;:!?)]+$/g, '')
    return (
      <ExternalTextLink href={toHref(display)} className={linkClassName}>
        {display}
      </ExternalTextLink>
    )
  }

  URL_IN_TEXT_RE.lastIndex = 0
  if (!URL_IN_TEXT_RE.test(value)) return value
  URL_IN_TEXT_RE.lastIndex = 0

  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = URL_IN_TEXT_RE.exec(value)) != null) {
    const start = match.index
    if (start > lastIndex) parts.push(value.slice(lastIndex, start))
    const { href, display } = trimUrlMatch(match[0])
    parts.push(
      <ExternalTextLink key={`url-${key++}`} href={href} className={linkClassName}>
        {display}
      </ExternalTextLink>,
    )
    // Re-append trailing punctuation stripped from the match
    if (display.length < match[0].length) {
      parts.push(match[0].slice(display.length))
    }
    lastIndex = start + match[0].length
  }

  if (lastIndex < value.length) parts.push(value.slice(lastIndex))
  return parts.length === 1 ? parts[0] : parts
}

// ─── Table primitives ────────────────────────────────────────────

const scanTableHeadClass =
  'border-b border-border-subtle px-3 py-2.5 text-left font-display text-[13px] font-semibold leading-tight tracking-tight text-muted-foreground'

const scanTableRowClass =
  'group border-b border-border-subtle/50 transition-colors last:border-0 hover:bg-muted/30'

function ScanTableStat({ dotClass, children }: { dotClass?: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
      {dotClass ? <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} aria-hidden /> : null}
      {children}
    </span>
  )
}

function ScanTableShell({ summary, children }: { summary?: ReactNode; children: ReactNode }) {
  return (
    <Card
      padding="none"
      radius="lg"
      topSlot={
        summary ? (
          <div className={cn(cardTopSlotRowClass, 'flex-wrap gap-x-3 gap-y-1.5')}>{summary}</div>
        ) : undefined
      }
    >
      <table className="w-full border-collapse">{children}</table>
    </Card>
  )
}

/** Section heading that replaces the old accordion header row. */
function ScanBlock({
  icon: Icon,
  title,
  caption,
  children,
}: {
  icon: typeof Search
  title: string
  caption?: string
  children: ReactNode
}) {
  return (
    <section className="min-w-0 space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-[13.5px] font-bold tracking-tight text-foreground">{title}</h3>
        {caption ? (
          <span className="text-[12px] text-muted-foreground">{caption}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-subtle bg-muted/10 px-3.5 py-4 text-[12.5px] leading-relaxed text-muted-foreground">
      {children}
    </div>
  )
}

function ItemList({ items, dotClass }: { items: string[]; dotClass?: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li key={`${index}-${item}`} className="flex items-start gap-2">
          <span
            className={cn(
              'mt-[0.4rem] inline-flex h-1.5 w-1.5 shrink-0 rounded-full',
              dotClass ?? 'bg-primary/50',
            )}
            aria-hidden
          />
          <span className="text-[12.5px] leading-relaxed text-foreground/90">
            {linkifyText(item)}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─── Field table (replaces the meta / list cards) ────────────────

type FieldRow = {
  label: string
  value?: ReactNode
  items?: string[]
  status?: FieldStatus
  mono?: boolean
  badge?: ReactNode
  hint?: string
}

function fieldRowHasContent(row: FieldRow): boolean {
  if (row.items && cleanItems(row.items).length > 0) return true
  if (row.badge) return true
  if (row.value == null) return false
  if (typeof row.value === 'string') return row.value.trim().length > 0
  return true
}

/** Drops nulls and rows with nothing worth rendering. */
function compactFieldRows(rows: (FieldRow | null)[]): FieldRow[] {
  return rows.filter((row): row is FieldRow => row != null && fieldRowHasContent(row))
}

function FieldsTable({
  rows,
  showStatus = false,
  labelHeader = 'Field',
  valueHeader = 'Value',
  summary,
}: {
  rows: FieldRow[]
  showStatus?: boolean
  labelHeader?: string
  valueHeader?: string
  summary?: ReactNode
}) {
  if (rows.length === 0) return <EmptyNote>Nothing was captured for this section.</EmptyNote>

  const counts = rows.reduce<Record<FieldStatus, number>>(
    (acc, row) => {
      if (row.status) acc[row.status] += 1
      return acc
    },
    { good: 0, warn: 0, bad: 0 },
  )

  const resolvedSummary =
    summary ??
    (showStatus ? (
      <>
        <span className="text-[12px] font-semibold text-foreground">
          {rows.length} check{rows.length === 1 ? '' : 's'}
        </span>
        <span className="text-muted-foreground/40" aria-hidden>
          ·
        </span>
        {(['good', 'warn', 'bad'] as const)
          .filter((status) => counts[status] > 0)
          .map((status) => (
            <ScanTableStat key={status} dotClass={FIELD_STATUS_META[status].dotClass}>
              {counts[status]} {FIELD_STATUS_META[status].label.toLowerCase()}
            </ScanTableStat>
          ))}
      </>
    ) : (
      <span className="text-[12px] font-semibold text-foreground">
        {rows.length} field{rows.length === 1 ? '' : 's'}
      </span>
    ))

  return (
    <ScanTableShell summary={resolvedSummary}>
      <thead>
        <tr>
          {showStatus ? (
            <th className={cn(scanTableHeadClass, 'w-11 pl-4')}>
              <span className="sr-only">Status</span>
            </th>
          ) : null}
          <th className={cn(scanTableHeadClass, 'w-[12rem] sm:w-[14rem]', !showStatus && 'pl-4')}>
            {labelHeader}
          </th>
          <th className={scanTableHeadClass}>{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const meta = row.status ? FIELD_STATUS_META[row.status] : null
          const StatusIcon = meta?.icon
          const items = row.items ? cleanItems(row.items) : null
          const display =
            typeof row.value === 'string'
              ? row.value.trim() || '—'
              : row.value ?? (items && items.length ? null : '—')

          return (
            <tr key={row.label} className={scanTableRowClass}>
              {showStatus && meta && StatusIcon ? (
                <td className={cn('border-l-2 px-3.5 py-2.5 align-top', meta.accentClass)}>
                  <StatusIcon
                    className={cn('h-4 w-4', meta.iconClass)}
                    aria-label={meta.label}
                  />
                </td>
              ) : showStatus ? (
                <td className="border-l-2 border-l-transparent px-3.5 py-2.5" />
              ) : null}

              <td className={cn('px-3.5 py-2.5 align-top', !showStatus && 'pl-4')}>
                <p className="text-[12.5px] font-semibold leading-snug text-foreground">
                  {row.label}
                </p>
                {row.hint ? (
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground/70">
                    {row.hint}
                  </p>
                ) : null}
              </td>

              <td className="px-3.5 py-2.5 align-top">
                {items && items.length > 0 ? (
                  <ItemList items={items} dotClass={meta?.dotClass} />
                ) : null}
                {display != null ? (
                  typeof display === 'string' ? (
                    <p
                      className={cn(
                        'break-words text-[12.5px] leading-relaxed text-foreground/90',
                        row.mono && 'font-mono text-[11.5px]',
                        row.status === 'bad' && 'text-rose-700/90',
                        row.status === 'warn' && 'text-amber-800/90',
                      )}
                    >
                      {linkifyText(display)}
                    </p>
                  ) : (
                    display
                  )
                ) : null}
                {row.badge ? <div className="mt-1.5">{row.badge}</div> : null}
              </td>
            </tr>
          )
        })}
      </tbody>
    </ScanTableShell>
  )
}

// ─── Named rows table (competitors, mentions, angles) ────────────

type NamedRow = {
  name: string
  detail: string
  badge?: ReactNode
}

function NamedRowsTable({
  rows,
  nameHeader,
  detailHeader,
  summary,
}: {
  rows: NamedRow[]
  nameHeader: string
  detailHeader: string
  summary?: ReactNode
}) {
  if (rows.length === 0) return null
  const hasBadge = rows.some((row) => Boolean(row.badge))

  return (
    <ScanTableShell
      summary={
        summary ?? (
          <span className="text-[12px] font-semibold text-foreground">
            {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
          </span>
        )
      }
    >
      <thead>
        <tr>
          <th className={cn(scanTableHeadClass, 'w-10 pl-4 text-right')}>#</th>
          <th className={cn(scanTableHeadClass, 'w-[13rem]')}>{nameHeader}</th>
          {hasBadge ? <th className={cn(scanTableHeadClass, 'w-28')}>Type</th> : null}
          <th className={scanTableHeadClass}>{detailHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.name}-${index}`} className={scanTableRowClass}>
            <td className="pl-4 pr-2 py-2.5 text-right align-top text-[11.5px] tabular-nums text-muted-foreground/60">
              {index + 1}
            </td>
            <td className="px-3.5 py-2.5 align-top">
              <p className="text-[12.5px] font-semibold leading-snug text-foreground">{row.name}</p>
            </td>
            {hasBadge ? (
              <td className="px-3.5 py-2.5 align-top">{row.badge ?? null}</td>
            ) : null}
            <td className="px-3.5 py-2.5 align-top">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {row.detail ? linkifyText(row.detail) : '—'}
              </p>
            </td>
          </tr>
        ))}
      </tbody>
    </ScanTableShell>
  )
}

// ─── Findings table ──────────────────────────────────────────────

function FindingsTable({ findings }: { findings: SeoAuditFinding[] }) {
  const source = Array.isArray(findings) ? findings : []
  if (source.length === 0) return <EmptyNote>Nothing flagged here.</EmptyNote>

  const rows = source
    .map((finding, index) => ({ finding, index, kind: findingKind(finding.severity) }))
    .sort((a, b) => {
      const byRank = FINDING_KIND_META[a.kind].rank - FINDING_KIND_META[b.kind].rank
      return byRank !== 0 ? byRank : a.index - b.index
    })

  const counts = rows.reduce<Record<FindingKind, number>>(
    (acc, row) => {
      acc[row.kind] += 1
      return acc
    },
    { bad: 0, warn: 0, good: 0 },
  )

  return (
    <ScanTableShell
      summary={
        <>
          <span className="text-[12px] font-semibold text-foreground">
            {rows.length} finding{rows.length === 1 ? '' : 's'}
          </span>
          <span className="text-muted-foreground/40" aria-hidden>
            ·
          </span>
          {(['bad', 'warn', 'good'] as const)
            .filter((kind) => counts[kind] > 0)
            .map((kind) => (
              <ScanTableStat key={kind} dotClass={FINDING_KIND_META[kind].dotClass}>
                {counts[kind]} {FINDING_KIND_META[kind].label.toLowerCase()}
              </ScanTableStat>
            ))}
        </>
      }
    >
      <thead>
        <tr>
          <th className={cn(scanTableHeadClass, 'w-40 pl-4')}>Severity</th>
          <th className={cn(scanTableHeadClass, 'md:w-[18rem]')}>Finding</th>
          <th className={cn(scanTableHeadClass, 'hidden md:table-cell')}>What we saw</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ finding, index, kind }) => {
          const meta = FINDING_KIND_META[kind]
          const Icon = meta.icon
          return (
            <tr key={`${finding.title}-${index}`} className={scanTableRowClass}>
              <td className={cn('border-l-2 px-3.5 py-3 align-top', meta.accentClass)}>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                    meta.chipClass,
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" aria-hidden />
                  {meta.label}
                </span>
              </td>
              <td className="px-3.5 py-3 align-top">
                <p className="text-[13px] font-semibold leading-snug text-foreground">
                  {finding.title}
                </p>
                {finding.detail ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground md:hidden">
                    {linkifyText(finding.detail)}
                  </p>
                ) : null}
              </td>
              <td className="hidden px-3.5 py-3 align-top md:table-cell">
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {finding.detail ? linkifyText(finding.detail) : '—'}
                </p>
              </td>
            </tr>
          )
        })}
      </tbody>
    </ScanTableShell>
  )
}

// ─── Pages table ─────────────────────────────────────────────────

function CrawledPagesTable({ pages }: { pages: CrawledPageSummary[] }) {
  if (pages.length === 0) return <EmptyNote>No pages were crawled for this scan.</EmptyNote>

  const okCount = pages.filter((page) => page.status >= 200 && page.status < 400).length
  const issueCount = pages.length - okCount
  const maxChars = pages.reduce(
    (max, page) => (Number.isFinite(page.charCount) ? Math.max(max, page.charCount) : max),
    0,
  )

  return (
    <ScanTableShell
      summary={
        <>
          <span className="text-[12px] font-semibold text-foreground">
            {pages.length} page{pages.length === 1 ? '' : 's'} crawled
          </span>
          <span className="text-muted-foreground/40" aria-hidden>
            ·
          </span>
          <ScanTableStat dotClass="bg-emerald-500">{okCount} reachable</ScanTableStat>
          {issueCount > 0 ? (
            <ScanTableStat dotClass="bg-amber-500">
              {issueCount} need{issueCount === 1 ? 's' : ''} a look
            </ScanTableStat>
          ) : null}
        </>
      }
    >
      <thead>
        <tr>
          <th className={cn(scanTableHeadClass, 'w-10 pl-4 text-right')}>#</th>
          <th className={scanTableHeadClass}>Page</th>
          <th className={cn(scanTableHeadClass, 'w-24')}>Status</th>
          <th className={cn(scanTableHeadClass, 'hidden w-32 text-right sm:table-cell')}>Content</th>
          <th className={cn(scanTableHeadClass, 'w-14')}>
            <span className="sr-only">Open</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {pages.map((page, index) => {
          const label = page.title?.trim() || page.url
          const ok = page.status >= 200 && page.status < 400
          const { host, path } = splitUrlParts(page.url)
          const charCount = Number.isFinite(page.charCount) ? page.charCount : 0
          const fillPct = maxChars > 0 ? Math.max(4, Math.round((charCount / maxChars) * 100)) : 0

          return (
            <tr key={page.url} className={scanTableRowClass}>
              <td className="pl-4 pr-2 py-3 text-right align-top text-[11.5px] tabular-nums text-muted-foreground/60">
                {index + 1}
              </td>

              <td className="max-w-0 px-3.5 py-3 align-top">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={label}
                  className="block truncate text-[13px] font-semibold leading-snug text-foreground underline-offset-2 transition-colors hover:text-primary hover:underline"
                >
                  {label}
                </a>
                <div className="mt-0.5 flex items-baseline gap-1 truncate font-mono text-[11px]">
                  {host ? <span className="shrink-0 text-muted-foreground/50">{host}</span> : null}
                  <span className="truncate text-muted-foreground/80">{path}</span>
                </div>
                {page.snippet ? (
                  <div className="mt-1.5 hidden sm:block">
                    <p
                      className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground/80"
                      title={page.snippet}
                    >
                      {page.snippet}
                    </p>
                  </div>
                ) : null}
              </td>

              <td className="whitespace-nowrap px-3.5 py-3 align-top">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums',
                    ok
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600'
                      : 'border-amber-500/25 bg-amber-500/10 text-amber-600',
                  )}
                >
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full', ok ? 'bg-emerald-500' : 'bg-amber-500')}
                    aria-hidden
                  />
                  {page.status}
                </span>
              </td>

              <td className="hidden px-3.5 py-3 text-right align-top sm:table-cell">
                <div className="inline-flex flex-col items-end gap-1">
                  <span className="text-[12px] font-semibold tabular-nums text-foreground/80">
                    {formatCharCount(charCount)}
                  </span>
                  <span className="block h-1 w-16 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary/40 transition-[width]"
                      style={{ width: `${fillPct}%` }}
                    />
                  </span>
                </div>
              </td>

              <td className="px-3.5 py-3 align-top">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Open ${label} in a new tab`}
                  title="Open page"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle text-muted-foreground/70 opacity-70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </td>
            </tr>
          )
        })}
      </tbody>
    </ScanTableShell>
  )
}

// ─── Pending state ───────────────────────────────────────────────

function SectionPendingBody({ label }: { label: string }) {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-muted/10 px-4 py-10 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">Analyzing {label.toLowerCase()}…</p>
      <p className="max-w-sm text-[12.5px] text-muted-foreground">
        This tab will fill in when the model finishes this pass.
      </p>
    </div>
  )
}

// ─── Hero ────────────────────────────────────────────────────────

function ScanReportHero({ report }: { report: WebsiteScanReport }) {
  const { profile, updateProfile } = useAuth()
  const [savingWebsite, setSavingWebsite] = useState(false)
  const topInsights = report.insights.standoutInsights.slice(0, 3)
  const siteUrl = report.normalizedUrl || report.url
  const isOwnWebsite =
    hostnameFromLooseUrl(profile?.website ?? '') === hostnameFromLooseUrl(siteUrl)

  async function saveAsOwnWebsite() {
    if (!siteUrl || savingWebsite || isOwnWebsite) return
    setSavingWebsite(true)
    const { error } = await updateProfile({ website: siteUrl })
    setSavingWebsite(false)
    if (error) {
      toast.error('Could not save as your website')
      return
    }
    toast.success('Saved as your website')
  }

  return (
    <div className={cn(detailHeroCardClassName, 'w-full overflow-hidden py-4 sm:py-5')}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="mt-1 font-display text-[clamp(1.25rem,3.5vw,1.75rem)] font-black leading-snug tracking-tight text-foreground">
            {report.meta.title ?? 'Untitled website'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="gray" size="sm">
              <Activity className="h-3 w-3" aria-hidden /> HTTP {report.status}
            </Badge>
            <Badge variant="gray" size="sm">
              <Layers className="h-3 w-3" aria-hidden /> {report.crawl.totalPages} pages
            </Badge>
            <Badge variant="gray" size="sm">
              <Zap className="h-3 w-3" aria-hidden /> {formatDuration(report.durationMs)}
            </Badge>
            <a href={report.url} target="_blank" rel="noreferrer noopener" className="max-w-full min-w-0">
              <Badge variant="blue" size="sm" className="max-w-full hover:underline">
                <span className="truncate">{report.url}</span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </Badge>
            </a>
            {isOwnWebsite ? (
              <Badge variant="green" size="sm">
                <Check className="h-3 w-3" aria-hidden /> Your website
              </Badge>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 min-h-7 gap-1.5 px-2.5 text-[11px] font-semibold"
                disabled={savingWebsite}
                onClick={() => void saveAsOwnWebsite()}
              >
                {savingWebsite ? (
                  <Loader2 className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" aria-hidden />
                )}
                Save as my website
              </Button>
            )}
          </div>
        </div>
      </div>

      {report.meta.description ? (
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
          {report.meta.description}
        </p>
      ) : null}

      {topInsights.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Top insights
          </p>
          <ul className="mt-2 space-y-1.5">
            {topInsights.map((insight, index) => (
              <li
                key={`${index}-${insight}`}
                className="flex items-start gap-2 text-[13px] text-foreground"
              >
                <span
                  className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
                  aria-hidden
                />
                <span className="leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

// ─── Tab panels ──────────────────────────────────────────────────

function SeoTab({ seo }: { seo: SeoAudit }) {
  const titleLen = seo.title?.trim().length ?? 0
  const descLen = seo.description?.trim().length ?? 0
  const h1Count = seo.h1.length
  const headingTotal = seo.headingsCount.h1 + seo.headingsCount.h2 + seo.headingsCount.h3

  const metaRows: FieldRow[] = [
    {
      label: 'Title',
      value: seo.title,
      hint: titleLen ? `${titleLen} chars` : undefined,
      status: !seo.title ? 'bad' : titleLen >= 30 && titleLen <= 65 ? 'good' : 'warn',
    },
    {
      label: 'Description',
      value: seo.description,
      hint: descLen ? `${descLen} chars` : undefined,
      status: !seo.description ? 'bad' : descLen >= 70 && descLen <= 170 ? 'good' : 'warn',
    },
    { label: 'Keywords', value: seo.keywords, status: seo.keywords ? 'good' : 'warn' },
    { label: 'Author', value: seo.author, status: seo.author ? 'good' : 'warn' },
    { label: 'Language', value: seo.language, status: seo.language ? 'good' : 'warn' },
    { label: 'Canonical', value: seo.canonical, mono: true, status: seo.canonical ? 'good' : 'bad' },
    {
      label: 'Robots',
      value: seo.robots,
      mono: true,
      status: seo.robots ? (/noindex|nofollow/i.test(seo.robots) ? 'warn' : 'good') : 'warn',
    },
    { label: 'Googlebot', value: seo.googlebot, mono: true, status: seo.googlebot ? 'good' : 'warn' },
    { label: 'Geo region', value: seo.geoRegion, status: seo.geoRegion ? 'good' : 'warn' },
    { label: 'Geo country', value: seo.geoCountry, status: seo.geoCountry ? 'good' : 'warn' },
    {
      label: 'Mobile ready',
      value: seo.hasViewport ? 'Yes (viewport set)' : 'Missing viewport',
      status: seo.hasViewport ? 'good' : 'bad',
    },
    {
      label: 'Favicon',
      value: seo.hasFavicon ? 'Present' : 'Missing',
      status: seo.hasFavicon ? 'good' : 'bad',
    },
    {
      label: 'Apple touch icon',
      value: seo.hasAppleTouchIcon ? 'Present' : 'Missing',
      status: seo.hasAppleTouchIcon ? 'good' : 'warn',
    },
    {
      label: 'Web manifest',
      value: seo.hasManifest ? 'Present' : 'Missing',
      status: seo.hasManifest ? 'good' : 'warn',
    },
    {
      label: 'H1s',
      value: h1Count ? seo.h1.join(' · ') : null,
      hint: `${h1Count} on page`,
      status: h1Count === 1 ? 'good' : h1Count > 1 ? 'warn' : 'bad',
    },
    {
      label: 'Word count',
      value: String(seo.wordCount),
      status: seo.wordCount <= 0 ? 'bad' : seo.wordCount < 200 ? 'warn' : 'good',
    },
    {
      label: 'Headings',
      value: `${headingTotal} total — H1 ${seo.headingsCount.h1} · H2 ${seo.headingsCount.h2} · H3 ${seo.headingsCount.h3}`,
      status: headingTotal <= 0 ? 'bad' : headingTotal === 1 ? 'warn' : 'good',
    },
    {
      label: 'Images missing alt',
      value: `${seo.imagesMissingAlt} of ${seo.imagesTotal}`,
      status:
        seo.imagesTotal === 0
          ? 'warn'
          : seo.imagesMissingAlt === 0
            ? 'good'
            : seo.imagesMissingAlt === seo.imagesTotal
              ? 'bad'
              : 'warn',
    },
    {
      label: 'Links',
      value: `${seo.internalLinks} internal / ${seo.externalLinks} external`,
      status:
        seo.internalLinks + seo.externalLinks === 0 ? 'warn' : seo.internalLinks > 0 ? 'good' : 'warn',
    },
  ]

  const socialRows: FieldRow[] = [
    { label: 'OG type', value: seo.ogType, status: seo.ogType ? 'good' : 'warn' },
    { label: 'OG site name', value: seo.ogSiteName, status: seo.ogSiteName ? 'good' : 'warn' },
    { label: 'OG locale', value: seo.ogLocale, status: seo.ogLocale ? 'good' : 'warn' },
    { label: 'OG URL', value: seo.ogUrl, mono: true, status: seo.ogUrl ? 'good' : 'warn' },
    { label: 'OG title', value: seo.ogTitle, status: seo.ogTitle ? 'good' : 'bad' },
    { label: 'OG description', value: seo.ogDescription, status: seo.ogDescription ? 'good' : 'bad' },
    { label: 'OG image', value: seo.ogImage, mono: true, status: seo.ogImage ? 'good' : 'bad' },
    { label: 'OG image alt', value: seo.ogImageAlt, status: seo.ogImageAlt ? 'good' : 'warn' },
    { label: 'Twitter card', value: seo.twitterCard, status: seo.twitterCard ? 'good' : 'bad' },
    { label: 'Twitter site', value: seo.twitterSite, status: seo.twitterSite ? 'good' : 'warn' },
    {
      label: 'Twitter creator',
      value: seo.twitterCreator,
      status: seo.twitterCreator ? 'good' : 'warn',
    },
    { label: 'Twitter title', value: seo.twitterTitle, status: seo.twitterTitle ? 'good' : 'warn' },
    {
      label: 'Twitter description',
      value: seo.twitterDescription,
      status: seo.twitterDescription ? 'good' : 'warn',
    },
    {
      label: 'Twitter image',
      value: seo.twitterImage,
      mono: true,
      status: seo.twitterImage ? 'good' : 'warn',
    },
  ]

  const structuredRows: FieldRow[] = [
    {
      label: 'JSON-LD',
      value: seo.hasJsonLd
        ? seo.jsonLdTypes.length
          ? `Present — ${seo.jsonLdTypes.join(', ')}`
          : 'Present'
        : 'Missing',
      status: seo.hasJsonLd ? 'good' : 'bad',
    },
    {
      label: 'Site verification',
      items: seo.siteVerification,
      value: seo.siteVerification.length ? null : 'None found',
      status: seo.siteVerification.length ? 'good' : 'warn',
    },
    {
      label: 'Analytics detected',
      items: seo.analytics,
      value: seo.analytics.length ? null : 'None found',
      status: seo.analytics.length ? 'good' : 'warn',
    },
    {
      label: 'Preloaded images (LCP)',
      items: seo.preloadImages,
      value: seo.preloadImages.length ? null : 'None found',
      status: seo.preloadImages.length ? 'good' : 'warn',
    },
  ]

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <ScanBlock icon={Search} title="Meta & technical" caption="Head tags, content, and link signals">
        <FieldsTable rows={metaRows} showStatus />
      </ScanBlock>

      <ScanBlock icon={Globe} title="Social previews" caption="How the page unfurls when shared">
        <FieldsTable rows={socialRows} showStatus />
      </ScanBlock>

      <ScanBlock icon={Layers} title="Structured data & tech" caption="Schema, verification, and tooling">
        <FieldsTable rows={structuredRows} showStatus valueHeader="Detected" />
      </ScanBlock>

      <ScanBlock icon={AlertCircle} title="On-page findings">
        <FindingsTable findings={seo.findings} />
      </ScanBlock>
    </div>
  )
}

function BusinessTab({
  business,
  insights,
  insightsPending = false,
}: {
  business: WebsiteScanReport['business']
  insights: Insights['business']
  insightsPending?: boolean
}) {
  const overviewRows = compactFieldRows([
    { label: 'Summary', value: business.summary },
    { label: 'Value proposition', value: business.valueProposition },
    { label: 'Audience', value: business.audience },
    { label: 'Differentiators', items: business.differentiators },
    { label: 'Weaknesses', items: business.weaknesses },
    { label: 'Calls to action', items: business.callToActions },
    { label: 'Monetization signals', items: business.monetizationSignals },
    { label: 'Social proof', items: business.socialProof },
    { label: 'Trust signals', items: business.trustSignals },
  ])

  const insightRows = compactFieldRows([
    insights.stage
      ? {
          label: 'Current Stage',
          value: insights.stage.evidence || insights.stage.label,
          badge: (
            <Badge variant={scoreBadgeVariant(stageVariant(insights.stage.label))} size="xs">
              {insights.stage.label}
            </Badge>
          ),
        }
      : null,
    !isBlankInsightText(insights.pricingStrategy)
      ? { label: 'Pricing Strategy', value: insights.pricingStrategy }
      : null,
    !isBlankInsightText(insights.geography)
      ? { label: 'Target Geography', value: insights.geography }
      : null,
    !isBlankInsightText(insights.businessModel)
      ? { label: 'Business Model', value: insights.businessModel }
      : null,
    !isBlankInsightText(insights.jobToBeDone)
      ? { label: 'Job to Be Done', value: insights.jobToBeDone }
      : null,
    !isBlankInsightText(insights.funnelPath)
      ? { label: 'Funnel path', value: insights.funnelPath }
      : null,
    { label: "Objections the page doesn't handle", items: insights.objectionsUnhandled },
    { label: 'Copy patterns', items: insights.copyPatterns },
    { label: 'Brand signals', items: insights.brandSignals },
  ])

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <ScanBlock icon={Building2} title="Overview" caption="What the site says it does">
        {overviewRows.length ? (
          <FieldsTable rows={overviewRows} labelHeader="Signal" valueHeader="What we found" />
        ) : (
          <EmptyNote>The model didn&apos;t return a business overview for this site.</EmptyNote>
        )}
      </ScanBlock>

      <ScanBlock icon={Radar} title="Deeper insights" caption="Model read of the underlying business">
        {insightsPending ? (
          <SectionPendingBody label="Deeper insights" />
        ) : isBusinessInsightsEmpty(insights) || insightRows.length === 0 ? (
          <EmptyNote>
            Deeper insights weren&apos;t generated for this site — the model either refused or
            returned too little to work with.
          </EmptyNote>
        ) : (
          <FieldsTable rows={insightRows} labelHeader="Insight" valueHeader="Read" />
        )}
      </ScanBlock>

      <ScanBlock icon={AlertCircle} title="Business findings">
        <FindingsTable findings={business.findings} />
      </ScanBlock>
    </div>
  )
}

function CompetitorTab({
  competitor,
  insights,
  insightsPending = false,
}: {
  competitor: WebsiteScanReport['competitor']
  insights: Insights['competitor']
  insightsPending?: boolean
}) {
  const positioningRows = compactFieldRows([
    { label: 'Summary', value: competitor.summary },
    { label: 'Positioning', value: competitor.positioning },
    { label: 'Likely competitors', items: competitor.likelyCompetitors },
    { label: 'Gaps vs. category', items: competitor.gaps },
  ])

  const mentionRows: NamedRow[] = competitor.mentions.map((mention) => ({
    name: mention.name,
    detail: mention.context,
  }))

  const rivalRows: NamedRow[] = [
    ...insights.directCompetitors.map((item) => ({
      name: item.name,
      detail: item.whyThreat,
      badge: (
        <Badge variant="red" size="xs">
          Direct
        </Badge>
      ),
    })),
    ...insights.indirectCompetitors.map((item) => ({
      name: item.name,
      detail: item.whyThreat,
      badge: (
        <Badge variant="amber" size="xs">
          Indirect
        </Badge>
      ),
    })),
  ]

  const angleRows: NamedRow[] = insights.competitorAngles.map((angle) => ({
    name: angle.name,
    detail: angle.whatSiteSays,
  }))

  const landscapeRows = compactFieldRows([
    !isBlankInsightText(insights.category) ? { label: 'Category', value: insights.category } : null,
    insights.switchingCosts
      ? {
          label: 'Switching costs',
          value: insights.switchingCosts.evidence,
          badge: (
            <Badge
              variant={scoreBadgeVariant(switchingCostsVariant(insights.switchingCosts.level))}
              size="xs"
            >
              {insights.switchingCosts.level} switching costs
            </Badge>
          ),
        }
      : null,
    !isBlankInsightText(insights.wedge) ? { label: 'Defensible wedge', value: insights.wedge } : null,
    { label: 'Realistic buyer alternatives', items: insights.buyerAlternatives },
    { label: "What's conspicuously missing", items: insights.unspokenGaps },
  ])

  const landscapeEmpty = isCompetitorInsightsEmpty(insights)

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <ScanBlock icon={TrendingUp} title="Positioning" caption="How the site frames itself">
        {positioningRows.length ? (
          <FieldsTable rows={positioningRows} labelHeader="Signal" valueHeader="What we found" />
        ) : (
          <EmptyNote>No positioning signals were returned for this site.</EmptyNote>
        )}
      </ScanBlock>

      {mentionRows.length > 0 ? (
        <ScanBlock icon={Layers} title="Competitors might be named or physically mentioned">
          <NamedRowsTable rows={mentionRows} nameHeader="Competitor" detailHeader="Context" />
        </ScanBlock>
      ) : null}

      <ScanBlock icon={Radar} title="Competitive Landscape" caption="Found by Reddit Marketing research">
        {insightsPending ? (
          <SectionPendingBody label="Competitive Landscape" />
        ) : landscapeEmpty ? (
          <EmptyNote>
            Competitive landscape insights weren&apos;t generated — the site likely doesn&apos;t name
            rivals, and the deeper pass returned too little to work with.
          </EmptyNote>
        ) : (
          <div className="space-y-4">
            {landscapeRows.length ? (
              <FieldsTable rows={landscapeRows} labelHeader="Insight" valueHeader="Read" />
            ) : null}
            {rivalRows.length ? (
              <NamedRowsTable
                rows={rivalRows}
                nameHeader="Rival"
                detailHeader="Why it's a threat"
                summary={
                  <>
                    <span className="text-[12px] font-semibold text-foreground">
                      {rivalRows.length} rival{rivalRows.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-muted-foreground/40" aria-hidden>
                      ·
                    </span>
                    <ScanTableStat dotClass="bg-red-500">
                      {insights.directCompetitors.length} direct
                    </ScanTableStat>
                    <ScanTableStat dotClass="bg-amber-500">
                      {insights.indirectCompetitors.length} indirect
                    </ScanTableStat>
                  </>
                }
              />
            ) : null}
            {angleRows.length ? (
              <NamedRowsTable
                rows={angleRows}
                nameHeader="Angle"
                detailHeader="What the site says"
              />
            ) : null}
          </div>
        )}
      </ScanBlock>

      <ScanBlock icon={AlertCircle} title="Competitive findings">
        <FindingsTable findings={competitor.findings} />
      </ScanBlock>
    </div>
  )
}

function groupRoadmapSteps(steps: RoadmapStep[]): {
  phase: string | null
  phaseDetail: string
  items: { step: RoadmapStep; index: number }[]
}[] {
  const phaseRe = /^day\s+\d+/i
  const groups: {
    phase: string | null
    phaseDetail: string
    items: { step: RoadmapStep; index: number }[]
  }[] = []
  let current: (typeof groups)[number] | null = null

  steps.forEach((step, index) => {
    const title = step?.title?.trim() || `Step ${index + 1}`
    if (phaseRe.test(title)) {
      current = {
        phase: title,
        phaseDetail: typeof step.detail === 'string' ? step.detail : '',
        items: [],
      }
      groups.push(current)
      return
    }
    if (!current) {
      current = { phase: null, phaseDetail: '', items: [] }
      groups.push(current)
    }
    current.items.push({ step, index })
  })

  return groups
}

function RoadmapStepsTable({ steps }: { steps: RoadmapStep[] }) {
  if (steps.length === 0) return <EmptyNote>No steps were returned for this audit.</EmptyNote>

  const grouped = groupRoadmapSteps(steps)
  const totalSteps = grouped.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <ScanTableShell
      summary={
        <>
          <span className="text-[12px] font-semibold text-foreground">
            {totalSteps} step{totalSteps === 1 ? '' : 's'}
          </span>
          {grouped.some((group) => group.phase) ? (
            <>
              <span className="text-muted-foreground/40" aria-hidden>
                ·
              </span>
              <ScanTableStat>
                {grouped.filter((group) => group.phase).length} phases
              </ScanTableStat>
            </>
          ) : null}
        </>
      }
    >
      <thead>
        <tr>
          <th className={cn(scanTableHeadClass, 'w-10 pl-4 text-right')}>#</th>
          <th className={cn(scanTableHeadClass, 'w-[16rem]')}>Step</th>
          <th className={cn(scanTableHeadClass, 'w-32')}>Effort</th>
          <th className={cn(scanTableHeadClass, 'hidden md:table-cell')}>What to do</th>
        </tr>
      </thead>
      {grouped.map((group, groupIndex) => (
        <tbody key={group.phase ?? `ungrouped-${groupIndex}`}>
          {group.phase ? (
            <tr className="border-b border-border-subtle/50 bg-muted/25">
              <td colSpan={4} className="px-4 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/70">
                  {group.phase}
                </p>
                {group.phaseDetail ? (
                  <p className="mt-0.5 max-w-3xl text-[12px] leading-relaxed text-muted-foreground">
                    {linkifyText(group.phaseDetail)}
                  </p>
                ) : null}
              </td>
            </tr>
          ) : null}
          {group.items.map(({ step, index }) => {
            const effort =
              step?.effort === 'low' || step?.effort === 'medium' || step?.effort === 'high'
                ? step.effort
                : 'medium'
            const title = step?.title?.trim() || `Step ${index + 1}`
            const detail = step?.detail ?? ''
            return (
              <tr key={`${title}-${index}`} className={scanTableRowClass}>
                <td className="pl-4 pr-2 py-3 text-right align-top text-[11.5px] tabular-nums text-muted-foreground/60">
                  {index + 1}
                </td>
                <td className="px-3.5 py-3 align-top">
                  <p className="text-[12.5px] font-semibold leading-snug text-foreground">{title}</p>
                  {detail ? (
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground md:hidden">
                      {linkifyText(detail)}
                    </p>
                  ) : null}
                </td>
                <td className="px-3.5 py-3 align-top">
                  <Badge variant={scoreBadgeVariant(effortVariant(effort))} size="xs">
                    {effort} effort
                  </Badge>
                </td>
                <td className="hidden px-3.5 py-3 align-top md:table-cell">
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    {detail ? linkifyText(detail) : '—'}
                  </p>
                </td>
              </tr>
            )
          })}
        </tbody>
      ))}
    </ScanTableShell>
  )
}

function RoadmapTab({ roadmap }: { roadmap: RoadmapAudit }) {
  const steps = Array.isArray(roadmap.steps) ? roadmap.steps : []
  const summary = typeof roadmap.summary === 'string' ? roadmap.summary : ''
  const quickWins = Array.isArray(roadmap.quickWins)
    ? roadmap.quickWins.filter((item): item is string => typeof item === 'string')
    : []
  const bigBets = Array.isArray(roadmap.bigBets)
    ? roadmap.bigBets.filter((item): item is string => typeof item === 'string')
    : []
  const horizonDays = coerceHorizonDisplay(roadmap.horizonDays)

  const planRows = compactFieldRows([
    summary
      ? {
          label: 'Summary',
          value: summary,
          badge: (
            <Badge variant="gray" size="xs">
              <Rocket className="h-3 w-3" aria-hidden /> {horizonDays}-day horizon
            </Badge>
          ),
        }
      : null,
    { label: 'Quick wins', items: quickWins },
    { label: 'Big bets', items: bigBets },
  ])

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <ScanBlock icon={Map} title="Plan" caption={`${horizonDays}-day horizon`}>
        {planRows.length ? (
          <FieldsTable rows={planRows} labelHeader="Plan" valueHeader="Detail" />
        ) : (
          <EmptyNote>No plan was returned for this audit.</EmptyNote>
        )}
      </ScanBlock>

      <ScanBlock icon={Rocket} title="Step-by-step">
        <RoadmapStepsTable steps={steps} />
      </ScanBlock>

      <ScanBlock icon={AlertCircle} title="Roadmap findings">
        <FindingsTable findings={roadmap.findings} />
      </ScanBlock>
    </div>
  )
}

// ─── Root ────────────────────────────────────────────────────────

function TabScoreChip({ score }: { score: number }) {
  const tone = scoreToneVariant(score)
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums',
        tone === 'green' && 'bg-emerald-500/15 text-emerald-600',
        tone === 'amber' && 'bg-amber-500/15 text-amber-600',
        tone === 'red' && 'bg-red-500/15 text-red-600',
      )}
    >
      {score}
    </span>
  )
}

export function WebsiteScanReportView({ report }: { report: WebsiteScanReport }) {
  const pending = new Set(report.pendingSections ?? [])
  const isRunning = report.scanStatus === 'running'
  const sectionPending = (id: ScanSectionId) => isRunning && pending.has(id)

  return (
    <>
      <ScanReportHero report={report} />

      <div className="w-full min-w-0 pb-8">
        {isRunning ? (
          <div className="mb-4 flex items-center gap-2 border-x border-border-subtle bg-primary/5 px-5 py-2 text-[13px] text-foreground layout-sm:px-6">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            <span>
              Scan in progress
              {pending.size > 0 ? ` — finishing ${[...pending].join(', ')}` : ' — wrapping up'}…
            </span>
          </div>
        ) : null}

        <InternalPageDataTabs
          defaultValue="seo"
          tabs={[
            ...SCAN_REPORT_SECTIONS.map((section) => {
              const Icon = section.icon
              const busy = sectionPending(section.key)
              return {
                id: section.key,
                label: section.label,
                icon: <Icon aria-hidden />,
                extra: busy ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" aria-hidden />
                ) : (
                  <TabScoreChip score={report[section.key].score} />
                ),
              }
            }),
            {
              id: 'pages',
              label: 'Pages',
              icon: <Layers aria-hidden />,
              extra: (
                <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-bold tabular-nums text-muted-foreground">
                  {report.crawl.pages.length}
                </span>
              ),
            },
          ]}
        >
            <TabsContent value="seo" className={internalPageTabPanelClass}>
              <SeoTab seo={report.seo} />
            </TabsContent>

            <TabsContent value="business" className={internalPageTabPanelClass}>
              {sectionPending('business') ? (
                <SectionPendingBody label="Business signals" />
              ) : (
                <BusinessTab
                  business={report.business}
                  insights={report.insights.business}
                  insightsPending={sectionPending('insights')}
                />
              )}
            </TabsContent>

            <TabsContent value="competitor" className={internalPageTabPanelClass}>
              {sectionPending('competitor') ? (
                <SectionPendingBody label="Competitive positioning" />
              ) : (
                <CompetitorTab
                  competitor={report.competitor}
                  insights={report.insights.competitor}
                  insightsPending={sectionPending('insights')}
                />
              )}
            </TabsContent>

            <TabsContent value="roadmap" className={internalPageTabPanelClass}>
              {sectionPending('roadmap') ? (
                <SectionPendingBody label="Roadmap" />
              ) : (
                <RoadmapTab roadmap={report.roadmap} />
              )}
            </TabsContent>

            <TabsContent value="pages" className={internalPageTabPanelClass}>
              <ScanBlock icon={Layers} title="Pages scanned" caption="Everything the crawler reached">
                <CrawledPagesTable pages={report.crawl.pages} />
              </ScanBlock>
            </TabsContent>
        </InternalPageDataTabs>
      </div>
    </>
  )
}

function coerceHorizonDisplay(raw: unknown): 30 | 60 | 90 {
  if (raw === 30 || raw === 60 || raw === 90) return raw
  if (Array.isArray(raw)) {
    const nums = raw
      .map((item) => (typeof item === 'number' ? item : Number(item)))
      .filter((n): n is 30 | 60 | 90 => n === 30 || n === 60 || n === 90)
    if (nums.length) return Math.max(...nums) as 30 | 60 | 90
  }
  return 90
}

import type { DiscoverHeroWorkspaceMetric } from '@/components/discover/DiscoverHeroMetricStrip'
import type { MarketTestListRow } from '@/lib/marketTestApi'
import type { SourcingHistoryRow } from '@/lib/sourcingTypes'
import { formatHistoryBudget, formatSourcingTimestamp } from '@/lib/sourcingHistoryDetails'
import {
  formatInvestorCheckSize,
  formatInvestorFirmType,
  formatInvestorLabel,
} from '@/lib/investorsDisplay'
import type { Investor } from '@/types/investors'
import type { WebsiteScanHistorySummary } from '@/lib/websiteScannerApi'

function scoreMetricTone(score: number): DiscoverHeroWorkspaceMetric['tone'] {
  if (score >= 75) return 'success'
  if (score > 0) return 'default'
  return 'muted'
}

function formatScore(value: number | null | undefined): string {
  const n = Number(value)
  return Number.isFinite(n) ? String(Math.round(n)) : '—'
}

export function scanWorkspaceMetrics(
  row: WebsiteScanHistorySummary,
): [DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric] {
  return [
    { label: 'SEO', value: formatScore(row.seo_score), tone: scoreMetricTone(Number(row.seo_score)) },
    {
      label: 'Business',
      value: formatScore(row.business_score),
      tone: scoreMetricTone(Number(row.business_score)),
    },
    {
      label: 'Competitor',
      value: formatScore(row.competitor_score),
      tone: scoreMetricTone(Number(row.competitor_score)),
    },
  ]
}

function marketTestStatusLabel(status: string | null | undefined): string {
  const value = String(status ?? '').toLowerCase()
  if (value === 'complete') return 'Complete'
  if (value === 'failed') return 'Failed'
  if (value === 'pending' || value === 'running') return 'Running'
  return value ? value : '—'
}

export function marketTestWorkspaceMetrics(
  row: MarketTestListRow,
): [DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric] {
  const score = Number(row.market_reality_score)
  const verdict = row.verdict_label?.trim() || row.verdict?.trim() || '—'
  const status = marketTestStatusLabel(row.generation_status)

  return [
    {
      label: 'Score',
      value: Number.isFinite(score) ? String(Math.round(score)) : '—',
      tone: Number.isFinite(score) && score >= 60 ? 'success' : 'default',
    },
    { label: 'Verdict', value: verdict, tone: verdict !== '—' ? 'default' : 'muted' },
    {
      label: 'Status',
      value: status,
      tone: status === 'Complete' ? 'success' : status === 'Failed' ? 'muted' : 'default',
    },
  ]
}

export const EMPTY_MARKET_TEST_WORKSPACE_METRICS: [
  DiscoverHeroWorkspaceMetric,
  DiscoverHeroWorkspaceMetric,
  DiscoverHeroWorkspaceMetric,
] = [
  { label: 'Score', value: '—', tone: 'muted' },
  { label: 'Verdict', value: '—', tone: 'muted' },
  { label: 'Status', value: 'Running', tone: 'default' },
]

export function sourcingWorkspaceMetrics(
  row: SourcingHistoryRow,
): [DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric] {
  const sourceCount = Array.isArray(row.sources) ? row.sources.length : 0
  return [
    {
      label: 'Budget',
      value: formatHistoryBudget(row.budget_max),
      tone: row.budget_max != null ? 'default' : 'muted',
    },
    {
      label: 'Suppliers',
      value: String(row.total_results ?? 0),
      tone: row.total_results > 0 ? 'success' : 'muted',
    },
    {
      label: 'Sources',
      value: sourceCount > 0 ? String(sourceCount) : '—',
      tone: sourceCount > 0 ? 'default' : 'muted',
    },
  ]
}

export function investorWorkspaceMetrics(
  investor: Pick<
    Investor,
    'firm_type' | 'hq_country' | 'check_size_min_usd' | 'check_size_max_usd'
  >,
): [DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric, DiscoverHeroWorkspaceMetric] {
  const type = investor.firm_type?.trim()
    ? formatInvestorFirmType(investor.firm_type)
    : '—'
  const hq = investor.hq_country?.trim() || '—'
  const check = formatInvestorCheckSize(investor.check_size_min_usd, investor.check_size_max_usd)

  return [
    { label: 'Type', value: type, tone: type !== '—' ? 'default' : 'muted' },
    { label: 'HQ', value: hq, tone: hq !== '—' ? 'default' : 'muted' },
    { label: 'Check', value: check, tone: check !== '—' ? 'success' : 'muted' },
  ]
}

export function investorWorkspaceStagesLabel(
  investor: Pick<Investor, 'stages'>,
): string {
  const stages = (investor.stages ?? [])
    .slice(0, 3)
    .map((stage) => formatInvestorLabel(stage).trim())
    .filter(Boolean)
  return stages.length > 0 ? stages.join(', ') : '—'
}

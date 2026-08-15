import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/hooks/useCurrency'
import { shapeUserResearchOpportunityRow } from '@/hooks/useOpportunityDetail'
import { isCompleteUserResearch } from '@/lib/userResearch'
import { formatConvertedValue, normalizeBusinessOverviewMarkdown, deriveMarginPct } from '@/lib/opportunityDetailUtils'
import { toast } from '@/components/ui/sonner'
import { Button, Card } from '@/components/ui'
import { MarketingText } from '@/components/ui/MarketingText'
import { RisingMarkdown } from '@/components/opportunity/detail/RisingMarkdown'
import { rv } from '@/lib/responsive'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { DiscoverWide } from '@/components/page-shells'
import { cn } from '@/lib/utils'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'
import OpportunityDetailPage from './OpportunityDetailPage'

const RESEARCH_HOME = roomPathForMode('research')

type UserOpportunityRow = Record<string, any>

function safeArray<T = any>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[]
  return []
}

export default function UserOpportunityDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const bp = useBreakpoint()
  const isMobile = bp === 'mobile' || bp === 'tablet'
  const { formatMoney, formatSetupCost, localizeText } = useCurrency()

  const [row, setRow] = useState<UserOpportunityRow | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id || !slug) return
    setLoading(true)
    const { data, error } = await supabase
      .from('user_opportunities')
      .select('*')
      .eq('user_id', user.id)
      .eq('slug', slug)
      .maybeSingle()
    if (error || !data) {
      toast.error('Opportunity not found', { description: 'This idea may have been removed or is not accessible.' })
      navigate(RESEARCH_HOME, { replace: true })
      return
    }
    setRow(shapeUserResearchOpportunityRow(data) as UserOpportunityRow)
    setLoading(false)
  }, [navigate, slug, user?.id])

  useEffect(() => {
    void load()
  }, [load])

  const shapedRow = useMemo(
    () => (row ? (shapeUserResearchOpportunityRow(row) as UserOpportunityRow) : null),
    [row],
  )

  const isComplete = Boolean(shapedRow && isCompleteUserResearch(shapedRow))

  const title = String(shapedRow?.title ?? '')
  const tagline = localizeText(String(shapedRow?.tagline ?? ''))

  const machinery = useMemo(() => safeArray<any>(shapedRow?.machinery_list), [shapedRow?.machinery_list])
  const rawMaterials = useMemo(() => safeArray<any>(shapedRow?.raw_materials), [shapedRow?.raw_materials])
  const licenses = useMemo(() => safeArray<any>(shapedRow?.licenses_required), [shapedRow?.licenses_required])
  const faqs = useMemo(() => safeArray<any>(shapedRow?.faqs), [shapedRow?.faqs])
  const faqsWithQuestions = useMemo(
    () =>
      faqs.filter((f) => {
        const q = f?.question ?? f?.q
        return typeof q === 'string' && q.trim().length > 0
      }),
    [faqs],
  )

  const machineryRows = useMemo(
    () =>
      machinery
        .filter((m) => typeof m?.name === 'string' && m.name.trim().length > 0)
        .slice(0, 24),
    [machinery],
  )

  const rawMaterialRows = useMemo(
    () =>
      rawMaterials
        .filter((r) => typeof r?.name === 'string' && r.name.trim().length > 0)
        .slice(0, 30),
    [rawMaterials],
  )

  const licenseRows = useMemo(
    () =>
      licenses
        .filter((l) => typeof l?.name === 'string' && l.name.trim().length > 0)
        .slice(0, 20),
    [licenses],
  )

  const hasSetupRange = useMemo(() => {
    const a = shapedRow?.setup_min
    const b = shapedRow?.setup_max
    return (a != null && a !== '') || (b != null && b !== '')
  }, [shapedRow?.setup_min, shapedRow?.setup_max])

  const marginPct = useMemo(() => deriveMarginPct(shapedRow), [shapedRow])
  const hasMargin = useMemo(() => marginPct > 0, [marginPct])

  const hasMonthlyRev = useMemo(() => {
    const a = shapedRow?.monthly_rev_min
    const b = shapedRow?.monthly_rev_max
    return (a != null && a !== '') || (b != null && b !== '')
  }, [shapedRow?.monthly_rev_min, shapedRow?.monthly_rev_max])

  const showMetrics = hasSetupRange || hasMargin || hasMonthlyRev

  const overviewMarkdown = useMemo(() => {
    const full = String(shapedRow?.full_desc ?? '').trim()
    const raw = full || String(shapedRow?.tagline ?? '').trim()
    return normalizeBusinessOverviewMarkdown(raw)
  }, [shapedRow?.full_desc, shapedRow?.tagline])

  const showOverview = overviewMarkdown.length > 0

  if (!user?.id) return null
  if (loading) return null
  if (!shapedRow) return null

  if (isComplete) {
    return (
      <OpportunityDetailPage
        opportunityOverride={shapedRow as Record<string, unknown>}
        isUserResearch
        onOpportunityRefresh={() => void load()}
      />
    )
  }

  const backHref = RESEARCH_HOME

  const formatLicenseCost = (cost: unknown) => {
    if (cost == null || cost === '') return null
    const n = Number(cost)
    if (Number.isFinite(n) && n > 0) return formatMoney(n)
    return formatConvertedValue(cost, formatMoney)
  }

  return (
    <div className="min-h-screen bg-background grain-texture">
      <div className="w-full border-b border-border-subtle bg-card py-3.5">
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate(backHref)}>
            Back
          </Button>
          <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            My opportunity · {String(shapedRow.status ?? 'draft')}
          </div>
        </div>
      </div>

      <main className="overflow-x-clip">
        <DiscoverWide className="py-5 pb-12">
        <div className="mb-4">
          <MarketingText
            key={String(shapedRow.id ?? title)}
            as="h1"
            text={title}
            speed="fast"
            wordWrap
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: rv(bp, { mobile: '26px', tablet: '34px', desktop: '44px' }),
              fontWeight: 800,
              lineHeight: 1.1,
              margin: 0,
              color: 'hsl(var(--foreground))',
            }}
          />
          {tagline ? (
            <MarketingText
              key={`${String(shapedRow.id ?? title)}-tagline`}
              as="p"
              text={tagline}
              speed="fast"
              wordWrap
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'hsl(var(--text-secondary))',
                lineHeight: 1.6,
              }}
            />
          ) : null}
        </div>

        {showMetrics ? (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: isMobile
                ? '1fr'
                : [hasSetupRange, hasMargin, hasMonthlyRev].filter(Boolean).length === 1
                  ? 'minmax(0, 1fr)'
                  : [hasSetupRange, hasMargin, hasMonthlyRev].filter(Boolean).length === 2
                    ? 'repeat(2, minmax(0, 1fr))'
                    : 'repeat(3, minmax(0, 1fr))',
            }}
          >
            {hasSetupRange ? (
              <Card radius="none" style={{ boxShadow: 'none' }}>
                <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Setup
                </div>
                <div className="mt-1 text-[16px] font-semibold text-foreground">
                  {formatSetupCost(Number(shapedRow.setup_min) || 0, Number(shapedRow.setup_max) || 0)}
                </div>
              </Card>
            ) : null}
            {hasMargin ? (
              <Card radius="none" style={{ boxShadow: 'none' }}>
                <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Margin
                </div>
                <div className="mt-1 text-[16px] font-semibold text-foreground">
                  {`${Math.round(marginPct)}%`}
                </div>
              </Card>
            ) : null}
            {hasMonthlyRev ? (
              <Card radius="none" style={{ boxShadow: 'none' }}>
                <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Monthly revenue
                </div>
                <div className="mt-1 text-[16px] font-semibold text-foreground">
                  {`${formatMoney(Number(shapedRow.monthly_rev_min) || 0)}–${formatMoney(Number(shapedRow.monthly_rev_max) || 0)}`}
                </div>
              </Card>
            ) : null}
          </div>
        ) : null}

        {showOverview ? (
          <div className={showMetrics ? 'mt-5' : ''}>
            <Card radius="none" style={{ boxShadow: 'none' }}>
              <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Overview
              </div>
              <div className="text-[15px] text-foreground leading-relaxed">
                <RisingMarkdown
                  text={overviewMarkdown}
                  resetKey={String(shapedRow.id ?? title)}
                  isMobile={isMobile}
                  className="text-[15px] text-foreground leading-relaxed"
                />
              </div>
            </Card>
          </div>
        ) : null}

        {machineryRows.length > 0 ? (
          <div className={showMetrics || showOverview ? 'mt-5' : ''}>
            <Card radius="none" style={{ boxShadow: 'none' }}>
              <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Machinery
              </div>
              <div className="grid gap-2">
                {machineryRows.map((m, i) => (
                  <div key={i} className="border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-foreground">{m.name ?? '—'}</div>
                        {m.purpose ? <div className="text-[12px] text-muted-foreground mt-0.5">{m.purpose}</div> : null}
                      </div>
                      <div className="font-semibold text-[12px] font-semibold text-foreground">
                        {m.cost_approx ? formatMoney(Number(m.cost_approx)) : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {rawMaterialRows.length > 0 ? (
          <div className="mt-5">
            <Card radius="none" style={{ boxShadow: 'none' }}>
              <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Raw materials
              </div>
              <div className="grid gap-2">
                {rawMaterialRows.map((r, i) => (
                  <div key={i} className="border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-foreground">{r.name ?? '—'}</div>
                        {r.source ? <div className="text-[12px] text-muted-foreground mt-0.5">{r.source}</div> : null}
                      </div>
                      <div className="font-semibold text-[12px] font-semibold text-foreground">
                        {r.rate_per_unit
                          ? formatMoney(Number(r.rate_per_unit))
                          : formatConvertedValue(r.cost_per_unit, formatMoney)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {licenseRows.length > 0 ? (
          <div className="mt-5">
            <Card radius="none" style={{ boxShadow: 'none' }}>
              <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                Licences
              </div>
              <div className="grid gap-2">
                {licenseRows.map((l, i) => {
                  const costLabel = formatLicenseCost(l.cost)
                  return (
                    <div key={i} className="border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                      <div className="text-[14px] font-semibold text-foreground">{l.name ?? '—'}</div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        {l.authority ?? '—'}
                        {l.days ? ` · ${l.days} days` : ''}
                        {costLabel ? ` · ${costLabel}` : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        ) : null}

        {faqsWithQuestions.length > 0 ? (
          <div className="mt-5">
            <Card radius="none" style={{ boxShadow: 'none' }}>
              <div className="text-[11px] font-semibold font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">
                FAQs
              </div>
              <div className="grid gap-3">
                {faqsWithQuestions.slice(0, 12).map((f, i) => {
                  const q = f?.question ?? f?.q
                  const a = f?.answer ?? f?.a
                  return (
                    <div key={i} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                      <div className="text-[14px] font-semibold text-foreground">{localizeText(String(q).trim())}</div>
                      {typeof a === 'string' && a.trim() ? (
                        <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{localizeText(a)}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        ) : null}
        </DiscoverWide>
      </main>
    </div>
  )
}

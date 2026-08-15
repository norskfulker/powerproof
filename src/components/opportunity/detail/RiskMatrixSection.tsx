import { useMemo } from 'react'
import type { ElementType } from 'react'
import {
  AlertTriangle,
  Eye,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
} from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityProLock } from '@/components/opportunity/detail/OpportunityProLock'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import {
  parseOppJsonField,
  type RiskMatrixData,
  type RiskMatrixRiskItem,
} from '@/lib/researchDepthTypes'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { iconClassName, type IconTone } from '@/lib/iconClassNames'

import {
  opportunityCardTopSlotMetaClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
  opportunityCardTopSlotToneStyle,
  opportunityDetailCardClass,
} from '@/lib/opportunityCardClasses'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

const LEVEL_VARIANT: Record<string, 'green' | 'amber' | 'red'> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
  critical: 'red',
}

const SCORE_ORDER: RiskLevel[] = ['critical', 'high', 'medium', 'low']
const PROB_AXIS = ['low', 'medium', 'high'] as const
const IMPACT_AXIS = ['high', 'medium', 'low'] as const

export type NormalizedRisk = RiskMatrixRiskItem & {
  probability: string
  impact: string
  risk_score: string
}

function levelVariant(level: string | undefined): 'green' | 'amber' | 'red' {
  const k = String(level ?? '').toLowerCase()
  return LEVEL_VARIANT[k] ?? 'amber'
}

function levelKey(level: string | undefined): string {
  return String(level ?? '').toLowerCase()
}

function axisLevel(level: string | undefined): (typeof PROB_AXIS)[number] {
  const k = levelKey(level)
  if (k === 'critical') return 'high'
  if (k === 'low' || k === 'medium' || k === 'high') return k
  return 'medium'
}

function deriveRiskScore(probability: string, impact: string): RiskLevel {
  const p = axisLevel(probability)
  const i = axisLevel(impact)
  if ((p === 'high' && i === 'high') || levelKey(impact) === 'critical') return 'critical'
  if (p === 'high' || i === 'high') return 'high'
  if (p === 'medium' || i === 'medium') return 'medium'
  return 'low'
}

export function normalizeRiskItem(raw: RiskMatrixRiskItem): NormalizedRisk | null {
  const title = String(raw.risk ?? '').trim()
  const description = String(raw.description ?? '').trim()
  if (!title && !description) return null

  const probability = levelKey(raw.probability ?? raw.likelihood) || 'medium'
  const impact = levelKey(raw.impact) || 'medium'
  const risk_score = levelKey(raw.risk_score) || deriveRiskScore(probability, impact)
  const early_warning_sign = String(raw.early_warning_sign ?? raw.early_warning ?? '').trim()

  return {
    ...raw,
    risk: title,
    description,
    probability,
    impact,
    risk_score,
    early_warning_sign: early_warning_sign || undefined,
  }
}

function cellTone(probability: string, impact: string): string {
  const score = deriveRiskScore(probability, impact)
  if (score === 'critical') return 'border-rose-500/35 bg-rose-500/[0.14]'
  if (score === 'high') return 'border-rose-500/20 bg-rose-500/[0.08]'
  if (score === 'medium') return 'border-warning/25 bg-warning/[0.08]'
  return 'border-success/20 bg-success/[0.06]'
}

function riskScoreTone(score: string): IconTone {
  const level = levelKey(score)
  if (level === 'critical' || level === 'high') return 'destructive'
  if (level === 'medium') return 'amber'
  return 'success'
}

function RiskMetaTile({
  icon: Icon,
  label,
  children,
}: {
  icon: ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <Card
      padding="sm"
      radius="lg"
      className="h-full min-w-0"
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Icon className={iconClassName({ tone: 'muted', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              'text-xs font-medium text-muted-foreground',
            )}
          >
            {label}
          </span>
        </div>
      }
    >
      <div className="font-sans text-[12px] font-medium leading-snug text-foreground">{children}</div>
    </Card>
  )
}

function RiskMatrixHeatmap({ risks }: { risks: NormalizedRisk[] }) {
  const buckets = useMemo(() => {
    const map = new Map<string, NormalizedRisk[]>()
    for (const impact of IMPACT_AXIS) {
      for (const prob of PROB_AXIS) {
        map.set(`${impact}:${prob}`, [])
      }
    }
    for (const risk of risks) {
      const impact = axisLevel(risk.impact)
      const prob = axisLevel(risk.probability)
      const key = `${impact}:${prob}`
      map.get(key)?.push(risk)
    }
    return map
  }, [risks])

  return (
    <div className="space-y-2">
      <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        Risk heatmap
      </p>
      <div className="overflow-x-auto">
        <div className="min-w-[280px]">
          <div className="grid grid-cols-[4.5rem_repeat(3,minmax(0,1fr))] gap-1.5">
            <div aria-hidden />
            {PROB_AXIS.map((prob) => (
              <div
                key={prob}
                className="px-1 text-center font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {prob} prob
              </div>
            ))}

            {IMPACT_AXIS.map((impact) => (
              <div key={impact} className="contents">
                <div className="flex items-center justify-end pr-1 font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {impact}
                </div>
                {PROB_AXIS.map((prob) => {
                  const cellRisks = buckets.get(`${impact}:${prob}`) ?? []
                  return (
                    <div
                      key={`${impact}-${prob}`}
                      className={cn(
                        'min-h-[4.5rem] rounded-lg border p-1.5 transition-colors',
                        cellTone(prob, impact),
                        cellRisks.length === 0 && 'opacity-60',
                      )}
                    >
                      {cellRisks.length > 0 ? (
                        <ul className="space-y-1">
                          {cellRisks.map((r, i) => (
                            <li
                              key={`${r.risk}-${i}`}
                              className="rounded-md border border-border-subtle/40 bg-card/80 px-1.5 py-1 font-sans text-[10px] font-semibold leading-snug text-foreground"
                              title={r.risk}
                            >
                              <span className="line-clamp-2">{r.risk}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="block pt-2 text-center font-sans text-[10px] text-muted-foreground/50">
                          —
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

  )
}

function RiskSummaryStrip({ risks, overall }: { risks: NormalizedRisk[]; overall: string }) {
  const counts = useMemo(() => {
    const map: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    for (const r of risks) {
      const k = levelKey(r.risk_score) as RiskLevel
      if (k in map) map[k] += 1
    }
    return map
  }, [risks])

  const levels = SCORE_ORDER.filter((l) => counts[l] > 0)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {overall ? (
        <Badge size="sm" className="font-semibold" variant={levelVariant(overall)}>
          Overall: {overall}
        </Badge>
      ) : null}
      {levels.map((level) => (
        <span
          key={level}
          className={cn(
            'inline-flex items-center rounded-lg border px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wider',
            level === 'critical' || level === 'high'
              ? 'border-rose-500/20 bg-rose-500/[0.06] text-rose-700'
              : level === 'medium'
                ? 'border-warning/20 bg-warning/[0.06] text-warning'
                : 'border-success/20 bg-success/[0.06] text-success',
          )}
        >
          {counts[level]} {level}
        </span>
      ))}
    </div>
  )
}

function RiskCard({ risk }: { risk: NormalizedRisk }) {
  const { localizeText } = useCurrency()
  const score = levelKey(risk.risk_score)
  const tone = riskScoreTone(score)
  const topSlotTone =
    tone === 'destructive' ? 'destructive' : tone === 'amber' ? 'amber' : 'success'

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'h-full overflow-hidden transition-shadow hover:shadow-md')}
      topSlotStyle={opportunityCardTopSlotToneStyle[topSlotTone]}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <AlertTriangle
            className={iconClassName({ tone, size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span
            className={cn(
              opportunityCardTopSlotTitleClass,
              opportunityCardTopSlotTone[topSlotTone].title,
              'min-w-0 flex-1',
            )}
          >
            {risk.risk || 'Risk'}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {risk.category ? (
            <Badge size="sm" className="font-semibold" variant="gray">{risk.category}</Badge>
          ) : null}
          {score ? (
            <Badge size="sm" className="font-semibold" variant={levelVariant(score)}>{score}</Badge>
          ) : null}
        </div>

        {risk.description ? (
          <p className="font-sans text-[12px] leading-relaxed text-muted-foreground">
            {localizeText(risk.description)}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <RiskMetaTile icon={TrendingDown} label="Probability">
            <Badge size="sm" className="font-semibold" variant={levelVariant(risk.probability)}>
              {risk.probability}
            </Badge>
          </RiskMetaTile>
          <RiskMetaTile icon={ShieldAlert} label="Impact">
            <Badge size="sm" className="font-semibold" variant={levelVariant(risk.impact)}>
              {risk.impact}
            </Badge>
          </RiskMetaTile>
          <RiskMetaTile icon={AlertTriangle} label="Score">
            <span className="font-bold capitalize">{score}</span>
          </RiskMetaTile>
        </div>

        {risk.mitigation ? (
          <Card
            padding="sm"
            radius="lg"
            topSlotStyle={opportunityCardTopSlotToneStyle.success}
            topSlot={
              <div className={opportunityCardTopSlotRowClass}>
                <ShieldCheck
                  className={iconClassName({ tone: 'success', size: 'sm', active: true })}
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.success.title)}>
                  Mitigation
                </span>
              </div>
            }
          >
            <p className="font-sans text-[12px] leading-relaxed text-foreground/85">
              {localizeText(risk.mitigation)}
            </p>
          </Card>
        ) : null}

        {risk.early_warning_sign ? (
          <Card
            padding="sm"
            radius="lg"
            topSlotStyle={opportunityCardTopSlotToneStyle.warning}
            topSlot={
              <div className={opportunityCardTopSlotRowClass}>
                <Eye
                  className={iconClassName({ tone: 'amber', size: 'sm', active: true })}
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.warning.title)}>
                  Early warning
                </span>
              </div>
            }
          >
            <p className="font-sans text-[12px] leading-relaxed text-foreground/85">
              {localizeText(risk.early_warning_sign)}
            </p>
          </Card>
        ) : null}
      </div>
    </Card>
  )
}

export function RiskMatrixSection({
  opp,
  isMobile,
  isProLocked = false,
}: {
  opp: Record<string, unknown>
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
  isProLocked?: boolean
}) {
  const data = parseOppJsonField<RiskMatrixData>((opp as { risk_matrix?: unknown }).risk_matrix)
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'risk_matrix',
    'risk-matrix',
  )

  const risks = useMemo(
    () =>
      (data?.risks ?? [])
        .map((r) => normalizeRiskItem(r))
        .filter((r): r is NormalizedRisk => Boolean(r)),
    [data?.risks],
  )

  const sortedRisks = useMemo(() => {
    return [...risks].sort((a, b) => {
      const ai = SCORE_ORDER.indexOf(levelKey(a.risk_score) as RiskLevel)
      const bi = SCORE_ORDER.indexOf(levelKey(b.risk_score) as RiskLevel)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [risks])

  if (!data || risks.length === 0) return null

  const overall = String(data.overall_risk ?? '').trim()
  const riskCountLabel = `${risks.length} risk${risks.length === 1 ? '' : 's'}`
  const scoreCounts = SCORE_ORDER.filter((l) => risks.some((r) => levelKey(r.risk_score) === l))
  const scoreSummary = scoreCounts
    .map((l) => `${risks.filter((r) => levelKey(r.risk_score) === l).length} ${l}`)
    .join(' · ')

  return (
    <OpportunityDetailSectionShell
      id="od-risks"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="risk-matrix"
      accordionValue={isProLocked ? 'risk-matrix' : accordionValue}
      onAccordionValueChange={isProLocked ? () => {} : onAccordionValueChange}
      header={<OpportunityAccordionHeaderRow icon={ShieldAlert} title="Risk matrix" />}
      contentMeta={
        riskCountLabel || overall || scoreSummary ? (
          <>
            {riskCountLabel ? (
              <span className="font-sans text-[12px] font-normal leading-snug text-muted-foreground sm:text-[13px]">
                {riskCountLabel}
              </span>
            ) : null}
            {overall ? (
              <Badge size="sm" className="font-semibold" variant={levelVariant(overall)}>
                Overall {overall}
              </Badge>
            ) : scoreSummary ? (
              <span className="font-sans text-[12px] font-semibold text-muted-foreground">{scoreSummary}</span>
            ) : null}
          </>
        ) : null
      }
    >
      <div className="space-y-4">
        <RiskMatrixHeatmap risks={risks} />
        <RiskSummaryStrip risks={risks} overall={overall} />
        <div className="space-y-3">
          {sortedRisks.map((r, i) => (
            <RiskCard key={`${r.risk}-${i}`} risk={r} />
          ))}
        </div>
      </div>
    </OpportunityDetailSectionShell>


  )
}

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Users } from '@/lib/icons'
import { opportunityDetailCardClass } from '@/lib/opportunityCardClasses'

interface HeadcountBreakdown {
  role: string
  count: number
  type: string
}

interface Headcount {
  min?: number
  max?: number
  total?: number
  breakdown: HeadcountBreakdown[]
}

interface Props {
  headcount?: Headcount | null
  isMobile?: boolean
}

function finiteNonNegativeNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'string' ? Number(v.trim()) : Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  skilled: 'Skilled',
  unskilled: 'Unskilled',
  admin: 'Admin',
}

function formatTypeLabel(type: string) {
  return TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}

function typeBadgeVariant(type: string): 'blue' | 'amber' | 'gray' {
  const key = type.toLowerCase()
  if (key.includes('full') || key.includes('skilled')) return 'blue'
  if (key.includes('part') || key.includes('admin')) return 'amber'
  return 'gray'
}

function useHeadcountMetrics(headcount: Headcount | null | undefined) {
  const totalFromBreakdown = useMemo(() => {
    return Array.isArray(headcount?.breakdown)
      ? headcount!.breakdown.reduce(
          (sum, person) => sum + (finiteNonNegativeNumber(person.count) ?? 0),
          0,
        )
      : 0
  }, [headcount])

  const finiteTotalField = finiteNonNegativeNumber(headcount?.total)
  const minN = finiteNonNegativeNumber(headcount?.min)
  const maxN = finiteNonNegativeNumber(headcount?.max)

  const totalHeadcount = useMemo(() => {
    if (finiteTotalField != null && finiteTotalField > 0) return finiteTotalField
    if (totalFromBreakdown > 0) return totalFromBreakdown
    if (maxN != null && maxN > 0) return maxN
    if (minN != null && minN > 0) return minN
    return 0
  }, [finiteTotalField, totalFromBreakdown, minN, maxN])

  const summaryLabel = useMemo(() => {
    if (minN != null && maxN != null) {
      return minN === maxN ? String(minN) : `${minN}–${maxN}`
    }
    return totalHeadcount > 0 ? String(totalHeadcount) : '—'
  }, [minN, maxN, totalHeadcount])

  return {
    totalHeadcount,
    summaryLabel,
    roleCount: headcount?.breakdown?.length ?? 0,
    hasBreakdown: (headcount?.breakdown?.length ?? 0) > 0,
  }
}

function HeadcountSection({ headcount, isMobile = false }: Props) {
  const metrics = useHeadcountMetrics(headcount)
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'headcount',
    'team-required',
  )

  if (!headcount) {
    return (
      <section className={opportunitySectionWrapClass(isMobile)}>
        <div className={cn(opportunityDetailCardClass, 'p-5')}>
          <div className="flex items-start gap-3 rounded-xl bg-muted/30 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" strokeWidth={2} />
            <p className="font-sans text-[13px] font-medium leading-relaxed text-muted-foreground/70">
              Headcount details being researched. Typically 1–5 people depending on scale.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const { totalHeadcount, summaryLabel, roleCount, hasBreakdown } = metrics

  return (
    <OpportunityDetailSectionShell
      id="od-headcount"
      className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}
      itemValue="team-required"
      accordionValue={accordionValue}
      onAccordionValueChange={onAccordionValueChange}
      header={
        <OpportunityAccordionHeaderRow
          icon={Users}
          title={<OpportunityTermLabel term="team_required" label="Team required" />}
        />
      }
      contentMeta={
        summaryLabel !== '—' ? (
          <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
            {summaryLabel} people
          </span>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {hasBreakdown ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Role</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="pr-4 text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headcount.breakdown.map((person, i) => {
                const pct =
                  totalHeadcount > 0 ? Math.round((person.count / totalHeadcount) * 100) : 0
                return (
                  <TableRow key={`${person.role}-${i}`}>
                    <TableCell className="pl-4 font-medium">{person.role}</TableCell>
                    <TableCell>
                      <Badge size="sm" variant={typeBadgeVariant(person.type)} className="font-semibold">
                        {formatTypeLabel(person.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {person.count}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums text-muted-foreground">
                      {pct > 0 ? `${pct}%` : '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="font-sans text-[13px] text-muted-foreground">
            {summaryLabel !== '—'
              ? `${summaryLabel} people required to run this business.`
              : 'Staffing plan details are not available yet.'}
            {roleCount > 0 ? ` · ${roleCount} roles` : ''}
          </p>
        )}

        <p className="font-sans text-[12px] text-muted-foreground">
          Salary costs are included in the OpEx estimate in the financial projections.
        </p>
      </div>
    </OpportunityDetailSectionShell>
  )
}

export default HeadcountSection

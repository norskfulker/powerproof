import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ExternalLink, Landmark } from '@/lib/icons'

export type SchemesSectionProps = {
  opp: any
  isMobile: boolean
  twScroll: { startWhenInView: true; inViewResetKey: string }
}

const DIFFICULTY_VARIANT: Record<string, 'green' | 'amber' | 'red' | 'gray'> = {
  easy: 'green',
  medium: 'amber',
  hard: 'red',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy to get',
  medium: 'Moderate',
  hard: 'Competitive',
}

export function SchemesSection({ opp, isMobile }: SchemesSectionProps) {
  const schemes =
    (opp as any).govt_scheme_details?.schemes ??
    (Array.isArray((opp as any).govt_scheme_details) ? (opp as any).govt_scheme_details : [])
  const { accordionValue, onAccordionValueChange, wrapperClassName } =
    useOpportunityEditSectionAccordion('govt_schemes', 'government-schemes')

  if (!schemes.length) return null

  return (
    <section id="od-schemes" className={cn('min-w-0 w-full scroll-mt-[7.5rem]', wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="government-schemes"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={Landmark}
            title={
              <OpportunityTermLabel
                term="government_schemes"
                label="Government Schemes & Support"
              />
            }
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Scheme</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="hidden sm:table-cell">Benefit</TableHead>
              <TableHead className="hidden text-right md:table-cell">Processing</TableHead>
              <TableHead className="pr-4">Apply</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schemes.map((s: any, i: number) => {
              const diffKey = String(s?.difficulty ?? 'medium').toLowerCase()
              const applyAt = String(s?.apply_at ?? s?.apply_url ?? '').trim()
              const hasUrl = Boolean(applyAt) && !applyAt.toLowerCase().startsWith('through')
              const url = hasUrl
                ? applyAt.startsWith('http')
                  ? applyAt
                  : `https://${applyAt}`
                : null
              const benefit = String(s?.subsidy ?? s?.benefit ?? '').trim()
              const days = s?.processing_days && String(s.processing_days) !== '0'
                ? `~${s.processing_days}d`
                : '—'

              return (
                <TableRow key={String(s?.scheme ?? s?.name ?? i)}>
                  <TableCell className="pl-4">
                    <div className="font-medium text-foreground">{s?.scheme ?? s?.name ?? '—'}</div>
                    {s?.ministry ? (
                      <div className="mt-0.5 text-[12px] text-muted-foreground">{s.ministry}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge
                      size="sm"
                      variant={DIFFICULTY_VARIANT[diffKey] ?? 'gray'}
                      className="font-semibold"
                    >
                      {DIFFICULTY_LABEL[diffKey] ?? 'Moderate'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-[16rem] text-muted-foreground sm:table-cell">
                    <span className="line-clamp-2">{benefit || '—'}</span>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                    {days}
                  </TableCell>
                  <TableCell className="pr-4">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        Apply
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">{applyAt || '—'}</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </OpportunityDetailSectionShell>
    </section>
  )
}

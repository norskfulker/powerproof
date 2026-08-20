import { useMemo } from 'react'
import { ExternalLink, FileCheck, Lock } from '@/lib/icons'
import { OpportunityTermLabel } from '@/components/opportunity/detail/OpportunityTermLabel'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunitySectionWrapClass } from '@/components/opportunity/detail/detailSectionClasses'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { useCurrency } from '@/hooks/useCurrency'
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

export type LicensesSectionProps = {
  licensesList: any[]
  opp: any
  isMobile: boolean
  isLocked: boolean
  formatMoney: (n: number) => string
  formatSetupCost: (min: number | null | undefined, max: number | null | undefined) => string
  twScroll: { startWhenInView: true; inViewResetKey: string }
}

const PRIORITY_ORDER = ['Mandatory', 'Nice to Have', 'Optional'] as const

function priorityVariant(priority: string): 'red' | 'amber' | 'gray' {
  if (priority === 'Mandatory') return 'red'
  if (priority === 'Nice to Have') return 'amber'
  return 'gray'
}

function resolvePriority(lic: any): string {
  let p = lic.priority
  if (!p) p = lic.mandatory === true || lic.mandatory === 'true' ? 'Mandatory' : 'Optional'
  return String(p)
}

function formatProcess(process: string | undefined): string | null {
  if (!process) return null
  if (process === 'both') return 'Online & Offline'
  return process.charAt(0).toUpperCase() + process.slice(1)
}

export function LicensesSection(props: LicensesSectionProps) {
  const { licensesList, opp, isMobile, isLocked, formatMoney, formatSetupCost } = props
  const { localizeText } = useCurrency()

  const rows = useMemo(() => {
    return [...licensesList].sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(resolvePriority(a) as (typeof PRIORITY_ORDER)[number])
      const bi = PRIORITY_ORDER.indexOf(resolvePriority(b) as (typeof PRIORITY_ORDER)[number])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [licensesList])

  const totalMin = opp.license_cost_min || 0
  const totalMax = opp.license_cost_max || 0
  const hasCost = totalMin > 0 || totalMax > 0
  const costStr = hasCost ? formatSetupCost(totalMin, totalMax) : null
  const { accordionValue, onAccordionValueChange, wrapperClassName } =
    useOpportunityEditSectionAccordion('licenses_required', 'licenses')

  if (!licensesList?.length) return null

  return (
    <section id="od-licenses" className={cn(opportunitySectionWrapClass(isMobile), wrapperClassName)}>
      <OpportunityDetailSectionShell
        itemValue="licenses"
        accordionValue={accordionValue}
        onAccordionValueChange={onAccordionValueChange}
        header={
          <OpportunityAccordionHeaderRow
            icon={FileCheck}
            title={
              <OpportunityTermLabel term="licences_registrations" label="Licences & Registrations" />
            }
          />
        }
        contentMeta={
          costStr ? (
            <span className="font-sans text-sm font-semibold tabular-nums text-foreground">
              est. {costStr}
            </span>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {isLocked ? (
            <div className="flex items-center gap-2 rounded-xl bg-warning/[0.04] px-4 py-2.5">
              <Lock className="h-4 w-4 shrink-0 text-warning" strokeWidth={2.5} aria-hidden />
              <p className="font-sans text-[12px] font-medium text-warning/80">
                Sign in to view all licence details. First row is visible as a preview.
              </p>
            </div>
          ) : null}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Licence</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="hidden sm:table-cell">Authority</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="hidden text-right md:table-cell">Time</TableHead>
                <TableHead className="pr-4">Portal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lic, i) => {
                const priority = resolvePriority(lic)
                const blurred = isLocked && i > 0
                const portal = String(lic.portal ?? lic.url ?? '').trim()
                const portalHref =
                  portal &&
                  (portal.startsWith('http')
                    ? portal
                    : portal.includes('.')
                      ? `https://${portal}`
                      : '')
                const cost = Number(lic.cost)
                const hasRowCost = Number.isFinite(cost) && cost > 0
                const processLabel = formatProcess(lic.process as string | undefined)

                return (
                  <TableRow key={i} className={blurred ? 'blur-[4px]' : undefined}>
                    <TableCell className="pl-4">
                      <div className="font-medium text-foreground">{lic.name || '—'}</div>
                      {processLabel ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{processLabel}</div>
                      ) : null}
                      {lic.description ? (
                        <div className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                          {localizeText(lic.description)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge size="sm" variant={priorityVariant(priority)} className="font-semibold">
                        {priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {lic.authority || '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {hasRowCost ? formatMoney(cost) : '—'}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                      {lic.days ? `${lic.days}d` : '—'}
                    </TableCell>
                    <TableCell className="pr-4">
                      {portalHref ? (
                        <a
                          href={portalHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          Open
                          <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{portal || 'Local office'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </OpportunityDetailSectionShell>
    </section>
  )
}

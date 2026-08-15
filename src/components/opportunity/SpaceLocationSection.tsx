import { MapPin } from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { opportunityDetailEqualBadgeCardClassName } from '@/components/opportunity/detail/detailSectionClasses'
import { OpportunityDetailSectionShell } from '@/components/opportunity/detail/OpportunityDetailAccordion'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { useCurrency } from '@/hooks/useCurrency'
import { useOpportunityEditSectionAccordion } from '@/hooks/useOpportunityEditSectionAccordion'
import { cn } from '@/lib/utils'
import type { ResearchSpaceLocation } from '@/types/database'

const FOOTFALL_VARIANT: Record<ResearchSpaceLocation['footfall_requirement'], 'green' | 'amber' | 'red'> = {
  low: 'green',
  medium: 'amber',
  high: 'red',
}

/** Space & Location is shown only when research marks it needed and includes usable detail. */
export function isSpaceLocationPresent(
  space: ResearchSpaceLocation | null | undefined,
): boolean {
  if (!space || space.needed !== true) return false

  const hasRent = [space.rent_tier1_usd, space.rent_tier2_usd, space.rent_tier3_usd].some(
    (rent) => Number.isFinite(rent) && rent > 0,
  )
  const hasFitOut = Number.isFinite(space.fit_out_cost_usd) && space.fit_out_cost_usd > 0
  const hasText = [space.ideal_location, space.avoid, space.notes, space.lease_terms].some(
    (value) => String(value ?? '').trim().length > 0,
  )
  const hasFootfall = Boolean(space.footfall_requirement)

  return hasRent || hasFitOut || hasText || hasFootfall
}

export function SpaceLocationSection({
  space,
}: {
  space: ResearchSpaceLocation | null | undefined
}) {
  const { formatMoney } = useCurrency()
  const { accordionValue, onAccordionValueChange, wrapperClassName } = useOpportunityEditSectionAccordion(
    'space_location',
    'space-location',
  )

  if (!isSpaceLocationPresent(space)) return null

  const tiers = [
    { label: 'Tier 1', rent: space!.rent_tier1_usd },
    { label: 'Tier 2', rent: space!.rent_tier2_usd },
    { label: 'Tier 3', rent: space!.rent_tier3_usd },
  ].filter((row) => Number.isFinite(row.rent) && row.rent > 0)

  return (
    <OpportunityDetailSectionShell
      id="od-space-location"
      className={wrapperClassName}
      itemValue="space-location"
      accordionValue={accordionValue}
      onAccordionValueChange={onAccordionValueChange}
      header={<OpportunityAccordionHeaderRow icon={MapPin} title="Space & Location" />}
    >
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{space!.type}</span>
        {space!.min_sqft || space!.max_sqft ? (
          <>
            {' '}
            · {space!.min_sqft?.toLocaleString() ?? '—'}–{space!.max_sqft?.toLocaleString() ?? '—'} sq ft
          </>
        ) : null}
      </p>

      {tiers.length > 0 ? (
      <div className="mt-4 overflow-x-auto rounded-xl border-0">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-[hsl(var(--bg-sunken))]/60">
              <th className="px-3 py-2 font-semibold text-muted-foreground">Area tier</th>
              <th className="px-3 py-2 font-semibold text-muted-foreground">Monthly rent</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((row) => (
              <tr key={row.label} className="border-b border-border-subtle last:border-0">
                <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                <td className="px-3 py-2.5 text-foreground">{formatMoney(row.rent ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      ) : null}

      {space!.fit_out_cost_usd ? (
        <span className={cn(opportunityDetailEqualBadgeCardClassName, 'font-medium')}>
          Fit-out: {formatMoney(space!.fit_out_cost_usd)}
        </span>
      ) : null}

      {space!.ideal_location ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ideal location</p>
          <p className="mt-1 text-sm text-foreground">{space!.ideal_location}</p>
        </div>
      ) : null}

      {space!.avoid ? (
        <div className="mt-3 rounded-lg border-0 bg-warning/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-warning dark:text-saffron-400">
            Avoid
          </p>
          <p className="mt-1 text-xs text-foreground">{space!.avoid}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {space!.footfall_requirement ? (
          <Badge size="sm" className="font-semibold" variant={FOOTFALL_VARIANT[space!.footfall_requirement] ?? 'gray'}>
            Footfall: {space!.footfall_requirement}
          </Badge>
        ) : null}
        {space!.lease_terms ? (
          <span className="text-xs text-muted-foreground">Lease: {space!.lease_terms}</span>
        ) : null}
      </div>

      {space!.notes ? (
        <p className={cn('mt-3 text-xs text-muted-foreground')}>{space!.notes}</p>
      ) : null}
    </OpportunityDetailSectionShell>
  )
}

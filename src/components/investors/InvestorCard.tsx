import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cardTopSlotRowClass, cardTopSlotTitleClass } from '@/components/ui/card'
import {
  useDiscoverHeroWorkspaceLayoutView,
} from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import { RoomHeroCard, RoomHeroCardBody } from '@/components/shared/RoomHeroCard'
import { InvestorLogo } from '@/components/investors/InvestorLogo'
import {
  formatInvestorFirmType,
  formatInvestorLabel,
} from '@/lib/investorsDisplay'
import { investorDetailPath } from '@/lib/investorsApi'
import {
  investorWorkspaceMetrics,
  investorWorkspaceStagesLabel,
} from '@/lib/workspaceItemMetrics'
import type { Investor } from '@/types/investors'
import { cn } from '@/lib/utils'

type InvestorCardProps = {
  investor: Investor
}

export function InvestorCard({ investor }: InvestorCardProps) {
  const navigate = useNavigate()
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const stagesLabel = investorWorkspaceStagesLabel(investor)
  const firmType = investor.firm_type?.trim()
    ? formatInvestorFirmType(investor.firm_type)
    : 'Investor'
  const hq = investor.hq_country?.trim() || null
  const description = investor.description?.trim() || investor.thesis?.trim() || null
  const metrics = investorWorkspaceMetrics(investor)
  const checkValue = metrics[2]?.value ?? '—'
  const sectorLabels = (investor.sectors ?? [])
    .slice(0, 3)
    .map((sector) => formatInvestorLabel(sector).trim())
    .filter(Boolean)
  const href = investorDetailPath(investor.slug)
  const open = () => navigate(href)
  const locationLine = [hq, investor.founded_year ? `Est. ${investor.founded_year}` : null]
    .filter(Boolean)
    .join(' · ')

  if (layout === 'table') {
    return (
      <DiscoverHeroWorkspaceItem
        title={investor.name}
        subtitle={locationLine || firmType}
        leading={<InvestorLogo name={investor.name} src={investor.logo_url} size="sm" />}
        metrics={metrics}
        metaColumn={
          <span className="block truncate text-[13px] font-semibold text-foreground" title={stagesLabel}>
            {stagesLabel}
          </span>
        }
        onActivate={open}
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 min-h-7 px-2.5 text-[11px] font-semibold"
            onClick={(event) => {
              event.stopPropagation()
              open()
            }}
          >
            Open
          </Button>
        }
      />
    )
  }

  return (
    <RoomHeroCard
      interactive
      onActivate={open}
      className="h-full"
      topSlot={
        <div className={cn(cardTopSlotRowClass, 'justify-between gap-2')}>
          <span className={cn(cardTopSlotTitleClass, 'text-muted-foreground')}>{firmType}</span>
          <span className="truncate text-[13px] font-semibold tabular-nums text-foreground">
            {checkValue}
          </span>
        </div>
      }
    >
      <RoomHeroCardBody className="gap-3.5 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <InvestorLogo name={investor.name} src={investor.logo_url} size="md" />
          <div className="min-w-0 flex-1">
            <h3
              className="truncate font-display text-[15px] font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary"
              title={investor.name}
            >
              {investor.name}
            </h3>
            {locationLine ? (
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{locationLine}</p>
            ) : null}
          </div>
        </div>

        {description ? (
          <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}

        {investor.is_india_focused || sectorLabels.length > 0 || (investor.stages?.length ?? 0) > 0 ? (
          <div className="mt-auto flex flex-wrap items-center gap-1.5">
            {investor.is_india_focused ? (
              <Badge variant="amber" size="sm">
                India focused
              </Badge>
            ) : null}
            {(investor.stages ?? []).slice(0, 2).map((stage) => (
              <Badge key={stage} variant="blue" size="sm">
                {formatInvestorLabel(stage)}
              </Badge>
            ))}
            {sectorLabels.slice(0, 2).map((label) => (
              <Badge key={label} variant="gray" size="sm">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}
      </RoomHeroCardBody>
    </RoomHeroCard>
  )
}

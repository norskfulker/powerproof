import { RoomCardActions } from '@/components/shared/RoomCardActions'
import { Button } from '@/components/ui/button'
import { Globe } from '@/lib/icons'
import { useCurrency } from '@/hooks/useCurrency'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import { workspaceFinancialMetrics } from '@/components/discover/DiscoverHeroMetricStrip'
import { cn } from '@/lib/utils'

export type UserResearchCardData = {
  title: string
  slug: string
  researchQuery?: string | null
  categorySlug?: string | null
  researchStyle?: string | null
  modelUsed?: string | null
  setupMin?: number | null
  setupMax?: number | null
  monthlyRevMin?: number | null
  monthlyRevMax?: number | null
  monthlyProfitMin?: number | null
  monthlyProfitMax?: number | null
  marginPct?: number | null
  ease?: string | null
}

type UserResearchCardProps = UserResearchCardData & {
  onClick: () => void
  onDeleteRequest?: () => void
  onReResearchRequest?: () => void
  onPublishRequest?: () => void
  disabled?: boolean
  isReResearching?: boolean
  isPublishing?: boolean
  className?: string
}

export function UserResearchCard({
  title,
  categorySlug,
  setupMin,
  setupMax,
  monthlyRevMin,
  monthlyRevMax,
  monthlyProfitMin,
  monthlyProfitMax,
  marginPct,
  ease,
  onClick,
  onDeleteRequest,
  onReResearchRequest,
  onPublishRequest,
  disabled = false,
  isReResearching = false,
  isPublishing = false,
  className,
}: UserResearchCardProps) {
  const { formatMoney } = useCurrency()
  const metrics = workspaceFinancialMetrics(
    {
      setup_min: setupMin,
      setup_max: setupMax,
      monthly_rev_min: monthlyRevMin,
      monthly_rev_max: monthlyRevMax,
      monthly_profit_min: monthlyProfitMin,
      monthly_profit_max: monthlyProfitMax,
      margin_pct: marginPct,
    },
    formatMoney,
  )
  const showFooter = Boolean(onPublishRequest || (onDeleteRequest && onReResearchRequest))

  return (
    <DiscoverHeroWorkspaceItem
      title={title}
      categorySlug={categorySlug}
      metrics={metrics}
      effort={ease}
      onActivate={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(isReResearching && 'ring-2 ring-primary/25', className)}
      actions={
        showFooter ? (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {onPublishRequest ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={!isPublishing ? <Globe className="h-3.5 w-3.5" aria-hidden /> : undefined}
                loading={isPublishing}
                disabled={disabled || isPublishing}
                onClick={(event) => {
                  event.stopPropagation()
                  onPublishRequest()
                }}
              >
                {isPublishing ? 'Adding…' : 'Add to catalog'}
              </Button>
            ) : (
              <span aria-hidden />
            )}
            {onDeleteRequest && onReResearchRequest ? (
              <RoomCardActions
                className={cn(onPublishRequest ? 'w-auto pt-0' : 'w-full pt-0')}
                onReRun={onReResearchRequest}
                onDelete={onDeleteRequest}
                reRunLabel="Re-research"
                reRunVariant="primary"
                disabled={disabled || isPublishing}
              />
            ) : null}
          </div>
        ) : undefined
      }
    />
  )
}

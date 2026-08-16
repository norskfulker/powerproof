import { Loader2, Play, Store2Line } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import {
  useDiscoverHeroWorkspaceLayoutView,
} from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import { cardTopSlotRowClass, cardTopSlotTitleClass } from '@/components/ui/card'
import type { MarketTestListRow } from '@/lib/marketTestApi'
import { MARKET_TEST_RERUN_CONFIRM } from '@/lib/rerunConfirm'
import { formatSourcingTimestamp } from '@/lib/sourcingHistoryDetails'
import {
  EMPTY_MARKET_TEST_WORKSPACE_METRICS,
  marketTestWorkspaceMetrics,
} from '@/lib/workspaceItemMetrics'
import { cn } from '@/lib/utils'
import { RoomCardActions } from '@/components/shared/RoomCardActions'
import {
  roomHeroCardPendingProgressFillClassName,
  roomHeroCardPendingProgressTrackClassName,
} from '@/components/shared/roomHeroCardStyles'

type MarketTestCardProps = {
  row: MarketTestListRow
  onClick: () => void
  onDeleteRequest?: () => void
  onReRunRequest?: () => void
  disabled?: boolean
  className?: string
}

export function MarketTestCard({
  row,
  onClick,
  onDeleteRequest,
  onReRunRequest,
  disabled = false,
  className,
}: MarketTestCardProps) {
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const query = row.query?.trim() || null
  const title = query || 'Untitled market test'
  const status = String(row.generation_status ?? '').toLowerCase()
  const isComplete = status === 'complete'
  const isFailed = status === 'failed'
  const isPending = !isComplete && !isFailed
  const metrics = isPending ? EMPTY_MARKET_TEST_WORKSPACE_METRICS : marketTestWorkspaceMetrics(row)
  const testedLabel = row.created_at ? formatSourcingTimestamp(row.created_at) : ''

  const footerActions =
    isPending ? (
      layout === 'table' ? (
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={disabled}
          className="h-7 min-h-7 shrink-0 gap-1.5 px-2.5 text-[11px] font-semibold"
          onClick={(event) => {
            event.stopPropagation()
            onClick()
          }}
        >
          <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Continue
        </Button>
      ) : (
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled}
            className="h-7 min-h-7 w-auto gap-1.5 px-2.5 text-[11px] font-semibold"
            onClick={(event) => {
              event.stopPropagation()
              onClick()
            }}
          >
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Continue
          </Button>
          <span aria-hidden />
        </div>
      )
    ) : onDeleteRequest && onReRunRequest && (isComplete || isFailed) ? (
      layout === 'table' ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 min-h-7 px-2.5 text-[11px] font-semibold"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation()
              onClick()
            }}
          >
            Open
          </Button>
          <RoomCardActions
            compact
            reRunLabel="Re-run"
            reRunVariant="primary"
            disabled={disabled}
            requireReRunConfirm
            reRunConfirm={{
              title: MARKET_TEST_RERUN_CONFIRM.title,
              description: MARKET_TEST_RERUN_CONFIRM.description,
              confirmLabel: MARKET_TEST_RERUN_CONFIRM.confirmLabel,
            }}
            onReRun={onReRunRequest}
            onDelete={onDeleteRequest}
          />
        </div>
      ) : (
        <RoomCardActions
          reRunLabel="Re-run"
          reRunVariant="primary"
          disabled={disabled}
          requireReRunConfirm
          reRunConfirm={{
            title: MARKET_TEST_RERUN_CONFIRM.title,
            description: MARKET_TEST_RERUN_CONFIRM.description,
            confirmLabel: MARKET_TEST_RERUN_CONFIRM.confirmLabel,
          }}
          onReRun={onReRunRequest}
          onDelete={onDeleteRequest}
        />
      )
    ) : layout === 'table' ? (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-7 min-h-7 px-2.5 text-[11px] font-semibold"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          onClick()
        }}
      >
        Open
      </Button>
    ) : undefined

  return (
    <DiscoverHeroWorkspaceItem
      title={title}
      iconOverride={isPending ? Loader2 : Store2Line}
      iconTone={isPending ? 'amber' : 'primary'}
      subtitle={layout === 'table' ? testedLabel || undefined : undefined}
      metrics={metrics}
      topSlot={
        layout === 'grid' && testedLabel ? (
          <div className={cn(cardTopSlotRowClass, 'justify-between gap-2')}>
            <span className={cn(cardTopSlotTitleClass, 'text-muted-foreground')}>Tested</span>
            <span className="truncate text-[13px] font-semibold text-foreground">{testedLabel}</span>
          </div>
        ) : undefined
      }
      highlight={isPending ? 'in-progress' : null}
      onActivate={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      progress={
        isPending ? (
          <div className="mt-auto">
            <div className={roomHeroCardPendingProgressTrackClassName}>
              <div className={cn(roomHeroCardPendingProgressFillClassName, 'shimmer w-2/5')} />
            </div>
          </div>
        ) : undefined
      }
      actions={footerActions}
    />
  )
}

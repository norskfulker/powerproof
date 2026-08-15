import {
  useDiscoverHeroWorkspaceLayoutView,
} from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import { cardTopSlotRowClass, cardTopSlotTitleClass } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RoomCardActions } from '@/components/shared/RoomCardActions'
import { formatSourcingTimestamp } from '@/lib/sourcingHistoryDetails'
import type { SourcingHistoryRow } from '@/lib/sourcingTypes'
import { sourcingWorkspaceMetrics } from '@/lib/workspaceItemMetrics'
import { cn } from '@/lib/utils'

export function SourcingHistorySummary({
  row,
  onClick,
  onDeleteRequest,
  onReSearchRequest,
}: {
  row: SourcingHistoryRow
  onClick: () => void
  onDeleteRequest?: () => void
  onReSearchRequest?: () => void
}) {
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const searchedLabel = formatSourcingTimestamp(row.searched_at)

  return (
    <DiscoverHeroWorkspaceItem
      title={row.keyword}
      subtitle={layout === 'table' ? searchedLabel || undefined : undefined}
      metrics={sourcingWorkspaceMetrics(row)}
      topSlot={
        layout === 'grid' && searchedLabel ? (
          <div className={cn(cardTopSlotRowClass, 'justify-between gap-2')}>
            <span className={cn(cardTopSlotTitleClass, 'text-muted-foreground')}>Searched</span>
            <span className="truncate text-[13px] font-semibold text-foreground">{searchedLabel}</span>
          </div>
        ) : undefined
      }
      onActivate={onClick}
      actions={
        onDeleteRequest && onReSearchRequest ? (
          layout === 'table' ? (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 min-h-7 px-2.5 text-[11px] font-semibold"
                onClick={(event) => {
                  event.stopPropagation()
                  onClick()
                }}
              >
                Open
              </Button>
              <RoomCardActions
                compact
                reRunLabel="Search again"
                onReRun={onReSearchRequest}
                onDelete={onDeleteRequest}
              />
            </div>
          ) : (
            <RoomCardActions
              reRunLabel="Search again"
              onReRun={onReSearchRequest}
              onDelete={onDeleteRequest}
            />
          )
        ) : layout === 'table' ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 min-h-7 px-2.5 text-[11px] font-semibold"
            onClick={(event) => {
              event.stopPropagation()
              onClick()
            }}
          >
            Open
          </Button>
        ) : undefined
      }
    />
  )
}

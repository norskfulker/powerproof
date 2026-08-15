import { useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Play, Trash2 } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import type { ActiveResearch } from '@/hooks/useBackgroundJobs'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import { EMPTY_WORKSPACE_FINANCIAL_METRICS } from '@/components/discover/DiscoverHeroMetricStrip'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import { recordResearchWorkspaceRecent } from '@/lib/composerSearchRecents'
import { cn } from '@/lib/utils'
import {
  roomHeroCardPendingProgressFillClassName,
  roomHeroCardPendingProgressTrackClassName,
} from '@/components/shared/roomHeroCardStyles'

export function ResearchPendingCard({
  research,
  onDeleteRequest,
  disabled = false,
  className,
}: {
  research: ActiveResearch
  onDeleteRequest?: () => void
  disabled?: boolean
  className?: string
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const heroFromState = discoverHeroNavState(location.pathname, location.search)
  const query = research.research_query?.trim() || null
  const title = research.title?.trim() || query || 'Untitled research'
  const researchSlug = research.slug?.trim() || null

  const openResearch = () => {
    if (!researchSlug || disabled) return
    recordResearchWorkspaceRecent({ query: query || title, slug: researchSlug })
    navigate(`/my-research/${encodeURIComponent(researchSlug)}`, { state: heroFromState })
  }

  return (
    <DiscoverHeroWorkspaceItem
      title={title}
      iconOverride={Loader2}
      iconTone="amber"
      metrics={EMPTY_WORKSPACE_FINANCIAL_METRICS}
      highlight="in-progress"
      onActivate={researchSlug && !disabled ? openResearch : undefined}
      disabled={disabled}
      className={cn('aria-busy:pointer-events-auto', className)}
      progress={
        <div className="mt-1">
          <div className={roomHeroCardPendingProgressTrackClassName}>
            <div className={cn(roomHeroCardPendingProgressFillClassName, 'shimmer w-2/5')} />
          </div>
        </div>
      }
      actions={
        <div className="flex w-full items-center justify-between gap-2">
          {researchSlug ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={disabled}
              className="h-7 min-h-7 w-auto gap-1.5 px-2.5 text-[11px] font-semibold"
              onClick={(e) => {
                e.stopPropagation()
                openResearch()
              }}
            >
              <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Continue
            </Button>
          ) : (
            <span aria-hidden />
          )}
          {onDeleteRequest ? (
            <button
              type="button"
              aria-label="Delete"
              title="Delete"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteRequest()
              }}
              className={cn(
                'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors',
                'hover:bg-destructive/10 hover:text-destructive',
                'active:scale-95',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground/70',
              )}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : (
            <span aria-hidden />
          )}
        </div>
      }
    />
  )
}

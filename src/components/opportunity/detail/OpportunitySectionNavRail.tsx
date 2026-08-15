import { OpportunitySectionNav } from '@/components/opportunity/detail/OpportunitySectionNav'
import { RailCollapseToggle } from '@/components/layout/RailCollapseToggle'
import { useOpportunityDetailNavOptional } from '@/contexts/OpportunityDetailNavContext'
import { cn } from '@/lib/utils'

type OpportunitySectionNavRailProps = {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
}

export function OpportunitySectionNavRail({
  collapsed = false,
  onCollapsedChange,
  className,
}: OpportunitySectionNavRailProps) {
  const ctx = useOpportunityDetailNavOptional()
  const sections = ctx?.sections ?? []

  if (sections.length < 2) return null

  const toggleCollapsed = () => onCollapsedChange?.(!collapsed)

  return (
    <aside
      className={cn(
        'opp-section-nav-rail hidden h-full min-h-0 shrink-0 flex-col layout-lg:flex',
        collapsed ? 'is-collapsed w-[52px]' : 'w-[11.75rem]',
        className,
      )}
      aria-label="Opportunity sections"
    >
      <div
        className={cn(
          'flex h-12 max-h-12 min-h-12 shrink-0 items-center border-b border-border-subtle bg-card',
          collapsed ? 'justify-center px-1' : 'justify-between gap-2 px-2',
        )}
      >
        {!collapsed ? (
          <span className="opp-section-nav-label min-w-0 truncate px-1 font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            On this page
          </span>
        ) : null}
        {onCollapsedChange ? (
          <RailCollapseToggle
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            expandLabel="Expand section navigation"
            collapseLabel="Collapse section navigation"
            className="h-8 w-8"
          />
        ) : null}
      </div>
      <OpportunitySectionNav
        sections={sections}
        variant="rail"
        collapsed={collapsed}
        className="min-h-0 flex-1"
      />
    </aside>
  )
}

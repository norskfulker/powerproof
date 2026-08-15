import { RailCollapseToggle } from '@/components/layout/RailCollapseToggle'
import { ClarificationSidebar } from '@/components/research/ClarificationSidebar'
import { useClarificationNavOptional } from '@/contexts/ClarificationNavContext'
import { cn } from '@/lib/utils'

type ClarificationSidebarRailProps = {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
}

export function ClarificationSidebarRail({
  collapsed = false,
  onCollapsedChange,
  className,
}: ClarificationSidebarRailProps) {
  const nav = useClarificationNavOptional()?.nav

  if (!nav) return null

  const toggleCollapsed = () => onCollapsedChange?.(!collapsed)

  return (
    <aside
      className={cn(
        'clarify-section-nav-rail hidden h-full min-h-0 shrink-0 flex-col layout-sm:flex',
        collapsed ? 'is-collapsed w-[52px]' : 'w-[13.5rem]',
        className,
      )}
      aria-label="Clarification progress"
    >
      <div
        className={cn(
          'flex h-12 max-h-12 min-h-12 shrink-0 items-center border-b border-border-subtle bg-card',
          collapsed ? 'justify-center px-1' : 'justify-between gap-2 px-2',
        )}
      >
        {!collapsed ? (
          <span className="clarify-section-nav-label min-w-0 truncate px-1 font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Progress
          </span>
        ) : null}
        {onCollapsedChange ? (
          <RailCollapseToggle
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            expandLabel="Expand clarification progress"
            collapseLabel="Collapse clarification progress"
            className="h-8 w-8"
          />
        ) : null}
      </div>
      <ClarificationSidebar
        model={nav.model}
        onSelectItem={nav.onSelectItem}
        collapsed={collapsed}
        variant="rail"
        className="min-h-0 flex-1"
      />
    </aside>
  )
}

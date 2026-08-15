import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import {
  Check,
  ChevronDown,
  ClipboardCheck,
  ListChecks,
} from '@/lib/icons'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { navIconClassName } from '@/lib/iconClassNames'
import type { ClarifyNavItem, ClarifyNavItemStatus, ClarifyNavModel } from '@/lib/clarifyNav'
import { cn } from '@/lib/utils'

const SECTION_ICONS: Record<string, ElementType<{ className?: string; strokeWidth?: number }>> = {
  clarification: ListChecks,
  summary: ClipboardCheck,
}

const NAV_SCROLL_HIDE_CLASS =
  'overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

function ProgressNode({
  status = 'pending',
  answered,
  size = 'sm',
}: {
  status?: ClarifyNavItemStatus
  answered?: boolean
  size?: 'sm' | 'xs'
}) {
  const resolved = answered ? 'complete' : status
  const dim = size === 'xs' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  const iconDim = size === 'xs' ? 'h-1.5 w-1.5' : 'h-2 w-2'

  if (resolved === 'complete') {
    return (
      <span
        className={cn(
          'relative z-[1] inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_2px_hsl(var(--card))]',
          dim,
        )}
        aria-hidden
      >
        <Check className={iconDim} strokeWidth={3} />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'relative z-[1] inline-flex shrink-0 rounded-full border-2 bg-card shadow-[0_0_0_2px_hsl(var(--card))]',
        dim,
        resolved === 'active'
          ? 'border-primary bg-primary/10'
          : 'border-dashed border-muted-foreground/35',
      )}
      aria-hidden
    />
  )
}

function NavTreeBranch({
  children,
  className,
  depth = 1,
}: {
  children: ReactNode
  className?: string
  depth?: 1 | 2
}) {
  return (
    <div
      className={cn(
        'relative',
        depth === 1 ? 'ml-[11px] pl-3' : 'ml-[9px] pl-3',
        'before:absolute before:bottom-2 before:left-0 before:top-0 before:w-px before:bg-border-subtle/90',
        className,
      )}
    >
      {children}
    </div>
  )
}

function NavQuestionButton({
  item,
  onSelect,
  collapsed = false,
}: {
  item: ClarifyNavItem
  onSelect: (id: string) => void
  collapsed?: boolean
}) {
  const label = item.label.replace(/^Q\d+:\s*/, '')

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={item.active ? 'step' : undefined}
            aria-disabled={!item.clickable}
            className={cn(
              'mx-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
              item.active && 'bg-primary/12 text-primary',
              !item.active && item.clickable && 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              !item.clickable && 'cursor-default text-muted-foreground/45',
            )}
          >
            <ProgressNode status={item.status} answered={item.answered} size="xs" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[14rem] text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={item.active ? 'step' : undefined}
      aria-disabled={!item.clickable}
      data-nav-active={item.active ? '' : undefined}
      className={cn(
        'group relative flex w-full items-start gap-2.5 rounded-lg py-1.5 pl-0.5 pr-2 text-left font-sans text-[11px] leading-snug transition-colors',
        item.active && 'bg-primary/10 font-medium text-primary',
        !item.active && item.clickable && 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
        !item.clickable && 'cursor-default text-muted-foreground/50',
      )}
    >
      <ProgressNode status={item.status} answered={item.answered} size="xs" />
      <span className="min-w-0 flex-1 pt-px">
        <span className="font-semibold text-foreground/70">{item.label.match(/^Q\d+/)?.[0] ?? 'Q'}</span>
        <span className="mx-1 text-muted-foreground/40" aria-hidden>
          ·
        </span>
        <span className={cn(item.active ? 'text-primary' : 'text-inherit')}>{label}</span>
      </span>
    </button>
  )
}

function NavRoundBlock({
  item,
  onSelect,
  collapsed = false,
}: {
  item: ClarifyNavItem
  onSelect: (id: string) => void
  collapsed?: boolean
}) {
  const hasChildren = (item.children?.length ?? 0) > 0
  const pulse = item.loading || item.animated

  if (collapsed) {
    return (
      <li className="flex justify-center py-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-muted-foreground">
              {item.roundIndex != null ? item.roundIndex + 1 : '·'}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </li>
    )
  }

  return (
    <li className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-2 py-0.5',
          pulse && 'motion-safe:animate-pulse',
        )}
      >
        <ProgressNode status={item.status} />
        <p
          className={cn(
            'rounded-md bg-muted/35 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
            item.status === 'active' ? 'text-primary' : 'text-muted-foreground',
            item.status === 'pending' && 'text-muted-foreground/70',
          )}
        >
          {item.label}
        </p>
      </div>
      {hasChildren ? (
        <NavTreeBranch depth={2}>
          <ul className="space-y-0.5">
            {(item.children ?? []).map((child) => (
              <li key={child.id}>
                <NavQuestionButton item={child} onSelect={onSelect} collapsed={collapsed} />
              </li>
            ))}
          </ul>
        </NavTreeBranch>
      ) : null}
    </li>
  )
}

function NavSectionBlock({
  item,
  onSelect,
  collapsed = false,
}: {
  item: ClarifyNavItem
  onSelect: (id: string) => void
  collapsed?: boolean
}) {
  const Icon = SECTION_ICONS[item.id]
  const hasRoundChildren = item.id === 'clarification' && (item.children?.length ?? 0) > 0

  if (collapsed) {
    return (
      <li className="flex justify-center py-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => item.clickable && onSelect(item.id)}
              aria-current={item.active ? 'step' : undefined}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                item.active && 'bg-primary/12 text-primary',
                !item.active && 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              {Icon ? (
                <Icon className={navIconClassName(item.active)} strokeWidth={2.25} aria-hidden />
              ) : (
                <ProgressNode status={item.status} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </li>
    )
  }

  if (hasRoundChildren) {
    return (
      <li className="space-y-1.5">
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-1 py-1',
            item.active && 'text-primary',
            !item.active && 'text-foreground',
            item.loading && 'motion-safe:animate-pulse',
          )}
        >
          {Icon ? (
            <Icon className={navIconClassName(item.active)} strokeWidth={2.25} aria-hidden />
          ) : (
            <ProgressNode status={item.status} />
          )}
          <span className="min-w-0 flex-1 truncate font-sans text-[12px] font-semibold leading-snug">
            {item.label}
          </span>
        </div>
        <NavTreeBranch>
          <ul className="space-y-2.5">
            {(item.children ?? []).map((round) => (
              <NavRoundBlock key={round.id} item={round} onSelect={onSelect} collapsed={collapsed} />
            ))}
          </ul>
        </NavTreeBranch>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={item.active ? 'step' : undefined}
        aria-disabled={!item.clickable}
        data-nav-active={item.active ? '' : undefined}
        className={cn(
          'group flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left font-sans text-[12px] font-semibold leading-snug transition-colors',
          item.active && 'bg-primary/10 text-primary',
          !item.active && item.clickable && 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          !item.clickable && !item.active && 'cursor-default text-muted-foreground',
        )}
      >
        {Icon ? (
          <Icon className={navIconClassName(item.active)} strokeWidth={2.25} aria-hidden />
        ) : (
          <ProgressNode status={item.status} />
        )}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>
      {item.id === 'summary' && item.children?.length ? (
        <NavTreeBranch>
          <p className="py-1 text-[11px] leading-relaxed text-muted-foreground">{item.children[0]?.label}</p>
        </NavTreeBranch>
      ) : null}
    </li>
  )
}

export function ClarificationSidebarNav({
  model,
  onSelectItem,
  collapsed = false,
  className,
}: {
  model: ClarifyNavModel
  onSelectItem: (id: string) => void
  collapsed?: boolean
  className?: string
}) {
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (collapsed) return
    const root = navRef.current
    if (!root || !model.activeItemId) return
    const activeEl = root.querySelector<HTMLElement>('[data-nav-active]')
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [collapsed, model.activeItemId])

  return (
    <nav
      ref={navRef}
      aria-label="Clarification progress"
      className={cn('flex min-h-0 flex-1 flex-col', className)}
    >
      <ul
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-1',
          collapsed ? 'items-center px-1 py-2' : 'px-2 py-2',
          NAV_SCROLL_HIDE_CLASS,
        )}
      >
        {model.items.map((item) => (
          <NavSectionBlock key={item.id} item={item} onSelect={onSelectItem} collapsed={collapsed} />
        ))}
      </ul>
    </nav>
  )
}

function ClarificationSidebarMobile({
  model,
  onSelectItem,
  className,
}: {
  model: ClarifyNavModel
  onSelectItem: (id: string) => void
  className?: string
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const wasLoadingRef = useRef(false)
  const isLoading = model.items.some((item) => item.id === 'clarification' && item.loading)

  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      setMobileOpen(false)
    }
    wasLoadingRef.current = isLoading
  }, [isLoading])

  return (
    <div className={cn('max-layout-sm:block layout-sm:hidden', className)}>
      <Collapsible open={mobileOpen} onOpenChange={setMobileOpen}>
        <CollapsibleTrigger
          className={cn(
            'flex w-full items-center justify-between gap-2 border-0 bg-transparent py-0 text-left transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1',
          )}
          aria-expanded={mobileOpen}
        >
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Progress
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
              mobileOpen && 'rotate-180',
            )}
            strokeWidth={2.5}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="mt-2 rounded-xl border border-border-subtle bg-card">
            <ClarificationSidebarNav model={model} onSelectItem={onSelectItem} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

export type ClarificationSidebarProps = {
  model: ClarifyNavModel
  onSelectItem: (id: string) => void
  collapsed?: boolean
  variant?: 'rail' | 'inline'
  className?: string
}

export function ClarificationSidebar({
  model,
  onSelectItem,
  collapsed = false,
  variant = 'inline',
  className,
}: ClarificationSidebarProps) {
  if (variant === 'inline') {
    return <ClarificationSidebarMobile model={model} onSelectItem={onSelectItem} className={className} />
  }

  return (
    <ClarificationSidebarNav
      model={model}
      onSelectItem={onSelectItem}
      collapsed={collapsed}
      className={className}
    />
  )
}

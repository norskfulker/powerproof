import { isValidElement, type ReactNode } from 'react'
import type { RemixIcon } from '@/lib/icons'

import {
  DiscoverHeroWorkspaceLayoutSwitcher,
  useDiscoverHeroWorkspaceLayoutOptional,
} from '@/components/discover/DiscoverHeroBox'
import { cn } from '@/lib/utils'

function WorkspaceIcon({
  icon,
  className,
}: {
  icon?: RemixIcon | ReactNode
  className: string
}) {
  if (!icon) return null
  if (isValidElement(icon)) return icon
  const Icon = icon as RemixIcon
  return <Icon className={className} aria-hidden />
}

export type DiscoverHeroWorkspaceSectionAccent = 'primary' | 'success' | 'warRoom'

const ICON_ACCENT: Record<DiscoverHeroWorkspaceSectionAccent, string> = {
  primary: 'text-primary',
  success: 'text-[hsl(var(--success))]',
  warRoom: 'text-destructive',
}

const COUNT_BADGE_INNER: Record<DiscoverHeroWorkspaceSectionAccent, string> = {
  primary: 'bg-primary/12 text-primary',
  success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
  warRoom: 'bg-red-500/12 text-red-600 dark:text-red-400',
}

function WorkspaceSectionCountBadge({
  count,
  accent,
}: {
  count: string
  accent: DiscoverHeroWorkspaceSectionAccent
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-2 py-0.5',
        'text-[12px] font-semibold leading-none tabular-nums',
        COUNT_BADGE_INNER[accent],
      )}
      aria-label={`${count} items`}
    >
      {count}
    </span>
  )
}

export function DiscoverHeroWorkspaceSectionTitle({
  label,
  count,
  icon,
  accent = 'primary',
  trailing,
  className,
}: {
  label?: string
  count?: number | null
  /** Pass a RemixIcon reference (e.g. `BookMarked`) or a rendered icon element. */
  icon?: RemixIcon | ReactNode
  accent?: DiscoverHeroWorkspaceSectionAccent
  trailing?: ReactNode
  className?: string
}) {
  const countLabel =
    count == null ? null : count > 99 ? '99+' : String(count)
  const hasTitle = Boolean(label?.trim())
  const layoutCtx = useDiscoverHeroWorkspaceLayoutOptional()
  const trailingContent =
    trailing || layoutCtx ? (
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {layoutCtx ? <DiscoverHeroWorkspaceLayoutSwitcher /> : null}
      </div>
    ) : null

  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-center gap-2.5 sm:gap-3',
        trailingContent ? 'justify-between' : undefined,
        className,
      )}
    >
      <div className="flex min-w-0 mt-2 flex-1 items-center gap-2.5 sm:gap-3">
        <WorkspaceIcon
          icon={icon}
          className={cn('h-5 w-5 shrink-0', ICON_ACCENT[accent])}
        />
        {hasTitle ? (
          <h3 className="min-w-0 font-display text-lg font-semibold leading-none tracking-normal text-foreground layout-sm:text-xl">
            <span className="inline-flex min-w-0 flex-wrap items-center gap-2.5">
              <span>{label}</span>
              {countLabel != null ? (
                <WorkspaceSectionCountBadge count={countLabel} accent={accent} />
              ) : null}
            </span>
          </h3>
        ) : null}
      </div>
      {trailingContent}
    </div>
  )
}

export function DiscoverHeroWorkspaceEmptyState({
  icon,
  title,
  description,
  accent = 'primary',
  className,
  children,
}: {
  icon: RemixIcon | ReactNode
  title: string
  description: ReactNode
  accent?: DiscoverHeroWorkspaceSectionAccent
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-dashed border-border-subtle/80 bg-muted/15 px-5 py-8 text-center layout-sm:px-6 layout-sm:py-10',
        className,
      )}
    >
      <WorkspaceIcon
        icon={icon}
        className={cn('mx-auto mb-3 h-9 w-9', ICON_ACCENT[accent])}
      />
      <p className="font-display text-lg font-semibold tracking-normal text-foreground layout-sm:text-xl">
        {title}
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { discoverHeroWorkspacePanelChipsClassName } from '@/components/discover/discoverHeroTokens'

export type DiscoverHeroWorkspacePanelChipAccent = 'primary' | 'success' | 'warRoom'

export type DiscoverHeroWorkspacePanelChipItem = {
  id: string
  label: string
  icon?: ReactNode
  count?: number | null
  disabled?: boolean
  accent?: DiscoverHeroWorkspacePanelChipAccent
  /** Optional driver.js tour target on this chip button. */
  dataTour?: string
}

const ACCENT_STYLES: Record<
  DiscoverHeroWorkspacePanelChipAccent,
  {
    icon: string
    active: string
    idle: string
    count: string
  }
> = {
  primary: {
    icon: 'bg-primary/10 text-primary',
    active:
      'border-primary/40 bg-primary/5 text-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.25)]',
    idle: 'hover:border-primary/35 hover:bg-primary/5 hover:text-foreground',
    count: 'bg-primary/10 text-primary',
  },
  success: {
    icon: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
    active:
      'border-[hsl(var(--success)/0.45)] bg-[hsl(var(--success)/0.08)] text-foreground shadow-[0_2px_8px_-2px_hsl(var(--success)/0.22)]',
    idle: 'hover:border-[hsl(var(--success)/0.35)] hover:bg-[hsl(var(--success)/0.06)] hover:text-foreground',
    count: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
  },
  warRoom: {
    icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
    active:
      'border-red-200/70 bg-red-500/[0.06] text-foreground shadow-[0_2px_8px_-2px_rgba(239,68,68,0.22)] dark:border-red-900/45',
    idle: 'hover:border-red-200/60 hover:bg-red-500/[0.06] hover:text-foreground dark:hover:border-red-900/40',
    count: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
}

function DiscoverHeroWorkspacePanelChip({
  active,
  onClick,
  disabled,
  icon,
  label,
  count,
  accent,
  dataTour,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  icon?: ReactNode
  label: string
  count?: number | null
  accent: DiscoverHeroWorkspacePanelChipAccent
  dataTour?: string
}) {
  const styles = ACCENT_STYLES[accent]

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      {...(dataTour ? { 'data-tour': dataTour } : {})}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-md border border-border-subtle/70',
        'bg-card px-2.5 py-2 text-[11px] font-medium shadow-sm transition-[color,box-shadow,border-color,background-color]',
        active ? cn('text-foreground/90', styles.active) : cn('text-foreground/75', styles.idle),
        'disabled:cursor-default disabled:opacity-40',
      )}
    >
      {icon ? (
        <span
          className={cn(
            'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md',
            styles.icon,
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
      {count != null && count > 0 ? (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums',
            styles.count,
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  )
}

export function DiscoverHeroWorkspacePanelChips({
  value,
  onValueChange,
  items,
  accent = 'primary',
  disabled,
  className,
  ariaLabel = 'Workspace views',
  leading,
}: {
  value: string
  onValueChange: (value: string) => void
  items: DiscoverHeroWorkspacePanelChipItem[]
  accent?: DiscoverHeroWorkspacePanelChipAccent
  disabled?: boolean
  className?: string
  ariaLabel?: string
  leading?: ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(discoverHeroWorkspacePanelChipsClassName, className)}
    >
      {leading}
      {items.map((item) => (
        <DiscoverHeroWorkspacePanelChip
          key={item.id}
          active={value === item.id}
          onClick={() => onValueChange(item.id)}
          disabled={disabled || item.disabled}
          icon={item.icon}
          label={item.label}
          count={item.count}
          accent={item.accent ?? accent}
          dataTour={item.dataTour}
        />
      ))}
    </div>
  )
}

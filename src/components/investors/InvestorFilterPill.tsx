import { cn } from '@/lib/utils'

type InvestorFilterPillProps = {
  active?: boolean
  children: React.ReactNode
  onClick: () => void
  /** Accent when active — India focus uses saffron/green tint */
  accent?: 'primary' | 'india'
  className?: string
}

export function InvestorFilterPill({
  active = false,
  children,
  onClick,
  accent = 'primary',
  className,
}: InvestorFilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold tracking-[0.01em] transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? accent === 'india'
            ? 'border-[hsl(var(--saffron-200))] bg-[hsl(var(--saffron-50))] text-[hsl(var(--saffron-700))] shadow-[0_2px_14px_-6px_hsl(var(--saffron-500)/0.35)]'
            : 'border-primary/35 bg-primary text-primary-foreground shadow-[0_2px_14px_-6px_hsl(var(--primary)/0.4)]'
          : 'border-border-subtle bg-card text-muted-foreground hover:border-primary/20 hover:bg-primary/[0.04] hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

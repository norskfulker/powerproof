import { cn } from '@/lib/utils'

type PageSectionProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** Eyebrow label above title (Notion-style section label) */
  kicker?: React.ReactNode
}

export function PageSection({ title, description, kicker, children, className }: PageSectionProps) {
  return (
    <section className={cn('mb-8 last:mb-0', className)}>
      {(kicker || title || description) && (
        <header className="mb-4">
          {kicker ? (
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {kicker}
            </div>
          ) : null}
          {title ? <h2 className="m-0 text-base font-bold text-foreground layout-sm:text-lg">{title}</h2> : null}
          {description ? (
            <p className="mt-1.5 m-0 text-sm text-muted-foreground">{description}</p>
          ) : null}
          <div className="mt-3 h-px w-full bg-border-subtle" />
        </header>
      )}
      {children}
    </section>
  )
}

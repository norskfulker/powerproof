import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title?: React.ReactNode
  /** @deprecated Subtitles are no longer shown under page titles. */
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  /** Omit the accent line under the title row */
  hideAccent?: boolean
}

export function PageHeader({ title, description: _description, actions, className, hideAccent }: PageHeaderProps) {
  const showTitle = title != null && title !== ''
  return (
    <div className={cn('mb-5 layout-sm:mb-7', className)}>
      <div
        className={cn(
          'flex flex-col gap-3 layout-sm:flex-row layout-sm:items-end layout-sm:justify-between',
          !showTitle && actions && 'layout-sm:justify-end',
        )}
      >
        {showTitle ? (
          <div className="min-w-0">
            <h1 className="m-0 font-display text-xl font-bold tracking-heading text-foreground layout-sm:text-2xl layout-lg:text-[28px] leading-tight">
              {title}
            </h1>
          </div>
        ) : null}
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {!hideAccent && showTitle ? (
        <div className="mt-4 flex items-center gap-3">
          <div className="h-0.5 w-8 shrink-0 rounded-full bg-primary" />
          <div className="h-px flex-1 bg-border-subtle" />
        </div>
      ) : null}
    </div>
  )
}

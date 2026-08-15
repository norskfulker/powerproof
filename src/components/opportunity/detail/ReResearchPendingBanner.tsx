import { Loader2 } from '@/lib/icons'
import { formatReResearchSectionsLabel, isBackgroundJobStale } from '@/lib/backgroundJobs'
import { cn } from '@/lib/utils'

export function ReResearchPendingBanner({
  title,
  sections,
  createdAt,
  className,
}: {
  title: string
  sections: string[] | null | undefined
  createdAt?: string | null
  className?: string
}) {
  const stale = createdAt ? isBackgroundJobStale(createdAt) : false

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">
          Updating {formatReResearchSectionsLabel(sections)} for {title}
        </p>
        <p className="text-xs text-muted-foreground">
          {stale
            ? 'Taking longer than expected — existing content stays visible until sections refresh.'
            : 'Your report stays visible while selected sections regenerate.'}
        </p>
      </div>
    </div>
  )
}

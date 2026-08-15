import { DiscoverWide } from '@/components/page-shells'
import { Skeleton } from '@/components/ui/skeleton'
import { opportunityDetailPageGridClass } from '@/components/opportunity/detail/detailSectionClasses'
import { opportunityDetailCardRadiusClass } from '@/lib/opportunityCardClasses'
import { cn } from '@/lib/utils'

function AccordionRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-border-subtle px-0 py-3.5 sm:py-5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 sm:px-4">
        <Skeleton className="h-7 w-7 shrink-0 rounded-[14px]" />
        <Skeleton className="h-5 w-36 max-w-[55%] sm:h-6 sm:w-48" />
      </div>
      <Skeleton className="mr-3 h-4 w-4 shrink-0 rounded-sm sm:mr-4" />
    </div>
  )
}

export function OpportunityLoadingState() {
  return (
    <div className="w-full" aria-busy="true" aria-label="Loading opportunity">
      <DiscoverWide>
        <div className={opportunityDetailPageGridClass()}>
          <div
            className={cn(
              'relative z-0 w-full min-w-0 overflow-hidden border-0 bg-bg-sunken',
              opportunityDetailCardRadiusClass,
            )}
          >
            <Skeleton className="max-h-[min(22vh,160px)] h-[160px] w-full rounded-none sm:max-h-[min(28vh,220px)] sm:h-[220px] lg:max-h-[min(32vh,280px)] lg:h-[280px]" />
          </div>

          <div className="w-full space-y-4 border-0 bg-background p-5 sm:space-y-5 sm:p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-[min(100%,22rem)] sm:h-10" />
            <Skeleton className="h-4 w-[min(100%,28rem)]" />
            <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg sm:h-20" />
              ))}
            </div>
          </div>

          <div className="w-full border-t border-border-subtle">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <AccordionRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </DiscoverWide>
    </div>
  )
}

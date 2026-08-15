import { Skeleton } from '@/components/ui/skeleton'

export function AnalyticsStatCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-8 w-24" />
    </div>
  )
}

export function AnalyticsStatsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <AnalyticsStatCardSkeleton />
      <AnalyticsStatCardSkeleton />
      <AnalyticsStatCardSkeleton />
    </div>
  )
}

/** Use inside existing `<table><tbody>` on Analytics dashboard. */
export function AnalyticsTopOpportunitiesBodySkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-b-0">
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-[min(320px,85%)]" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-4 w-14" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-4 w-12" />
          </td>
          <td className="px-4 py-3 text-right">
            <Skeleton className="ml-auto h-4 w-10" />
          </td>
        </tr>
      ))}
    </>
  )
}

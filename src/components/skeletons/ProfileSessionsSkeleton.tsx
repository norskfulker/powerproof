import { Skeleton } from '@/components/ui/skeleton'

export function ProfileSessionsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border-subtle bg-[hsl(var(--bg-surface))] p-3 sm:p-3.5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-[88px] shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  )
}

import { DashboardGrid } from '@/components/page-shells'
import { cn } from '@/lib/utils'

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted/50', className)} />
}

export function ProfilePageSkeleton() {
  return (
    <DashboardGrid>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-1 layout-sm:px-0">
        <div className="overflow-hidden rounded-2xl border border-border-subtle bg-card p-6">
          <div className="flex flex-col items-center gap-4 layout-sm:flex-row layout-sm:items-start">
            <Bone className="h-[88px] w-[88px] shrink-0 rounded-2xl" />
            <div className="w-full space-y-2 layout-sm:flex-1">
              <Bone className="mx-auto h-7 w-40 layout-sm:mx-0" />
              <Bone className="mx-auto h-4 w-28 layout-sm:mx-0" />
              <Bone className="mx-auto h-4 w-52 layout-sm:mx-0" />
              <div className="flex justify-center gap-2 pt-2 layout-sm:justify-start">
                <Bone className="h-7 w-24 rounded-full" />
                <Bone className="h-7 w-28 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <Bone className="mx-auto h-10 w-full max-w-xs rounded-xl" />
        <div className="space-y-4">
          <Bone className="h-48 w-full rounded-2xl" />
          <Bone className="h-36 w-full rounded-2xl" />
          <Bone className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </DashboardGrid>
  )
}

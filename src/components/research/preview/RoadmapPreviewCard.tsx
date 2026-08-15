import { Check, Lock, Waypoints } from '@/lib/icons'
import { cardSurface } from '@/lib/cardSurface'
import type { PreviewResult } from '@/types/previewResearch'
import { cn } from '@/lib/utils'
import { PreviewLockedSection } from '@/components/research/preview/PreviewLockedSection'

export function RoadmapPreviewCard({
  preview,
  panel = false,
}: {
  preview: PreviewResult
  panel?: boolean
}) {
  const { roadmap_preview: roadmap } = preview
  const phases = roadmap.phases.slice(0, 3)
  const firstMilestone = roadmap.first_milestone

  return (
    <article className={cn(!panel && cardSurface, !panel && 'p-5 sm:p-6', 'flex flex-col')}>
      {!panel ? (
        <header className="flex items-center justify-between gap-2 border-b border-border-subtle/60 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Waypoints className="h-3.5 w-3.5" aria-hidden />
            Preview
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {roadmap.total_weeks} weeks total
          </span>
        </header>
      ) : (
        <div className="mb-4 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Waypoints className="h-3.5 w-3.5" aria-hidden />
            Preview
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {roadmap.total_weeks} weeks
          </span>
        </div>
      )}

      <div className={cn(!panel && 'mt-4', 'space-y-4')}>
        {phases.map((phase, index) => {
          const isOpen = index === 0
          return (
            <div
              key={`${phase.title}-${index}`}
              className={cn(
                'rounded-xl border p-4 transition-colors',
                isOpen
                  ? 'border-primary/25 bg-primary/[0.04]'
                  : 'border-border-subtle/60 bg-surface/40 opacity-90',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-muted-foreground">
                    Phase {index + 1}
                  </p>
                  <p className="mt-1 text-base font-normal text-foreground">{phase.title}</p>
                  {phase.weeks ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{phase.weeks}</p>
                  ) : null}
                  {phase.tagline ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{phase.tagline}</p>
                  ) : null}
                </div>
                {isOpen ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Check className="h-3 w-3" aria-hidden />
                    Open
                  </span>
                ) : (
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-label="Locked" />
                )}
              </div>

              {isOpen && firstMilestone ? (
                <div className="mt-4 rounded-lg border border-border-subtle/50 bg-background/60 p-3">
                  <p className="text-sm font-semibold text-foreground">{firstMilestone.title}</p>
                  <ul className="mt-2.5 space-y-2">
                    {firstMilestone.tasks.map((task) => (
                      <li key={task} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/60" aria-hidden />
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )
        })}

        <PreviewLockedSection focus="roadmap" />
      </div>
    </article>
  )
}

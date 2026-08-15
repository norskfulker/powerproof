import { Loader2 } from '@/lib/icons'
import {
  formatReResearchSectionsLabel,
  isBackgroundJobStale,
  isReResearchJob,
} from '@/lib/backgroundJobs'
import type {
  ActivePlaybook,
  ActiveResearch,
  ActiveRoadmap,
  ActiveSourcingTask,
} from '@/hooks/useBackgroundJobs'
import { cn } from '@/lib/utils'

interface Props {
  activeResearches: ActiveResearch[]
  activePlaybooks: ActivePlaybook[]
  activeRoadmaps: ActiveRoadmap[]
  activeSourcingTasks: ActiveSourcingTask[]
}

export function RunningJobsBanner({
  activeResearches,
  activePlaybooks,
  activeRoadmaps,
  activeSourcingTasks,
}: Props) {
  const total =
    activeResearches.length +
    activePlaybooks.length +
    activeRoadmaps.length +
    activeSourcingTasks.length
  if (total === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-label="Background jobs in progress"
    >
      {activeResearches.map((r) => (
        <JobPill
          key={r.id}
          label={researchPillLabel(r)}
          stale={isBackgroundJobStale(r.created_at)}
        />
      ))}
      {activePlaybooks.map((p) => (
        <JobPill
          key={p.id}
          label={`Building War Room for ${p.business_name?.trim() || 'your business'}…`}
          stale={isBackgroundJobStale(p.created_at)}
        />
      ))}
      {activeRoadmaps.map((r) => (
        <JobPill
          key={r.id}
          label={`Building roadmap for ${r.title?.trim() || r.goal_input?.trim() || 'your goal'}…`}
          stale={isBackgroundJobStale(r.created_at)}
        />
      ))}
      {activeSourcingTasks.map((s) => (
        <JobPill
          key={s.id}
          label={`Sourcing: ${s.task_label?.trim() || 'task'}…`}
          stale={isBackgroundJobStale(s.created_at)}
        />
      ))}
    </div>
  )
}

function researchPillLabel(r: ActiveResearch): string {
  const query = r.research_query?.trim() || r.title?.trim() || 'your idea'
  if (isReResearchJob(r)) {
    const sections = formatReResearchSectionsLabel(r.re_research_sections)
    return `Re-researching ${sections} for ${r.title?.trim() || query}…`
  }
  return `Researching "${query}"…`
}

function JobPill({ label, stale }: { label: string; stale: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-2 rounded-lg border border-border-subtle bg-card px-3 py-2 text-sm shadow-md',
      )}
    >
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
      <span className="min-w-0 truncate text-foreground">{label}</span>
      {stale ? (
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
          Taking longer…
        </span>
      ) : null}
    </div>
  )
}

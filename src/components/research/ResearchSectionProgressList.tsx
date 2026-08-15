import { CheckCircle2, Loader2 } from '@/lib/icons'
import type { TimedSectionStatus } from '@/lib/researchTimedProgress'
import { cn } from '@/lib/utils'

export type ResearchSectionProgressItem = {
  id: string
  label: string
  status: TimedSectionStatus
}

export interface ResearchSectionProgressListProps {
  sections: ResearchSectionProgressItem[]
  className?: string
}

function SectionStatusIcon({ status }: { status: TimedSectionStatus }) {
  if (status === 'complete') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
  }
  if (status === 'active') {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" aria-hidden />
  }
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-muted/30"
      aria-hidden
    />
  )
}

export function ResearchSectionProgressList({ sections, className }: ResearchSectionProgressListProps) {
  return (
    <ul className={cn('space-y-2.5', className)}>
      {sections.map((section) => (
        <li
          key={section.id}
          className={cn(
            'flex items-center gap-2.5 transition-colors duration-500',
            section.status === 'complete' && 'text-foreground',
            section.status === 'active' && 'text-foreground',
            section.status === 'pending' && 'text-muted-foreground/55',
          )}
        >
          <SectionStatusIcon status={section.status} />
          <span
            className={cn(
              'text-sm',
              section.status === 'complete' && 'font-medium',
              section.status === 'active' && 'font-semibold',
              section.status === 'pending' && 'font-medium',
            )}
          >
            {section.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

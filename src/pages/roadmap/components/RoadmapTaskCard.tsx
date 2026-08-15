import type { ComponentType, MouseEvent } from 'react'
import { ArrowRight, Check, Circle, Clock, ListChecks, Wrench } from '@/lib/icons'

import { MetricBadge } from '@/components/detail/DetailHeroPanel'
import { ScratchRetypeText } from '@/components/ScratchRetypeText'
import { iconClassName } from '@/lib/iconClassNames'
import { cn } from '@/lib/utils'

import type { RoadmapNode } from '../roadmapTypes'

const TASK_META_ROWS = [
  { key: 'exact_time_allocation', label: 'Time', icon: Clock, tone: 'primary' as const },
  { key: 'specific_tool_platform', label: 'Tool / platform', icon: Wrench, tone: 'muted' as const },
  { key: 'measurable_output', label: 'Output', icon: ListChecks, tone: 'success' as const },
  { key: 'trigger_to_move_on', label: 'Move on when', icon: ArrowRight, tone: 'roadmap' as const },
] as const

function readMetadataField(node: RoadmapNode, key: string): string | null {
  const value = node.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function TaskMetaCell({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  value: string
  tone: 'primary' | 'muted' | 'success' | 'roadmap'
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-none border border-border-subtle/60 bg-muted/15 p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className={iconClassName({ tone, size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="m-0 text-[12px] font-medium leading-snug text-foreground">{value}</p>
    </div>
  )
}

function TaskCompletionToggle({
  completed,
  onToggle,
}: {
  completed: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border-default bg-background text-muted-foreground transition-all hover:border-semantic-positive hover:text-semantic-positive',
        completed && 'border-semantic-positive bg-semantic-positive text-white',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-label={completed ? 'Mark task incomplete' : 'Mark task done'}
      aria-pressed={completed}
    >
      {completed ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      ) : (
        <Circle className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  )
}

export type RoadmapTaskCardProps = {
  task: RoadmapNode
  onToggleComplete?: () => void
  onClick?: () => void
  className?: string
}

export function RoadmapTaskCard({
  task,
  onToggleComplete,
  onClick,
  className,
}: RoadmapTaskCardProps) {
  const timeBadge =
    readMetadataField(task, 'exact_time_allocation') ?? task.duration_label?.trim() ?? null

  const metaRows = TASK_META_ROWS.map((row) => ({
    ...row,
    value: readMetadataField(task, row.key),
  })).filter((row): row is typeof row & { value: string } => Boolean(row.value))

  const handleCardClick = onClick
    ? (event: MouseEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest('button')) return
        onClick()
      }
    : undefined

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-none border border-border-subtle/70 bg-background p-3 sm:p-3.5',
        onClick && 'cursor-pointer hover:border-border-subtle hover:bg-muted/10',
        className,
        task.is_completed && 'opacity-55',
        task.is_optional && 'opacity-70',
      )}
      onClick={handleCardClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {onToggleComplete ? (
          <TaskCompletionToggle completed={task.is_completed} onToggle={onToggleComplete} />
        ) : (
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-default bg-background text-muted-foreground"
            aria-hidden
          >
            <Circle className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <ScratchRetypeText
              text={task.title}
              animateKey={task.is_completed}
              as="p"
              className={cn(
                'm-0 min-w-0 flex-1 text-[13px] font-medium leading-snug sm:text-sm',
                task.is_completed ? 'text-muted-foreground line-through' : 'text-foreground',
              )}
            />
            {timeBadge ? (
              <span className="shrink-0">
                <MetricBadge icon={Clock} variant="ghost" size="sm">
                  {timeBadge}
                </MetricBadge>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {metaRows.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 layout-lg:grid-cols-4">
          {metaRows.map((row) => (
            <TaskMetaCell
              key={row.key}
              icon={row.icon}
              label={row.label}
              value={row.value}
              tone={row.tone}
            />
          ))}
        </div>
      ) : null}

      {task.action_items.length > 0 ? (
        <ol className="m-0 flex list-none flex-col gap-1.5 border-t border-border-subtle/60 pt-2.5 pl-1">
          {task.action_items.map((item, index) => (
            <li
              key={index}
              className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground sm:pl-2 sm:text-[12.5px]"
            >
              <span className="shrink-0 font-semibold text-primary/80" aria-hidden>
                →
              </span>
              <span className="min-w-0 text-foreground/90">{item}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

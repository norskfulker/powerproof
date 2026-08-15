import { useState } from 'react'
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Flag,
  GitBranch,
  ListChecks,
  Map,
  MessageCircle,
  Target,
  Zap,
} from '@/lib/icons'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScratchRetypeText } from '@/components/ScratchRetypeText'
import { MetricBadge } from '@/components/detail/DetailHeroPanel'
import { OpportunityAccordionHeaderRow } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { opportunityAccordionDescriptionClass } from '@/components/opportunity/detail/OpportunityAccordionHeaderRow'
import { iconClassName } from '@/lib/iconClassNames'
import { cn } from '@/lib/utils'

import { MilestoneResources } from './MilestoneResources'
import { condensePassCondition } from './roadmapCopyUtils'
import { phaseChildren, phaseProgress } from './roadmapUtils'
import { milestoneTasks } from './roadmapNodeGraph'
import { RoadmapTaskCard } from './components/RoadmapTaskCard'
import type { RoadmapDifficulty, RoadmapNode } from './roadmapTypes'

export function roadmapPhaseSectionId(phaseId: string): string {
  return `roadmap-phase-${phaseId}`
}

function milestoneHasExpandableContent(milestone: RoadmapNode, nodes: RoadmapNode[]): boolean {
  return (
    Boolean(milestone.description?.trim()) ||
    milestone.action_items.length > 0 ||
    milestoneTasks(milestone.id, nodes).length > 0 ||
    milestone.resources.length > 0 ||
    (Array.isArray(milestone.metadata?.tasks) && milestone.metadata.tasks.length > 0)
  )
}

export { RoadmapHero } from './components/RoadmapHero'

type RoadmapJourneyProps = {
  phases: RoadmapNode[]
  nodes: RoadmapNode[]
  phaseIndexBase?: number
  onNodeComplete: (node: RoadmapNode) => void
  onNodeSelect?: (node: RoadmapNode) => void
  roadmapDifficulty?: RoadmapDifficulty | null
}

function formatRoadmapDifficulty(difficulty: RoadmapDifficulty): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
}

/** Renders phase panels directly (no accordion) — typically one active phase from chrome tabs. */
export function RoadmapJourney({
  phases,
  nodes,
  phaseIndexBase = 0,
  onNodeComplete,
  onNodeSelect,
  roadmapDifficulty,
}: RoadmapJourneyProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-0">
      {phases.map((phase, phaseIndex) => {
        const { percent: progress, completed, total } = phaseProgress(phase.id, nodes)
        return (
          <PhasePanel
            key={phase.id}
            phase={phase}
            phaseIndex={phaseIndexBase + phaseIndex}
            nodes={nodes}
            progress={progress}
            completed={completed}
            total={total}
            onNodeComplete={onNodeComplete}
            onNodeSelect={onNodeSelect}
            roadmapDifficulty={roadmapDifficulty}
          />
        )
      })}
    </div>
  )
}

type PhasePanelProps = {
  phase: RoadmapNode
  phaseIndex: number
  nodes: RoadmapNode[]
  progress: number
  completed: number
  total: number
  onNodeComplete: (node: RoadmapNode) => void
  onNodeSelect?: (node: RoadmapNode) => void
  roadmapDifficulty?: RoadmapDifficulty | null
}

function PhasePanel({
  phase,
  phaseIndex,
  nodes,
  progress,
  completed,
  total,
  onNodeComplete,
  onNodeSelect,
  roadmapDifficulty,
}: PhasePanelProps) {
  const children = phaseChildren(phase.id, nodes)

  return (
    <section
      id={roadmapPhaseSectionId(phase.id)}
      role="tabpanel"
      className="min-w-0 border-b border-border-subtle py-3.5 sm:py-5"
    >
      <div className="mb-3 flex min-w-0 items-center gap-2.5">
        <OpportunityAccordionHeaderRow
          icon={Map}
          tone="primary"
          title={`Phase ${phaseIndex + 1}: ${phase.title}`}
        />
      </div>
      {phase.description?.trim() ? (
        <p className={cn(opportunityAccordionDescriptionClass, 'mb-3')}>{phase.description}</p>
      ) : null}
      <div className="mb-4">
        <PhaseSectionMeta
          phase={phase}
          nodes={nodes}
          progress={progress}
          completed={completed}
          total={total}
          roadmapDifficulty={roadmapDifficulty}
        />
      </div>
      {total > 0 ? (
        <div className="mb-4 h-1.5 w-full min-w-0 overflow-hidden rounded-none bg-muted/40">
          <div
            className="h-full bg-primary transition-[width] duration-350 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
      {children.length > 0 ? (
        <PhaseChildrenList
          phase={phase}
          nodes={nodes}
          onNodeComplete={onNodeComplete}
          onNodeSelect={onNodeSelect}
        />
      ) : (
        <p className="font-sans text-[13px] text-muted-foreground">No steps in this phase yet.</p>
      )}
    </section>
  )
}

function PhaseSectionMeta({
  phase,
  nodes,
  progress,
  completed,
  total,
  roadmapDifficulty,
}: {
  phase: RoadmapNode
  nodes: RoadmapNode[]
  progress: number
  completed: number
  total: number
  roadmapDifficulty?: RoadmapDifficulty | null
}) {
  const children = phaseChildren(phase.id, nodes)
  const milestoneCount = children.filter((c) => c.node_type === 'milestone').length
  const decisionCount = children.filter((c) => c.node_type === 'decision').length
  const weekLabel =
    phase.timeline_week_start != null && phase.timeline_week_end != null
      ? `Weeks ${phase.timeline_week_start}–${phase.timeline_week_end}`
      : null

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <PhaseTagPills phase={phase} roadmapDifficulty={roadmapDifficulty} />
      <PhaseMetricBadges
        weekLabel={weekLabel}
        durationLabel={phase.duration_label}
        milestoneCount={milestoneCount}
        decisionCount={decisionCount}
        completed={completed}
        total={total}
        progress={progress}
      />
    </div>
  )
}

function PhaseMetricBadges({
  weekLabel,
  durationLabel,
  milestoneCount,
  decisionCount,
  completed,
  total,
  progress,
  className,
}: {
  weekLabel: string | null
  durationLabel: string | null
  milestoneCount: number
  decisionCount: number
  completed: number
  total: number
  progress: number
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5', className)}>
      {weekLabel ? (
        <MetricBadge icon={Calendar} variant="ghost" size="sm">
          {weekLabel}
        </MetricBadge>
      ) : null}
      {durationLabel ? (
        <MetricBadge icon={Clock} variant="ghost" size="sm">
          {durationLabel}
        </MetricBadge>
      ) : null}
      {milestoneCount > 0 ? (
        <MetricBadge icon={Flag} variant="ghost" size="sm">
          {milestoneCount} milestone{milestoneCount !== 1 ? 's' : ''}
        </MetricBadge>
      ) : null}
      {decisionCount > 0 ? (
        <MetricBadge icon={GitBranch} variant="ghost" size="sm">
          {decisionCount} fork{decisionCount !== 1 ? 's' : ''}
        </MetricBadge>
      ) : null}
      {total > 0 ? (
        <MetricBadge
          icon={CheckCircle2}
          variant={progress === 100 ? 'success' : 'primary'}
          size="sm"
        >
          {completed}/{total} · {progress}%
        </MetricBadge>
      ) : null}
    </div>
  )
}

function PhaseTagPills({
  phase,
  roadmapDifficulty,
  className,
}: {
  phase: RoadmapNode
  roadmapDifficulty?: RoadmapDifficulty | null
  className?: string
}) {
  const showCritical = phase.is_critical_path
  const showDifficulty = Boolean(roadmapDifficulty)
  if (!showCritical && !showDifficulty) return null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {showCritical ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/12 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
          <Zap className="h-3 w-3 shrink-0" aria-hidden />
          Critical path
        </span>
      ) : null}
      {showDifficulty && roadmapDifficulty ? (
        <span className="inline-flex items-center rounded-full border border-border-subtle bg-muted/45 px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {formatRoadmapDifficulty(roadmapDifficulty)}
        </span>
      ) : null}
    </div>
  )
}

function PhaseChildrenList({
  phase,
  nodes,
  onNodeComplete,
  onNodeSelect,
}: {
  phase: RoadmapNode
  nodes: RoadmapNode[]
  onNodeComplete: (node: RoadmapNode) => void
  onNodeSelect?: (node: RoadmapNode) => void
}) {
  const children = phaseChildren(phase.id, nodes)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {children.map((child) => {
        if (child.node_type === 'milestone') {
          return (
            <MilestoneCollapsible
              key={child.id}
              milestone={child}
              nodes={nodes}
              onComplete={onNodeComplete}
              onSelect={onNodeSelect}
            />
          )
        }
        if (child.node_type === 'decision') {
          return <DecisionBlock key={child.id} node={child} onSelect={onNodeSelect} />
        }
        if (child.node_type === 'emotional') {
          return <EmotionalBlock key={child.id} node={child} onSelect={onNodeSelect} />
        }
        if (child.node_type === 'task') {
          return (
            <TaskRow key={child.id} task={child} onComplete={onNodeComplete} onSelect={onNodeSelect} />
          )
        }
        return null
      })}
    </div>
  )
}

type MilestoneCollapsibleProps = {
  milestone: RoadmapNode
  nodes: RoadmapNode[]
  onComplete: (node: RoadmapNode) => void
  onSelect?: (node: RoadmapNode) => void
}

function MilestoneCollapsible({
  milestone,
  nodes,
  onComplete,
  onSelect,
}: MilestoneCollapsibleProps) {
  const [open, setOpen] = useState(false)
  const tasks = milestoneTasks(milestone.id, nodes)
  const actionCount = milestone.action_items.length + tasks.length
  const expandable = milestoneHasExpandableContent(milestone, nodes)

  const handleMilestoneComplete = () => {
    if (!milestone.is_completed) {
      setOpen(false)
    }
    onComplete(milestone)
  }

  const header = (
    <div className="flex min-w-0 items-start gap-2.5 px-3 py-3 sm:px-3.5">
      <CompletionToggle
        completed={milestone.is_completed}
        onToggle={handleMilestoneComplete}
        size="md"
        label={milestone.is_completed ? 'Mark milestone incomplete' : 'Mark milestone done'}
        className="mt-0.5 shrink-0"
      />
      {expandable ? (
        <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 border-0 bg-transparent p-0 text-left text-inherit">
          <MilestoneHeaderBody milestone={milestone} actionCount={actionCount} />
          <ChevronDown
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-[transform,color] duration-250 group-data-[state=open]/milestone:rotate-180 group-data-[state=open]/milestone:text-primary"
            aria-hidden
          />
        </CollapsibleTrigger>
      ) : (
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 border-0 bg-transparent p-0 text-left text-inherit"
          onClick={() => onSelect?.(milestone)}
        >
          <MilestoneHeaderBody milestone={milestone} actionCount={actionCount} />
        </button>
      )}
    </div>
  )

  const body = (
    <>
      {milestone.description && <RoadmapPassCondition text={milestone.description} />}

      {milestone.action_items.length > 0 && (
        <ul className="mb-3 flex list-none flex-col gap-2 p-0">
          {milestone.action_items.map((item, i) => (
            <li key={i} className="text-[13px] leading-relaxed text-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}

      {tasks.length > 0 && (
        <div className="mb-3 flex flex-col gap-1.5 border-t border-border-subtle pt-2.5">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} />
          ))}
        </div>
      )}

      <MilestoneResources resources={milestone.resources} />
    </>
  )

  if (!expandable) {
    return (
      <div
        className={cn(
          'rounded-none border border-border-subtle/70 bg-background',
          milestone.is_completed && 'opacity-[0.72]',
        )}
      >
        {header}
      </div>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'group/milestone min-w-0 overflow-hidden rounded-none border border-border-subtle/70 bg-background transition-colors hover:bg-muted/10',
        milestone.is_completed && 'opacity-[0.72]',
        milestone.is_optional && 'opacity-70',
      )}
    >
      {header}
      <CollapsibleContent className="min-w-0 overflow-x-hidden border-t border-border-subtle/60 px-3 py-3 sm:px-3.5 sm:py-3.5 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        {body}
        {onSelect && (
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-primary hover:underline"
            onClick={() => onSelect(milestone)}
          >
            View full details
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function MilestoneHeaderBody({
  milestone,
  actionCount,
}: {
  milestone: RoadmapNode
  actionCount: number
}) {
  return (
    <div className="min-w-0 flex-1">
      <ScratchRetypeText
        text={milestone.title}
        animateKey={milestone.is_completed}
        as="p"
        className={cn(
          'mb-1.5 text-sm font-semibold leading-snug',
          milestone.is_completed ? 'text-muted-foreground line-through' : 'text-foreground',
        )}
      />
      <div className="flex flex-wrap gap-1.5">
          {milestone.duration_label && (
            <MetricBadge icon={Clock} variant="ghost" size="sm">
              {milestone.duration_label}
            </MetricBadge>
          )}
          {milestone.timeline_week_start != null && milestone.timeline_week_end != null && (
            <MetricBadge icon={Calendar} variant="ghost" size="sm">
              Wk {milestone.timeline_week_start}–{milestone.timeline_week_end}
            </MetricBadge>
          )}
          {milestone.is_critical_path && (
            <MetricBadge icon={Zap} variant="warning" size="sm">
              Critical
            </MetricBadge>
          )}
          {milestone.is_optional && (
            <MetricBadge variant="ghost" size="sm">
              Optional
            </MetricBadge>
          )}
          {actionCount > 0 && (
            <MetricBadge icon={ListChecks} variant="ghost" size="sm">
              {actionCount} step{actionCount !== 1 ? 's' : ''}
            </MetricBadge>
          )}
        </div>
    </div>
  )
}

function RoadmapPassCondition({
  text,
  tone = 'pass',
}: {
  text: string
  tone?: 'pass' | 'decision'
}) {
  if (tone === 'decision') {
    return (
      <div className="mb-3 flex flex-col gap-2 rounded-[10px] border border-primary/10 bg-primary/[0.05] p-3">
        <MetricBadge variant="warning" icon={GitBranch} size="sm">
          The call
        </MetricBadge>
        <p className="m-0 text-sm font-semibold leading-snug text-foreground">{text}</p>
      </div>
    )
  }

  const { focusBody, doneWhen } = condensePassCondition(text)

  return (
    <div className="mb-3 flex flex-col gap-2">
      {focusBody ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-primary/10 bg-primary/[0.05] p-3">
          <MetricBadge variant="primary" icon={Target} size="sm">
            Focus should be
          </MetricBadge>
          <p className="m-0 text-sm font-semibold leading-snug text-foreground">{focusBody}</p>
        </div>
      ) : null}
      {doneWhen ? (
        <div className="flex flex-col gap-2 rounded-[10px] border border-semantic-positive/15 bg-semantic-positive/[0.06] p-3">
          <MetricBadge variant="success" icon={CheckCircle2} size="sm">
            Done when
          </MetricBadge>
          <p className="m-0 text-sm font-semibold leading-snug text-foreground">{doneWhen}</p>
        </div>
      ) : null}
    </div>
  )
}

function CompletionToggle({
  completed,
  onToggle,
  size = 'sm',
  label,
  className,
}: {
  completed: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
  label: string
  className?: string
}) {
  const dim = size === 'md' ? 'h-7 w-7' : 'h-5 w-5'
  return (
    <button
      type="button"
      className={cn(
        'flex shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-border-default bg-background text-muted-foreground transition-all hover:border-semantic-positive hover:text-semantic-positive',
        dim,
        completed && 'border-semantic-positive bg-semantic-positive text-white',
        className,
      )}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-label={label}
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

type TaskRowProps = {
  task: RoadmapNode
  onComplete: (node: RoadmapNode) => void
  onSelect?: (node: RoadmapNode) => void
}

function TaskRow({ task, onComplete, onSelect }: TaskRowProps) {
  return (
    <RoadmapTaskCard
      task={task}
      onToggleComplete={() => onComplete(task)}
      onClick={onSelect ? () => onSelect(task) : undefined}
    />
  )
}

function DecisionBlock({
  node,
  onSelect,
}: {
  node: RoadmapNode
  onSelect?: (node: RoadmapNode) => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex min-w-0 w-full gap-2.5 rounded-none border border-dashed border-saffron-400/70 bg-badge-low-bg p-3 text-left transition-colors hover:bg-badge-low-bg/80 sm:gap-3 sm:p-3.5',
        node.is_optional && 'opacity-70',
      )}
      onClick={() => onSelect?.(node)}
    >
      <GitBranch className={iconClassName({ tone: 'amber', size: 'lg', active: true })} strokeWidth={2.5} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="mb-2">
          <MetricBadge icon={GitBranch} variant="primary" size="sm">
            Decision
            {node.timeline_week_start != null ? ` · Wk ${node.timeline_week_start}` : ''}
          </MetricBadge>
        </div>
        <p className="mb-1.5 text-sm font-semibold leading-snug text-foreground">{node.title}</p>
        {node.description && <RoadmapPassCondition text={node.description} tone="decision" />}
        {node.decision_branches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {node.decision_branches.slice(0, 2).map((b, i) => (
              <span
                key={i}
                className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground"
              >
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

const EMOTIONAL_STYLES: Record<string, string> = {
  overwhelmed_lost: 'bg-badge-hot-bg border-badge-hot-text/15',
  grinding_invisible: 'bg-badge-low-bg border-saffron-400/20',
  first_win_high: 'bg-badge-trending-bg border-badge-trending-text/15',
  plateau_doubt: 'bg-badge-hot-bg border-badge-hot-text/15',
  breaking_through: 'bg-badge-trending-bg border-badge-trending-text/15',
  exhausted_proud: 'bg-badge-trending-bg border-badge-trending-text/15',
}

function EmotionalBlock({
  node,
  onSelect,
}: {
  node: RoadmapNode
  onSelect?: (node: RoadmapNode) => void
}) {
  const styleClass = node.emotional_tag ? EMOTIONAL_STYLES[node.emotional_tag] ?? '' : 'bg-surface border-border-subtle'

  return (
    <button
      type="button"
      className={cn(
        'min-w-0 w-full rounded-none border p-3 text-left transition-opacity hover:opacity-90 sm:p-3.5',
        styleClass,
        node.is_optional && 'opacity-70',
      )}
      onClick={() => onSelect?.(node)}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <MessageCircle className={iconClassName({ tone: 'muted', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Mindset check
        </span>
        {node.emotional_tag && (
          <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
            {node.emotional_tag.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <p className="mb-1.5 text-sm font-semibold text-foreground">{node.title}</p>
      {node.description && (
        <p className="mb-1.5 text-[13px] leading-relaxed text-foreground/90">{node.description}</p>
      )}
      {node.emotional_note && (
        <p className="mb-1.5 text-[13px] italic leading-relaxed text-foreground/90">{node.emotional_note}</p>
      )}
    </button>
  )
}

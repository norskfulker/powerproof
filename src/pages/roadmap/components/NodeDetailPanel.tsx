import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsCompactSheetViewport } from '@/hooks/useResponsiveSheetSide'
import { cn } from '@/lib/utils'

import { condensePassCondition } from '../roadmapCopyUtils'
import { resolveResourceUrl, resourceTypeMeta } from '../roadmapResourceUtils'
import type { RoadmapNode } from '../roadmapTypes'

const TASK_METADATA_FIELDS = [
  ['exact_time_allocation', 'Time allocation'],
  ['specific_tool_platform', 'Tool / platform'],
  ['measurable_output', 'Measurable output'],
  ['trigger_to_move_on', 'Move on when'],
] as const

function readMetadataField(node: RoadmapNode, key: string): string | null {
  const value = node.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const NODE_TYPE_STYLES: Record<string, string> = {
  phase: 'bg-primary text-primary-foreground',
  milestone: 'bg-badge-new-bg text-badge-new-text',
  task: 'bg-surface-alt text-muted-foreground',
  decision: 'bg-badge-low-bg text-badge-low-text',
  emotional: 'bg-badge-trending-bg text-badge-trending-text',
}

const BOTTOM_SHEET_CLASS =
  'flex w-full max-w-full flex-col gap-0 overflow-y-auto rounded-t-2xl bg-bg-elevated p-0 max-h-[85dvh]'

const RIGHT_SHEET_CLASS =
  'flex h-full w-full max-w-[400px] flex-col gap-0 overflow-y-auto bg-bg-elevated p-0-sm:max-w-[400px]'

type Props = {
  node: RoadmapNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (node: RoadmapNode) => void
}

export function NodeDetailPanel({ node, open, onOpenChange, onComplete }: Props) {
  const isCompact = useIsCompactSheetViewport()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {isCompact ? (
        <SheetContent side="bottom" className={BOTTOM_SHEET_CLASS}>
          <NodeDetailPanelBody node={node} onComplete={onComplete} />
        </SheetContent>
      ) : (
        <SheetContent side="right" className={RIGHT_SHEET_CLASS}>
          <NodeDetailPanelBody node={node} onComplete={onComplete} />
        </SheetContent>
      )}
    </Sheet>
  )
}

function NodeDetailPanelBody({
  node,
  onComplete,
}: {
  node: RoadmapNode
  onComplete: (node: RoadmapNode) => void
}) {
  const passCopy =
    node.description && node.node_type !== 'task'
      ? condensePassCondition(node.description)
      : null

  return (
    <>
      <SheetTitle className="sr-only">{node.title}</SheetTitle>

      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-bg-elevated p-4 pr-12">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
            NODE_TYPE_STYLES[node.node_type] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {node.node_type}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 pb-6">
        <h2 className="text-base font-bold leading-snug text-foreground">
          {node.title}
          {node.is_optional && (
            <span className="ml-2 text-[10px] font-normal uppercase text-muted-foreground">
              Optional
            </span>
          )}
        </h2>

        {(node.timeline_week_start != null || node.duration_label) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span aria-hidden>⏱</span>
            <span>
              {node.duration_label ? `Time: ${node.duration_label}` : ''}
              {node.duration_label && node.timeline_week_start != null ? ' · ' : ''}
              {node.timeline_week_start != null &&
                `Week ${node.timeline_week_start}–${node.timeline_week_end}`}
            </span>
            {node.is_critical_path && (
              <span className="text-xs font-semibold text-saffron-500">⚡ Critical path</span>
            )}
          </div>
        )}

        {node.description && node.node_type !== 'task' && !passCopy?.focusBody && !passCopy?.doneWhen && (
          <p className="text-sm leading-relaxed text-foreground">{node.description}</p>
        )}

        {passCopy && (passCopy.focusBody || passCopy.doneWhen) && (
          <div className="flex flex-col gap-3">
            {passCopy.focusBody ? (
              <div className="rounded-[10px] border border-primary/10 bg-primary/[0.05] p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Focus should be
                </p>
                <p className="text-sm leading-relaxed text-foreground">{passCopy.focusBody}</p>
              </div>
            ) : null}
            {passCopy.doneWhen ? (
              <div className="rounded-[10px] border border-semantic-positive/15 bg-semantic-positive/[0.06] p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-semantic-positive">
                  Done when
                </p>
                <p className="text-sm leading-relaxed text-foreground">{passCopy.doneWhen}</p>
              </div>
            ) : null}
          </div>
        )}

        {node.node_type === 'task' && node.description && (
          <p className="text-sm leading-relaxed text-foreground">{node.description}</p>
        )}

        {TASK_METADATA_FIELDS.map(([key, label]) => {
          const value = readMetadataField(node, key)
          if (!value) return null
          return (
            <div key={key} className="rounded-lg border border-border-subtle bg-surface/50 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="text-sm leading-relaxed text-foreground">{value}</p>
            </div>
          )
        })}

        {node.action_items.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              What to do
            </p>
            <div className="flex flex-col gap-2">
              {node.action_items.map((item, i) => (
                <div key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
                  <span className="shrink-0 font-bold text-primary">→</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {node.resources.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tools & resources
            </p>
            <div className="flex flex-wrap gap-2">
              {node.resources.map((r, i) => {
                const href = resolveResourceUrl(r)
                const { badgeLabel } = resourceTypeMeta(r.type)
                const label = r.label?.trim() || href || 'Resource'
                const className =
                  'inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary-subtle'

                if (!href) {
                  return (
                    <span key={i} className={className}>
                      <span className="rounded bg-badge-new-bg px-1.5 py-0.5 text-[9px] font-bold uppercase text-badge-new-text">
                        {badgeLabel}
                      </span>
                      {label}
                    </span>
                  )
                }

                return (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={className}
                  >
                    <span className="rounded bg-badge-new-bg px-1.5 py-0.5 text-[9px] font-bold uppercase text-badge-new-text">
                      {badgeLabel}
                    </span>
                    {label}
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {node.node_type === 'emotional' && (
          <div className="rounded-xl bg-badge-trending-bg p-3">
            {node.emotional_tag && (
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-badge-trending-text">
                💭 {node.emotional_tag.replace(/_/g, ' ')}
              </p>
            )}
            {node.emotional_note && (
              <p className="text-sm leading-relaxed text-badge-trending-text opacity-90">
                {node.emotional_note}
              </p>
            )}
          </div>
        )}

        {node.node_type === 'decision' && node.decision_branches.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Branches
            </p>
            <div className="flex flex-col gap-2">
              {node.decision_branches.map((b, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg p-3 text-xs',
                    i === 0 ? 'bg-badge-trending-bg' : 'bg-badge-hot-bg',
                  )}
                >
                  <p className="mb-0.5 font-bold text-foreground">{b.label}</p>
                  <p className="text-muted-foreground">{b.condition}</p>
                  {'outcome' in b && b.outcome ? (
                    <p className="mt-1 italic text-foreground">→ {b.outcome}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {(node.node_type === 'milestone' || node.node_type === 'task') && (
          <Button
            variant={node.is_completed ? 'primary' : 'secondary'}
            className={cn(
              'w-full',
              !node.is_completed &&
                'border-semantic-positive text-semantic-positive hover:bg-semantic-positive hover:text-white',
            )}
            onClick={() => onComplete(node)}
          >
            {node.is_completed ? '✓ Completed' : 'Mark as complete'}
          </Button>
        )}
      </div>
    </>
  )
}

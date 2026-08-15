import { ExternalLink, ListChecks } from '@/lib/icons'
import type { EditorChecklistItem } from '@/lib/adminOpportunityEditorChecklist'
import { groupChecklistByPriority } from '@/lib/adminOpportunityEditorChecklist'

type Props = {
  items: EditorChecklistItem[]
  onJump: (item: EditorChecklistItem) => void
}

function PriorityBlock({
  title,
  subtitle,
  tone,
  rows,
  onJump,
}: {
  title: string
  subtitle: string
  tone: 'red' | 'amber' | 'slate'
  rows: EditorChecklistItem[]
  onJump: (item: EditorChecklistItem) => void
}) {
  if (rows.length === 0) return null
  const ring =
    tone === 'red'
      ? 'border-red-200 bg-red-50/80'
      : tone === 'amber'
        ? 'border-saffron-100 bg-warning-bg/80'
        : 'border-slate-200 bg-slate-50/90'
  const badge =
    tone === 'red'
      ? 'bg-red-600 text-white'
      : tone === 'amber'
        ? 'bg-saffron-600 text-primary-foreground'
        : 'bg-slate-600 text-white'

  return (
    <div className={`rounded-lg border p-2.5 ${ring}`}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge}`}>{title}</span>
            <span className="text-[11px] font-semibold text-foreground">{subtitle}</span>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">{rows.length} open</span>
      </div>
      <ul className="max-h-[220px] space-y-1 overflow-y-auto pr-0.5">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-1.5 rounded-md bg-card/90 px-2 py-1.5 text-[11px] text-foreground border border-black/[0.04]">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="font-semibold leading-snug">{row.label}</div>
              {row.hint ? <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{row.hint}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => onJump(row)}
              className="shrink-0 inline-flex items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
            >
              {row.navigateTo ? (
                <>
                  Open <ExternalLink className="h-3 w-3" aria-hidden />
                </>
              ) : (
                'Jump'
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminOpportunityEditorChecklistPanel({ items, onJump }: Props) {
  const { p0, p1, p2, doneCount, total } = groupChecklistByPriority(items)
  const pending = p0.length + p1.length + p2.length

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-start gap-2">
        <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
          <ListChecks className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">Editor checklist</div>
          <div className="text-[11px] leading-snug text-muted-foreground">
            P0 = before go-live quality bar · P1 = high-impact richness · P2 = SEO / polish. Based on{' '}
            <code className="rounded bg-muted px-0.5 text-[10px]">opportunities</code>.
          </div>
          <div className="mt-1 text-[11px] font-semibold text-gray-700">
            {pending === 0 ? (
              <span className="text-success">All tracked items satisfied ({doneCount}/{total}).</span>
            ) : (
              <span>
                {pending} open · {doneCount}/{total} done
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <PriorityBlock
          title="P0"
          subtitle="Fix first (detail / launch bar)"
          tone="red"
          rows={p0}
          onJump={onJump}
        />
        <PriorityBlock
          title="P1"
          subtitle="Strong page depth & trust"
          tone="amber"
          rows={p1}
          onJump={onJump}
        />
        <PriorityBlock
          title="P2"
          subtitle="When you have time"
          tone="slate"
          rows={p2}
          onJump={onJump}
        />
      </div>
    </div>
  )
}

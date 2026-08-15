import { cardSurface } from '@/lib/cardSurface'
import type { PreviewResult } from '@/types/previewResearch'
import { cn } from '@/lib/utils'
import { Microscope } from '@/lib/icons'
import { PreviewInsightGrid } from '@/components/research/preview/PreviewInsightGrid'
import { PreviewLockedSection } from '@/components/research/preview/PreviewLockedSection'
import { PreviewScoreDots } from '@/components/research/preview/PreviewScoreDots'

export function ResearchPreviewCard({
  preview,
  panel = false,
}: {
  preview: PreviewResult
  panel?: boolean
}) {
  const score = Math.min(100, Math.max(0, Math.round(preview.opportunity_score)))

  return (
    <article className={cn(!panel && cardSurface, !panel && 'p-5 sm:p-6', 'flex flex-col')}>
      {!panel ? (
        <header className="border-b border-border-subtle/60 pb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Microscope className="h-3.5 w-3.5" aria-hidden />
            Preview
          </span>
        </header>
      ) : null}

      <div className={cn(!panel && 'mt-4', 'space-y-5')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {!panel ? (
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Microscope className="h-3.5 w-3.5" aria-hidden />
                Preview
              </div>
            ) : null}
            <h3 className="text-xl font-normal leading-snug text-foreground sm:text-2xl">{preview.title}</h3>
            {preview.tagline ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{preview.tagline}</p>
            ) : null}
          </div>
          <div className="shrink-0 rounded-xl border border-border-subtle/70 bg-surface px-3 py-2.5 text-center">
            <p className="text-[12px] font-medium text-muted-foreground">Score</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{score}</p>
            <PreviewScoreDots score={score} className="mt-1 justify-center" />
          </div>
        </div>

        <PreviewInsightGrid preview={preview} />

        <PreviewLockedSection focus="research" />
      </div>
    </article>
  )
}

import { Loader2 } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { BrandLogoLink } from '@/components/layout/BrandLogoLink'
import { ResearchSectionProgressList } from '@/components/research/ResearchSectionProgressList'
import { useResearchTimedProgress } from '@/hooks/useResearchTimedProgress'
import { RESEARCH_TIMED_HINT } from '@/lib/researchTimedProgress'
import type { ResearchStyle } from '@/lib/researchStyles'
import { RESEARCH_STYLE_OPTIONS } from '@/lib/researchStyles'
import {
  formatResearchStreamChars,
  researchStreamProgressPct,
  researchStreamStatusMessage,
} from '@/lib/researchStreamProgress'
import { cn } from '@/lib/utils'

const STYLE_LABELS = Object.fromEntries(
  RESEARCH_STYLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<string, string>

export interface ResearchDeepLoadingPageProps {
  query?: string | null
  researchStyle?: ResearchStyle | string | null
  startedAt?: string | null
  /** Live SSE char count from `research-opportunity` stream. */
  streamProgressChars?: number | null
  onCancel?: () => void
  cancelDisabled?: boolean
  className?: string
}

export function ResearchDeepLoadingPage({
  query,
  researchStyle = 'standard',
  startedAt,
  streamProgressChars = null,
  onCancel,
  cancelDisabled = false,
  className,
}: ResearchDeepLoadingPageProps) {
  const trimmedQuery = query?.trim()
  const useStreamProgress = streamProgressChars != null
  const { sections, progressPct: timedProgressPct, elapsed, allComplete } =
    useResearchTimedProgress(useStreamProgress ? null : startedAt)
  const styleKey = String(researchStyle ?? 'standard')
  const styleLabel = STYLE_LABELS[styleKey] ?? null
  const showCancel = Boolean(onCancel) && (useStreamProgress ? streamProgressChars > 0 : elapsed >= 3)
  const progressPct = useStreamProgress
    ? researchStreamProgressPct(streamProgressChars)
    : timedProgressPct
  const headline = useStreamProgress
    ? researchStreamStatusMessage(streamProgressChars)
    : allComplete
      ? 'Finalising your report…'
      : 'Running deep research…'
  const subline = useStreamProgress
    ? 'Streaming your report as it is generated.'
    : 'Analysing markets, competitors, financials, and more.'

  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-var(--app-top-offset,0px))] flex-col items-center justify-center px-4 py-12 layout-sm:py-16',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-8">
        <BrandLogoLink
          to="/"
          className="animated-logo pointer-events-none h-auto px-0"
          logoClassName="h-8 w-auto layout-sm:h-9"
          aria-label="PowerProof"
        />

        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />
        </div>

        <div className="space-y-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground layout-sm:text-3xl">
            {headline}
          </h1>
          <p className="text-sm text-muted-foreground">{subline}</p>
          {trimmedQuery ? (
            <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground/80">
              &ldquo;{trimmedQuery}&rdquo;
            </p>
          ) : null}
          {styleLabel && styleKey !== 'standard' ? (
            <p className="pt-1">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {styleLabel} style
              </span>
            </p>
          ) : null}
        </div>

        <div className="w-full space-y-4 rounded-2xl border border-border-subtle bg-bg-surface/70 p-5 shadow-[var(--shadow-md)] layout-sm:p-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
              <span>{useStreamProgress ? 'Live generation progress' : RESEARCH_TIMED_HINT}</span>
              <span className="tabular-nums">
                {useStreamProgress
                  ? formatResearchStreamChars(streamProgressChars)
                  : elapsed > 0
                    ? `${elapsed}s`
                    : 'Starting…'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {!useStreamProgress ? <ResearchSectionProgressList sections={sections} /> : null}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can safely close this tab — your report will appear in My Research when ready.
        </p>

        {showCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={cancelDisabled}
            onClick={onCancel}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Cancel research (50% refund)
          </Button>
        ) : null}
      </div>
    </div>
  )
}

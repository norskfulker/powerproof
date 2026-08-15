import { useState } from 'react'
import { DiscoverWide } from '@/components/page-shells'
import { Button } from '@/components/ui/button'
import { ResearchPreviewCard } from '@/components/research/preview/ResearchPreviewCard'
import { RoadmapPreviewCard } from '@/components/research/preview/RoadmapPreviewCard'
import { parsePreviewDataFromContext } from '@/lib/previewResearch'
import type { PreviewResult } from '@/types/previewResearch'
import { cn } from '@/lib/utils'

export function PreviewResearchInitialView({
  opportunity,
  researchQuery,
  onUnlockFullResearch,
  unlocking,
}: {
  opportunity: Record<string, unknown>
  researchQuery: string
  onUnlockFullResearch: () => void
  unlocking: boolean
}) {
  const preview =
    parsePreviewDataFromContext(opportunity.research_context) ??
    (opportunity.research_context as { preview_data?: PreviewResult } | null)?.preview_data ??
    null

  const title = String(preview?.title ?? opportunity.title ?? researchQuery)
  const tagline = String(preview?.tagline ?? opportunity.tagline ?? '')

  if (!preview) {
    return (
      <DiscoverWide className="py-8">
        <div className="rounded-lg border border-border-subtle bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Preview data is loading…</p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="mt-4"
            loading={unlocking}
            onClick={onUnlockFullResearch}
          >
            Unlock Full Research
          </Button>
        </div>
      </DiscoverWide>
    )
  }

  return (
    <DiscoverWide className="py-6 pb-12">
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Preview saved</p>
        <h1 className="font-display text-2xl font-bold text-foreground layout-sm:text-3xl">{title}</h1>
        {tagline ? <p className="text-sm text-muted-foreground layout-sm:text-base">{tagline}</p> : null}
        {researchQuery ? (
          <p className="text-xs text-muted-foreground">
            Original prompt: <span className="text-foreground">{researchQuery}</span>
          </p>
        ) : null}
      </div>

      <div className={cn('grid gap-4', 'grid-cols-1 layout-lg:grid-cols-2 layout-sm:items-start')}>
        <ResearchPreviewCard preview={preview} />
        <RoadmapPreviewCard preview={preview} />
      </div>

      <div className="sticky bottom-4 z-20 mt-8 flex justify-center">
        <div className="w-full max-w-lg rounded-lg border border-primary/25 bg-card/95 p-4 text-center shadow-lg backdrop-blur-sm">
          <p className="text-sm font-semibold text-foreground">
            Ready for the full report?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Unlock deep financials, competitor analysis, govt schemes, and a complete roadmap.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="mt-4 w-full layout-sm:w-auto"
            loading={unlocking}
            onClick={onUnlockFullResearch}
          >
            Unlock Full Research
          </Button>
        </div>
      </div>
    </DiscoverWide>
  )
}

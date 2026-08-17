import { Badge, Button, Card } from '@/components/ui'
import {
  cardTopSlotIconClass,
  cardTopSlotRowClass,
  cardTopSlotTitleClass,
} from '@/components/ui/card'
import {
  ScanFindingSeverityChip,
  scanFindingAccentClass,
} from '@/components/scanner/ScanFindingSeverityChip'
import { StartLockedFindings } from '@/components/start/StartLockedFindings'
import { SiteFavicon } from '@/components/shared/SiteFavicon'
import {
  AlertTriangle,
  ArrowRight,
  Lightbulb,
  Lock,
  Search,
  Sparkles,
  Swords,
  TrendingUp,
} from '@/lib/icons'
import { getVerdictTone } from '@/lib/saturation'
import { hostnameFromLooseUrl } from '@/lib/siteFavicon'
import type { PreviewWebsiteScanResponse } from '@/types/previewWebsiteScan'
import { cn } from '@/lib/utils'

function scoreBadgeVariant(score: number): 'green' | 'amber' | 'red' {
  if (score >= 75) return 'green'
  if (score >= 55) return 'amber'
  return 'red'
}

export function StartPreviewResult({
  url,
  data,
  onSignUp,
  onScanAnother,
}: {
  url: string
  data: PreviewWebsiteScanResponse
  onSignUp: () => void
  onScanAnother: () => void
}) {
  const { preview, session_token } = data
  const { seo, ai } = preview
  const hostname = hostnameFromLooseUrl(url)
  const competitors = ai.likelyCompetitors
  const insights = ai.standoutInsights
  const findings = seo.topFindings
  const lockedCount = seo.lockedFindingsCount
  const unlockedInsights = insights.length >= 3 ? insights.slice(0, -1) : insights
  const lockedInsight = insights.length >= 3 ? insights[insights.length - 1] : null
  const verdictTone = ai.verdict ? getVerdictTone(ai.verdict) : null

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Preview snapshot
        </p>
        <div className="flex flex-wrap items-start gap-3">
          <SiteFavicon hostname={hostname} size={28} className="mt-1" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
              {seo.title || hostname || 'Your website'}
            </h1>
            {hostname ? (
              <p className="mt-1 text-sm text-muted-foreground">{hostname}</p>
            ) : null}
            {seo.description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{seo.description}</p>
            ) : null}
          </div>
        </div>
      </header>

      <Card
        padding="md"
        radius="lg"
        topSlot={
          <div className={cardTopSlotRowClass}>
            <span className={cardTopSlotIconClass}>
              <Search aria-hidden />
            </span>
            <h2 className={cardTopSlotTitleClass}>SEO score</h2>
            <Badge
              variant={scoreBadgeVariant(seo.score)}
              size="lg"
              className="shrink-0 font-semibold tabular-nums"
            >
              {seo.score}
            </Badge>
          </div>
        }
      >
        {findings.length > 0 ? (
          <ul className="divide-y divide-border-subtle/70">
            {findings.map((finding, index) => (
              <li
                key={`${finding.title}-${index}`}
                className={cn('flex gap-3 border-l-2 py-3 pl-3 pr-1 first:pt-0 last:pb-0', scanFindingAccentClass(finding.severity))}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ScanFindingSeverityChip severity={finding.severity} />
                    <p className="text-[13px] font-semibold leading-snug text-foreground">
                      {finding.title}
                    </p>
                  </div>
                  {finding.detail ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {finding.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : lockedCount <= 0 ? (
          <p className="text-sm text-muted-foreground">No on-page findings in this preview.</p>
        ) : null}

        <StartLockedFindings
          count={lockedCount}
          items={seo.lockedFindingsPreview}
          onSignUp={onSignUp}
          divided={findings.length > 0}
        />
      </Card>

      {ai.businessSnapshot ? (
        <Card padding="md" radius="lg">
          <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
            Business snapshot
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground/90">{ai.businessSnapshot}</p>
        </Card>
      ) : null}

      {ai.verdict ? (
        <article className={cn('rounded-xl border p-4 sm:p-5', verdictTone?.card)}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              Verdict
            </h2>
            <span
              className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                verdictTone?.badge,
              )}
            >
              {ai.verdict}
            </span>
          </div>
          {ai.verdictReason ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{ai.verdictReason}</p>
          ) : null}
        </article>
      ) : null}

      {competitors.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={cardTopSlotIconClass}>
              <Swords aria-hidden />
            </span>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Likely competitors
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {competitors.map((competitor, index) => (
              <article
                key={`${competitor.name}-${index}`}
                className="flex min-h-[10rem] flex-col rounded-xl border border-border-subtle bg-card p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 font-display text-base font-semibold leading-snug text-foreground">
                  {competitor.name}
                </h3>
                {competitor.whyThreat ? (
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                    {competitor.whyThreat}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {insights.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={cardTopSlotIconClass}>
              <Sparkles aria-hidden />
            </span>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Standout insights
            </h2>
          </div>
          <ol className="space-y-2.5">
            {unlockedInsights.map((insight, index) => (
              <li
                key={`${insight}-${index}`}
                className="flex gap-3 rounded-xl border border-border-subtle bg-card px-4 py-3.5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
                  {index + 1}
                </span>
                <p className="text-sm font-medium leading-6 text-foreground">{insight}</p>
              </li>
            ))}
            {lockedInsight ? (
              <li className="relative overflow-hidden rounded-xl border border-border-subtle bg-card">
                <div
                  className="pointer-events-none flex select-none gap-3 px-4 py-3.5"
                  aria-hidden
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
                    {unlockedInsights.length + 1}
                  </span>
                  <p className="blur-[6px] text-sm font-medium leading-6 text-foreground">
                    {lockedInsight}
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-end bg-gradient-to-l from-card via-card/80 to-transparent px-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    icon={<Lock className="h-3.5 w-3.5" aria-hidden />}
                    onClick={onSignUp}
                  >
                    Unlock
                  </Button>
                </div>
              </li>
            ) : null}
          </ol>
        </section>
      ) : null}

      {ai.oneBigRisk || ai.oneBigOpportunity ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {ai.oneBigRisk ? (
            <article className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
              <div className="mb-2 flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <h2 className="text-sm font-semibold">One big risk</h2>
              </div>
              <p className="text-sm leading-6 text-foreground/90">{ai.oneBigRisk}</p>
            </article>
          ) : null}
          {ai.oneBigOpportunity ? (
            <article className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
              <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                <h2 className="text-sm font-semibold">One big opportunity</h2>
              </div>
              <p className="text-sm leading-6 text-foreground/90">{ai.oneBigOpportunity}</p>
            </article>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className={cardTopSlotIconClass}>
            <Lightbulb aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Unlock the full audit
            </h2>
            {ai.fullAuditTeaser ? (
              <p
                className="mt-2 select-none text-sm leading-6 text-muted-foreground blur-[5px]"
                aria-hidden
              >
                {ai.fullAuditTeaser}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign up free to get the complete SEO, business, competitor, and roadmap report.
              </p>
            )}
            <Button
              type="button"
              variant="primary"
              size="md"
              className="mt-4"
              iconRight={<ArrowRight className="h-4 w-4" aria-hidden />}
              onClick={onSignUp}
            >
              Get the full audit
            </Button>
            {!session_token ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                You can still create an account — we&apos;ll start a fresh scan after signup.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="text-center">
        <button
          type="button"
          onClick={onScanAnother}
          className="text-[13px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Scan a different site
        </button>
      </div>
    </div>
  )
}

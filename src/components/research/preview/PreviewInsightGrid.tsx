import type { ReactNode } from 'react'
import type { RemixIcon } from '@/lib/icons'
import { BarChart3, Swords, TrendingUp } from '@/lib/icons'
import { getVerdictTone } from '@/lib/saturation'
import type { PreviewResult } from '@/types/previewResearch'
import { cn } from '@/lib/utils'

type InsightAccent = 'competitive' | 'market' | 'revenue'

const ACCENT_STYLES: Record<InsightAccent, { label: string; card: string }> = {
  competitive: {
    label: 'text-amber-700 dark:text-amber-400',
    card: 'border-amber-500/25 bg-amber-500/[0.06]',
  },
  market: {
    label: 'text-primary',
    card: 'border-primary/20 bg-primary/[0.05]',
  },
  revenue: {
    label: 'text-emerald-700 dark:text-emerald-400',
    card: 'border-emerald-500/25 bg-emerald-500/[0.06]',
  },
}

function InsightTile({
  accent,
  icon: Icon,
  title,
  children,
  cardClassName,
  labelClassName,
}: {
  accent: InsightAccent
  icon: RemixIcon
  title: string
  children: ReactNode
  cardClassName?: string
  labelClassName?: string
}) {
  const styles = ACCENT_STYLES[accent]

  return (
    <article className={cn('flex min-h-0 flex-col rounded-xl border p-4', styles.card, cardClassName)}>
      <div className="mb-3 flex items-center gap-2.5">
        <Icon className={cn('h-[18px] w-[18px] shrink-0', styles.label, labelClassName)} aria-hidden />
        <h4 className={cn('text-sm font-semibold', styles.label, labelClassName)}>{title}</h4>
      </div>
      <div className="min-h-0 flex-1 text-sm leading-relaxed text-foreground">{children}</div>
    </article>
  )
}

export function PreviewInsightGrid({ preview }: { preview: PreviewResult }) {
  const tone = getVerdictTone(preview.saturation_verdict)

  const competitiveCard =
    preview.saturation_verdict === 'Saturated'
      ? 'border-red-500/25 bg-red-500/[0.06]'
      : preview.saturation_verdict === 'Blue Ocean'
        ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
        : undefined
  const competitiveLabel =
    preview.saturation_verdict === 'Saturated'
      ? 'text-red-700 dark:text-red-400'
      : preview.saturation_verdict === 'Blue Ocean'
        ? 'text-emerald-700 dark:text-emerald-400'
        : undefined

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
      <InsightTile
        accent="competitive"
        icon={Swords}
        title="Competitive"
        cardClassName={competitiveCard}
        labelClassName={competitiveLabel}
      >
        <div className="space-y-2.5">
          <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', tone.badge)}>
            {preview.saturation_verdict}
          </span>
          {preview.saturation_reason ? (
            <p className="text-muted-foreground">{preview.saturation_reason}</p>
          ) : null}
          {preview.top_competitors.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 pt-0.5">
              {preview.top_competitors.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-border-subtle/70 bg-bg-surface/80 px-2.5 py-0.5 text-xs font-medium text-foreground"
                >
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </InsightTile>

      <InsightTile accent="market" icon={BarChart3} title="Market snapshot">
        {preview.market_snapshot ? (
          <p className="text-foreground/90">{preview.market_snapshot}</p>
        ) : (
          <p className="text-muted-foreground">Market data unavailable in preview.</p>
        )}
      </InsightTile>

      <InsightTile accent="revenue" icon={TrendingUp} title="Revenue potential">
        {preview.revenue_hint ? (
          <p className="font-semibold text-foreground">{preview.revenue_hint}</p>
        ) : (
          <p className="text-muted-foreground">Revenue estimate unavailable in preview.</p>
        )}
      </InsightTile>
    </div>
  )
}

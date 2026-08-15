import type { ComponentType, ReactNode } from 'react'
import { CheckCircle2, Quote, Target } from '@/lib/icons'

import { iconClassName } from '@/lib/iconClassNames'
import { opportunityDetailCardClass } from '@/lib/opportunityCardClasses'
import { cn } from '@/lib/utils'

import { roadmapOverallProgress } from '../roadmapUtils'
import type { RoadmapNode, UserRoadmap } from '../roadmapTypes'

type Props = {
  roadmap: UserRoadmap
  nodes: RoadmapNode[]
  showOpeningMessage?: boolean
}

function HeroInsightCard({
  icon: Icon,
  label,
  tone,
  children,
  className,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  tone: 'roadmap' | 'primary' | 'success'
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2.5 border-b border-border-subtle/70 py-4 last:border-b-0 layout-lg:border-b-0 layout-lg:border-r layout-lg:px-5 layout-lg:py-0 layout-lg:last:border-r-0',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={iconClassName({ tone, size: 'md', active: true })} strokeWidth={2.5} aria-hidden />
        <p className="m-0 font-sans text-[12px] font-medium leading-none text-muted-foreground sm:text-[13px]">
          {label}
        </p>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export function RoadmapHero({ roadmap, nodes, showOpeningMessage = true }: Props) {
  const { percent: overallPercent, completed, total } = roadmapOverallProgress(nodes)

  const showQuote = showOpeningMessage && Boolean(roadmap.opening_message?.trim())
  const showWin = Boolean(roadmap.success_vision?.trim())
  const showProgress = total > 0

  if (!showQuote && !showWin && !showProgress) return null

  const colCount = [showQuote, showWin, showProgress].filter(Boolean).length

  return (
    <section
      id="roadmap-overview"
      className={cn(opportunityDetailCardClass, 'scroll-mt-[7.5rem] border-b border-border-subtle')}
    >
      <div
        className={cn(
          'grid w-full min-w-0 grid-cols-1 gap-0 px-0 py-1 layout-lg:gap-0',
          colCount === 1 && 'layout-lg:grid-cols-1',
          colCount === 2 && 'layout-lg:grid-cols-2',
          colCount >= 3 && 'layout-lg:grid-cols-3',
        )}
      >
        {showQuote ? (
          <HeroInsightCard icon={Quote} label="Opening note" tone="roadmap">
            <blockquote className="m-0 font-sans text-[15px] italic leading-relaxed text-foreground layout-lg:text-[16px]">
              {roadmap.opening_message}
            </blockquote>
          </HeroInsightCard>
        ) : null}

        {showWin ? (
          <HeroInsightCard icon={Target} label="Win condition" tone="primary">
            <p className="m-0 font-sans text-[15px] font-semibold leading-snug text-foreground layout-lg:text-[16px]">
              {roadmap.success_vision}
            </p>
          </HeroInsightCard>
        ) : null}

        {showProgress ? (
          <HeroInsightCard icon={CheckCircle2} label="Journey progress" tone="success">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-muted-foreground">Steps completed</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {completed}/{total} · {overallPercent}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-none bg-muted/40">
                <div
                  className="h-full bg-primary transition-[width] duration-400 ease-out"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          </HeroInsightCard>
        ) : null}
      </div>
    </section>
  )
}

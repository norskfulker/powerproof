import type { ReactNode } from 'react'
import { CheckCircle2, Flag, ListChecks } from '@/lib/icons'

import { CountryFlagImg } from '@/components/CountryFlagImg'
import {
  DetailHeroPanel,
  type DetailHeroPanelTwScroll,
} from '@/components/detail/DetailHeroPanel'
import { getCountryCodeFromName } from '@/lib/countries'
import { roadmapCountryFromMetadata } from '@/lib/roadmapPreferences'
import { PersonaBadge } from '@/components/persona/PersonaBadge'
import { isPersona } from '@/types/persona'
import { heroGlassBadgeClassForTone } from '@/lib/heroStyles'
import { cn } from '@/lib/utils'
import type { Breakpoint } from '@/hooks/useBreakpoint'

import { roadmapOverallProgress } from './roadmapUtils'
import type { RoadmapDomain, RoadmapNode, UserRoadmap } from './roadmapTypes'

export const ROADMAP_DOMAIN_LABELS: Record<RoadmapDomain, string> = {
  academic: 'Academic',
  professional: 'Professional',
  product_build: 'Product',
  personal: 'Personal',
  general: 'General',
}

const metricLabelClass =
  'font-sans text-[12px] font-medium leading-none text-muted-foreground sm:text-[13px]'

const metricValueClass =
  'font-sans text-[18px] font-semibold tracking-tight tabular-nums text-foreground sm:text-[22px] lg:text-[24px]'

function RoadmapMetricsBar({
  nodes,
  phaseCount,
}: {
  nodes: RoadmapNode[]
  phaseCount: number
}) {
  const { percent, completed, total } = roadmapOverallProgress(nodes)
  if (total <= 0 && phaseCount <= 0) return null

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 sm:gap-x-6">
      <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className={metricLabelClass}>Progress</span>
        </div>
        <p className={cn(metricValueClass, 'm-0')}>{percent}%</p>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className={metricLabelClass}>Steps</span>
        </div>
        <p className={cn(metricValueClass, 'm-0')}>
          {completed}/{total}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 sm:gap-2 max-sm:col-span-2">
        <div className="flex items-center gap-1.5">
          <Flag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className={metricLabelClass}>Phases</span>
        </div>
        <p className={cn(metricValueClass, 'm-0')}>{phaseCount}</p>
      </div>
    </div>
  )
}

type Props = {
  roadmap: UserRoadmap
  nodes?: RoadmapNode[]
  phaseCount?: number
  bp: Breakpoint
  twScroll: DetailHeroPanelTwScroll
  heroActions?: ReactNode
}

export function RoadmapHeroPanel({
  roadmap,
  nodes = [],
  phaseCount = 0,
  bp,
  twScroll,
  heroActions,
}: Props) {
  const country = roadmapCountryFromMetadata(roadmap.metadata)
  const fluidBadgeClass = heroGlassBadgeClassForTone('dark')

  const meta = (
    <>
      <span className={fluidBadgeClass}>{ROADMAP_DOMAIN_LABELS[roadmap.domain]}</span>
      {country ? (
        <span className={cn(fluidBadgeClass, 'gap-2')}>
          <CountryFlagImg
            code={getCountryCodeFromName(country)}
            size={16}
            className="!border-0 shrink-0 rounded-sm"
          />
          {country}
        </span>
      ) : null}
    </>
  )

  return (
    <DetailHeroPanel
      id="roadmap-hero"
      title={roadmap.title}
      subtitle={roadmap.subtitle}
      meta={meta}
      metrics={<RoadmapMetricsBar nodes={nodes} phaseCount={phaseCount} />}
      actions={heroActions}
      bp={bp}
      twScroll={twScroll}
      fluidTheme="roadmap"
      fluidTextTone="dark"
      footer={
        roadmap.persona && isPersona(roadmap.persona) ? (
          <div className="mt-4">
            <PersonaBadge persona={roadmap.persona} showTagline />
          </div>
        ) : undefined
      }
    />
  )
}

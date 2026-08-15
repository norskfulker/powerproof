import { ExternalLink, Link2 } from '@/lib/icons'

import { iconClassName } from '@/lib/iconClassNames'
import { cn } from '@/lib/utils'

import type { RoadmapNode } from './roadmapTypes'
import {
  formatResourceSource,
  resolveResourceUrl,
  resourceTypeMeta,
} from './roadmapResourceUtils'

type Props = {
  resources: RoadmapNode['resources']
}

export function MilestoneResources({ resources }: Props) {
  if (resources.length === 0) return null

  return (
    <div className="mt-1 border-t border-border-subtle pt-3">
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <Link2 className={iconClassName({ tone: 'primary', size: 'sm', active: true })} strokeWidth={2.5} aria-hidden />
        <span>Sources &amp; tools</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]">
        {resources.map((resource, i) => {
          const href = resolveResourceUrl(resource)
          const source = href ? formatResourceSource(href) : ''
          const { badgeLabel, badgeClass } = resourceTypeMeta(resource.type)
          const label = resource.label?.trim() || href || 'Resource'

          const cardClassName =
            'group flex flex-col items-start gap-1 rounded-[10px] border border-border-default bg-surface p-2.5 no-underline transition-[border-color,box-shadow,background] hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-[0_4px_14px_hsl(var(--foreground)/0.05)]'

          const inner = (
            <>
              <div className="flex w-full items-start justify-between gap-1.5">
                <span className="text-[13px] font-semibold leading-snug text-foreground">{label}</span>
                {href ? (
                  <ExternalLink
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary opacity-70 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                ) : null}
              </div>
              {source ? (
                <span className="break-all text-[11px] leading-snug text-muted-foreground">{source}</span>
              ) : null}
              <span
                className={cn(
                  'mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  badgeClass,
                )}
              >
                {badgeLabel}
              </span>
            </>
          )

          if (!href) {
            return (
              <div key={`${label}-${i}`} className={cardClassName}>
                {inner}
              </div>
            )
          }

          return (
            <a
              key={`${label}-${i}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cardClassName}
            >
              {inner}
            </a>
          )
        })}
      </div>
    </div>
  )
}

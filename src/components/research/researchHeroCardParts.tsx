import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ChevronDown } from '@/lib/icons'
import type { RemixIcon } from '@/lib/icons'
import { useIsMobile } from '@/hooks/useBreakpoint'
import { renderCategoryIcon } from '@/lib/categoryIcons'

import { BrandLogoImg } from '@/components/composer/BrandLogoImg'
import { AiModelDisplay } from '@/components/AI/AiModelDisplay'
import { researchStyleLogoUrl } from '@/lib/brandLogos'
import { researchModelDisplayLabel } from '@/lib/aiModels'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'
import {
  roomHeroCardAccentChipClassName,
  roomHeroCardMetaChipClassName,
  roomHeroCardPromptClassName,
} from '@/components/shared/roomHeroCardStyles'
import { discoverHeroBoxTitleClassName } from '@/components/discover/DiscoverHeroBox'
import { cn } from '@/lib/utils'

export type RoomCardIconTone =
  | 'primary'
  | 'warRoom'
  | 'roadmap'
  | 'amber'
  | 'success'
  | 'destructive'
  | 'muted'

export function resolveResearchStyleOption(style: string | null | undefined) {
  const key = (style?.trim() || 'standard') as ResearchStyle
  return RESEARCH_STYLE_OPTIONS.find((o) => o.value === key) ?? RESEARCH_STYLE_OPTIONS[0]!
}

export function ResearchModelBadge({ modelUsed }: { modelUsed?: string | null }) {
  return <AiModelDisplay modelUsed={modelUsed} />
}

export function ResearchStyleBadge({ style }: { style?: string | null }) {
  const option = resolveResearchStyleOption(style)
  const logoUrl = researchStyleLogoUrl(option.value)

  return (
    <span
      className={cn(
        roomHeroCardAccentChipClassName('research'),
        'inline-flex w-fit items-center gap-1 border border-primary/25',
      )}
    >
      {logoUrl ? <BrandLogoImg src={logoUrl} alt="" height={12} /> : null}
      <span>{option.label}</span>
    </span>
  )
}

/** Room-card category icon — uses the catalog category map. */
export function ResearchHeroCategoryIcon({
  categorySlug,
  categoryIcon,
  tone = 'primary',
  iconOverride,
  className,
}: {
  categorySlug?: string | null
  /** Catalog `categories.lucide` name when known. */
  categoryIcon?: string | null
  tone?: RoomCardIconTone
  /** Override category icon. Pass a RemixIcon reference (e.g. `Loader2`). */
  iconOverride?: RemixIcon
  className?: string
}) {
  const toneClassName: Record<RoomCardIconTone, string> = {
    primary: 'text-primary',
    warRoom: 'text-destructive',
    roadmap: 'text-[hsl(var(--badge-global-text))]',
    amber: 'text-saffron-600',
    success: 'text-[hsl(var(--success))]',
    destructive: 'text-destructive',
    muted: 'text-muted-foreground',
  }
  if (iconOverride) {
    const FinalIcon = iconOverride
    return (
      <FinalIcon
        className={cn('h-5 w-5 shrink-0', toneClassName[tone], className)}
        aria-hidden
      />
    )
  }
  return (
    <span className={cn('inline-flex shrink-0', toneClassName[tone], className)} aria-hidden>
      {renderCategoryIcon(categorySlug ?? '', categoryIcon, 'h-5 w-5')}
    </span>
  )
}

/** Single-line truncate with ellipsis. Parent flex row must have `min-w-0`. */
const researchHeroCardTitleClassName = cn(
  discoverHeroBoxTitleClassName,
  'block min-w-0 w-full truncate text-left text-[15px] leading-snug layout-sm:text-base',
  'text-foreground transition-colors duration-150 group-hover:text-primary',
)

/** Static "In progress" chip — used by all in-progress cards right next to the title. */
export const researchHeroCardInProgressBadgeClassName = cn(
  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1',
  'border border-[hsl(var(--saffron-600))]/40 bg-[hsl(var(--saffron-50))]',
  'text-[11px] font-semibold tracking-normal text-[hsl(var(--saffron-700))]',
  'dark:border-[hsl(var(--saffron-500))]/45 dark:bg-[hsl(var(--saffron-50))]/55 dark:text-[hsl(var(--saffron-400))]',
)

export function ResearchHeroCardHeader({
  categorySlug,
  categoryIcon,
  iconOverride,
  iconTone = 'primary',
  leading,
  eyebrow,
  title,
  subtitle,
  onTitleClick,
  titleDisabled,
  badge,
  badgeClassName,
  badgePlacement = 'inline',
}: {
  categorySlug?: string | null
  categoryIcon?: string | null
  /** Override category icon. Pass a RemixIcon reference (e.g. `Loader2`). */
  iconOverride?: RemixIcon
  iconTone?: RoomCardIconTone
  /** Custom leading mark (e.g. site favicon). Replaces the category icon tile. */
  leading?: ReactNode
  eyebrow?: string | null
  title: string
  /** Muted line under the title (e.g. timestamp in table rows). */
  subtitle?: string | null
  onTitleClick?: () => void
  titleDisabled?: boolean
  badge?: ReactNode
  badgeClassName?: string
  /** `below` — status chip under the title (draft / pending cards). */
  badgePlacement?: 'inline' | 'below'
}) {
  const titleEl = (
    <h3 className={researchHeroCardTitleClassName} title={title}>
      {title}
    </h3>
  )

  return (
    <div className="flex min-w-0 w-full items-center gap-3">
      {leading ? (
        <span className="inline-flex shrink-0 items-center justify-center" aria-hidden>
          {leading}
        </span>
      ) : (
        <ResearchHeroCategoryIcon
          categorySlug={categorySlug}
          categoryIcon={categoryIcon}
          iconOverride={iconOverride}
          tone={iconTone}
          className="shrink-0"
        />
      )}
      <div className="min-w-0 flex-1 space-y-1.5 pb-0.5">
        {eyebrow ? (
          <p className="text-[10px] font-medium tabular-nums text-muted-foreground">{eyebrow}</p>
        ) : null}
        <div
          className={cn(
            badgePlacement === 'inline' && 'flex min-w-0 items-center justify-between gap-2',
          )}
        >
          {onTitleClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTitleClick()
              }}
              disabled={titleDisabled}
              className={cn(
                'min-w-0 text-left text-foreground transition-colors duration-150 group-hover:text-primary hover:text-primary disabled:cursor-not-allowed disabled:group-hover:text-foreground',
                badgePlacement === 'inline' ? 'flex-1' : 'w-full',
              )}
            >
              {titleEl}
            </button>
          ) : (
            <div className={cn('min-w-0 text-left', badgePlacement === 'inline' ? 'flex-1' : 'w-full')}>
              {titleEl}
            </div>
          )}
          {badge && badgePlacement === 'inline' ? (
            <span className={cn('shrink-0', badgeClassName)}>{badge}</span>
          ) : null}
        </div>
        {badge && badgePlacement === 'below' ? (
          <div className={cn('pt-0.5', badgeClassName)}>{badge}</div>
        ) : null}
        {subtitle ? (
          <p className="truncate text-[11px] font-medium text-muted-foreground" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function ResearchHeroCardQuery({
  query,
  disabled,
}: {
  query?: string | null
  disabled?: boolean
}) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const trimmed = query?.trim() ?? ''
  const clampOnDesktop = !isMobile && !expanded

  useLayoutEffect(() => {
    setExpanded(false)
  }, [trimmed])

  useLayoutEffect(() => {
    if (!trimmed || isMobile) {
      setHasOverflow(false)
      return
    }
    const el = textRef.current
    if (!el || expanded) return
    setHasOverflow(el.scrollHeight > el.clientHeight + 1)
  }, [trimmed, expanded, isMobile])

  if (!trimmed) return null

  return (
    <div className={cn(roomHeroCardPromptClassName, 'w-full text-left')}>
      <p
        ref={textRef}
        className={cn(
          'whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/90 text-left',
          clampOnDesktop && 'line-clamp-2',
        )}
      >
        {trimmed}
      </p>
      {!isMobile && hasOverflow ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setExpanded((open) => !open)}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed"
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  )
}

export function ResearchHeroCardMetaRow({
  researchStyle,
  modelUsed,
  trailing,
}: {
  researchStyle?: string | null
  modelUsed?: string | null
  trailing?: ReactNode
}) {
  const modelLabel = researchModelDisplayLabel(modelUsed)
  if (!researchStyle && !modelLabel && !trailing) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {researchStyle ? <ResearchStyleBadge style={researchStyle} /> : null}
      {modelLabel ? <ResearchModelBadge modelUsed={modelUsed} /> : null}
      {trailing}
    </div>
  )
}

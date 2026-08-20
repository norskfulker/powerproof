import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

import { EditableHeroField } from '@/components/opportunity/detail/EditableHeroField'
import { MarketingText } from '@/components/ui/MarketingText'
import type { LandingFluidThemeId } from '@/lib/landingFluidThemes'
import type { Breakpoint } from '@/hooks/useBreakpoint'
import { typeScale } from '@/lib/typeScale'
import { cn } from '@/lib/utils'

export type FluidTextTone = 'light' | 'dark'

import { cardPadding } from '@/lib/cardSurface'

/** Frosted glass on dark opportunity fluid heroes. */
export const opportunityDetailFluidGlassSurfaceClassName = cn(
  'border border-white/20 bg-white/10 backdrop-blur-md',
  'shadow-[0_4px_18px_-6px_rgba(0,0,0,0.22),0_2px_6px_-3px_rgba(0,0,0,0.12)]',
)

/** Detail page hero title panel — flush surface, no surrounding border. */
export const detailHeroCardClassName = cn(
  'rounded-none border-0 bg-transparent',
  cardPadding.lg,
  'w-full overflow-visible shadow-none',
)

/** Title on light fluid heroes — dark foreground for contrast. */
export const opportunityDetailFluidHeroDarkTitleClassName =
  '!text-foreground selection:bg-primary/20'

/** Subtitle on light fluid heroes. */
export const opportunityDetailFluidHeroDarkSubtitleClassName = '!text-foreground/80'

/** Frosted badge / control surface on light fluid heroes. */
export const opportunityDetailFluidDarkGlassSurfaceClassName = cn(
  'border border-border-subtle/55 bg-surface/50 backdrop-blur-md',
  'shadow-[0_4px_18px_-6px_rgba(0,0,0,0.08),0_2px_6px_-3px_rgba(0,0,0,0.04)]',
)

export type DetailHeroPanelTwScroll = {
  startWhenInView: true
  inViewResetKey: string
}

export type DetailHeroPanelProps = {
  id?: string
  title: string
  subtitle?: string | null
  /** Rendered below the short description (e.g. expandable full overview). */
  overview?: ReactNode
  meta?: ReactNode
  metrics?: ReactNode
  footer?: ReactNode
  bp: Breakpoint
  twScroll: DetailHeroPanelTwScroll
  titleClassName?: string
  subtitleClassName?: string
  onTitleSave?: (title: string) => Promise<void>
  onDescriptionSave?: (description: string) => Promise<void>
  fluidTheme?: LandingFluidThemeId
  /** `dark` = black foreground on light fluid palettes (roadmap, market-test). */
  fluidTextTone?: FluidTextTone
  actions?: ReactNode
}

export function MetricBadge({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'ghost' | 'glass' | 'surface'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  const variants = {
    default: 'bg-muted/50 text-muted-foreground border-border-subtle/50',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
    ghost: 'bg-transparent text-muted-foreground border-border-subtle/30 hover:bg-muted/30',
    glass: cn(
      opportunityDetailFluidGlassSurfaceClassName,
      'text-white [&_*]:text-inherit',
    ),
    surface: cn(
      'border border-border-subtle/55 bg-surface/55 text-foreground backdrop-blur-md',
      'shadow-[0_4px_18px_-6px_rgba(0,0,0,0.08),0_2px_6px_-3px_rgba(0,0,0,0.04)]',
    ),
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border font-bold tracking-tight',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : size === 'lg' ? 'px-3.5 py-2 text-[13px]' : 'px-3 py-1.5 text-[12px]',
        variants[variant],
      )}
    >
      {Icon && <Icon className={cn('shrink-0', size === 'lg' ? 'h-3.5 w-3.5' : 'h-3 w-3')} strokeWidth={2.5} />}
      {children}
    </span>
  )
}

/** Shared detail-page hero title panel (extracted from OpportunityHeroPanel). */
export function DetailHeroPanel({
  id = 'detail-hero',
  title,
  subtitle,
  overview,
  meta,
  metrics,
  footer,
  bp: _bp,
  twScroll,
  titleClassName,
  subtitleClassName,
  onTitleSave,
  onDescriptionSave,
  fluidTheme: _fluidTheme = 'default',
  fluidTextTone = 'dark',
  actions,
}: DetailHeroPanelProps) {
  void _bp
  void _fluidTheme
  const heroEditable = Boolean(onTitleSave || onDescriptionSave)
  const titleClass = cn(
    'm-0',
    typeScale.header,
    opportunityDetailFluidHeroDarkTitleClassName,
    titleClassName,
  )
  const subtitleClass = cn(
    'max-w-3xl font-description font-medium leading-[1.65] tracking-description',
    opportunityDetailFluidHeroDarkSubtitleClassName,
    'text-[15px] sm:text-[16px]',
    subtitleClassName,
  )

  return (
    <div id={id} data-tour={id === 'od-hero' ? 'od-hero' : undefined} className="relative min-w-0 w-full scroll-mt-[7.5rem] overflow-visible">
      <div className={cn(detailHeroCardClassName, 'overflow-visible')}>
        <div className="space-y-3 sm:space-y-4">
          {meta || actions ? (
            <div className="flex flex-wrap items-start justify-between gap-2 selection:bg-transparent">
              {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : <span />}
              {actions ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div> : null}
            </div>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {heroEditable ? (
              <EditableHeroField
                as="title"
                value={title}
                onSave={onTitleSave}
                displayClassName={titleClass}
                appearance="fluid"
                fluidTextTone={fluidTextTone}
              >
                <h1 className={titleClass}>{title}</h1>
              </EditableHeroField>
            ) : (
              <MarketingText
                key={twScroll.inViewResetKey}
                as="h1"
                text={title}
                speed="fast"
                wordWrap
                className={titleClass}
              />
            )}
          </motion.div>

          {subtitle || onDescriptionSave ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {heroEditable ? (
                <EditableHeroField
                  as="description"
                  value={subtitle ?? ''}
                  onSave={onDescriptionSave}
                  placeholder="Add a short description…"
                  displayClassName={subtitleClass}
                  appearance="fluid"
                  fluidTextTone={fluidTextTone}
                >
                  {subtitle ? (
                    <p className={subtitleClass}>{subtitle}</p>
                  ) : (
                    <p className={cn(subtitleClass, 'text-foreground/45')}>
                      Add a short description…
                    </p>
                  )}
                </EditableHeroField>
              ) : subtitle ? (
                <MarketingText
                  key={`${twScroll.inViewResetKey}-subtitle`}
                  as="p"
                  text={subtitle}
                  speed="fast"
                  wordWrap
                  className={subtitleClass}
                />
              ) : null}
            </motion.div>
          ) : null}

          {overview ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="min-w-0"
              id="od-ai"
            >
              {overview}
            </motion.div>
          ) : null}
        </div>

        {metrics ? (
          <div className="mt-5 min-w-0 overflow-visible border-t border-border-subtle/60 pt-5 sm:mt-6 sm:pt-6">
            {metrics}
          </div>
        ) : null}

        {footer}
      </div>
    </div>
  )
}

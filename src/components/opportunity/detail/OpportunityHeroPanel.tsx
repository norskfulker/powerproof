import { useMemo, useState } from 'react'
import {
  forwardRef,
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from 'react'
import { Download, FileJson, FileSpreadsheet, FileText, Share2, Rocket } from '@/lib/icons'
import { motion } from 'framer-motion'
import type { Breakpoint } from '@/hooks/useBreakpoint'
import { cn } from '@/lib/utils'
import { iconClassName } from '@/lib/iconClassNames'
import { DetailHeroPanel } from '@/components/detail/DetailHeroPanel'
import { opportunityDetailFluidDarkGlassSurfaceClassName } from '@/components/detail/DetailHeroPanel'
import { RisingMarkdown } from '@/components/opportunity/detail/RisingMarkdown'
import {
  capitalizeFirstLetter,
  normalizeBusinessOverviewMarkdown,
} from '@/lib/opportunityDetailUtils'
import type { TrendKind } from '@/lib/opportunityTrendChart'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { OpportunityExportFormat } from '@/lib/opportunityExport'
import { useCurrency } from '@/hooks/useCurrency'
import type { LandingFluidThemeId } from '@/lib/landingFluidThemes'
import { opportunityDetailCardRadiusClass } from '@/lib/opportunityCardClasses'

const opportunityDetailFluidGlassActionActiveClassName =
  'border-white/40 bg-white/15 text-white shadow-[0_4px_12px_rgba(255,255,255,0.12)]'

export type OpportunityHeroPanelProps = {
  opp: any
  fullDetail: boolean
  user: { id: string } | null | undefined
  isMobile: boolean
  categoryLabel: string | null
  /** Secondary text beside category (status chip / research date). */
  metaText?: string | null
  statusChip: { label: string; color: string; bg: string } | null
  interestedHero: number
  showInterestCount?: boolean
  /** Onboarding reveal — show Preview chip among hero badges. */
  showPreviewBadge?: boolean
  bp: Breakpoint
  twScroll: { startWhenInView: true; inViewResetKey: string }
  handleExport: (format: OpportunityExportFormat) => void
  handleShare: () => void | Promise<void>
  handleStartBusiness: () => void
  locationPathSearch: string
  showHeroQuickActions?: boolean
  showStartBusiness?: boolean
  metrics?: ReactNode
  onTitleSave?: (title: string) => Promise<void>
  onDescriptionSave?: (description: string) => Promise<void>
  fluidTheme?: LandingFluidThemeId
  demandTrendKind?: TrendKind
  headerActions?: ReactNode
  /** When set, used instead of `opp.full_desc` for the expandable overview. */
  overviewMarkdown?: string
  /** When false, hide the long business overview under the tagline. Default true. */
  showOverview?: boolean
}

type ActionButtonProps = {
  onClick?: () => void
  active?: boolean
  label: string
  icon: ElementType
  className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'onClick'>

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  { onClick, active = false, label, icon: Icon, className, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      type={type}
      onClick={onClick}
      className={cn(
        'group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300',
        active
          ? cn(opportunityDetailFluidGlassActionActiveClassName)
          : cn(
              opportunityDetailFluidDarkGlassSurfaceClassName,
              'text-foreground shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:border-primary/35 hover:bg-surface-hover hover:text-foreground',
            ),
        className,
      )}
      aria-label={label}
      {...rest}
    >
      <Icon className="h-4 w-4 stroke-[2.25] transition-transform duration-300 group-hover:scale-110" />
    </motion.button>
  )
})

function ExportOption({
  format,
  label,
  icon,
  onClick,
}: {
  format: OpportunityExportFormat
  label: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-display text-md font-medium text-foreground transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      {isValidElement<{ className?: string }>(icon)
        ? cloneElement(icon, {
            className: cn(
              iconClassName({ tone: 'muted', size: 'md', interactive: true }),
              icon.props.className,
            ),
          })
        : icon}
      <span className="flex-1">{label}</span>
    </motion.button>
  )
}

function CTAButton({
  onClick,
  label,
  icon: Icon,
}: {
  onClick: () => void
  label: string
  icon: ElementType
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      type="button"
      onClick={onClick}
      className="group inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 text-[13px] font-bold tracking-tight text-primary-foreground transition-colors duration-300 hover:bg-primary-strong"
    >
      <Icon
        className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        strokeWidth={2.5}
      />
      <span>{label}</span>
    </motion.button>
  )
}

function HeroOverviewExpandable({
  text,
  isMobile,
  resetKey,
}: {
  text: string
  isMobile: boolean
  resetKey: string
}) {
  const needsTruncate = text.replace(/\s+/g, ' ').trim().length > 220
  const [expanded, setExpanded] = useState(!needsTruncate)

  return (
    <div className="min-w-0">
      <div
        className={cn(
          'min-w-0 text-foreground',
          needsTruncate && !expanded && 'max-h-[4.75rem] overflow-hidden sm:max-h-[5.25rem]',
        )}
      >
        <RisingMarkdown
          text={text}
          isMobile={isMobile}
          resetKey={resetKey}
          className={cn(
            'font-description leading-relaxed text-foreground [&_p]:mb-2 [&_p]:text-[14px] [&_p]:text-muted-foreground/90 sm:[&_p]:text-[15px]',
            needsTruncate && !expanded && '[&_*]:!mb-0',
          )}
        />
      </div>
      {needsTruncate ? (
        <button
          type="button"
          className="mt-1.5 font-sans text-[13px] font-semibold text-primary transition-colors hover:text-primary/80"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      ) : null}
    </div>
  )
}

export function OpportunityHeroPanel(props: OpportunityHeroPanelProps) {
  const {
    opp,
    fullDetail,
    user,
    isMobile,
    categoryLabel,
    metaText,
    showPreviewBadge = false,
    bp,
    twScroll,
    handleExport,
    handleShare,
    handleStartBusiness,
    showHeroQuickActions = false,
    showStartBusiness = false,
    metrics,
    onTitleSave,
    onDescriptionSave,
    fluidTheme = 'default',
    headerActions,
    overviewMarkdown,
    showOverview = true,
  } = props

  const { localizeText } = useCurrency()
  const subtitleRaw = opp.tagline ?? null
  const subtitle = subtitleRaw ? localizeText(String(subtitleRaw)) : null
  const category = String(categoryLabel ?? '').trim()
  const secondaryMeta = String(metaText ?? '').trim()

  const heroMeta =
    category || secondaryMeta || showPreviewBadge ? (
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {category ? (
          <span className="inline-flex shrink-0 items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-sans text-[11px] font-semibold text-primary">
            {category}
          </span>
        ) : null}
        {category && secondaryMeta ? (
          <span className="shrink-0 text-[12px] text-muted-foreground/60" aria-hidden>
            ·
          </span>
        ) : null}
        {secondaryMeta ? (
          <span className="min-w-0 truncate font-sans text-[12px] font-medium text-muted-foreground">
            {secondaryMeta}
          </span>
        ) : null}
        {showPreviewBadge ? (
          <span className="inline-flex shrink-0 items-center rounded-md border border-border-subtle bg-muted/40 px-2 py-0.5 font-sans text-[11px] font-semibold text-muted-foreground">
            Preview
          </span>
        ) : null}
      </div>
    ) : null

  const overviewText = useMemo(() => {
    const raw = String(overviewMarkdown ?? opp.full_desc ?? '').trim()
    if (!raw) return ''
    const normalized = normalizeBusinessOverviewMarkdown(raw)
    return normalized && !/^#{1,6}\s/m.test(normalized)
      ? capitalizeFirstLetter(normalized)
      : normalized
  }, [opp.full_desc, overviewMarkdown])

  const exportOptions: { format: OpportunityExportFormat; label: string; icon: ReactNode }[] = [
    { format: 'json', label: 'JSON Data', icon: <FileJson className="h-4 w-4 text-warning" strokeWidth={2} /> },
    { format: 'markdown', label: 'Markdown Memo', icon: <FileText className="h-4 w-4 text-blue-500" strokeWidth={2} /> },
    { format: 'csv', label: 'CSV Spreadsheet', icon: <FileSpreadsheet className="h-4 w-4 text-success" strokeWidth={2} /> },
  ]

  const overview =
    showOverview && overviewText.trim().length > 0 ? (
      <HeroOverviewExpandable
        text={overviewText}
        isMobile={isMobile}
        resetKey={twScroll.inViewResetKey}
      />
    ) : null

  const footer = (
    <>
      {showHeroQuickActions && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border-subtle pt-4 sm:mt-8 sm:gap-3 sm:pt-6"
        >
          <div className="flex items-center gap-2.5">
            {fullDetail && (
              <Popover>
                <PopoverTrigger asChild>
                  <ActionButton label="Export data" icon={Download} className="cursor-pointer" />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className={cn(
                    'w-56 border border-border-subtle/60 bg-card/95 p-2 shadow-xl backdrop-blur-xl',
                    opportunityDetailCardRadiusClass,
                  )}
                >
                  <div className="mb-1 px-3 py-2">
                    <p className="font-display text-md font-medium text-primary">Export Format</p>
                  </div>
                  {exportOptions.map((opt) => (
                    <ExportOption
                      key={opt.format}
                      format={opt.format}
                      label={opt.label}
                      icon={opt.icon}
                      onClick={() => handleExport(opt.format)}
                    />
                  ))}
                </PopoverContent>
              </Popover>
            )}

            <ActionButton onClick={handleShare} label="Share opportunity" icon={Share2} />
          </div>

          {showStartBusiness && user && (
            <div className="ml-auto">
              <CTAButton onClick={handleStartBusiness} label="Start Business" icon={Rocket} />
            </div>
          )}
        </motion.div>
      )}
    </>
  )

  return (
    <DetailHeroPanel
      id="od-hero"
      title={String(opp.title ?? '')}
      subtitle={subtitle}
      meta={heroMeta}
      overview={overview}
      metrics={metrics}
      footer={footer}
      bp={bp}
      twScroll={twScroll}
      onTitleSave={onTitleSave}
      onDescriptionSave={onDescriptionSave}
      fluidTheme={fluidTheme}
      fluidTextTone="dark"
      actions={headerActions}
    />
  )
}

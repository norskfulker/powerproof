import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Sparkles, Wand2 } from '@/lib/icons'
import type { RemixIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { useTypewriterFill } from '@/hooks/useTypewriterFill'
import {
  useIdeaChipsSession,
  type IdeaChipsContext,
  type IdeaChipsSession,
} from '@/hooks/useIdeaChipsSession'
import { IDEA_CHIPS_COUNT } from '@/lib/ideaChipsConfig'
import { capitalizeIdeaFirstLetter } from '@/lib/ideaText'
import {
  discoverHeroFluidGlassChipButtonClassName,
  discoverHeroFluidGlassChipButtonWarRoomClassName,
  discoverHeroFluidChipsHeaderClassName,
  discoverHeroEmbeddedChipsHeaderClassName,
  discoverHeroEmbeddedIdeaChipsGridClassName,
} from '@/components/discover/discoverHeroTokens'
import { IdeaChipsErrorDisplay } from '@/components/ideas/IdeaChipsErrorDisplay'
import { Pill } from '@/components/ui/Pill'
import { SOURCING_GRID_STAGGER, SOURCING_ITEM_MOTION } from '@/lib/sourcingHeroMotion'

interface IdeaChipsProps {
  context: IdeaChipsContext
  onSelect: (idea: string) => void
  disabled?: boolean
  className?: string
  inputId?: string
  /** Renders inside the discover hero ideas workspace panel. */
  embedded?: boolean
  /** Hide inline suggest/refresh control — use `SuggestIdeasButton` in the shared composer. */
  hideSuggestControl?: boolean
  /** Hide the chip row when fetch fails (no chips to show). */
  suppressErrorDisplay?: boolean
  /** Hide chips entirely when loaded (e.g. during clarification wizard). */
  hideWhenLoaded?: boolean
  onLoadingChange?: (loading: boolean) => void
  /** Fires when chip panel visibility changes (generating, loaded, or error). */
  onVisibilityChange?: (visible: boolean) => void
  /** Shared session from a parent HeroChips wrapper (keeps suggest() working when chips render elsewhere). */
  session?: IdeaChipsSession
  /** Frosted glass chips inside the discover hero fluid card. */
  fluidGlass?: boolean
}

export type IdeaChipsHandle = {
  /** Sync chips from session cache (no network). */
  load: () => void
  /** Call Gemini — Suggest Ideas button only. */
  suggest: () => void
}

const CONTEXT_CONFIG: Record<
  IdeaChipsContext,
  { label: string; Icon: RemixIcon }
> = {
  warroom: {
    label: 'Try war-room plays like',
    Icon: Sparkles,
  },
  research: {
    label: 'Try researching these',
    Icon: Sparkles,
  },
  market_test: {
    label: 'Try reality-checking these',
    Icon: Sparkles,
  },
  sourcing: {
    label: 'Try sourcing products like',
    Icon: Wand2,
  },
  roadmap: {
    label: 'Try roadmap goals like',
    Icon: Sparkles,
  },
}

export const IdeaChips = forwardRef<IdeaChipsHandle, IdeaChipsProps>(function IdeaChips(
  {
    context,
    onSelect,
    disabled,
    className,
    inputId,
    embedded = false,
    hideSuggestControl = false,
    suppressErrorDisplay = false,
    hideWhenLoaded = false,
    onLoadingChange,
    onVisibilityChange,
    session: sessionProp,
    fluidGlass = false,
  },
  ref,
) {
  const internalSession = useIdeaChipsSession(context)
  const { chips, loadingPool, generating, error, hasChips, suggestChips } =
    sessionProp ?? internalSession
  const { fill, isTyping } = useTypewriterFill('fast')
  const { label, Icon } = CONTEXT_CONFIG[context]
  const skeletonCount = IDEA_CHIPS_COUNT[context]
  const isWarRoom = context === 'warroom'

  const load = useCallback(() => {
    /* No-op — chips load only via explicit `suggest` / `generateChips`. */
  }, [])

  const suggest = useCallback(() => {
    void suggestChips()
  }, [suggestChips])

  useImperativeHandle(ref, () => ({ load, suggest }), [load, suggest])

  const chipsLoading = loadingPool || generating

  useEffect(() => {
    onLoadingChange?.(chipsLoading)
  }, [chipsLoading, onLoadingChange])

  const chipIconClass = 'text-foreground'
  const chipHoverClass =
    'hover:border-primary/35 hover:bg-background hover:text-foreground'

  const handleChipSelect = (chip: string) => {
    if (disabled || isTyping) return
    fill(capitalizeIdeaFirstLetter(chip), onSelect, { inputId })
  }

  const chipsDisabled = Boolean(disabled) || isTyping || chipsLoading
  const showGenerating = chipsLoading && !error
  const showExploreIdeasError = Boolean(error) && !chipsLoading && !hasChips
  const showGeneratePrompt = !hasChips && !chipsLoading && !error

  const panelVisible = chipsLoading || hasChips || Boolean(error)

  useEffect(() => {
    onVisibilityChange?.(panelVisible)
  }, [panelVisible, onVisibilityChange])

  if (hideWhenLoaded && hasChips && !chipsLoading) {
    return null
  }

  const suggestButton = (
    <button
      type="button"
      disabled={chipsDisabled}
      onClick={() => void suggestChips()}
      title="Generate fresh ideas"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 border border-border-subtle/80 text-[10px] font-semibold text-muted-foreground transition-colors',
        'hover:border-primary/30 hover:text-foreground disabled:cursor-default disabled:opacity-50',
        embedded
          ? 'rounded-md bg-card px-2.5 py-2 shadow-sm'
          : 'rounded-full bg-background px-2 py-1',
      )}
    >
      {generating ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <Sparkles className="h-3 w-3" aria-hidden />
      )}
      {generating ? 'Generating...' : 'Suggest ideas'}
    </button>
  )

  const chipButtonClass = fluidGlass
    ? cn(
        discoverHeroFluidGlassChipButtonClassName,
        isWarRoom && discoverHeroFluidGlassChipButtonWarRoomClassName,
      )
    : embedded
    ? cn(
        'inline-flex w-full min-w-0 items-start gap-1.5 rounded-md border border-border-subtle/70',
        'bg-background px-2.5 py-2 shadow-sm',
        'text-[11px] font-medium text-foreground transition-[color,box-shadow,border-color]',
        'max-layout-sm:gap-2.5 max-layout-sm:rounded-2xl max-layout-sm:px-3.5 max-layout-sm:py-3.5 max-layout-sm:text-[13px] max-layout-sm:leading-snug',
        chipHoverClass,
        'disabled:cursor-default disabled:opacity-40',
      )
    : cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-none border border-border-subtle/80',
        'bg-background px-2.5 py-1 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.03)]',
        'text-[11px] font-medium text-foreground transition-[color,box-shadow,border-color]',
        chipHoverClass,
        'disabled:cursor-default disabled:opacity-40',
      )

  const chipIconWrapClass = fluidGlass
    ? cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md max-layout-sm:h-5 max-layout-sm:w-5',
        chipIconClass,
      )
    : embedded
    ? cn(
        'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md max-layout-sm:h-5 max-layout-sm:w-5',
        chipIconClass,
      )
    : cn('inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-none', chipIconClass)

  const chipList = hasChips && !chipsLoading ? (
    <motion.div
      key={chips.join('|')}
      className={cn(
        embedded
          ? discoverHeroEmbeddedIdeaChipsGridClassName
          : 'flex flex-wrap items-start justify-center gap-3 overflow-visible',
        embedded ? 'min-w-0 overflow-x-hidden' : undefined,
      )}
      variants={embedded ? SOURCING_GRID_STAGGER : undefined}
      initial={embedded ? 'hidden' : { opacity: 0, y: 4 }}
      animate={embedded ? 'visible' : { opacity: 1, y: 0 }}
      transition={embedded ? undefined : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {chips.map((chip) =>
        embedded ? (
          <motion.div key={chip} variants={SOURCING_ITEM_MOTION} className="min-w-0 w-full">
            <button
              type="button"
              disabled={chipsDisabled}
              onClick={() => handleChipSelect(chip)}
              className={chipButtonClass}
            >
              <span className={chipIconWrapClass}>
                <Icon className="h-2.5 w-2.5 max-layout-sm:h-3.5 max-layout-sm:w-3.5" aria-hidden />
              </span>
              <span className="min-w-0 break-words text-left max-layout-sm:whitespace-normal layout-sm:truncate">
                {chip}
              </span>
            </button>
          </motion.div>
        ) : (
          <motion.button
            key={chip}
            type="button"
            disabled={chipsDisabled}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            onClick={() => handleChipSelect(chip)}
            className={chipButtonClass}
          >
            <span className={chipIconWrapClass}>
              <Icon className="h-2.5 w-2.5 max-layout-sm:h-3.5 max-layout-sm:w-3.5" aria-hidden />
            </span>
            <span className="min-w-0 break-words text-left max-layout-sm:whitespace-normal layout-sm:truncate">
              {chip}
            </span>
          </motion.button>
        ),
      )}
    </motion.div>
  ) : null

  const showInlineSuggest = !hideSuggestControl && showGeneratePrompt
  const showChipsHeader = embedded && panelVisible && !showGeneratePrompt

  const body = (
    <div
      className={cn(
        'flex flex-col gap-2 max-layout-sm:gap-3',
        embedded && 'min-w-0 items-stretch overflow-x-hidden text-left',
      )}
    >
      {showChipsHeader ? (
        <span
          className={cn(
            fluidGlass
              ? discoverHeroFluidChipsHeaderClassName
              : discoverHeroEmbeddedChipsHeaderClassName,
          )}
        >
          <Icon className="h-3 w-3 shrink-0" aria-hidden />
          {label}
        </span>
      ) : null}
      {showInlineSuggest ? (
        <div className={cn('flex gap-2', embedded ? 'flex-wrap items-center' : 'items-center')}>
          {suggestButton}
        </div>
      ) : null}
      <AnimatePresence mode="wait">
        {showGenerating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className={cn(
                embedded ? discoverHeroEmbeddedIdeaChipsGridClassName : 'flex flex-wrap gap-3',
              )}
              aria-busy="true"
              aria-label="Loading suggestions"
            >
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <Pill
                  key={i}
                  disabled
                  className="animate-pulse"
                  style={{
                    minWidth: embedded ? undefined : `${[88, 104, 72, 96, 112][i % 5]}px`,
                    width: embedded ? '100%' : undefined,
                    opacity: 0.55,
                  }}
                >
                  <span className="inline-block h-2 w-16 rounded-md bg-muted-foreground/20" />
                </Pill>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {chipList}
      {error && !chipsLoading ? <IdeaChipsErrorDisplay error={error} /> : null}
    </div>
  )

  if (suppressErrorDisplay && showExploreIdeasError && error) {
    return null
  }

  if (embedded && hideSuggestControl && showGeneratePrompt) {
    return null
  }

  if (embedded && showExploreIdeasError && error) {
    return (
      <div className={cn('w-full', className)}>
        <IdeaChipsErrorDisplay error={error} />
      </div>
    )
  }

  if (embedded) {
    return (
      <div className={cn('w-full min-w-0 overflow-x-hidden', className)}>
        {body}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground/70">
          <Icon className="h-3 w-3 shrink-0 text-foreground/70" aria-hidden />
          {label}
        </span>
      </div>
      {showExploreIdeasError && error ? <IdeaChipsErrorDisplay error={error} /> : body}
    </div>
  )
})

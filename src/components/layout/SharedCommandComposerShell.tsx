import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowUp, Microscope, Sparkles, Compass, PackageSearch } from '@/lib/icons'
import { useState, type ReactNode } from 'react'

import { HeroComposerFooterChipContent } from '@/components/composer/HeroComposerFooterChipContent'
import {
  discoverHeroButtonPrimaryClassName,
  discoverHeroComposerShellClassName,
} from '@/components/discover/discoverHeroTokens'
import { Button } from '@/components/ui/button'
import {
  MobileComposerOptionsSheet,
  type MobileComposerOptionsSheetView,
} from '@/components/layout/MobileComposerOptionsSheet'
import { ResearchStylePicker } from '@/components/research/ResearchStylePicker'
import {
  HERO_FOOTER_CHIP_BUTTON_CLASS,
  HERO_FOOTER_SELECT_TRIGGER_CLASS,
  HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
} from '@/lib/heroComposerSelect'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { usePreferredAiModel } from '@/contexts/PreferredAiModelContext'
import { POWERPROOF_COMPOSER_MODEL_LABELS, type AIModelId } from '@/lib/aiModels'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'
import { sidebarRoomNavItems, type RoomComposerMode } from '@/lib/sidebarWorkspaceNav'
import { hasSubscriptionFeature } from '@/lib/subscriptionStatus'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Internal padding was previously layered on mobile when nested — shell owns equal padding now. */
const discoverHeroComposerMobileInnerPaddingClassName = ''

/** Stable id for shared-element layout between discover hero and Command Center composer. */
export const COMMAND_COMPOSER_LAYOUT_ID = 'powerproof-shared-command-composer'

/** Matches discover hero composer (`DiscoverHeroLiveSearch` / opportunities). */
export const commandComposerShellClassName =
  'flex w-full min-w-0 max-w-full items-stretch overflow-hidden border border-border-default bg-card transition-shadow rounded-lg shadow-[0_6px_24px_-8px_rgba(0,0,0,0.14),0_1px_4px_-1px_rgba(0,0,0,0.06)] focus-within:border-primary/40 focus-within:shadow-[0_8px_28px_-8px_rgba(0,0,0,0.18),0_0_0_1px_hsl(var(--primary)/0.12)]'

const shellTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 36,
  mass: 0.85,
}

function ComposerSubmitButton({
  onClick,
  disabled,
  loading,
  'aria-label': ariaLabel,
  title,
  size = 'md',
  iconDirection = 'right',
  accent = 'default',
}: {
  onClick: () => void | Promise<void>
  disabled: boolean
  loading: boolean
  'aria-label': string
  title?: string
  size?: 'md' | 'sm' | 'chip' | 'mobileHero'
  iconDirection?: 'right' | 'up'
  accent?: 'default' | 'war-room'
}) {
  const iconClass =
    size === 'chip'
      ? 'h-4 w-4 sm:h-3.5 sm:w-3.5'
      : size === 'mobileHero'
        ? 'h-5 w-5'
        : size === 'sm'
          ? 'h-3 w-3'
          : 'h-3.5 w-3.5'
  const dimClass =
    size === 'chip'
      ? // Match Select chip / Button icon (`h-9` → `sm:h-7`).
        'h-9 w-9 min-h-9 min-w-9 p-0 sm:h-7 sm:w-7 sm:min-h-7 sm:min-w-7'
      : size === 'mobileHero'
        ? 'h-9 w-9 min-h-9 min-w-9 p-0 sm:h-7 sm:w-7 sm:min-h-7 sm:min-w-7'
        : size === 'sm'
          ? 'h-9 w-9 min-h-9 min-w-9 p-0'
          : 'h-9 w-9 min-h-9 min-w-9 p-0 layout-sm:h-10 layout-sm:w-10 layout-sm:min-h-10 layout-sm:min-w-10'

  const directionIcon =
    iconDirection === 'up' ? (
      <ArrowUp
        className={cn(
          iconClass,
          'transition-transform duration-200 ease-out group-hover/composer:rotate-90',
        )}
        aria-hidden
      />
    ) : (
      <ArrowRight className={iconClass} aria-hidden />
    )

  const handleClick = () => {
    if (disabled || loading) return
    return onClick()
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="icon"
      onClick={handleClick}
      disabled={disabled}
      loading={loading}
      disablePressAnimation
      className={cn(
        discoverHeroButtonPrimaryClassName,
        dimClass,
        accent === 'war-room' &&
          'bg-red-600 text-white border-red-600 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600',
      )}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading ? true : undefined}
      title={title ?? ariaLabel}
      icon={loading ? undefined : directionIcon}
    />
  )
}

type SharedCommandComposerShellProps = {
  children: ReactNode
  className?: string
  /** Hero variant — classes on the inner solid composer shell. */
  innerClassName?: string
  /** When true, participates in cross-route `layoutId` animation (discover hero ↔ Command Center). */
  enableSharedLayout?: boolean
  /** `hero` = compact discover hero (all tabs); `default` = command center / heavy shadow. */
  variant?: 'default' | 'hero'
}

export function SharedCommandComposerShell({
  children,
  className,
  innerClassName,
  enableSharedLayout = false,
  variant = 'default',
}: SharedCommandComposerShellProps) {
  const reduceMotion = useReducedMotion()
  const isHero = variant === 'hero'

  if (isHero) {
    const shell = (
      <div className={cn(discoverHeroComposerShellClassName, className, innerClassName)}>
        {children}
      </div>
    )
    if (enableSharedLayout && !reduceMotion) {
      return (
        <motion.div
          layoutId={COMMAND_COMPOSER_LAYOUT_ID}
          transition={shellTransition}
          className="w-full min-w-0 max-w-full overflow-visible"
        >
          {shell}
        </motion.div>
      )
    }
    return shell
  }

  const cls = cn(commandComposerShellClassName, className)

  if (enableSharedLayout && !reduceMotion) {
    return (
      <motion.div layoutId={COMMAND_COMPOSER_LAYOUT_ID} transition={shellTransition} className={cls}>
        {children}
      </motion.div>
    )
  }

  return <div className={cls}>{children}</div>
}

export type DiscoverMode = 'opportunities' | 'research' | 'sourcing'

export type SharedCommandComposerInnerRowProps = {
  /** When true, secondary mode (research on discover hero). When false, discover search. */
  switchChecked?: boolean
  onSwitchCheckedChange?: (checked: boolean) => void
  switchId?: string
  showSwitch?: boolean
  /** Discover hero: search ↔ research. */
  switchMode?: 'discover-research'
  /** New: mode dropdown for switching between opportunities, research, sourcing */
  currentMode?: DiscoverMode
  onModeChange?: (mode: DiscoverMode) => void
  showModeDropdown?: boolean
  /** Room tools — research, roadmap, market test, war room, sourcing. */
  currentRoomMode?: RoomComposerMode
  onRoomModeChange?: (mode: RoomComposerMode) => void
  showRoomModeDropdown?: boolean
  /** Research style dropdown (footer row, beside mode select). */
  showResearchStylePicker?: boolean
  researchStyle?: ResearchStyle
  onResearchStyleChange?: (style: ResearchStyle) => void
  researchStyleDisabled?: boolean
  /** Country picker in footer row (research), beside research style. */
  showCountryPicker?: boolean
  countryPickerSlot?: ReactNode
  /** AI model select — inline in primary footer (research) or secondary row (War Room). */
  showAiModelPicker?: boolean
  aiModelLabels?: Partial<Record<import('@/lib/aiModels').AIModelId, string>>
  aiModelPickerDisabled?: boolean
  onAiModelChange?: (modelId: AIModelId) => void
  /** Chip accent for hero model trigger (War Room uses `warRoom`). */
  aiModelChipAccent?: 'primary' | 'warRoom'
  /** `inline` | `secondary` — both render in the footer row below the input. */
  aiModelPickerPlacement?: 'inline' | 'secondary'
  /** Main input (fills remaining width). */
  inputSlot?: ReactNode
  /** Omit the input row — footer/actions only (split discover hero layout). */
  hideInputRow?: boolean
  /** Single-line search composer — center input + submit vertically, fitted row height. */
  compactInputRow?: boolean
  /** Keep submit in footer when input row is hidden (split discover hero layout). */
  forceSubmitInFooter?: boolean
  /** Optional control between input and submit (e.g. Sparkles handoff on discover hero). */
  midSlot?: ReactNode
  onSubmit: () => void | Promise<void>
  submitDisabled: boolean
  /** Small Auto switch — hides AI model picker when enabled. */
  showAiAutoSwitch?: boolean
  aiAutoEnabled?: boolean
  onAiAutoEnabledChange?: (enabled: boolean) => void
  submitLoading: boolean
  submitAriaLabel?: string
  submitTitle?: string
  /** Circular padded submit button (discover hero). */
  submitVariant?: 'default' | 'circular'
  /** War Room tab uses explicit red submit styling. */
  submitAccent?: 'default' | 'war-room'
  /** Hide submit button (used when custom actions replace it). */
  hideSubmitButton?: boolean
  /** On narrow viewports, render mid controls below the input row (discover hero). */
  stackMidSlotOnNarrow?: boolean
  /** Suggest ideas / keywords control — rendered in the footer row beside research pickers. */
  suggestIdeasSlot?: ReactNode
  /**
   * `footer` = beside submit in footer (on mobile hero, Suggest replaces the circular arrow);
   * `beforeSubmit` = primary row before the arrow;
   * `below` = full-width row under the composer on all breakpoints.
   */
  suggestIdeasPlacement?: 'footer' | 'beforeSubmit' | 'below'
  /** Extra footer controls (e.g. sourcing budget) — rendered after Help in the footer row. */
  footerExtraSlot?: ReactNode
  /** Lead footer control (e.g. the discover hero feature Select). Rendered first
   *  in the footer row, on the left. Use this when the lead item should sit
   *  alongside the Generate Ideas chip and submit arrow. */
  composerLeadSlot?: ReactNode
  /** Optional driver.js tour target on the footer row container. */
  footerDataTour?: string
}

/**
 * Shared discover / Command Center composer chrome: input area, optional mid control,
 * mode dropdown, and arrow submit (matches both routes’ `layoutId` shell).
 */
export function SharedCommandComposerInnerRow({
  currentMode = 'opportunities',
  onModeChange,
  showModeDropdown = false,
  currentRoomMode,
  onRoomModeChange,
  showRoomModeDropdown = false,
  showResearchStylePicker = false,
  researchStyle,
  onResearchStyleChange,
  researchStyleDisabled = false,
  showCountryPicker = false,
  countryPickerSlot,
  showAiModelPicker = false,
  aiModelLabels,
  aiModelPickerDisabled = false,
  onAiModelChange,
  aiModelChipAccent = 'primary',
  aiModelPickerPlacement = 'inline',
  inputSlot,
  midSlot,
  onSubmit,
  submitDisabled,
  showAiAutoSwitch = false,
  aiAutoEnabled = true,
  onAiAutoEnabledChange,
  submitLoading,
  submitAriaLabel = 'Submit',
  submitTitle,
  submitVariant = 'default',
  submitAccent = 'default',
  hideSubmitButton = false,
  stackMidSlotOnNarrow = false,
  suggestIdeasSlot,
  suggestIdeasPlacement = 'footer',
  footerExtraSlot,
  composerLeadSlot,
  footerDataTour,
  hideInputRow = false,
  forceSubmitInFooter = false,
  compactInputRow = false,
}: SharedCommandComposerInnerRowProps) {
  const modeIcons: Record<DiscoverMode, React.ReactNode> = {
    opportunities: <Compass className="h-4 w-4" />,
    research: <Sparkles className="h-4 w-4" />,
    sourcing: <PackageSearch className="h-4 w-4" />,
  }

  const [composerSheetView, setComposerSheetView] = useState<MobileComposerOptionsSheetView | 'root' | null>(
    null,
  )
  const { profile } = useAuth()
  const { selectedModel } = usePreferredAiModel()
  const { data: subscriptionStatus } = useSubscriptionStatus()
  const isAdmin = ['admin', 'super_admin'].includes(String(profile?.role ?? ''))
  const roomNavItems = sidebarRoomNavItems({
    roadmapUnlocked: hasSubscriptionFeature(subscriptionStatus, 'roadmap_unlocked'),
    warroomUnlocked: hasSubscriptionFeature(subscriptionStatus, 'warroom_unlocked'),
    isAdmin,
  })
  const composerSheetOpen = composerSheetView != null
  const styleChipLabel =
    RESEARCH_STYLE_OPTIONS.find((option) => option.value === researchStyle)?.label ?? 'Style'
  const modelChipLabel = aiAutoEnabled
    ? 'Auto'
    : (aiModelLabels?.[selectedModel] ??
      POWERPROOF_COMPOSER_MODEL_LABELS[selectedModel] ??
      'Model')

  const openComposerSheet = (view: MobileComposerOptionsSheetView) => {
    setComposerSheetView(view)
  }

  const showModeSelect = showModeDropdown && Boolean(onModeChange)
  const showRoomModeSelect =
    showRoomModeDropdown && Boolean(onRoomModeChange) && currentRoomMode != null
  const showStyleSelect =
    showResearchStylePicker &&
    researchStyle != null &&
    Boolean(onResearchStyleChange)
  const showCountry = showCountryPicker && Boolean(countryPickerSlot)
  const showAiModelInline = false
  const showAiModelSecondary = false
  const footerSelectTriggerClass = HERO_FOOTER_SELECT_TRIGGER_CLASS
  const heroFooterPickers = submitVariant === 'circular'

  const aiModelPickerNode = null

  const showAiModelInFooter = false

  const suggestBeforeSubmit = Boolean(suggestIdeasSlot) && suggestIdeasPlacement === 'beforeSubmit'
  const suggestInFooter = Boolean(suggestIdeasSlot) && suggestIdeasPlacement === 'footer'
  const suggestBelowComposer = Boolean(suggestIdeasSlot) && suggestIdeasPlacement === 'below'
  /** Mobile replaces the circular arrow with Suggest when narrow viewport; we now
   *  render the same desktop layout on mobile, so this is always false. */
  const mobileSuggestReplacesArrow = false

  const circularSubmit = submitVariant === 'circular'

  const midSlotNode = midSlot ? (
    <div
      className={cn(
        'flex shrink-0 items-center self-stretch',
        stackMidSlotOnNarrow && 'w-full layout-lg:w-auto',
      )}
    >
      {midSlot}
    </div>
  ) : null

  const modeSelectNode = showModeSelect ? (
    <Select
      value={currentMode}
      leadingVariant="iconWithText"
      onValueChange={(value) => onModeChange!(value as DiscoverMode)}
    >
      <SelectTrigger className={footerSelectTriggerClass}>
        <SelectValue className="text-foreground" />
      </SelectTrigger>
      <SelectContent className="w-60" align="start">
        <SelectItem value="research" icon={modeIcons.research} textValue="Research Ideas" className="gap-2">
          Research Ideas
        </SelectItem>
        <SelectItem
          value="opportunities"
          icon={modeIcons.opportunities}
          textValue="Explore Opportunities"
          className="gap-2"
        >
          Explore Opportunities
        </SelectItem>
        <SelectItem value="sourcing" icon={modeIcons.sourcing} textValue="Source Products" className="gap-2">
          Source Products
        </SelectItem>
      </SelectContent>
    </Select>
  ) : null

  const roomModeSelectNode = showRoomModeSelect ? (
    <Select
      value={currentRoomMode}
      leadingVariant="iconWithText"
      onValueChange={(value) => onRoomModeChange!(value as RoomComposerMode)}
    >
      <SelectTrigger className={footerSelectTriggerClass} data-tour="composer-room-mode">
        <SelectValue className="text-foreground" />
      </SelectTrigger>
      <SelectContent className="w-60" align="start">
        {roomNavItems.map((item) => {
          const Icon = item.icon
          return (
            <SelectItem
              key={item.id}
              value={item.id}
              icon={<Icon className="h-4 w-4 shrink-0" aria-hidden />}
              textValue={item.label}
              className="gap-2"
            >
              {item.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  ) : null

  const styleSelectNode = showStyleSelect ? (
    <div data-tour="arsenal-research-style" className="min-w-0 shrink-0">
      <ResearchStylePicker
        value={researchStyle!}
        onChange={onResearchStyleChange!}
        disabled={researchStyleDisabled}
        variant={heroFooterPickers ? 'hero' : 'default'}
        triggerClassName={heroFooterPickers ? undefined : footerSelectTriggerClass}
        contentClassName="z-[10001]"
      />
    </div>
  ) : null

  const countryNode = showCountry ? (
    <div className="flex min-w-0 shrink-0 items-center">{countryPickerSlot}</div>
  ) : null

  const composerSheetOptions =
    showRoomModeSelect ||
    showModeSelect ||
    showStyleSelect ||
    showCountry ||
    showAiModelInFooter ||
    showAiAutoSwitch ||
    Boolean(footerExtraSlot)

  // Mobile uses the same desktop footer row as desktop when the hero pickers
  // are mounted. No bottom-sheet conversion on narrow viewports.
  const useMobileComposerActionRow = false
  const useComposerBottomSheet = false
  const mobileSubmitInline = false

  const showMobileActionRow =
    useMobileComposerActionRow &&
    (useComposerBottomSheet ||
      suggestInFooter ||
      !hideSubmitButton)

  const showFooterRow = useMobileComposerActionRow
    ? showMobileActionRow
    : forceSubmitInFooter ||
      showRoomModeSelect ||
      showModeSelect ||
      showStyleSelect ||
      showCountry ||
      showAiModelInFooter ||
      showAiAutoSwitch ||
      suggestInFooter ||
      Boolean(footerExtraSlot) ||
      Boolean(composerLeadSlot)

  const submitInFooter =
    circularSubmit &&
    !mobileSubmitInline &&
    !mobileSuggestReplacesArrow &&
    (forceSubmitInFooter ||
      (showFooterRow && !suggestBeforeSubmit))

  const footerItems: ReactNode[] = []
  if (roomModeSelectNode) footerItems.push(roomModeSelectNode)
  if (modeSelectNode) footerItems.push(modeSelectNode)
  if (styleSelectNode) footerItems.push(styleSelectNode)
  if (countryNode) footerItems.push(countryNode)
  if (showAiModelInFooter && aiModelPickerNode) footerItems.push(aiModelPickerNode)
  if (footerExtraSlot && !useComposerBottomSheet) footerItems.push(footerExtraSlot)

  const submitLooksDisabled = submitDisabled
  const handleSubmitClick = () => {
    if (submitLoading || submitDisabled) return
    return onSubmit()
  }

  const mobileSubmitSize = useMobileComposerActionRow ? ('mobileHero' as const) : ('chip' as const)

  const submitButtonNode = hideSubmitButton
    ? null
    :
    circularSubmit ? (
      <ComposerSubmitButton
        onClick={onSubmit}
        disabled={submitDisabled}
        loading={submitLoading}
        aria-label={submitAriaLabel}
        title={submitTitle ?? submitAriaLabel}
        size={mobileSubmitSize}
        iconDirection="up"
        accent={submitAccent}
      />
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleSubmitClick}
        disabled={submitDisabled}
        loading={submitLoading}
        disablePressAnimation
        className={cn(
          'h-auto w-12 min-h-0 min-w-0 rounded-none bg-bg-sunken/40 shadow-none',
          'layout-sm:w-14',
          submitLooksDisabled && 'opacity-40',
          submitAccent === 'war-room'
            ? 'text-red-600 hover:bg-red-500/10 dark:text-red-400'
            : 'text-foreground hover:bg-primary/10',
        )}
        aria-label={submitAriaLabel}
        aria-disabled={submitLooksDisabled || submitLoading ? true : undefined}
        title={submitTitle ?? submitAriaLabel}
        icon={<ArrowRight className="h-5 w-5" aria-hidden />}
      />
    )

  const fullWidthMobileSubmit =
    mobileSuggestReplacesArrow && !hideSubmitButton ? (
      <Button
        type="button"
        variant="primary"
        size="lg"
        full
        onClick={handleSubmitClick}
        disabled={submitDisabled}
        loading={submitLoading}
        disablePressAnimation
        className={cn(
          'h-12 min-h-12 justify-center gap-2 rounded-xl text-sm font-semibold',
          submitAccent === 'war-room' &&
            'border-red-600 bg-red-600 text-white hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-600',
        )}
        aria-label={submitAriaLabel}
        title={submitTitle ?? submitAriaLabel}
        iconRight={
          <span className="inline-flex items-center gap-1.5">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        }
      >
        {submitAriaLabel}
      </Button>
    ) : null

  return (
    <div
      className={cn(
        'flex flex-col gap-0 w-full min-w-0',
        heroFooterPickers && discoverHeroComposerMobileInnerPaddingClassName,
      )}
    >
      <div
        className={cn(
          'flex w-full min-w-0',
          stackMidSlotOnNarrow ? 'flex-col layout-sm:flex-row layout-sm:items-center' : 'items-center',
        )}
      >
        {!hideInputRow ? (
        <div className="flex min-w-0 w-full shrink-0 flex-1 items-center overflow-visible">
          <div
            className={cn(
              'relative flex min-w-0 w-full flex-1',
              compactInputRow
                ? 'min-h-0 max-layout-sm:min-h-10 items-center'
                : 'min-h-0 items-center',
            )}
          >
            {inputSlot}
          </div>
          {stackMidSlotOnNarrow ? null : midSlotNode}
          {!submitInFooter && !useMobileComposerActionRow
            ? circularSubmit
              ? (
                  <div className="flex shrink-0 items-center self-center gap-1.5 overflow-visible p-0.5 layout-sm:gap-2 layout-sm:p-1">
                    {suggestBeforeSubmit ? suggestIdeasSlot : null}
                    {submitButtonNode}
                  </div>
                )
              : (
                  submitButtonNode
                )
            : null}
        </div>
        ) : null}
        {stackMidSlotOnNarrow && !hideInputRow ? midSlotNode : null}
      </div>

      {showFooterRow ? (
        <div
          {...(footerDataTour && !useMobileComposerActionRow ? { 'data-tour': footerDataTour } : {})}
          className={cn(
            'flex min-w-0 items-center gap-1.5',
            heroFooterPickers
              ? 'flex-nowrap overflow-x-auto hide-scrollbar pt-1 max-layout-sm:px-0 max-layout-sm:pt-2 max-layout-sm:items-center [-webkit-overflow-scrolling:touch] [touch-action:pan-x]'
              : useMobileComposerActionRow
                ? 'flex-nowrap'
                : 'max-layout-sm:flex-wrap max-layout-sm:gap-y-1.5 layout-sm:flex-nowrap layout-lg:gap-2',
            !heroFooterPickers && 'bg-muted/20',
            !heroFooterPickers && 'bg-muted/20',
          )}
        >
          {useMobileComposerActionRow ? (
            <div className="flex w-full min-w-0 items-center justify-between gap-2 max-layout-sm:min-h-10">
              <div className="flex min-w-0 shrink items-center gap-2 max-layout-sm:min-h-10">
                {suggestInFooter && !mobileSuggestReplacesArrow ? suggestIdeasSlot : null}
                {useComposerBottomSheet ? (
                  <>
                    {showRoomModeSelect ? (
                      <button
                        type="button"
                        onClick={() => openComposerSheet('room')}
                        className={cn(
                          HERO_FOOTER_CHIP_BUTTON_CLASS,
                          HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
                          'shrink-0 justify-center',
                          composerSheetView === 'room' && 'border-primary/35 bg-primary/5',
                        )}
                        aria-haspopup="dialog"
                        aria-expanded={composerSheetView === 'room'}
                        aria-label="Room"
                      >
                        Room
                      </button>
                    ) : null}
                    {showModeSelect ? (
                      <button
                        type="button"
                        onClick={() => openComposerSheet('mode')}
                        className={cn(
                          HERO_FOOTER_CHIP_BUTTON_CLASS,
                          HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
                          'shrink-0 justify-center',
                          composerSheetView === 'mode' && 'border-primary/35 bg-primary/5',
                        )}
                        aria-haspopup="dialog"
                        aria-expanded={composerSheetView === 'mode'}
                        aria-label="Mode"
                      >
                        Mode
                      </button>
                    ) : null}
                    {showStyleSelect ? (
                      <button
                        type="button"
                        onClick={() => openComposerSheet('style')}
                        disabled={researchStyleDisabled}
                        className={cn(
                          HERO_FOOTER_CHIP_BUTTON_CLASS,
                          HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
                          'max-w-[9.5rem] shrink-0 justify-center',
                          composerSheetView === 'style' && 'border-primary/35 bg-primary/5',
                        )}
                        aria-haspopup="dialog"
                        aria-expanded={composerSheetView === 'style'}
                        aria-label="Research style"
                      >
                        <HeroComposerFooterChipContent
                          label={styleChipLabel}
                          icon={
                            <Microscope
                              className="h-3.5 w-3.5 text-muted-foreground"
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          }
                        />
                      </button>
                    ) : null}
                    {showAiModelInFooter ? (
                      <button
                        type="button"
                        onClick={() => openComposerSheet('ai-model')}
                        disabled={aiModelPickerDisabled}
                        className={cn(
                          HERO_FOOTER_CHIP_BUTTON_CLASS,
                          HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
                          'max-w-[9.5rem] shrink-0 justify-center',
                          submitAccent === 'war-room' &&
                            'hover:border-red-200/60 hover:bg-red-500/[0.06] dark:hover:border-red-900/40',
                          composerSheetView === 'ai-model' && 'border-primary/35 bg-primary/5',
                        )}
                        aria-haspopup="dialog"
                        aria-expanded={composerSheetView === 'ai-model'}
                        aria-label="AI model"
                      >
                        <HeroComposerFooterChipContent
                          label={modelChipLabel}
                          icon={
                            <Sparkles
                              className={cn(
                                'h-3.5 w-3.5',
                                aiModelChipAccent === 'warRoom'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-primary',
                              )}
                              strokeWidth={2.25}
                              aria-hidden
                            />
                          }
                        />
                      </button>
                    ) : null}
                    {showCountry ? (
                      <button
                        type="button"
                        onClick={() => openComposerSheet('country')}
                        className={cn(
                          HERO_FOOTER_CHIP_BUTTON_CLASS,
                          HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
                          'shrink-0 justify-center',
                          composerSheetView === 'country' && 'border-primary/35 bg-primary/5',
                        )}
                        aria-haspopup="dialog"
                        aria-expanded={composerSheetView === 'country'}
                        aria-label="Country"
                      >
                        Country
                      </button>
                    ) : null}
                    {footerExtraSlot ? (
                      <button
                        type="button"
                        onClick={() => openComposerSheet('budget')}
                        className={cn(
                          HERO_FOOTER_CHIP_BUTTON_CLASS,
                          HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS,
                          'shrink-0 justify-center',
                          composerSheetView === 'budget' && 'border-primary/35 bg-primary/5',
                        )}
                        aria-haspopup="dialog"
                        aria-expanded={composerSheetView === 'budget'}
                        aria-label="Budget"
                      >
                        Budget
                      </button>
                    ) : null}
                    <MobileComposerOptionsSheet
                      open={composerSheetOpen}
                      onOpenChange={(open) => {
                        if (!open) setComposerSheetView(null)
                      }}
                      initialView={composerSheetView ?? 'root'}
                      showRoomModeSelect={showRoomModeSelect}
                      currentRoomMode={currentRoomMode}
                      onRoomModeChange={onRoomModeChange}
                      showModeSelect={showModeSelect}
                      currentMode={currentMode}
                      onModeChange={onModeChange}
                      showStyleSelect={showStyleSelect}
                      researchStyle={researchStyle}
                      onResearchStyleChange={onResearchStyleChange}
                      researchStyleDisabled={researchStyleDisabled}
                      showCountry={showCountry}
                      countryPickerSlot={countryNode}
                      showAiModelInFooter={showAiModelInFooter}
                      showAiModelPicker={showAiModelPicker}
                      aiModelLabels={aiModelLabels ?? (heroFooterPickers ? POWERPROOF_COMPOSER_MODEL_LABELS : undefined)}
                      aiModelPickerDisabled={aiModelPickerDisabled}
                      onAiModelChange={onAiModelChange}
                      aiModelChipAccent={aiModelChipAccent}
                      showAiAutoSwitch={showAiAutoSwitch}
                      aiAutoEnabled={aiAutoEnabled}
                      onAiAutoEnabledChange={onAiAutoEnabledChange}
                      footerExtraSlot={footerExtraSlot}
                    />
                  </>
                ) : null}
              </div>
              {mobileSuggestReplacesArrow ? (
                <div className="flex min-w-0 shrink items-center justify-end gap-1.5 overflow-visible">
                  {suggestIdeasSlot}
                </div>
              ) : !hideSubmitButton ? (
                <div className="flex shrink-0 items-center gap-1.5 overflow-visible">
                  {submitButtonNode}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {composerLeadSlot || (suggestInFooter && composerLeadSlot) ? (
                <div className="flex min-w-0 shrink items-center gap-1.5 overflow-visible">
                  {composerLeadSlot}
                  {suggestInFooter && composerLeadSlot ? suggestIdeasSlot : null}
                </div>
              ) : null}
              {footerItems.map((item, index) => (
                <span key={index} className="contents">
                  {item}
                </span>
              ))}
              {suggestInFooter || submitInFooter ? (
                <div
                  className={cn(
                    'ml-auto flex shrink-0 items-center gap-1.5 overflow-visible pl-0.5 layout-sm:gap-2 layout-sm:pl-1',
                    heroFooterPickers ? '' : 'max-layout-sm:w-full max-layout-sm:justify-end',
                  )}
                >
                  {suggestInFooter && !composerLeadSlot ? suggestIdeasSlot : null}
                  {submitInFooter ? (
                    <>
                      {submitButtonNode}
                    </>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {fullWidthMobileSubmit ? (
        <div className="flex w-full min-w-0 pt-3">{fullWidthMobileSubmit}</div>
      ) : null}
      {suggestBelowComposer ? (
        <div className="w-full min-w-0 pt-3 max-layout-sm:pt-3.5">{suggestIdeasSlot}</div>
      ) : null}
    </div>
  )
}

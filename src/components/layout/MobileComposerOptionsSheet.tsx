import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, ChevronRight, Microscope, Sparkles } from '@/lib/icons'

import { BrandLogoImg } from '@/components/composer/BrandLogoImg'
import { usePreferredAiModel } from '@/contexts/PreferredAiModelContext'
import type { DiscoverMode } from '@/components/layout/SharedCommandComposerShell'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { AI_MODELS, POWERPROOF_COMPOSER_MODEL_LABELS, type AIModelId } from '@/lib/aiModels'
import { researchStyleLogoUrl } from '@/lib/brandLogos'
import { RESEARCH_STYLE_OPTIONS, type ResearchStyle } from '@/lib/researchStyles'
import { sidebarRoomNavItems, type RoomComposerMode } from '@/lib/sidebarWorkspaceNav'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { hasSubscriptionFeature } from '@/lib/subscriptionStatus'
import { cn } from '@/lib/utils'

type SheetView = 'root' | 'room' | 'mode' | 'style' | 'ai-model' | 'country' | 'budget'

export type MobileComposerOptionsSheetView = Exclude<SheetView, 'root'>

type MobileComposerOptionsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Open directly into a picker (skip the root options list). */
  initialView?: SheetView
  showRoomModeSelect: boolean
  currentRoomMode?: RoomComposerMode
  onRoomModeChange?: (mode: RoomComposerMode) => void
  showModeSelect: boolean
  currentMode?: DiscoverMode
  onModeChange?: (mode: DiscoverMode) => void
  showStyleSelect: boolean
  researchStyle?: ResearchStyle
  onResearchStyleChange?: (style: ResearchStyle) => void
  researchStyleDisabled?: boolean
  showCountry: boolean
  countryPickerSlot?: ReactNode
  showAiModelInFooter: boolean
  showAiModelPicker: boolean
  aiModelLabels?: Partial<Record<AIModelId, string>>
  aiModelPickerDisabled?: boolean
  onAiModelChange?: (modelId: AIModelId) => void
  aiModelChipAccent?: 'primary' | 'warRoom'
  showAiAutoSwitch?: boolean
  aiAutoEnabled?: boolean
  onAiAutoEnabledChange?: (enabled: boolean) => void
  footerExtraSlot?: ReactNode
}

const MODE_LABELS: Record<DiscoverMode, string> = {
  opportunities: 'Explore Opportunities',
  research: 'Research Ideas',
  sourcing: 'Source Products',
}

const sheetRowClassName =
  'flex w-full min-w-0 items-center gap-3 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const sheetOptionClassName =
  'flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left text-[15px] font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function SheetHandle() {
  return (
    <div className="mx-auto mb-2 mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
  )
}

function SheetBackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle/70 px-3 py-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
      </button>
      <h3 className="min-w-0 flex-1 truncate text-[16px] font-semibold text-foreground">{title}</h3>
    </div>
  )
}

function SheetNavRow({
  label,
  value,
  onClick,
}: {
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className={sheetRowClassName}>
      <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
      {value ? <span className="max-w-[45%] truncate text-[14px] text-muted-foreground">{value}</span> : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

export function MobileComposerOptionsSheet({
  open,
  onOpenChange,
  initialView = 'root',
  showRoomModeSelect,
  currentRoomMode,
  onRoomModeChange,
  showModeSelect,
  currentMode = 'opportunities',
  onModeChange,
  showStyleSelect,
  researchStyle,
  onResearchStyleChange,
  researchStyleDisabled = false,
  showCountry,
  countryPickerSlot,
  showAiModelInFooter,
  aiModelLabels,
  aiModelPickerDisabled = false,
  onAiModelChange,
  aiModelChipAccent = 'primary',
  showAiAutoSwitch = false,
  aiAutoEnabled = true,
  onAiAutoEnabledChange,
  footerExtraSlot,
}: MobileComposerOptionsSheetProps) {
  const [view, setView] = useState<SheetView>(initialView)
  const { selectedModel } = usePreferredAiModel()
  const { profile } = useAuth()
  const { data: subscriptionStatus } = useSubscriptionStatus()
  const isAdmin = ['admin', 'super_admin'].includes(String(profile?.role ?? ''))
  const roomNavItems = sidebarRoomNavItems({
    roadmapUnlocked: hasSubscriptionFeature(subscriptionStatus, 'roadmap_unlocked'),
    warroomUnlocked: hasSubscriptionFeature(subscriptionStatus, 'warroom_unlocked'),
    isAdmin,
  })

  useEffect(() => {
    if (open) setView(initialView)
    else setView('root')
  }, [open, initialView])

  const roomLabel = roomNavItems.find((item) => item.id === currentRoomMode)?.label ?? 'Room'
  const styleLabel =
    RESEARCH_STYLE_OPTIONS.find((option) => option.value === researchStyle)?.label ?? 'Style'

  const rootItems: Array<{ id: SheetView; label: string; value?: string; show: boolean }> = [
    { id: 'room', label: 'Room', value: roomLabel, show: showRoomModeSelect },
    { id: 'mode', label: 'Mode', value: MODE_LABELS[currentMode], show: showModeSelect },
    { id: 'style', label: 'Research style', value: styleLabel, show: showStyleSelect },
    { id: 'ai-model', label: 'AI model', show: showAiModelInFooter },
    { id: 'country', label: 'Country', show: showCountry },
    { id: 'budget', label: 'Budget', show: Boolean(footerExtraSlot) },
  ].filter((item) => item.show)

  const closeAfterPick = () => {
    setView('root')
    onOpenChange(false)
  }

  const handleBack = () => {
    if (initialView !== 'root') {
      onOpenChange(false)
      return
    }
    setView('root')
  }

  const activeTitle = rootItems.find((item) => item.id === view)?.label ?? 'Options'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="flex max-h-[min(88dvh,36rem)] flex-col gap-0 overflow-hidden rounded-t-[var(--radius-lg)] border-t border-border-default p-0 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <SheetTitle className="sr-only">Composer options</SheetTitle>
        {view === 'root' ? (
          <>
            <SheetHandle />
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-1">
              <p className="px-1 pb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Composer options
              </p>
              <div className="flex flex-col gap-1">
                {rootItems.map((item) => (
                  <SheetNavRow
                    key={item.id}
                    label={item.label}
                    value={item.value}
                    onClick={() => setView(item.id)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <SheetBackHeader title={activeTitle} onBack={handleBack} />
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {view === 'room' && showRoomModeSelect ? (
                <div className="flex flex-col gap-1">
                  {roomNavItems.map((item) => {
                    const Icon = item.icon
                    const active = item.id === currentRoomMode
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onRoomModeChange?.(item.id)
                          closeAfterPick()
                        }}
                        className={cn(sheetOptionClassName, active && 'bg-primary/10 text-primary')}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2.5">
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="truncate">{item.label}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {view === 'mode' && showModeSelect ? (
                <div className="flex flex-col gap-1">
                  {(Object.keys(MODE_LABELS) as DiscoverMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        onModeChange?.(mode)
                        closeAfterPick()
                      }}
                      className={cn(
                        sheetOptionClassName,
                        currentMode === mode && 'bg-primary/10 text-primary',
                      )}
                    >
                      {MODE_LABELS[mode]}
                    </button>
                  ))}
                </div>
              ) : null}

              {view === 'style' && showStyleSelect && researchStyle != null && onResearchStyleChange ? (
                <div className="flex flex-col gap-1">
                  {RESEARCH_STYLE_OPTIONS.map((option) => {
                    const logoUrl = researchStyleLogoUrl(option.value)
                    return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={researchStyleDisabled}
                      onClick={() => {
                        onResearchStyleChange(option.value)
                        closeAfterPick()
                      }}
                      className={cn(
                        sheetOptionClassName,
                        researchStyle === option.value && 'bg-primary/10 text-primary',
                        researchStyleDisabled && 'opacity-50',
                      )}
                    >
                      <span className="min-w-0">
                        {logoUrl ? (
                          <BrandLogoImg src={logoUrl} alt={option.firm} height={18} />
                        ) : (
                          <Microscope className="h-[18px] w-[18px] text-muted-foreground/80" strokeWidth={2.25} aria-hidden />
                        )}
                        <span className="mt-1 block truncate text-[13px] font-normal text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </button>
                    )
                  })}
                </div>
              ) : null}

              {view === 'ai-model' && showAiModelInFooter ? (
                <div className="flex flex-col gap-3">
                  {showAiAutoSwitch ? (
                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border-subtle/70 bg-muted/15 px-4 py-3">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[15px] font-medium text-foreground">
                        <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        Auto
                      </span>
                      <Switch
                        checked={aiAutoEnabled}
                        onCheckedChange={(checked) => onAiAutoEnabledChange?.(checked)}
                        className="h-5 w-9 shrink-0 data-[state=checked]:bg-primary [&>span]:h-4 [&>span]:w-4 data-[state=checked]:[&>span]:translate-x-4"
                        aria-label="Automatic AI model selection"
                      />
                    </label>
                  ) : null}
                  <div className="flex flex-col gap-1">
                    {AI_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        disabled={aiModelPickerDisabled || aiAutoEnabled}
                        onClick={() => {
                          onAiModelChange?.(model.id)
                          onAiAutoEnabledChange?.(false)
                          closeAfterPick()
                        }}
                        className={cn(
                          sheetOptionClassName,
                          !aiAutoEnabled && selectedModel === model.id && 'bg-primary/10 text-primary',
                          aiAutoEnabled && 'opacity-50',
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">
                            {aiModelLabels?.[model.id] ?? POWERPROOF_COMPOSER_MODEL_LABELS[model.id]}
                          </span>
                          <span className="mt-0.5 block truncate text-[13px] font-normal text-muted-foreground">
                            {model.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {view === 'country' && showCountry ? (
                <div className="px-1 py-2 text-[15px] [&_button]:min-h-12 [&_button]:text-[15px]">
                  {countryPickerSlot}
                </div>
              ) : null}

              {view === 'budget' && footerExtraSlot ? (
                <div className="px-1 py-2 [&_button]:h-12 [&_button]:min-h-12 [&_button]:text-[15px] [&_input]:text-[15px]">
                  {footerExtraSlot}
                </div>
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

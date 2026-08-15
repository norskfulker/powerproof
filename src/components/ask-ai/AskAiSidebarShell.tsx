import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AskAiHistoryToggle } from '@/components/ask-ai/AskAiHistoryPanel'
import { AskAiChatComposer } from '@/components/ask-ai/AskAiChatPanel'
import { useAskAiChatStateOptional } from '@/components/ask-ai/useAskAiChatState'
import { RailCollapseToggle } from '@/components/layout/RailCollapseToggle'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAskAiSidebarCollapsed } from '@/hooks/useAskAiSidebarCollapsed'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useAskAiPanelLayoutOptional } from '@/contexts/AskAiPanelLayoutContext'
import { Maximize2, Minimize2, Plus, Sparkles, X } from '@/lib/icons'
import { ASK_AI_SIDEBAR_WIDTH_PX } from '@/lib/askAiSidebar'
import { askAiIconButtonClassName, askAiIconButtonCompactClassName } from '@/lib/askAiPresentation'
import {
  ASK_AI_UI_ENABLED,
  REQUEST_ASK_AI_OPEN_EVENT,
  type AskAiOpenRequestDetail,
} from '@/lib/askAiPanelEvents'
import { cn } from '@/lib/utils'

import {
  opportunityDetailCardSurfaceClass,
} from '@/lib/opportunityCardClasses'

type AskAiSidebarShellProps = {
  children: ReactNode
  className?: string
}

/** Fallback when chrome header is absent. */
const ASK_AI_SIDEBAR_TOP_FALLBACK_PX = 0

const askAiSidebarCardClass = cn(
  opportunityDetailCardSurfaceClass,
  'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none border border-border-subtle',
)

function useAskAiSidebarChromeOffset(): number {
  const [topPx, setTopPx] = useState(ASK_AI_SIDEBAR_TOP_FALLBACK_PX)

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-app-chrome-header]')
    if (!header) {
      setTopPx(ASK_AI_SIDEBAR_TOP_FALLBACK_PX)
      return
    }

    const sync = () => {
      setTopPx(Math.max(0, Math.ceil(header.getBoundingClientRect().height)))
    }
    sync()

    const ro = new ResizeObserver(sync)
    ro.observe(header)
    window.addEventListener('resize', sync, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', sync)
    }
  }, [])

  return topPx
}

const askAiPanelWidthTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 34,
  mass: 0.9,
}

function AskAiSidebarHeader({
  onCollapse,
  fullscreenDialog,
  onFullscreenToggle,
  showFullscreenToggle,
  compact,
}: {
  onCollapse: () => void
  fullscreenDialog: boolean
  onFullscreenToggle: () => void
  showFullscreenToggle: boolean
  compact?: boolean
}) {
  const state = useAskAiChatStateOptional()
  if (!state?.enabled) return null

  const inEditMode = state.applyOpportunityEdit && Boolean(state.editModePanel)
  const editControls = inEditMode ? state.editModeControls : null

  const iconBtn = compact ? askAiIconButtonCompactClassName : askAiIconButtonClassName
  const iconSize = compact ? 'h-5 w-5' : 'h-4 w-4'

  const historyOpen = editControls?.historyOpen ?? state.historyOpen
  const setHistoryOpen = editControls?.setHistoryOpen ?? state.setHistoryOpen
  const handleNewChat = editControls?.handleNewChat ?? (() => void state.handleNewChat())
  const newChatDisabled = editControls?.isBootstrapping ?? state.isBootstrapping

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle/70 bg-muted/25',
        compact
          ? 'px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]'
          : 'px-3 py-2.5',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(iconBtn, 'pointer-events-none shrink-0 text-primary')}
          aria-hidden
        >
          <Sparkles className={iconSize} aria-hidden />
        </span>
        <p
          className={cn(
            'min-w-0 truncate font-sans font-semibold leading-none text-foreground',
            compact ? 'text-[16px]' : 'text-[14px]',
          )}
        >
          Ask AI
        </p>
      </div>
      <div className={cn('flex shrink-0 items-center', compact ? 'gap-2' : 'gap-1')}>
        {!inEditMode || editControls ? (
          <AskAiHistoryToggle
            variant="default"
            size={compact ? 'compact' : 'default'}
            showTooltip={!compact}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
          />
        ) : null}
        {compact ? (
          <button
            type="button"
            className={iconBtn}
            disabled={newChatDisabled}
            onClick={handleNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <Plus className={iconSize} aria-hidden />
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={iconBtn}
                disabled={newChatDisabled}
                onClick={handleNewChat}
                aria-label="New chat"
              >
                <Plus className={iconSize} aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">New chat</TooltipContent>
          </Tooltip>
        )}
        {showFullscreenToggle ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(iconBtn, fullscreenDialog && 'bg-muted text-foreground')}
                onClick={onFullscreenToggle}
                aria-label={fullscreenDialog ? 'Exit full screen' : 'Open Ask AI full screen'}
              >
                {fullscreenDialog ? (
                  <Minimize2 className={iconSize} aria-hidden />
                ) : (
                  <Maximize2 className={iconSize} aria-hidden />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {fullscreenDialog ? 'Exit full screen' : 'Full screen'}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {compact ? (
          <button
            type="button"
            className={iconBtn}
            onClick={onCollapse}
            aria-label="Close Ask AI"
            title="Close Ask AI"
          >
            <X className={iconSize} aria-hidden />
          </button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <RailCollapseToggle
                collapsed={false}
                onToggle={onCollapse}
                side="right"
                collapseLabel="Collapse Ask AI sidebar"
                expandLabel="Expand Ask AI sidebar"
                className="h-8 w-8"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom">Collapse Ask AI sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

function AskAiPanelBody() {
  const state = useAskAiChatStateOptional()
  if (!state?.enabled) return null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      {state.applyOpportunityEdit && state.editModePanel ? state.editModePanel : <AskAiChatComposer />}
    </div>
  )
}

function AskAiDesktopFixedPanel({
  chromeTopPx,
  onCollapse,
  fullscreenDialog,
  onFullscreenToggle,
  showFullscreenToggle,
}: {
  chromeTopPx: number
  onCollapse: () => void
  fullscreenDialog: boolean
  onFullscreenToggle: () => void
  showFullscreenToggle: boolean
}) {
  const state = useAskAiChatStateOptional()
  const prefersReducedMotion = useReducedMotion()
  if (!state?.enabled) return null

  const panelHeight = `calc(100dvh - ${chromeTopPx}px - env(safe-area-inset-bottom, 0px))`

  return createPortal(
    <motion.div
      className="fixed right-0 z-[125] flex flex-col border-l border-border-subtle bg-card shadow-[var(--shadow-lg)]"
      initial={false}
      animate={{ width: ASK_AI_SIDEBAR_WIDTH_PX }}
      transition={prefersReducedMotion ? { duration: 0.15 } : askAiPanelWidthTransition}
      style={{
        top: chromeTopPx,
        width: ASK_AI_SIDEBAR_WIDTH_PX,
        height: panelHeight,
      }}
    >
      <aside
        className={cn(
          askAiSidebarCardClass,
          'h-full border-0 shadow-none',
          state.panelHighlight &&
            'ring-2 ring-primary/70 shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]',
        )}
        role="region"
        aria-label={state.ariaTitle}
        data-tour={state.panelHighlight ? 'ask-ai-panel' : 'ask-ai-panel'}
      >
        <AskAiSidebarHeader
          onCollapse={onCollapse}
          fullscreenDialog={fullscreenDialog}
          onFullscreenToggle={onFullscreenToggle}
          showFullscreenToggle={showFullscreenToggle}
        />
        <AskAiPanelBody />
      </aside>
    </motion.div>,
    document.body,
  )
}

function AskAiFullscreenDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const state = useAskAiChatStateOptional()
  if (!state?.enabled) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        layout="flex"
        hideClose
        size="xl"
        className={cn(
          'flex h-[min(92dvh,calc(100dvh-2rem))] w-[min(calc(100vw-2rem),64rem)] max-w-none flex-col gap-0 overflow-hidden p-0',
          state.panelHighlight &&
            'ring-2 ring-primary/70 shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]',
        )}
        data-tour="ask-ai-panel"
      >
        <AskAiSidebarHeader
          onCollapse={() => onOpenChange(false)}
          fullscreenDialog
          onFullscreenToggle={() => onOpenChange(false)}
          showFullscreenToggle
          compact
        />
        <AskAiPanelBody />
      </DialogContent>
    </Dialog>
  )
}

/**
 * Right collapsible Ask AI sidebar for workspace pages (research, war room, roadmap, market test).
 * Collapsed state has no side marquee rail — reopen via chrome Ask AI or the floating trigger.
 * Full screen opens a floating page dialog instead of splitting the workspace.
 */
export function AskAiSidebarShell({ children, className }: AskAiSidebarShellProps) {
  if (!ASK_AI_UI_ENABLED) {
    return <div className={className}>{children}</div>
  }

  const state = useAskAiChatStateOptional()
  const bp = useBreakpoint()
  const isCompactAskAi = bp === 'mobile' || bp === 'tablet'
  const chromeTopPx = useAskAiSidebarChromeOffset()
  const panelLayout = useAskAiPanelLayoutOptional()
  const [collapsed, setCollapsed] = useAskAiSidebarCollapsed(
    state?.storageNamespace ?? 'research',
    state?.enabled ? state.resourceId : undefined,
  )
  const [compactSheetOpen, setCompactSheetOpen] = useState(false)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  useEffect(() => {
    panelLayout?.setFullscreenDialog(fullscreenOpen)
    return () => panelLayout?.setFullscreenDialog(false)
  }, [fullscreenOpen, panelLayout])

  useEffect(() => {
    if (!state?.enabled) return

    const handleOpenRequest = (event: Event) => {
      const detail = (event as CustomEvent<AskAiOpenRequestDetail>).detail
      state.onOpenChange(true)
      if (isCompactAskAi) {
        setCompactSheetOpen(true)
        return
      }
      setCollapsed(false)
      if (detail?.presentation === 'dialog') {
        setFullscreenOpen(true)
      }
    }

    window.addEventListener(REQUEST_ASK_AI_OPEN_EVENT, handleOpenRequest)
    return () => window.removeEventListener(REQUEST_ASK_AI_OPEN_EVENT, handleOpenRequest)
  }, [isCompactAskAi, setCollapsed, state?.enabled, state?.onOpenChange])

  useEffect(() => {
    if (!state?.panelHighlight) return
    state.onOpenChange(true)
    if (isCompactAskAi) {
      setCompactSheetOpen(true)
      return
    }
    setCollapsed(false)
  }, [isCompactAskAi, setCollapsed, state?.panelHighlight, state?.onOpenChange])

  if (!state?.enabled || state.layout !== 'sidebar') {
    return <>{children}</>
  }

  const collapse = () => {
    setFullscreenOpen(false)
    setCollapsed(true)
    state.onOpenChange(false)
  }

  const closeCompactSheet = () => {
    setCompactSheetOpen(false)
    state.onOpenChange(false)
  }

  const toggleFullscreen = () => {
    setFullscreenOpen((prev) => {
      const next = !prev
      if (next) {
        setCollapsed(false)
        state.onOpenChange(true)
      }
      return next
    })
  }

  const showFullscreenToggle = !isCompactAskAi

  const fullscreenDialog = (
    <AskAiFullscreenDialog
      open={fullscreenOpen}
      onOpenChange={(next) => {
        setFullscreenOpen(next)
        if (!next) state.onOpenChange(false)
        else state.onOpenChange(true)
      }}
    />
  )

  if (isCompactAskAi) {
    return (
      <>
        <div className={cn('min-w-0 w-full', className)}>{children}</div>
        <Sheet open={compactSheetOpen} onOpenChange={(next) => {
          if (!next) closeCompactSheet()
          else setCompactSheetOpen(true)
        }}>
          <SheetContent
            side="bottom"
            hideClose
            data-tour="ask-ai-panel"
            onOpenAutoFocus={(event) => event.preventDefault()}
            className={cn(
              'flex h-[100dvh] max-h-[100dvh] w-full flex-col gap-0 overflow-hidden rounded-none border-t border-border-default bg-card p-0 pb-[env(safe-area-inset-bottom,0px)] shadow-[var(--shadow-lg)]',
              state?.panelHighlight &&
                'ring-2 ring-primary/70 shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]',
            )}
          >
            <AskAiSidebarHeader
              onCollapse={closeCompactSheet}
              fullscreenDialog={false}
              onFullscreenToggle={() => {}}
              showFullscreenToggle={false}
              compact
            />
            <AskAiPanelBody />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  if (collapsed) {
    return (
      <>
        <div className={cn('min-w-0 w-full', className)}>{children}</div>
        {fullscreenDialog}
      </>
    )
  }

  return (
    <>
      <div className={cn('min-w-0 w-full', className)}>{children}</div>
      {!fullscreenOpen ? (
        <AskAiDesktopFixedPanel
          chromeTopPx={chromeTopPx}
          onCollapse={collapse}
          fullscreenDialog={fullscreenOpen}
          onFullscreenToggle={toggleFullscreen}
          showFullscreenToggle={showFullscreenToggle}
        />
      ) : null}
      {fullscreenDialog}
    </>
  )
}

/** @deprecated Use AskAiSidebarShell. */
export function AskAiChatPageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <AskAiSidebarShell className={className}>{children}</AskAiSidebarShell>
}

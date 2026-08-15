import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { ArrowLeft, Clock, MessageSquare } from '@/lib/icons'
import type { AskAiAdapter, AskAiSession } from '@/lib/askAiTypes'
import { opportunityDetailFluidGlassSurfaceClassName } from '@/components/detail/DetailHeroPanel'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { askAiIconButtonClassName, askAiIconButtonCompactClassName } from '@/lib/askAiPresentation'
import { keepNestedWheelScrollLocal } from '@/lib/appScrollRoot'
import { cn } from '@/lib/utils'

type HistoryGroup = {
  label: string
  sessions: AskAiSession[]
}

function groupSessionsByDate(sessions: AskAiSession[]): HistoryGroup[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const groups = new Map<string, AskAiSession[]>()

  for (const session of sorted) {
    const date = parseISO(session.created_at)
    let label: string
    if (isToday(date)) label = 'Today'
    else if (isYesterday(date)) label = 'Yesterday'
    else label = format(date, 'MMM d')

    const existing = groups.get(label)
    if (existing) existing.push(session)
    else groups.set(label, [session])
  }

  return Array.from(groups.entries()).map(([label, groupSessions]) => ({
    label,
    sessions: groupSessions,
  }))
}

function sessionMessageCount(session: AskAiSession): number {
  return Array.isArray(session.messages) ? session.messages.length : 0
}

function sessionHasMessages(session: AskAiSession): boolean {
  return sessionMessageCount(session) > 0
}

function relativeTimeLabel(createdAt: string): string {
  const date = parseISO(createdAt)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24 && isToday(date)) {
    return `${diffHours}h ago`
  }
  if (isToday(date)) return format(date, 'h:mm a')
  return format(date, 'MMM d')
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-subtle/70 bg-muted/30 px-3.5 py-3.5"
        >
          <div className="mb-2.5 h-3.5 w-[70%] rounded-md bg-muted" />
          <div className="flex gap-2">
            <div className="h-3 w-16 rounded-md bg-muted/70" />
            <div className="h-3 w-12 rounded-md bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  )
}

type AskAiHistorySharedProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceId: string
  activeSessionId: string | null
  adapter: AskAiAdapter
  onSelectSession: (session: AskAiSession) => void
}

function useAskAiHistorySessions(open: boolean, resourceId: string, adapter: AskAiAdapter) {
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<AskAiSession[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !resourceId) return
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    void (async () => {
      try {
        const res = await adapter.fetchHistory(resourceId)
        if (!cancelled) setSessions(res.sessions ?? [])
      } catch {
        if (!cancelled) {
          setSessions([])
          setFetchError('Could not load past sessions.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, resourceId, adapter])

  return { loading, sessions, fetchError }
}

export function AskAiHistoryToggle({
  open,
  onOpenChange,
  variant = 'default',
  size = 'default',
  showTooltip = true,
}: Pick<AskAiHistorySharedProps, 'open' | 'onOpenChange'> & {
  variant?: 'default' | 'fluid'
  size?: 'default' | 'compact'
  showTooltip?: boolean
}) {
  const label = open ? 'Close session history' : 'Past sessions'
  const iconClass = size === 'compact' ? askAiIconButtonCompactClassName : askAiIconButtonClassName
  const iconSize = size === 'compact' ? 'h-5 w-5' : 'h-4 w-4'

  const button = (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      className={cn(
        variant === 'fluid'
          ? cn(
              'flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              size === 'compact' ? 'h-11 w-11 rounded-xl' : 'h-8 w-8',
              'border-0 text-white/90 hover:bg-white/10 hover:text-white',
              opportunityDetailFluidGlassSurfaceClassName,
              open && 'bg-white/15 text-white',
            )
          : cn(iconClass, open && 'bg-muted text-foreground'),
      )}
      aria-label={label}
      title={label}
    >
      <Clock className={iconSize} aria-hidden />
    </button>
  )

  if (!showTooltip) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function AskAiHistoryPanel({
  open,
  onOpenChange,
  resourceId,
  activeSessionId,
  adapter,
  onSelectSession,
}: AskAiHistorySharedProps) {
  const prefersReducedMotion = useReducedMotion()
  const { loading, sessions, fetchError } = useAskAiHistorySessions(open, resourceId, adapter)
  const validSessions = useMemo(
    () => sessions.filter((s) => sessionHasMessages(s)),
    [sessions],
  )
  const groups = useMemo(() => groupSessionsByDate(validSessions), [validSessions])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="ask-ai-history"
          initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: prefersReducedMotion ? 0 : 16 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.12 }
              : { type: 'spring', stiffness: 420, damping: 36 }
          }
          className="absolute inset-0 z-10 flex flex-col bg-gradient-to-b from-surface via-surface to-muted/20"
          role="dialog"
          aria-label="Past sessions"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle/80 bg-surface/90 px-3 py-3 backdrop-blur-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Back to chat"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Past sessions</h3>
              {!loading && validSessions.length > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  {validSessions.length} conversation{validSessions.length === 1 ? '' : 's'}
                </p>
              ) : null}
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]"
            onWheel={keepNestedWheelScrollLocal}
          >
            {loading ? (
              <HistorySkeleton />
            ) : fetchError ? (
              <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <p className="text-sm font-medium text-foreground">Couldn’t load history</p>
                <p className="text-xs text-muted-foreground">{fetchError}</p>
              </div>
            ) : validSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                  <MessageSquare className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">No sessions yet</p>
                  <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
                    {adapter.emptyHistoryCopy}
                  </p>
                </div>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-2 px-3">
                    {group.sessions.map((session) => {
                      const count = sessionMessageCount(session)
                      const isActive = session.session_id === activeSessionId
                      return (
                        <button
                          key={session.session_id}
                          type="button"
                          onClick={() => onSelectSession(session)}
                          className={cn(
                            'group rounded-xl border px-3.5 py-3 text-left transition-[background-color,border-color,box-shadow] duration-150',
                            isActive
                              ? 'border-primary/35 bg-primary/[0.07] shadow-[0_1px_0_0_hsl(var(--primary)/0.12)]'
                              : 'border-border-subtle/80 bg-card/80 hover:border-border-default hover:bg-muted/40',
                          )}
                        >
                          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                            {adapter.sessionPreview(session)}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 opacity-70" aria-hidden />
                              {count}
                            </span>
                            <span aria-hidden>·</span>
                            <span>{relativeTimeLabel(session.created_at)}</span>
                            {isActive ? (
                              <>
                                <span aria-hidden>·</span>
                                <span className="font-medium text-primary">Open</span>
                              </>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

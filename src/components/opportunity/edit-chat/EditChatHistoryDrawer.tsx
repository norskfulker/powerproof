import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { ArrowLeft, Clock } from '@/lib/icons'
import type { EditChatHistoryResponse, EditChatHistorySession } from '@/lib/opportunityEditChat'
import { cn } from '@/lib/utils'

type HistoryGroup = {
  label: string
  sessions: EditChatHistorySession[]
}

function groupSessionsByDate(sessions: EditChatHistorySession[]): HistoryGroup[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const groups = new Map<string, EditChatHistorySession[]>()

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

function sessionMessageCount(session: EditChatHistorySession): number {
  if (typeof session.message_count === 'number') return session.message_count
  return Array.isArray(session.messages) ? session.messages.length : 0
}

function sessionHasMessages(session: EditChatHistorySession): boolean {
  return sessionMessageCount(session) > 0
}

function getSessionTitle(session: EditChatHistorySession): string {
  if (!Array.isArray(session.messages)) return 'New conversation'
  for (const item of session.messages) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const isUser = o.role === 'user' || o.type === 'user' || o.kind === 'user'
    if (!isUser) continue
    const content = String(o.content ?? o.text ?? o.message ?? '').trim()
    if (content) {
      return content.slice(0, 50) + (content.length > 50 ? '...' : '')
    }
  }
  return 'New conversation'
}

function sessionTimeLabel(createdAt: string): string {
  const date = parseISO(createdAt)
  if (isToday(date)) {
    return format(date, 'h:mm a')
  }
  return format(date, 'MMM d, h:mm a')
}

function relativeTimeLabel(createdAt: string): string {
  const date = parseISO(createdAt)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24 && isToday(date)) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }
  return sessionTimeLabel(createdAt)
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-border-subtle bg-muted/40 px-3 py-3"
        >
          <div className="mb-2 h-3.5 w-36 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted/80" />
        </div>
      ))}
    </div>
  )
}

type EditChatHistorySharedProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Resource id passed to `fetchHistory` (opportunity id, market test id, etc.). */
  resourceId: string
  /** @deprecated Prefer `resourceId`. */
  userOpportunityId?: string
  activeSessionId: string | null
  onSelectSession: (session: EditChatHistorySession) => void
  fetchHistory: (resourceId: string) => Promise<EditChatHistoryResponse>
}

function useEditChatHistorySessions(
  open: boolean,
  resourceId: string,
  fetchHistory: (resourceId: string) => Promise<EditChatHistoryResponse>,
) {
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<EditChatHistorySession[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !resourceId) return
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    void (async () => {
      try {
        const res = await fetchHistory(resourceId)
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
  }, [fetchHistory, open, resourceId])

  return { loading, sessions, fetchError }
}

export function EditChatHistoryToggle({
  open,
  onOpenChange,
}: Pick<EditChatHistorySharedProps, 'open' | 'onOpenChange'>) {
  return (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        open && 'bg-muted text-foreground',
      )}
      aria-label={open ? 'Close session history' : 'Past sessions'}
    >
      <Clock className="h-4 w-4" aria-hidden />
    </button>
  )
}

export function EditChatHistoryPanel({
  open,
  onOpenChange,
  resourceId,
  userOpportunityId,
  activeSessionId,
  onSelectSession,
  fetchHistory,
}: EditChatHistorySharedProps) {
  const prefersReducedMotion = useReducedMotion()
  const resolvedResourceId = resourceId || userOpportunityId || ''
  const { loading, sessions, fetchError } = useEditChatHistorySessions(
    open,
    resolvedResourceId,
    fetchHistory,
  )
  const validSessions = useMemo(
    () => sessions.filter((s) => sessionHasMessages(s)),
    [sessions],
  )
  const groups = useMemo(() => groupSessionsByDate(validSessions), [validSessions])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="edit-chat-history"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={
            prefersReducedMotion
              ? { duration: 0.15 }
              : { type: 'spring', stiffness: 400, damping: 40 }
          }
          className="absolute inset-0 z-10 flex flex-col bg-surface"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-3 py-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <h3 className="text-sm font-semibold text-foreground">Past Sessions</h3>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {loading ? (
              <HistorySkeleton />
            ) : fetchError ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">{fetchError}</p>
            ) : validSessions.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No past sessions yet. Start editing to create one.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="px-4 pb-1.5 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-1.5 px-3">
                    {group.sessions.map((session) => {
                      const count = sessionMessageCount(session)
                      const isActive = session.session_id === activeSessionId
                      return (
                        <button
                          key={session.session_id}
                          type="button"
                          onClick={() => onSelectSession(session)}
                          className={cn(
                            'rounded-lg border px-3 py-2.5 text-left transition-colors',
                            isActive
                              ? 'border-primary/40 bg-primary/[0.06]'
                              : 'border-border-subtle bg-background hover:bg-muted/50',
                          )}
                        >
                          <p className="line-clamp-2 text-sm font-medium text-foreground">
                            {getSessionTitle(session)}
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              · {count} message{count === 1 ? '' : 's'}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {relativeTimeLabel(session.created_at)}
                          </p>
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

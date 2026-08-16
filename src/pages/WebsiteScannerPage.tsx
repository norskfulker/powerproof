import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Seo } from '@/components/Seo'
import {
  DiscoverHeroBoxLoadingSkeleton,
  DiscoverHeroBoxStack,
  DiscoverHeroWorkspaceBox,
  DiscoverHeroWorkspaceTable,
  SCAN_WORKSPACE_METRIC_COLUMNS,
  useDiscoverHeroWorkspaceLayoutView,
} from '@/components/discover/DiscoverHeroBox'
import { DiscoverHeroRoomInputShell } from '@/components/discover/DiscoverHeroRoomShell'
import { DiscoverHeroSection } from '@/components/discover/DiscoverHeroSection'
import { DiscoverHeroViewportShell } from '@/components/discover/DiscoverHeroViewportShell'
import { DiscoverHeroWorkspaceItem } from '@/components/discover/DiscoverHeroWorkspaceItem'
import {
  DiscoverHeroWorkspaceEmptyState,
  DiscoverHeroWorkspaceSectionTitle,
} from '@/components/discover/DiscoverHeroWorkspaceSectionTitle'
import {
  discoverHeroContentMaxWidthClass,
  discoverHeroFluidToWorkspaceStackClassName,
  discoverHeroModeWorkspaceBoxBodyClassName,
  discoverHeroSectionSlotScrollChainClassName,
  discoverHeroStackClassName,
} from '@/components/discover/discoverHeroTokens'
import { HeroInput } from '@/components/discover/HeroInput'
import { cardTopSlotRowClass, cardTopSlotTitleClass } from '@/components/ui/card'
import { UsageBadge } from '@/components/billing/UsageBadge'
import { RoomCardActions } from '@/components/shared/RoomCardActions'
import { SiteFavicon } from '@/components/shared/SiteFavicon'
import { scanWorkspaceMetrics } from '@/lib/workspaceItemMetrics'
import { hostnameFromLooseUrl } from '@/lib/siteFavicon'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import { edgeApiErrorFromPayload } from '@/lib/edgeApiError'
import {
  AlertCircle,
  Building2,
  ChevronDown,
  Clock,
  History,
  Layers,
  Loader2,
  Radar,
  Scan2Line,
  Search,
  TrendingUp,
  Zap,
} from '@/lib/icons'
import {
  recordScannerWorkspaceRecent,
  seedScannerWorkspaceRecentsIfEmpty,
} from '@/lib/composerSearchRecents'
import {
  deleteScanHistory,
  deleteScanHistoryMany,
  listScanHistory,
  scanWebsite,
} from '@/lib/websiteScannerApi'
import type { WebsiteScanHistorySummary } from '@/lib/websiteScannerApi'
import {
  SCANNER_URL_MAX_LENGTH,
  SCANNER_URL_PLACEHOLDER,
  scannerInputModerationError,
  validateScannerUrlInput,
} from '@/lib/websiteScannerConfig'
import { SCANNER_DASHBOARD_PATH, scanDetailPath } from '@/lib/sidebarWorkspaceNav'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import { openSubscriptionPricingDialog } from '@/store/filterStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

type Phase = 'idle' | 'scanning' | 'error'

type SiteScanGroup = {
  key: string
  latest: WebsiteScanHistorySummary
  versions: WebsiteScanHistorySummary[]
}

const SCANNER_MAX_LENGTH = SCANNER_URL_MAX_LENGTH
export function WebsiteScannerPage() {
  // Stable JSX node — useRegisterAppChromeHeader depends on identity, so a fresh
  // element every render would re-run the effect and cause an update loop.
  const headerIcon = useMemo(() => <Scan2Line aria-hidden />, [])
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useSubscriptionStatus()

  const endActions = useMemo(
    () => (user?.id ? <UsageBadge className="w-auto" /> : null),
    [user?.id],
  )

  useRegisterAppChromeHeader({
    title: null,
    icon: headerIcon,
    endActions,
  })

  const [forceFresh, setForceFresh] = useState(false)
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<WebsiteScanHistorySummary[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null)
  const [deleteSingle, setDeleteSingle] = useState<WebsiteScanHistorySummary | null>(null)
  const [deleteGroup, setDeleteGroup] = useState<SiteScanGroup | null>(null)
  const [deleteSelectedIds, setDeleteSelectedIds] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  const showFreePlanBadge =
    Boolean(user) && !subscriptionLoading && !subscriptionStatus?.success

  const refreshHistory = useCallback(async () => {
    if (!user) {
      setHistory([])
      setHistoryLoaded(true)
      return
    }
    const rows = await listScanHistory(user.id, 30)
    setHistory(rows)
    setHistoryLoaded(true)
    seedScannerWorkspaceRecentsIfEmpty(
      rows.map((row) => ({
        query: row.site_title?.trim() || siteHostBadge(row.normalized_url || row.url),
        scanId: row.id,
      })),
    )
  }, [user])

  // Load history once auth resolves.
  useEffect(() => {
    if (!user) {
      setHistory([])
      setHistoryLoaded(true)
      return
    }
    if (historyLoaded) return
    void refreshHistory()
  }, [user, historyLoaded, refreshHistory])

  const onScan = useCallback(async (forceFresh = false) => {
    setInputError(null)
    setError(null)

    const parsed = validateScannerUrlInput(input)
    if (parsed.ok === false) {
      setInputError(parsed.message)
      return
    }

    setPhase('scanning')
    let navigated = false
    try {
      const result = await scanWebsite(parsed.url, {
        forceFresh,
        onStarted: (partial) => {
          const detailId = partial.id?.trim()
          if (!detailId || navigated) return
          navigated = true
          recordScannerWorkspaceRecent({
            query:
              partial.seo?.title?.trim() ||
              siteHostBadge(partial.normalizedUrl || partial.url || parsed.url),
            scanId: detailId,
          })
          navigate(scanDetailPath(detailId), {
            state: discoverHeroNavState(location.pathname, location.search),
          })
        },
      })
      const detailId = result.id?.trim()
      if (detailId && !navigated) {
        recordScannerWorkspaceRecent({
          query:
            result.seo?.title?.trim() ||
            siteHostBadge(result.normalizedUrl || result.url || parsed.url),
          scanId: detailId,
        })
        navigate(scanDetailPath(detailId), {
          state: discoverHeroNavState(location.pathname, location.search),
        })
        return
      }
      if (!navigated && user) {
        void refreshHistory()
      }
      setPhase('idle')
    } catch (err) {
      if (navigated) return
      const edge = edgeApiErrorFromPayload(undefined, err)
      setError(edge?.displayMessage ?? (err instanceof Error ? err.message : 'Scan failed.'))
      setPhase('error')
    }
  }, [input, user, refreshHistory, navigate, location.pathname, location.search])

  const onOpenHistory = useCallback(
    (id: string) => {
      const row = history.find((item) => item.id === id)
      if (row) {
        recordScannerWorkspaceRecent({
          query: row.site_title?.trim() || siteHostBadge(row.normalized_url || row.url),
          scanId: row.id,
        })
      }
      setLoadingHistoryId(id)
      navigate(scanDetailPath(id), {
        state: discoverHeroNavState(location.pathname, location.search),
      })
    },
    [history, navigate, location.pathname, location.search],
  )

  const requestDeleteSingle = useCallback((row: WebsiteScanHistorySummary) => {
    setDeleteGroup(null)
    setDeleteSingle(row)
  }, [])

  const requestDeleteGroup = useCallback((group: SiteScanGroup) => {
    if (group.versions.length <= 1) {
      setDeleteGroup(null)
      setDeleteSingle(group.latest)
      return
    }
    setDeleteSingle(null)
    setDeleteGroup(group)
    setDeleteSelectedIds(group.versions.map((v) => v.id))
  }, [])

  const confirmDeleteSingle = useCallback(async () => {
    if (!user || !deleteSingle) return
    setDeleting(true)
    try {
      const removed = await deleteScanHistory(deleteSingle.id, user.id)
      if (removed) {
        setHistory((rows) => rows.filter((row) => row.id !== deleteSingle.id))
      }
      setDeleteSingle(null)
    } finally {
      setDeleting(false)
    }
  }, [user, deleteSingle])

  const confirmDeleteGroup = useCallback(async () => {
    if (!user || !deleteGroup || deleteSelectedIds.length === 0) return
    setDeleting(true)
    try {
      const removed = await deleteScanHistoryMany(deleteSelectedIds, user.id)
      if (removed) {
        const idSet = new Set(deleteSelectedIds)
        setHistory((rows) => rows.filter((row) => !idSet.has(row.id)))
      }
      setDeleteGroup(null)
      setDeleteSelectedIds([])
    } finally {
      setDeleting(false)
    }
  }, [user, deleteGroup, deleteSelectedIds])

  const runScan = useCallback(() => {
    if (phase === 'scanning') return
    void onScan(forceFresh)
  }, [onScan, phase, forceFresh])

  const historyBox = user ? (
    <DiscoverHeroWorkspaceBox
      visible
      ariaLabel="Recent scans"
      bodyClassName={discoverHeroModeWorkspaceBoxBodyClassName}
    >
      <DiscoverHeroWorkspaceSectionTitle
        label="Recent scans"
        icon={History}
        accent="primary"
        count={historyLoaded ? groupScansBySite(history).length : null}
        className="mb-3"
      />
      <RecentScansList
        rows={history}
        loaded={historyLoaded}
        loadingId={loadingHistoryId}
        onOpen={onOpenHistory}
        onDeleteSingle={requestDeleteSingle}
        onDeleteGroup={requestDeleteGroup}
      />
    </DiscoverHeroWorkspaceBox>
  ) : null

  const scanErrorAlert =
    phase === 'error' && error ? (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-[13px] text-rose-700"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{error}</span>
      </div>
    ) : null

  const deleteDialogs = (
    <>
      <ConfirmDialog
        open={Boolean(deleteSingle)}
        title="Delete this scan?"
        description={
          deleteSingle
            ? `Remove the scan of ${siteHostBadge(deleteSingle.normalized_url || deleteSingle.url)} from ${formatHistoryTimestamp(deleteSingle.created_at)}. This can’t be undone.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={() => void confirmDeleteSingle()}
        onCancel={() => {
          if (!deleting) setDeleteSingle(null)
        }}
      />
      <Dialog
        open={Boolean(deleteGroup)}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteGroup(null)
            setDeleteSelectedIds([])
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete scan versions?</DialogTitle>
            <DialogDescription>
              {deleteGroup
                ? `Choose which versions of ${siteHostBadge(deleteGroup.key)} to delete. This can’t be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {deleteGroup ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-[12px] font-semibold text-primary hover:underline"
                  onClick={() =>
                    setDeleteSelectedIds(deleteGroup.versions.map((v) => v.id))
                  }
                >
                  Select all
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  type="button"
                  className="text-[12px] font-semibold text-muted-foreground hover:text-foreground"
                  onClick={() => setDeleteSelectedIds([])}
                >
                  Clear
                </button>
              </div>
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {deleteGroup.versions.map((version, index) => {
                  const checked = deleteSelectedIds.includes(version.id)
                  const isLatest = index === 0
                  return (
                    <li key={version.id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border-subtle/70 bg-muted/20 px-2.5 py-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            setDeleteSelectedIds((ids) => {
                              if (next === true) {
                                return ids.includes(version.id)
                                  ? ids
                                  : [...ids, version.id]
                              }
                              return ids.filter((id) => id !== version.id)
                            })
                          }}
                          disabled={deleting}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 flex-1 space-y-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="gray" size="sm">
                              {isLatest ? 'Latest' : `v${deleteGroup.versions.length - index}`}
                            </Badge>
                            <Badge variant="gray" size="sm">
                              <Clock className="h-3 w-3 shrink-0" aria-hidden />
                              {formatHistoryTimestamp(version.created_at)}
                            </Badge>
                          </span>
                          <span className="flex flex-wrap gap-1">
                            <ScanScoreBadges row={version} />
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={deleting}
              onClick={() => {
                setDeleteGroup(null)
                setDeleteSelectedIds([])
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              loading={deleting}
              disabled={deleting || deleteSelectedIds.length === 0}
              onClick={() => void confirmDeleteGroup()}
            >
              Delete {deleteSelectedIds.length || ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )

  const workspace =
    (
      <>
        {phase === 'scanning' ? <ScanningHint /> : null}
        {scanErrorAlert}
        {historyBox}
      </>
    )

  const workspaceVisible =
    phase === 'scanning' || phase === 'error' || Boolean(historyBox)

  const moderationError = useMemo(() => scannerInputModerationError(input), [input])
  const inputHostname = useMemo(() => hostnameFromLooseUrl(input), [input])

  const composerStack = (
    <DiscoverHeroBoxStack className="w-full shrink-0 overflow-visible">
      <HeroInput
        value={input}
        onChange={(next) => {
          setInput(next)
          if (inputError) setInputError(null)
        }}
        onSubmit={runScan}
        placeholder={SCANNER_URL_PLACEHOLDER}
        maxLength={SCANNER_MAX_LENGTH}
        disabled={phase === 'scanning'}
        inputError={inputError}
        moderationError={moderationError}
        loading={phase === 'scanning'}
        inputMode="url"
        autoComplete="url"
        inputAriaLabel="Website URL"
        submitLabel="Get Insights"
        submitAriaLabel="Get Insights"
        submitTitle="Get Insights"
        leadingSlot={
          inputHostname ? (
            <SiteFavicon hostname={inputHostname} size={18} />
          ) : (
            <Scan2Line className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />
          )
        }
        detailsSlot={
          <label
            className={cn(
              'ml-auto inline-flex shrink-0 items-center gap-1.5',
              'px-1 text-[12px] font-medium text-muted-foreground',
              phase === 'scanning' && 'opacity-50',
            )}
            title="When on, re-run Firecrawl and ignore the 24h cache"
          >
            <Switch
              checked={forceFresh}
              onCheckedChange={setForceFresh}
              disabled={phase === 'scanning'}
              aria-label="Fresh crawl"
            />
            <span className="whitespace-nowrap">Fresh Crawl</span>
          </label>
        }
      />
    </DiscoverHeroBoxStack>
  )

  return (
    <>
      <Seo
        title="Scanner | PowerProof"
        description="Audit any website for SEO, business, competitor, and roadmap signals."
        canonicalPath={SCANNER_DASHBOARD_PATH}
        noIndex
      />
      {deleteDialogs}

      <DiscoverHeroViewportShell>
        {showFreePlanBadge ? (
          <div className="flex shrink-0 justify-center px-3 pt-3 md:pt-4">
            <button
              type="button"
              onClick={openSubscriptionPricingDialog}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-bg-hover focus-visible:outline-none"
              aria-label="You're on the Free plan. Choose a plan."
            >
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
              Free plan
            </button>
          </div>
        ) : null}
        <DiscoverHeroSection
          id="website-scanner"
          ariaLabel="Website scanner"
          centered={false}
          align="left"
          className={discoverHeroSectionSlotScrollChainClassName}
        >
          {/* Same room content shell as DiscoverHeroLiveSearch (research). */}
          <div
            className={cn(
              'relative min-w-0 w-full',
              discoverHeroStackClassName,
              discoverHeroContentMaxWidthClass,
              'mx-auto',
              'min-h-0 w-full flex-col items-stretch gap-4 md:gap-5 lg:gap-6',
            )}
          >
            <div
              className={cn(
                discoverHeroFluidToWorkspaceStackClassName,
                'min-w-0 w-full items-stretch',
                'max-md:min-h-0 max-md:flex-1 max-md:flex-col',
                'p-2 md:p-6',
              )}
            >
              <DiscoverHeroRoomInputShell
                composer={composerStack}
                workspace={workspace}
                chipsVisible={false}
                workspaceVisible={workspaceVisible}
                workspaceStackClassName="min-h-0 flex-1 flex-col"
                title="Scanner"
              />
            </div>
          </div>
        </DiscoverHeroSection>
      </DiscoverHeroViewportShell>
    </>
  )
}

/* ─── Empty / scanning states ────────────────────────────────────────────── */

function ScanningHint() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border-subtle/70 bg-card px-4 py-10 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-semibold text-foreground">Scanning the website…</p>
      <p className="max-w-md text-[13px] text-muted-foreground">
        Crawling pages, parsing on-page signals, and building a structured report. This may
        take a few seconds for larger sites.
      </p>
    </div>
  )
}

/* ─── Recent scans ───────────────────────────────────────────────────────── */

function formatHistoryTimestamp(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return ''
  const now = Date.now()
  const diff = now - then
  const min = 60 * 1000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return 'just now'
  if (diff < hour) return `${Math.floor(diff / min)} min ago`
  if (diff < day) return `${Math.floor(diff / hour)} h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)} d ago`
  return new Date(iso).toLocaleDateString()
}

function groupScansBySite(rows: WebsiteScanHistorySummary[]): SiteScanGroup[] {
  const map = new Map<string, WebsiteScanHistorySummary[]>()
  for (const row of rows) {
    const key = row.normalized_url?.trim() || row.url
    const list = map.get(key)
    if (list) list.push(row)
    else map.set(key, [row])
  }
  const groups: SiteScanGroup[] = []
  for (const [key, list] of map) {
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    groups.push({
      key,
      latest: sorted[0]!,
      versions: sorted,
    })
  }
  groups.sort(
    (a, b) =>
      new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime(),
  )
  return groups
}

function siteHostBadge(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function externalSiteHref(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return '#'
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function scoreBadgeVariant(score: number): 'green' | 'amber' | 'red' | 'gray' {
  if (score >= 75) return 'green'
  if (score >= 55) return 'amber'
  if (score > 0) return 'red'
  return 'gray'
}

function ScanScoreBadges({
  row,
  includeSite = false,
  includeMeta = false,
}: {
  row: WebsiteScanHistorySummary
  includeSite?: boolean
  includeMeta?: boolean
}) {
  const siteUrl = row.normalized_url || row.url
  return (
    <>
      {includeSite ? (
        <a
          href={siteUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex max-w-full min-w-0"
          title={siteUrl}
          onClick={(event) => event.stopPropagation()}
        >
          <Badge variant="blue" size="sm" className="max-w-full hover:underline">
            <SiteFavicon hostname={hostnameFromLooseUrl(siteUrl)} size={12} />
            <span className="truncate">{siteHostBadge(siteUrl)}</span>
          </Badge>
        </a>
      ) : null}
      <Badge variant={scoreBadgeVariant(row.seo_score)} size="sm">
        <Search className="h-3 w-3 shrink-0" aria-hidden />
        SEO {row.seo_score}
      </Badge>
      <Badge variant={scoreBadgeVariant(row.business_score)} size="sm">
        <Building2 className="h-3 w-3 shrink-0" aria-hidden />
        Biz {row.business_score}
      </Badge>
      <Badge variant={scoreBadgeVariant(row.competitor_score)} size="sm">
        <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
        Comp {row.competitor_score}
      </Badge>
      <Badge variant="gray" size="sm">
        <Layers className="h-3 w-3 shrink-0" aria-hidden />
        {row.page_count} pages
      </Badge>
      {includeMeta ? (
        <Badge variant="gray" size="sm">
          <Clock className="h-3 w-3 shrink-0" aria-hidden />
          {formatDuration(row.duration_ms)} · {formatHistoryTimestamp(row.created_at)}
        </Badge>
      ) : null}
    </>
  )
}

function ScanWorkspaceItem({
  group,
  loadingId,
  versionsOpen,
  onToggleVersions,
  onOpen,
  onDeleteSingle,
  onDeleteGroup,
}: {
  group: SiteScanGroup
  loadingId: string | null
  versionsOpen: boolean
  onToggleVersions: () => void
  onOpen: (id: string) => void
  onDeleteSingle: (row: WebsiteScanHistorySummary) => void
  onDeleteGroup: (group: SiteScanGroup) => void
}) {
  const { layout } = useDiscoverHeroWorkspaceLayoutView()
  const row = group.latest
  const isLoading = loadingId === row.id
  const title = row.site_title?.trim() || siteHostBadge(row.normalized_url || row.url)
  const isCached = row.crawl_source === 'cache'
  const hasVersions = group.versions.length > 1
  const olderVersions = group.versions.slice(1)
  const metrics = scanWorkspaceMetrics(row)
  const siteUrl = row.normalized_url || row.url
  const siteLabel = siteHostBadge(siteUrl)
  const pagesValue = Number.isFinite(Number(row.page_count))
    ? String(Math.round(Number(row.page_count)))
    : '—'
  const pagesMeta = (
    <span className="text-[13px] font-semibold tabular-nums text-foreground">{pagesValue}</span>
  )
  const siteTopSlot = (
    <div className={cn(cardTopSlotRowClass, 'justify-between gap-2')}>
      <span className={cn(cardTopSlotTitleClass, 'text-muted-foreground')}>Site</span>
      <a
        href={externalSiteHref(siteUrl)}
        target="_blank"
        rel="noreferrer noopener"
        className="min-w-0 truncate text-[13px] font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
        title={siteUrl}
        onClick={(event) => event.stopPropagation()}
      >
        {siteLabel}
      </a>
    </div>
  )

  return (
    <DiscoverHeroWorkspaceItem
      title={title}
      leading={
        isLoading ? undefined : (
          <SiteFavicon
            hostname={hostnameFromLooseUrl(row.normalized_url || row.url)}
            size={20}
          />
        )
      }
      iconOverride={isLoading ? Loader2 : Radar}
      iconTone={isLoading ? 'amber' : 'primary'}
      metrics={metrics}
      topSlot={siteTopSlot}
      metaColumn={pagesMeta}
      onActivate={loadingId ? undefined : () => onOpen(row.id)}
      disabled={Boolean(loadingId)}
      className={cn(isLoading && 'ring-2 ring-primary/25')}
      progress={
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {isCached ? (
              <Badge variant="amber" size="sm">
                <Zap className="h-3 w-3 shrink-0" aria-hidden />
                Cached
              </Badge>
            ) : null}
            <Badge variant="gray" size="sm">
              <Layers className="h-3 w-3 shrink-0" aria-hidden />
              {row.page_count} pages
            </Badge>
            <Badge variant="gray" size="sm">
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              {formatDuration(row.duration_ms)} · {formatHistoryTimestamp(row.created_at)}
            </Badge>
            {hasVersions ? (
              <button
                type="button"
                className="inline-flex"
                aria-expanded={versionsOpen}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleVersions()
                }}
              >
                <Badge variant="gray" size="sm" className="cursor-pointer hover:opacity-90">
                  <History className="h-3 w-3 shrink-0" aria-hidden />
                  Versions ({group.versions.length})
                  <ChevronDown
                    className={cn('h-3 w-3 transition-transform', versionsOpen && 'rotate-180')}
                    aria-hidden
                  />
                </Badge>
              </button>
            ) : null}
          </div>
          {hasVersions && versionsOpen ? (
            <div
              className="mt-2 space-y-1.5 border-t border-border-subtle/60 pt-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {olderVersions.map((version, index) => {
                const versionLoading = loadingId === version.id
                return (
                  <div
                    key={version.id}
                    className={cn(
                      'flex flex-wrap items-center gap-1.5 rounded-md border border-border-subtle/60 bg-muted/20 px-2.5 py-2',
                      versionLoading && 'ring-1 ring-primary/25',
                    )}
                  >
                    <Badge variant="gray" size="sm">
                      v{group.versions.length - index - 1}
                    </Badge>
                    <ScanScoreBadges row={version} />
                    <Badge variant="gray" size="sm">
                      <Clock className="h-3 w-3 shrink-0" aria-hidden />
                      {formatHistoryTimestamp(version.created_at)}
                    </Badge>
                    <button
                      type="button"
                      className="ml-auto text-[12px] font-semibold text-primary hover:underline disabled:opacity-50"
                      disabled={Boolean(loadingId)}
                      onClick={() => onOpen(version.id)}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                      disabled={Boolean(loadingId)}
                      onClick={() => onDeleteSingle(version)}
                    >
                      Delete
                    </button>
                  </div>
                )
              })}
            </div>
          ) : null}
        </>
      }
      actions={
        <RoomCardActions
          className="w-auto pt-0"
          compact={layout === 'table'}
          reRunLabel="Open"
          reRunVariant="primary"
          requireReRunConfirm={false}
          disabled={Boolean(loadingId)}
          onReRun={() => onOpen(row.id)}
          onDelete={() => onDeleteGroup(group)}
        />
      }
    />
  )
}

function RecentScansList({
  rows,
  loaded,
  loadingId,
  onOpen,
  onDeleteSingle,
  onDeleteGroup,
}: {
  rows: WebsiteScanHistorySummary[]
  loaded: boolean
  loadingId: string | null
  onOpen: (id: string) => void
  onDeleteSingle: (row: WebsiteScanHistorySummary) => void
  onDeleteGroup: (group: SiteScanGroup) => void
}) {
  const [openVersionsKey, setOpenVersionsKey] = useState<string | null>(null)

  if (!loaded) {
    return (
      <DiscoverHeroBoxLoadingSkeleton
        count={3}
        columns="metrics"
        metricColumns={SCAN_WORKSPACE_METRIC_COLUMNS}
      />
    )
  }

  const groups = groupScansBySite(rows)
  if (groups.length === 0) {
    return (
      <DiscoverHeroWorkspaceEmptyState
        icon={Radar}
        title="No scans yet"
        description="Drop in a URL above to run your first audit."
        accent="primary"
      />
    )
  }

  return (
    <DiscoverHeroWorkspaceTable
      ariaLabel="Recent scans"
      columns="metrics"
      metricColumns={SCAN_WORKSPACE_METRIC_COLUMNS}
    >
      {groups.map((group) => (
        <ScanWorkspaceItem
          key={group.key}
          group={group}
          loadingId={loadingId}
          versionsOpen={openVersionsKey === group.key}
          onToggleVersions={() =>
            setOpenVersionsKey((current) => (current === group.key ? null : group.key))
          }
          onOpen={onOpen}
          onDeleteSingle={onDeleteSingle}
          onDeleteGroup={onDeleteGroup}
        />
      ))}
    </DiscoverHeroWorkspaceTable>
  )
}

export default WebsiteScannerPage

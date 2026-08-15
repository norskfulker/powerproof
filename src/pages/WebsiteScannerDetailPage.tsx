import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { Seo } from '@/components/Seo'
import { DiscoverWide } from '@/components/page-shells'
import { WebsiteScanReportView } from '@/components/scanner/WebsiteScanReportView'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import { useAuth } from '@/contexts/AuthContext'
import { landingSignInTo } from '@/lib/authLanding'
import { AlertCircle, Loader2, Radar } from '@/lib/icons'
import { discoverHeroNavState } from '@/lib/roomWorkspaceHeader'
import { scanDetailPath, SCANNER_DASHBOARD_PATH } from '@/lib/sidebarWorkspaceNav'
import { loadScanHistory, type WebsiteScanReport } from '@/lib/websiteScannerApi'
import { opportunityDetailPageGridClass } from '@/pages/OpportunityDetailPage'
import { cn } from '@/lib/utils'

const POLL_MS = 1500
const POLL_MAX_MS = 8 * 60 * 1000

export function WebsiteScannerDetailPage() {
  const { scanId } = useParams<{ scanId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const headerIcon = useMemo(() => <Radar aria-hidden />, [])
  const pollStartedAt = useRef<number | null>(null)

  const [report, setReport] = useState<WebsiteScanReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const title =
    report?.meta.title?.trim() ||
    report?.normalizedUrl ||
    'Scan report'

  const chromeBadges = useMemo((): { primary: string; ghost: string } | null => {
    if (!report) return null
    const running = report.scanStatus === 'running'
    return {
      primary: running ? 'Scanning…' : `${report.crawl.totalPages} pages`,
      ghost: report.normalizedUrl,
    }
  }, [report])

  useRegisterAppChromeHeader({
    title,
    icon: headerIcon,
    badges: chromeBadges,
  })

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!scanId || !user?.id) return null
    if (!opts?.quiet) {
      setLoading(true)
      setError(null)
    }
    try {
      const stored = await loadScanHistory(scanId, user.id)
      if (!stored) {
        setReport(null)
        setError('That scan could not be found. It may have been removed.')
        return null
      }
      setReport(stored)
      setError(null)
      return stored
    } finally {
      if (!opts?.quiet) setLoading(false)
    }
  }, [scanId, user?.id])

  useEffect(() => {
    if (!scanId) {
      setLoading(false)
      setError('Scan not found')
      return
    }
    if (!user?.id) {
      navigate(landingSignInTo(scanDetailPath(scanId)), { replace: true })
      return
    }
    pollStartedAt.current = null
    void load()
  }, [scanId, user?.id, navigate, load])

  // Poll while the scan is still running so sections fill in live.
  useEffect(() => {
    if (!report || report.scanStatus !== 'running' || !scanId || !user?.id) return

    if (pollStartedAt.current == null) pollStartedAt.current = Date.now()

    const timer = window.setInterval(() => {
      const started = pollStartedAt.current ?? Date.now()
      if (Date.now() - started > POLL_MAX_MS) {
        window.clearInterval(timer)
        setReport((current) =>
          current
            ? { ...current, scanStatus: 'error', pendingSections: [] }
            : current,
        )
        return
      }
      void load({ quiet: true })
    }, POLL_MS)

    return () => window.clearInterval(timer)
  }, [report?.scanStatus, scanId, user?.id, load])

  return (
    <>
      <Seo
        title={`${title} | Scanner | PowerProof`}
        description="Website scan report — SEO, business, competitor, and roadmap signals."
        canonicalPath={scanId ? scanDetailPath(scanId) : SCANNER_DASHBOARD_PATH}
        noIndex
      />

      <div className="w-full">
        <DiscoverWide>
          {loading && !report ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              <p className="text-sm font-medium text-foreground">Loading scan report…</p>
            </div>
          ) : error || !report ? (
            <div
              role="alert"
              className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-8 text-center"
            >
              <AlertCircle className="h-6 w-6 text-rose-600" aria-hidden />
              <p className="text-sm font-semibold text-foreground">{error ?? 'Scan not found'}</p>
              <button
                type="button"
                className="text-[13px] font-semibold text-primary hover:underline"
                onClick={() =>
                  navigate(SCANNER_DASHBOARD_PATH, {
                    state: discoverHeroNavState(location.pathname, location.search),
                  })
                }
              >
                Back to Scanner
              </button>
            </div>
          ) : (
            <div className={cn(opportunityDetailPageGridClass(), 'pb-8 font-sans')}>
              <WebsiteScanReportView report={report} />
            </div>
          )}
        </DiscoverWide>
      </div>
    </>
  )
}

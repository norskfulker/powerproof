import { roomPathForBrowse, roomPathForMode } from '@/lib/discoverHeroRoutes'
import { isScannerDetailPath, SCANNER_DASHBOARD_PATH } from '@/lib/sidebarWorkspaceNav'

const RESEARCH_HOME = roomPathForMode('research')

export function isInvestorDetailPath(pathname: string): boolean {
  return /^\/investors\/[^/]+$/.test(pathname)
}

export function isOpportunityDetailPath(pathname: string): boolean {
  return (
    /^\/o\/[^/]+$/.test(pathname) ||
    pathname.startsWith('/opportunity/') ||
    /^\/opportunities\/[^/]+$/.test(pathname) ||
    pathname.startsWith('/my-research/') ||
    pathname.startsWith('/my-opportunities/') ||
    pathname.startsWith('/market-test/') ||
    pathname === '/my-market-test' ||
    pathname.startsWith('/roadmap/') ||
    /^\/playbook\/[^/]+$/.test(pathname)
  )
}

export function isMarketTestPath(pathname: string): boolean {
  return pathname.startsWith('/market-test/') || pathname === '/my-market-test'
}

/** App chrome back — opportunity detail uses an in-page back bar instead. */
export function shouldShowAppPageBack(pathname: string): boolean {
  if (pathname === '/room' || pathname.startsWith('/room')) return false
  if (pathname === '/dashboard') return false
  if (isOpportunityDetailPath(pathname)) return false
  if (isInvestorDetailPath(pathname)) return false
  if (pathname.startsWith('/workspace/')) return true
  if (pathname.startsWith('/playbook/') && !/^\/playbook\/[^/]+$/.test(pathname)) return true
  return false
}

export function getAppPageBackFallback(pathname: string): string {
  if (isInvestorDetailPath(pathname)) return roomPathForBrowse('investors')
  if (pathname.startsWith('/my-research/')) return RESEARCH_HOME
  if (pathname.startsWith('/my-opportunities/')) return RESEARCH_HOME
  if (pathname.startsWith('/market-test/') || pathname === '/my-market-test') {
    return roomPathForMode('market-test')
  }
  if (pathname.startsWith('/opportunity/') || /^\/opportunities\/[^/]+$/.test(pathname) || /^\/o\/[^/]+$/.test(pathname)) {
    return roomPathForMode('search')
  }
  if (pathname.startsWith('/workspace/')) return RESEARCH_HOME
  if (pathname.startsWith('/playbook/')) return roomPathForMode('war-room')
  if (isScannerDetailPath(pathname)) return SCANNER_DASHBOARD_PATH
  return RESEARCH_HOME
}

export function getOpportunityDetailBackLabel(pathname: string): string {
  if (pathname.startsWith('/my-research/')) return 'Back to Research'
  if (pathname.startsWith('/my-opportunities/')) return 'Back to Research'
  if (pathname.startsWith('/market-test/') || pathname === '/my-market-test') {
    return 'Back to Market Test'
  }
  return 'Back to Opportunities'
}

export function resolveAppPageBackHref(pathname: string, state: unknown): string {
  const from = (state as { from?: string } | null)?.from
  if (typeof from === 'string' && from.startsWith('/') && from !== pathname) {
    return from
  }
  return getAppPageBackFallback(pathname)
}

import type { SeoAuditFinding } from '@/lib/websiteScannerApi'
import type { PreviewSaturationVerdict } from '@/types/previewResearch'

export type PreviewWebsiteScanFinding = SeoAuditFinding

/** Title + severity only — the full-audit `detail` is withheld until signup. */
export type PreviewWebsiteScanLockedFinding = {
  title: string
  severity: SeoAuditFinding['severity']
}

export type PreviewWebsiteScanSeo = {
  score: number
  title: string | null
  description: string | null
  hasViewport: boolean
  hasFavicon: boolean
  h1Count: number
  imagesTotal: number
  imagesMissingAlt: number
  hasOpenGraph: boolean
  hasJsonLd: boolean
  wordCount: number
  topFindings: PreviewWebsiteScanFinding[]
  lockedFindingsCount: number
  lockedFindingsPreview: PreviewWebsiteScanLockedFinding[]
}

export type PreviewWebsiteScanCompetitor = {
  name: string
  whyThreat: string
}

export type PreviewWebsiteScanAi = {
  businessSnapshot: string | null
  verdict: PreviewSaturationVerdict | null
  verdictReason: string | null
  likelyCompetitors: PreviewWebsiteScanCompetitor[]
  standoutInsights: string[]
  oneBigRisk: string | null
  oneBigOpportunity: string | null
  fullAuditTeaser: string | null
}

export type PreviewWebsiteScanPreview = {
  seo: PreviewWebsiteScanSeo
  ai: PreviewWebsiteScanAi
}

export type PreviewWebsiteScanResponse = {
  preview: PreviewWebsiteScanPreview
  session_token: string | null
}

/** Saved-preview lookup — same `preview` as a fresh scan, plus the URL it was run on. */
export type PreviewWebsiteScanGetResponse = PreviewWebsiteScanResponse & {
  url: string | null
  normalized_url: string | null
  expires_at: string | null
}

export type PreviewWebsiteScanErrorCode =
  | 'missing_url'
  | 'invalid_url'
  | 'fetch_failed'
  | 'misconfigured'
  | 'network'
  | 'timeout'
  | 'unknown'

export type PreviewWebsiteScanGetErrorCode =
  | 'invalid_session_token'
  | 'not_found'
  | 'expired'
  | 'lookup_failed'
  | 'network'
  | 'timeout'
  | 'unknown'

export type PreviewWebsiteScanState = 'idle' | 'loading' | 'restoring' | 'result' | 'error'

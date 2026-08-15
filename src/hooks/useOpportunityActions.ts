import type { Location, NavigateFunction } from 'react-router-dom'
import { toast } from '@/components/ui/sonner'
import { DEFAULT_DISPLAY_CURRENCY_CODE } from '@/lib/displayCurrency'
import { exportOpportunity, type OpportunityExportFormat } from '@/lib/opportunityExport'
import { deriveMarginPct } from '@/lib/opportunityDetailUtils'
import { buildHeroResearchFromOpportunity } from '@/lib/researchHeroState'

function buildOpportunityContext(o: any) {
  if (!o || typeof o !== 'object') return null
  const title = String(o.title ?? '').trim()
  const slug = String(o.slug ?? '').trim()
  const id = String(o.id ?? '').trim()
  if (!title || (!slug && !id)) return null

  const context = {
    id: id || null,
    slug: slug || null,
    title,
    tagline: o.tagline ?? null,
    category_slug: o.category_slug ?? null,
    country: (o as any).country ?? null,
    currency: (o as any).currency ?? DEFAULT_DISPLAY_CURRENCY_CODE,
    setup_min: o.setup_min ?? null,
    setup_max: o.setup_max ?? null,
    monthly_rev_min: o.monthly_rev_min ?? null,
    monthly_rev_max: o.monthly_rev_max ?? null,
    monthly_profit_min: o.monthly_profit_min ?? null,
    monthly_profit_max: o.monthly_profit_max ?? null,
    margin_pct: deriveMarginPct(o) || null,
    payback_months_min: o.payback_months_min ?? null,
    payback_months_max: o.payback_months_max ?? null,
    ease: o.ease ?? null,
    market_demographics: (o as any).market_demographics ?? null,
    competitors: (o as any).competitors ?? null,
    machinery_list: (o as any).machinery_list ?? null,
    raw_materials: (o as any).raw_materials ?? null,
    licenses_required: (o as any).licenses_required ?? null,
    license_cost_min: (o as any).license_cost_min ?? null,
    license_cost_max: (o as any).license_cost_max ?? null,
    faqs: (o as any).faqs ?? null,
    expert_tips_structured: (o as any).expert_tips_structured ?? null,
  }

  return context
}

export function useOpportunityActions(
  opp: any,
  _user: { id: string } | null | undefined,
  isMobile: boolean,
  navigate: NavigateFunction,
  _location: Location,
  fullDetail: boolean,
  setShowShareDrawer: (open: boolean) => void,
) {
  void fullDetail

  const handleStartBusiness = () => {
    const ctx = buildOpportunityContext(opp)
    if (!ctx?.slug) {
      toast('Could not load this opportunity yet', {
        description: 'Please retry in a moment.',
      })
      return
    }

    navigate('/my-research', {
      state: { heroResearch: buildHeroResearchFromOpportunity(opp as Record<string, unknown>) },
    })
  }

  const handleShare = async () => {
    if (!opp) return
    const shareUrl = `${window.location.origin}/opportunity/${opp?.slug}?ref=share`
    if (isMobile && navigator.share) {
      try {
        await navigator.share({ title: opp.title, text: opp.tagline ?? '', url: shareUrl })
        return
      } catch {}
    }
    if (isMobile) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast('Link copied!', { description: 'Share it anywhere.' })
        return
      } catch {}
    }
    setShowShareDrawer(true)
  }

  const handleExport = (format: OpportunityExportFormat = 'json') => {
    if (!opp) return
    exportOpportunity(opp as Record<string, unknown>, format)
  }

  return { handleStartBusiness, handleShare, handleExport }
}

import { useMemo } from 'react'
import { isSpaceLocationPresent } from '@/components/opportunity/SpaceLocationSection'
import { parseExpertTipsStructured } from '@/types/research'

export type OpportunityDetailSectionId =
  | 'od-hero'
  | 'od-metrics'
  | 'od-fit'
  | 'od-ai'
  | 'od-research-insights'
  | 'od-key-market-trends'
  | 'market'
  | 'od-scenarios'
  | 'od-revenue-streams'
  | 'od-marketing'
  | 'od-competitors'
  | 'od-demand-trend'
  | 'od-space-location'
  | 'od-machinery'
  | 'od-headcount'
  | 'od-raw'
  | 'od-licenses'
  | 'od-schemes'
  | 'od-unit-economics'
  | 'od-tools'
  | 'od-funding'
  | 'od-risks'
  | 'od-faq'
  | 'od-pros-cons'

export function useOpportunitySectionVisibility(
  opp: any,
  fullDetail: boolean,
  machineryList: any[],
  rawMaterialsList: any[],
  licensesList: any[],
  isUserResearch = false,
) {
  const sectionItems = useMemo(() => {
    const schemesCount = (opp as any)?.govt_scheme_details?.schemes?.length
      ?? (Array.isArray((opp as any)?.govt_scheme_details) ? (opp as any).govt_scheme_details.length : 0)

    const hasRevenueScenarios = opp?.monthly_rev_min != null || opp?.monthly_rev_max != null

    const revenueStreams = (opp as any)?.revenue_streams
    const hasRevenueStreams = Array.isArray(revenueStreams) && revenueStreams.length > 0

    const ms = (opp as any)?.marketing_strategy as Record<string, unknown> | null | undefined
    const hasMarketingStrategy =
      ms &&
      typeof ms === 'object' &&
      ((Array.isArray(ms.channels) && (ms.channels as unknown[]).length > 0) ||
        Boolean(String(ms.primary_hook ?? '').trim()) ||
        Boolean((ms.guerrilla_play as { idea?: string } | undefined)?.idea) ||
        (Array.isArray(ms.launch_sequence) && (ms.launch_sequence as unknown[]).length > 0) ||
        Boolean(String(ms.retention_strategy ?? '').trim()) ||
        Boolean(String(ms.referral_mechanic ?? '').trim()) ||
        (Array.isArray(ms.social_proof_angles) && (ms.social_proof_angles as unknown[]).length > 0) ||
        (Array.isArray(ms.psychology_levers) && (ms.psychology_levers as unknown[]).length > 0) ||
        Boolean(ms.budget_milestones))

    const validFaqCount = Array.isArray(opp?.faqs)
      ? opp!.faqs.filter((f: any) => String(f?.question ?? f?.q ?? '').trim() && String(f?.answer ?? f?.a ?? '').trim()).length
      : 0

    const pb = fullDetail
    const hasMetrics =
      opp?.setup_min != null ||
      opp?.setup_max != null ||
      opp?.monthly_profit_min != null ||
      opp?.monthly_profit_max != null ||
      Boolean(String(opp?.ease ?? '').trim()) ||
      (opp?.margin_pct != null && Number(opp.margin_pct) > 0) ||
      (opp?.profit_derivation as { cogs_pct?: number } | null | undefined)?.cogs_pct != null

    const hasResearchInsights =
      isUserResearch &&
      Boolean(
        (opp as any)?.pain_points?.length ||
          (opp as any)?.market_verdict ||
          (opp as any)?.future_outlook ||
          (opp as any)?.saturation_level ||
          (opp as any)?.is_saturated != null ||
          parseExpertTipsStructured(opp?.expert_tips_structured).length > 0,
      )

    const hasKeyMarketTrends =
      pb &&
      Boolean(
        (opp as any)?.market_intelligence ||
          (opp as any)?.demand_trend ||
          (opp as any)?.market_demographics?.market_size_cr ||
          (opp as any)?.market_demographics?.market_cagr,
      )

    const hasProsCons =
      (Array.isArray((opp as any)?.pros) && (opp as any).pros.length > 0) ||
      (Array.isArray((opp as any)?.cons) && (opp as any).cons.length > 0)
    const hasFitScore =
      Boolean((opp as any)?.score_breakdown) ||
      (opp?.score != null && opp.score !== '') ||
      ((opp as any)?.fit_index != null && (opp as any).fit_index !== '') ||
      hasProsCons
    const hasGuidelinesChips =
      (Array.isArray((opp as any)?.target_customer_pills) &&
        (opp as any).target_customer_pills.length > 0) ||
      (Array.isArray((opp as any)?.state_tags) && (opp as any).state_tags.length > 0)

    return [
      { id: 'od-hero', label: 'Summary', show: Boolean(opp) },
      { id: 'od-metrics', label: 'Key metrics', show: Boolean(opp) && hasMetrics },
      {
        id: 'od-fit',
        label: 'Fit',
        show: Boolean(opp) && (hasFitScore || (fullDetail && hasGuidelinesChips)),
      },
      {
        id: 'od-ai',
        label: 'Overview',
        show: Boolean(
          String(opp?.full_desc ?? '').trim() || String(opp?.tagline ?? '').trim(),
        ),
      },
      {
        id: 'od-research-insights',
        label: 'Market readiness',
        show: hasResearchInsights,
      },
      {
        id: 'od-key-market-trends',
        label: 'Market trends',
        show: hasKeyMarketTrends,
      },
      {
        id: 'market',
        label: 'Demographics',
        show:
          pb &&
          Boolean((opp as any)?.market_demographics),
      },
      { id: 'od-scenarios', label: 'Revenue Est.', show: hasRevenueScenarios && pb },
      { id: 'od-revenue-streams', label: 'Revenue streams', show: hasRevenueStreams && pb },
      { id: 'od-marketing', label: 'Marketing strategy', show: Boolean(hasMarketingStrategy) && pb },
      {
        id: 'od-competitors',
        label: 'Competitors',
        show:
          isUserResearch &&
          Boolean(
            (opp as any)?.competitors &&
              typeof (opp as any).competitors === 'object' &&
              (opp as any).competitors?.king_of_market?.name,
          ),
      },
      {
        id: 'od-demand-trend',
        label: 'Demand Trend',
        show:
          isUserResearch &&
          Array.isArray((opp as any)?.demand_trend?.data) &&
          (opp as any).demand_trend.data.length > 0,
      },
      {
        id: 'od-space-location',
        label: 'Space & Location',
        show: isUserResearch && isSpaceLocationPresent((opp as any)?.space_location),
      },
      { id: 'od-machinery', label: 'Machinery & equipment', show: machineryList.length > 0 && pb },
      { id: 'od-headcount', label: 'Headcount', show: Boolean(opp?.headcount) && pb },
      { id: 'od-raw', label: 'Raw materials', show: rawMaterialsList.length > 0 && pb },
      { id: 'od-licenses', label: 'Licences & registrations', show: licensesList.length > 0 && pb },
      { id: 'od-schemes', label: 'Government schemes', show: schemesCount > 0 },
      {
        id: 'od-unit-economics',
        label: 'Unit economics',
        show: isUserResearch && pb && Boolean((opp as any)?.unit_economics_deep),
      },
      {
        id: 'od-tools',
        label: 'Tools & stack',
        show: isUserResearch && pb && Boolean((opp as any)?.tools_and_stack),
      },
      {
        id: 'od-funding',
        label: 'Funding options',
        show: isUserResearch && pb && Boolean((opp as any)?.funding_options),
      },
      {
        id: 'od-risks',
        label: 'Risk matrix',
        show: isUserResearch && pb && Boolean((opp as any)?.risk_matrix),
      },
      { id: 'od-faq', label: 'FAQs', show: validFaqCount > 0 },
    ] as const
  }, [
    opp,
    fullDetail,
    machineryList,
    rawMaterialsList,
    licensesList,
    isUserResearch,
  ])

  return { sectionItems }
}

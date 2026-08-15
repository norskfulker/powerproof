import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatCategoryBadge, normalizeEaseLevel } from '@/lib/opportunityLabels'
import { isCompleteUserResearch } from '@/lib/userResearch'
import { getAnalyticsSessionId } from '@/lib/logger'

function safeJsonParse(value: any) {
  if (value == null) return value
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

export function normalizeOpportunity(raw: any) {
  if (!raw || typeof raw !== 'object') return raw
  const opp = { ...raw }
  const keysToParse = [
    'market_demographics',
    'market_intelligence',
    'target_customer_pills',
    'state_tags',
    'financial_projections',
    'headcount',
    'setup_cost_breakdown',
    'calculator_config',
    'expert_tips_structured',
    'pros',
    'cons',
    'supplier_tips',
    'govt_scheme_details',
    'research_context',
    'revenue_streams',
    'marketing_strategy',
    'competitors',
    'demand_trend',
    'space_location',
    'licenses_required',
    'style_addons',
    'funding_options',
    'risk_matrix',
    'unit_economics_deep',
    'tools_and_stack',
    'setup_cost_derivation',
    'profit_derivation',
    'effort_scorecard',
    'section_prompts',
    'pain_points',
    'market_verdict',
    'future_outlook',
  ]
  for (const k of keysToParse) {
    if (k in opp) opp[k] = safeJsonParse((opp as any)[k])
  }
  if ('pros' in opp) {
    ;(opp as any).pros = Array.isArray((opp as any).pros)
      ? (opp as any).pros.map(String).filter(Boolean)
      : []
  }
  if ('cons' in opp) {
    ;(opp as any).cons = Array.isArray((opp as any).cons)
      ? (opp as any).cons.map(String).filter(Boolean)
      : []
  }
  if ('state_tags' in opp) {
    ;(opp as any).state_tags = Array.isArray((opp as any).state_tags)
      ? (opp as any).state_tags.map(String).filter(Boolean)
      : []
  }
  if ('target_customer_pills' in opp) {
    ;(opp as any).target_customer_pills = Array.isArray((opp as any).target_customer_pills)
      ? (opp as any).target_customer_pills.map(String).filter(Boolean)
      : []
  }
  return opp
}

export type OpportunityDetailDataSource = 'catalog' | 'user_opportunity'

/** Shape a `user_opportunities` row like catalog detail data (categories, unlock flags). */
export function shapeUserResearchOpportunityRow(row: any) {
  const normalizedOpp = normalizeOpportunity(row)
  const cat = (normalizedOpp as any).categories
  const categoryWrap =
    cat && typeof cat === 'object'
      ? cat
      : {
          name:
            String((normalizedOpp as any).category_name ?? '').trim() ||
            formatCategoryBadge((normalizedOpp as any).category_slug) ||
            'Business opportunity',
          lucide: null,
        }

  const ease = normalizeEaseLevel(normalizedOpp.ease)

  return {
    ...normalizedOpp,
    ease: ease || normalizedOpp.ease,
    categories: categoryWrap,
    category_name: (categoryWrap as any)?.name,
    category_icon: (categoryWrap as any)?.lucide,
  }
}

export function useOpportunityDetail(
  slug: string | undefined,
  opts?: {
    dataSource?: OpportunityDetailDataSource
    enabled?: boolean
    /** Skip opportunity_views insert (onboarding preview). */
    skipViewTracking?: boolean
  },
) {
  const { user } = useAuth()
  const dataSource = opts?.dataSource ?? 'catalog'
  const enabled = opts?.enabled !== false
  const skipViewTracking = opts?.skipViewTracking === true
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      setError(null)
      setData(null)
      return
    }

    if (!slug) {
      setIsLoading(false)
      return
    }

    let isStale = false

    const fetchAll = async () => {
      if (dataSource === 'user_opportunity') {
        if (!user?.id) {
          setError('Sign in required')
          setIsLoading(false)
          return
        }
        const { data: row, error: rowErr } = await supabase
          .from('user_opportunities')
          .select('*')
          .eq('slug', slug)
          .eq('user_id', user.id)
          .maybeSingle()

        if (isStale) return

        if (rowErr || !row || !isCompleteUserResearch(row)) {
          setError('Research not found')
          setIsLoading(false)
          return
        }

        setData(shapeUserResearchOpportunityRow(row))
        setIsLoading(false)
        return
      }

      // Public catalog rows use the same generated shape as private research.
      const { data: opp, error: oppErr } = await supabase
        .from('user_opportunities')
        .select('*')
        .eq('slug', slug)
        .eq('visibility', 'catalog')
        .eq('status', 'published')
        .eq('research_status', 'complete')
        .maybeSingle()

      if (isStale) return

      if (oppErr || !opp) {
        setError('Opportunity not found')
        setIsLoading(false)
        return
      }

      setData(shapeUserResearchOpportunityRow(opp))
      
      // Setting loading to false as soon as main content is ready to prevent UI blocking
      setIsLoading(false)

      if (!skipViewTracking) {
        supabase.from('opportunity_views').insert({
          opportunity_id: opp.id,
          user_id: user?.id ?? null,
          session_id: getAnalyticsSessionId(),
        }).then()
      }
    }

    // Only show loading state if data is empty or if we are loading a completely new slug
    if (data?.slug !== slug) {
      setIsLoading(true)
      setData(null)
    }
    setError(null)

    fetchAll()
    
    return () => {
      isStale = true
    }
  }, [slug, user, dataSource, enabled, skipViewTracking])

  return { data, isLoading, error }
}

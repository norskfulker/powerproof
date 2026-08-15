import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface AdminAnalyticsData {
  overview: {
    totalUsers: number
    newThisWeek: number
    wau: number
    mau: number
    onboarded: number
    onboardingRate: number
  }
  funnel: {
    signedUp: number
    onboarded: number
    didResearch: number
    didWarroom: number
    didRoadmap: number
    didSourcing: number
    spentCredits: number
  }
  credits: {
    totalWallets: number
    walletsWithBalance: number
    totalBalance: number
    lifetimePurchased: number
    lifetimeSpent: number
    lifetimeEarned: number
    burnRate: number
  }
  revenue: {
    allTimeInr: number
    last7dInr: number
    paidCount: number
  }
  featureSpend: Array<{
    feature: string
    uses: number
    creditsSpent: number
    avgPerUse: number
  }>
  transactions: Array<{
    type: string
    count: number
    credits: number
  }>
  signupTrend: Array<{
    day: string
    signups: number
  }>
  users: Array<{
    id: string
    full_name: string
    email: string
    role: string
    created_at: string
    last_active_at: string
    onboarding_completed: boolean
    credits_balance: number | null
    lifetime_spent: number | null
    research_count: number
    warroom_count: number
    roadmap_count: number
  }>
}

/** @deprecated Use AdminAnalyticsData['users'][number] */
export type UserStat = AdminAnalyticsData['users'][number]

/** @deprecated Legacy exports for AnalyticsComponents */
export interface TopOpportunity {
  slug: string
  title: string
  category_slug: string
  category_name: string
  category_icon: string
  score: number
  view_count: number
  save_count: number
}

/** @deprecated Legacy exports for AnalyticsComponents */
export interface CategoryStat {
  slug: string
  name: string
  lucide: string
  opp_count: number
  total_views: number
  total_saves: number
}

const emptyData: AdminAnalyticsData = {
  overview: {
    totalUsers: 0,
    newThisWeek: 0,
    wau: 0,
    mau: 0,
    onboarded: 0,
    onboardingRate: 0,
  },
  funnel: {
    signedUp: 0,
    onboarded: 0,
    didResearch: 0,
    didWarroom: 0,
    didRoadmap: 0,
    didSourcing: 0,
    spentCredits: 0,
  },
  credits: {
    totalWallets: 0,
    walletsWithBalance: 0,
    totalBalance: 0,
    lifetimePurchased: 0,
    lifetimeSpent: 0,
    lifetimeEarned: 0,
    burnRate: 0,
  },
  revenue: {
    allTimeInr: 0,
    last7dInr: 0,
    paidCount: 0,
  },
  featureSpend: [],
  transactions: [],
  signupTrend: [],
  users: [],
}

function distinctUserCount(rows: Array<{ user_id: string | null }> | null | undefined): number {
  const set = new Set<string>()
  for (const row of rows ?? []) {
    if (row.user_id) set.add(row.user_id)
  }
  return set.size
}

function countByUser(rows: Array<{ user_id: string | null }> | null | undefined): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows ?? []) {
    if (!row.user_id) continue
    map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1)
  }
  return map
}

function nonAdminProfiles<T extends string>(columns: T, options?: { count: 'exact'; head: true }) {
  return supabase.from('profiles').select(columns, options).eq('is_admin', false)
}

function buildSignupTrend(
  profiles: Array<{ created_at: string | null }>,
  fourteenDaysAgo: Date,
): AdminAnalyticsData['signupTrend'] {
  const byDay = new Map<string, number>()
  for (const p of profiles) {
    if (!p.created_at) continue
    const d = new Date(p.created_at)
    if (d < fourteenDaysAgo) continue
    const key = d.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + 1)
  }

  const trend: AdminAnalyticsData['signupTrend'] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    trend.push({ day: key, signups: byDay.get(key) ?? 0 })
  }
  return trend
}

async function fetchAdminAnalytics(): Promise<AdminAnalyticsData> {
  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString()
  const fourteenDaysAgo = new Date(now - 14 * 86400000)
  fourteenDaysAgo.setHours(0, 0, 0, 0)
  const fourteenDaysAgoIso = fourteenDaysAgo.toISOString()

  const [
    totalUsersRes,
    wauRes,
    mauRes,
    newWeekRes,
    onboardedRes,
    creditsRes,
    researchUsersRes,
    warroomUsersRes,
    roadmapUsersRes,
    sourcingUsersRes,
    spendCreditsUsersRes,
    creditTxRes,
    creditPurchasesRes,
    signupProfilesRes,
    userProfilesRes,
    researchCountsRes,
    warroomCountsRes,
    roadmapCountsRes,
  ] = await Promise.all([
    nonAdminProfiles('*', { count: 'exact', head: true }),
    nonAdminProfiles('*', { count: 'exact', head: true }).gte('last_active_at', sevenDaysAgo),
    nonAdminProfiles('*', { count: 'exact', head: true }).gte('last_active_at', thirtyDaysAgo),
    nonAdminProfiles('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    nonAdminProfiles('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
    supabase.from('user_credits').select('balance, lifetime_purchased, lifetime_spent, lifetime_earned'),
    supabase.from('user_opportunities').select('user_id').not('research_status', 'is', null),
    supabase.from('user_playbooks').select('user_id'),
    supabase.from('user_roadmaps').select('user_id'),
    supabase.from('sourcing_search_history').select('user_id'),
    supabase.from('credit_transactions').select('user_id').eq('type', 'spend'),
    supabase.from('credit_transactions').select('type, amount, feature'),
    supabase.from('credit_purchases').select('status, amount_paid_inr, created_at'),
    nonAdminProfiles('created_at').gte('created_at', fourteenDaysAgoIso),
    nonAdminProfiles(
      'id, full_name, email, role, created_at, last_active_at, onboarding_completed, user_credits(balance, lifetime_spent, lifetime_earned)',
    ).order('created_at', { ascending: false }),
    supabase.from('user_opportunities').select('user_id').not('research_status', 'is', null),
    supabase.from('user_playbooks').select('user_id'),
    supabase.from('user_roadmaps').select('user_id'),
  ])

  const totalUsers = totalUsersRes.count ?? 0
  const onboarded = onboardedRes.count ?? 0

  const wallets = (creditsRes.data ?? []) as Array<{
    balance: number
    lifetime_purchased: number
    lifetime_spent: number
    lifetime_earned: number
  }>

  let totalBalance = 0
  let lifetimePurchased = 0
  let lifetimeSpent = 0
  let lifetimeEarned = 0
  let walletsWithBalance = 0

  for (const w of wallets) {
    const bal = Number(w.balance ?? 0)
    totalBalance += bal
    lifetimePurchased += Number(w.lifetime_purchased ?? 0)
    lifetimeSpent += Number(w.lifetime_spent ?? 0)
    lifetimeEarned += Number(w.lifetime_earned ?? 0)
    if (bal > 0) walletsWithBalance++
  }

  const burnRate =
    lifetimeEarned > 0 ? Math.round((lifetimeSpent / lifetimeEarned) * 100) : 0

  const featureMap = new Map<string, { uses: number; creditsSpent: number }>()
  const txMap = new Map<string, { count: number; credits: number }>()

  for (const tx of (creditTxRes.data ?? []) as Array<{
    type: string
    amount: number
    feature: string | null
  }>) {
    const type = tx.type || 'unknown'
    const amt = Math.abs(Number(tx.amount ?? 0))
    const txRow = txMap.get(type) ?? { count: 0, credits: 0 }
    txRow.count++
    txRow.credits += amt
    txMap.set(type, txRow)

    if (type === 'spend' && tx.feature) {
      const feat = featureMap.get(tx.feature) ?? { uses: 0, creditsSpent: 0 }
      feat.uses++
      feat.creditsSpent += amt
      featureMap.set(tx.feature, feat)
    }
  }

  const featureSpend = [...featureMap.entries()]
    .map(([feature, v]) => ({
      feature,
      uses: v.uses,
      creditsSpent: v.creditsSpent,
      avgPerUse: v.uses > 0 ? Math.round(v.creditsSpent / v.uses) : 0,
    }))
    .sort((a, b) => b.creditsSpent - a.creditsSpent)

  const transactions = [...txMap.entries()]
    .map(([type, v]) => ({ type, count: v.count, credits: v.credits }))
    .sort((a, b) => b.count - a.count)

  let allTimeInr = 0
  let last7dInr = 0
  let paidCount = 0

  for (const p of (creditPurchasesRes.data ?? []) as Array<{
    status: string
    amount_paid_inr: number | null
    created_at: string
  }>) {
    if (p.status !== 'completed') continue
    paidCount++
    const inr = Number(p.amount_paid_inr ?? 0)
    allTimeInr += inr
    if (p.created_at >= sevenDaysAgo) last7dInr += inr
  }

  const researchMap = countByUser(researchCountsRes.data as Array<{ user_id: string }>)
  const warroomMap = countByUser(warroomCountsRes.data as Array<{ user_id: string }>)
  const roadmapMap = countByUser(roadmapCountsRes.data as Array<{ user_id: string }>)

  type ProfileRow = {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
    created_at: string | null
    last_active_at: string | null
    onboarding_completed: boolean | null
    user_credits:
      | { balance: number; lifetime_spent: number; lifetime_earned: number }
      | { balance: number; lifetime_spent: number; lifetime_earned: number }[]
      | null
  }

  const users = ((userProfilesRes.data ?? []) as ProfileRow[]).map((p) => {
    const creditsRaw = p.user_credits
    const credits = Array.isArray(creditsRaw) ? creditsRaw[0] : creditsRaw
    return {
      id: p.id,
      full_name: p.full_name ?? '',
      email: p.email ?? '',
      role: p.role ?? 'user',
      created_at: p.created_at ?? '',
      last_active_at: p.last_active_at ?? '',
      onboarding_completed: Boolean(p.onboarding_completed),
      credits_balance: credits != null ? Number(credits.balance ?? 0) : null,
      lifetime_spent: credits != null ? Number(credits.lifetime_spent ?? 0) : null,
      research_count: researchMap.get(p.id) ?? 0,
      warroom_count: warroomMap.get(p.id) ?? 0,
      roadmap_count: roadmapMap.get(p.id) ?? 0,
    }
  })

  return {
    overview: {
      totalUsers,
      newThisWeek: newWeekRes.count ?? 0,
      wau: wauRes.count ?? 0,
      mau: mauRes.count ?? 0,
      onboarded,
      onboardingRate: totalUsers > 0 ? Math.round((onboarded / totalUsers) * 100) : 0,
    },
    funnel: {
      signedUp: totalUsers,
      onboarded,
      didResearch: distinctUserCount(researchUsersRes.data as Array<{ user_id: string }>),
      didWarroom: distinctUserCount(warroomUsersRes.data as Array<{ user_id: string }>),
      didRoadmap: distinctUserCount(roadmapUsersRes.data as Array<{ user_id: string }>),
      didSourcing: distinctUserCount(sourcingUsersRes.data as Array<{ user_id: string }>),
      spentCredits: distinctUserCount(spendCreditsUsersRes.data as Array<{ user_id: string }>),
    },
    credits: {
      totalWallets: wallets.length,
      walletsWithBalance,
      totalBalance,
      lifetimePurchased,
      lifetimeSpent,
      lifetimeEarned,
      burnRate,
    },
    revenue: {
      allTimeInr,
      last7dInr,
      paidCount,
    },
    featureSpend,
    transactions,
    signupTrend: buildSignupTrend(
      (signupProfilesRes.data ?? []) as Array<{ created_at: string | null }>,
      fourteenDaysAgo,
    ),
    users,
  }
}

export function useAdminAnalytics() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchAdminAnalytics()
      setData(next)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const resolved = data ?? emptyData

  return {
    overview: data?.overview ?? null,
    funnel: resolved.funnel,
    credits: resolved.credits,
    revenue: resolved.revenue,
    featureSpend: resolved.featureSpend,
    transactions: resolved.transactions,
    signupTrend: resolved.signupTrend,
    users: resolved.users,
    loading,
    error,
    lastRefresh,
    refresh,
    refetch: refresh,
  }
}

// --- Feature analytics (per-product pages) ---

export type FeatureKey = 'research' | 'warroom' | 'roadmap' | 'sourcing' | 'markettest' | 'itch'

export interface ResearchAnalytics {
  total: number
  complete: number
  pending: number
  cancelled: number
  uniqueUsers: number
  totalCredits: number
  reruns: number
  byStyle: Array<{ style: string; count: number; credits: number }>
  recentActivity: Array<{
    id: string
    user_id: string | null
    title: string
    research_style: string | null
    research_status: string
    credits_used: number | null
    created_at: string
    re_research_count: number
  }>
}

export interface WarRoomAnalytics {
  total: number
  complete: number
  pending: number
  failed: number
  uniqueUsers: number
  totalCredits: number
  byModel: Array<{ model: string; count: number; credits: number }>
  recentActivity: Array<{
    id: string
    user_id: string | null
    business_name: string | null
    business_description: string | null
    generation_status: string
    credits_used: number | null
    model_used: string | null
    step_count: number | null
    created_at: string
  }>
}

export interface RoadmapAnalytics {
  total: number
  complete: number
  failed: number
  uniqueUsers: number
  totalCredits: number
  avgTasks: number
  avgWeeks: number
  byPersona: Array<{ persona: string; count: number }>
  byDifficulty: Array<{ difficulty: string; count: number }>
  recentActivity: Array<{
    id: string
    user_id: string | null
    title: string | null
    goal_input: string | null
    generation_status: string
    persona: string | null
    difficulty: string | null
    total_tasks: number | null
    total_weeks: number | null
    credits_used: number | null
    created_at: string
  }>
}

export interface SourcingAnalytics {
  total: number
  uniqueUsers: number
  avgResults: number
  topKeywords: Array<{ keyword: string; searches: number; avgResults: number }>
  recentActivity: Array<{
    search_id: string
    user_id: string | null
    keyword: string
    budget_max: number | null
    total_results: number | null
    searched_at: string
  }>
}

export interface MarketTestAnalytics {
  total: number
  complete: number
  uniqueUsers: number
  avgScore: number
  byVerdict: Array<{ verdict: string; verdictLabel: string; count: number }>
  recentActivity: Array<{
    id: string
    user_id: string | null
    query: string | null
    verdict: string | null
    verdict_label: string | null
    market_reality_score: number | null
    generation_status: string
    credits_used: number | null
    created_at: string
  }>
}

export interface ItchAnalytics {
  totalCards: number
  totalSaves: number
  uniqueUsers: number
  sessionUsers: number
  byReaction: Array<{ reaction: string; count: number }>
  recentSaves: Array<{
    id: string
    user_id: string
    itch_card_id: string
    reaction: string
    created_at: string
  }>
}

export type FeatureAnalyticsData =
  | ResearchAnalytics
  | WarRoomAnalytics
  | RoadmapAnalytics
  | SourcingAnalytics
  | MarketTestAnalytics
  | ItchAnalytics

function distinctCount(rows: Array<{ user_id?: string | null }>, key: 'user_id' = 'user_id'): number {
  const set = new Set<string>()
  for (const row of rows) {
    const id = row[key]
    if (id) set.add(id)
  }
  return set.size
}

function sumCredits(rows: Array<{ credits_used?: number | null }>): number {
  return rows.reduce((acc, row) => acc + Number(row.credits_used ?? 0), 0)
}

function groupCountCredits<T>(
  rows: T[],
  keyFn: (row: T) => string,
): Array<{ key: string; count: number; credits: number }> {
  const map = new Map<string, { count: number; credits: number }>()
  for (const row of rows) {
    const key = keyFn(row) || 'unknown'
    const entry = map.get(key) ?? { count: 0, credits: 0 }
    entry.count++
    entry.credits += Number((row as { credits_used?: number | null }).credits_used ?? 0)
    map.set(key, entry)
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, count: v.count, credits: v.credits }))
    .sort((a, b) => b.count - a.count)
}

function groupCount<T>(rows: T[], keyFn: (row: T) => string | null | undefined): Array<{ key: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = keyFn(row)?.trim() || 'unknown'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
}

async function fetchResearchAnalytics(): Promise<ResearchAnalytics> {
  const { data, error } = await supabase
    .from('user_opportunities')
    .select(
      'id, user_id, research_status, credits_used, re_research_count, cancelled_at, research_style, title, created_at',
    )
    .not('research_status', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<{
    id: string
    user_id: string | null
    research_status: string | null
    credits_used: number | null
    re_research_count: number | null
    cancelled_at: string | null
    research_style: string | null
    title: string | null
    created_at: string | null
  }>

  const complete = rows.filter((r) => r.research_status === 'complete').length
  const pending = rows.filter((r) => r.research_status === 'pending').length
  const cancelled = rows.filter((r) => r.cancelled_at != null).length

  const byStyleRaw = groupCountCredits(rows, (r) => String(r.research_style ?? 'standard'))
  const byStyle = byStyleRaw.map(({ key, count, credits }) => ({
    style: key,
    count,
    credits,
  }))

  const recentActivity = rows.slice(0, 20).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    title: r.title?.trim() || 'Untitled',
    research_style: r.research_style,
    research_status: r.research_status ?? 'unknown',
    credits_used: r.credits_used,
    created_at: r.created_at ?? '',
    re_research_count: Number(r.re_research_count ?? 0),
  }))

  return {
    total: rows.length,
    complete,
    pending,
    cancelled,
    uniqueUsers: distinctCount(rows),
    totalCredits: sumCredits(rows),
    reruns: rows.reduce((acc, r) => acc + Number(r.re_research_count ?? 0), 0),
    byStyle,
    recentActivity,
  }
}

async function fetchWarRoomAnalytics(): Promise<WarRoomAnalytics> {
  const { data, error } = await supabase
    .from('user_playbooks')
    .select(
      'id, user_id, business_name, business_description, generation_status, credits_used, model_used, step_count, created_at',
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<{
    id: string
    user_id: string | null
    business_name: string | null
    business_description: string | null
    generation_status: string | null
    credits_used: number | null
    model_used: string | null
    step_count: number | null
    created_at: string | null
  }>

  const complete = rows.filter((r) => r.generation_status === 'complete').length
  const pending = rows.filter((r) => r.generation_status === 'pending' || r.generation_status === 'processing').length
  const failed = rows.filter((r) => r.generation_status === 'failed').length

  const byModelRaw = groupCountCredits(rows, (r) => String(r.model_used ?? 'unknown'))
  const byModel = byModelRaw.map(({ key, count, credits }) => ({
    model: key,
    count,
    credits,
  }))

  const recentActivity = rows.slice(0, 20).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    business_name: r.business_name,
    business_description: r.business_description,
    generation_status: r.generation_status ?? 'unknown',
    credits_used: r.credits_used,
    model_used: r.model_used,
    step_count: r.step_count,
    created_at: r.created_at ?? '',
  }))

  return {
    total: rows.length,
    complete,
    pending,
    failed,
    uniqueUsers: distinctCount(rows),
    totalCredits: sumCredits(rows),
    byModel,
    recentActivity,
  }
}

async function fetchRoadmapAnalytics(): Promise<RoadmapAnalytics> {
  const { data, error } = await supabase
    .from('user_roadmaps')
    .select(
      'id, user_id, title, goal_input, generation_status, persona, difficulty, total_tasks, total_weeks, credits_used, created_at',
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<{
    id: string
    user_id: string | null
    title: string | null
    goal_input: string | null
    generation_status: string | null
    persona: string | null
    difficulty: string | null
    total_tasks: number | null
    total_weeks: number | null
    credits_used: number | null
    created_at: string | null
  }>

  const completeRows = rows.filter((r) => r.generation_status === 'complete')
  const complete = completeRows.length
  const failed = rows.filter((r) => r.generation_status === 'failed').length

  const avgTasks =
    completeRows.length > 0
      ? completeRows.reduce((acc, r) => acc + Number(r.total_tasks ?? 0), 0) / completeRows.length
      : 0
  const avgWeeks =
    completeRows.length > 0
      ? completeRows.reduce((acc, r) => acc + Number(r.total_weeks ?? 0), 0) / completeRows.length
      : 0

  const byPersona = groupCount(rows, (r) => r.persona ?? 'Unknown').map(({ key, count }) => ({
    persona: key === 'unknown' ? 'Unknown' : key,
    count,
  }))
  const byDifficulty = groupCount(rows, (r) => r.difficulty ?? 'Unknown').map(({ key, count }) => ({
    difficulty: key === 'unknown' ? 'Unknown' : key,
    count,
  }))

  const recentActivity = rows.slice(0, 20).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    goal_input: r.goal_input,
    generation_status: r.generation_status ?? 'unknown',
    persona: r.persona,
    difficulty: r.difficulty,
    total_tasks: r.total_tasks,
    total_weeks: r.total_weeks,
    credits_used: r.credits_used,
    created_at: r.created_at ?? '',
  }))

  return {
    total: rows.length,
    complete,
    failed,
    uniqueUsers: distinctCount(rows),
    totalCredits: sumCredits(rows),
    avgTasks,
    avgWeeks,
    byPersona,
    byDifficulty,
    recentActivity,
  }
}

async function fetchSourcingAnalytics(): Promise<SourcingAnalytics> {
  const { data, error } = await supabase
    .from('sourcing_search_history')
    .select('search_id, user_id, keyword, budget_max, total_results, searched_at')
    .order('searched_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<{
    search_id: string
    user_id: string | null
    keyword: string | null
    budget_max: number | null
    total_results: number | null
    searched_at: string | null
  }>

  const keywordMap = new Map<string, { searches: number; totalResults: number }>()
  for (const row of rows) {
    const keyword = row.keyword?.trim() || '—'
    const entry = keywordMap.get(keyword) ?? { searches: 0, totalResults: 0 }
    entry.searches++
    entry.totalResults += Number(row.total_results ?? 0)
    keywordMap.set(keyword, entry)
  }

  const topKeywords = [...keywordMap.entries()]
    .map(([keyword, v]) => ({
      keyword,
      searches: v.searches,
      avgResults: v.searches > 0 ? v.totalResults / v.searches : 0,
    }))
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 15)

  const totalResults = rows.reduce((acc, r) => acc + Number(r.total_results ?? 0), 0)

  const recentActivity = rows.slice(0, 20).map((r) => ({
    search_id: r.search_id,
    user_id: r.user_id,
    keyword: r.keyword?.trim() || '—',
    budget_max: r.budget_max,
    total_results: r.total_results,
    searched_at: r.searched_at ?? '',
  }))

  return {
    total: rows.length,
    uniqueUsers: distinctCount(rows),
    avgResults: rows.length > 0 ? totalResults / rows.length : 0,
    topKeywords,
    recentActivity,
  }
}

const MARKET_TEST_VERDICTS = [
  { verdict: 'go', verdictLabel: 'Go' },
  { verdict: 'proceed_with_caution', verdictLabel: 'Proceed with caution' },
  { verdict: 'red_flag', verdictLabel: 'Red flag' },
] as const

async function fetchMarketTestAnalytics(): Promise<MarketTestAnalytics> {
  const { data, error } = await supabase
    .from('market_tests')
    .select(
      'id, user_id, query, verdict, verdict_label, market_reality_score, generation_status, credits_used, created_at',
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Array<{
    id: string
    user_id: string | null
    query: string | null
    verdict: string | null
    verdict_label: string | null
    market_reality_score: number | null
    generation_status: string | null
    credits_used: number | null
    created_at: string | null
  }>

  const completeRows = rows.filter((r) => r.generation_status === 'complete')
  const complete = completeRows.length

  const avgScore =
    completeRows.length > 0
      ? completeRows.reduce((acc, r) => acc + Number(r.market_reality_score ?? 0), 0) / completeRows.length
      : 0

  const verdictCounts = new Map<string, number>()
  for (const row of rows) {
    const v = row.verdict?.trim() || 'unknown'
    verdictCounts.set(v, (verdictCounts.get(v) ?? 0) + 1)
  }

  const byVerdict = MARKET_TEST_VERDICTS.map(({ verdict, verdictLabel }) => ({
    verdict,
    verdictLabel,
    count: verdictCounts.get(verdict) ?? 0,
  }))

  const recentActivity = rows.slice(0, 20).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    query: r.query,
    verdict: r.verdict,
    verdict_label: r.verdict_label,
    market_reality_score: r.market_reality_score,
    generation_status: r.generation_status ?? 'unknown',
    credits_used: r.credits_used,
    created_at: r.created_at ?? '',
  }))

  return {
    total: rows.length,
    complete,
    uniqueUsers: distinctCount(rows),
    avgScore,
    byVerdict,
    recentActivity,
  }
}

async function fetchItchAnalytics(): Promise<ItchAnalytics> {
  const [savesRes, cardsRes, sessionsRes] = await Promise.all([
    supabase
      .from('user_itch_saves')
      .select('id, user_id, itch_card_id, reaction, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('itch_cards').select('id', { count: 'exact', head: true }).eq('is_public', true),
    supabase.from('user_itch_sessions').select('user_id'),
  ])

  if (savesRes.error) throw new Error(savesRes.error.message)
  if (cardsRes.error) throw new Error(cardsRes.error.message)
  if (sessionsRes.error) throw new Error(sessionsRes.error.message)

  const saves = (savesRes.data ?? []) as Array<{
    id: string
    user_id: string
    itch_card_id: string
    reaction: string
    created_at: string
  }>

  const sessionUsers = distinctCount(sessionsRes.data as Array<{ user_id: string | null }>)

  const reactionMap = new Map<string, number>()
  for (const save of saves) {
    const reaction = save.reaction?.trim() || 'unknown'
    reactionMap.set(reaction, (reactionMap.get(reaction) ?? 0) + 1)
  }

  const knownReactions = ['upvoted', 'saved', 'researched']
  const byReaction = knownReactions.map((reaction) => ({
    reaction,
    count: reactionMap.get(reaction) ?? 0,
  }))

  const recentSaves = saves.slice(0, 20).map((s) => ({
    id: s.id,
    user_id: s.user_id,
    itch_card_id: s.itch_card_id,
    reaction: s.reaction,
    created_at: s.created_at,
  }))

  return {
    totalCards: cardsRes.count ?? 0,
    totalSaves: saves.length,
    uniqueUsers: distinctCount(saves),
    sessionUsers,
    byReaction,
    recentSaves,
  }
}

async function fetchFeatureAnalytics(feature: FeatureKey): Promise<FeatureAnalyticsData> {
  switch (feature) {
    case 'research':
      return fetchResearchAnalytics()
    case 'warroom':
      return fetchWarRoomAnalytics()
    case 'roadmap':
      return fetchRoadmapAnalytics()
    case 'sourcing':
      return fetchSourcingAnalytics()
    case 'markettest':
      return fetchMarketTestAnalytics()
    case 'itch':
      return fetchItchAnalytics()
    default:
      throw new Error(`Unknown feature: ${feature satisfies never}`)
  }
}

export function useFeatureAnalytics(feature: FeatureKey) {
  const [data, setData] = useState<FeatureAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await fetchFeatureAnalytics(feature)
      setData(next)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [feature])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { data, loading, error, lastRefresh, refresh }
}

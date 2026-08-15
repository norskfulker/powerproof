import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { NotFoundState } from '@/components/NotFoundState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ClipboardCheck,
  Coins,
  FileText,
  ListChecks,
  MapPin,
  Settings2,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from '@/lib/icons'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import TagEditor from '@/components/admin/TagEditor'
import JsonArrayEditor, { FieldDef } from '@/components/admin/JsonArrayEditor'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { CompetitorsEditor } from '@/components/admin/CompetitorsEditor'
import { GovtSchemesEditor } from '@/components/admin/GovtSchemesEditor'
import MultiSelectDropdown from '@/components/admin/MultiSelectDropdown'
import { LOCATION_SUITABILITY_OPTIONS } from '@/data/opportunityTaxonomy'
import { useGeoSubdivisions } from '@/hooks/useGeoSubdivisions'
import { useCurrency } from '@/hooks/useCurrency'
import { monthlyLoanEmi } from '@/lib/calculatorDefaults'
import { formatPaybackEst, formatProfitEst } from '@/lib/opportunityFormatters'
import { FIT_SCORE_KEYS, SCORE_DIMENSION_META, getFitScoreDisplay, hasCanonicalScoreBreakdown } from '@/lib/fitScore'
import { parseEdgeFunctionError } from '@/lib/parseEdgeFunctionError'
import { AdminOpportunityAnalyticsSidebar } from '@/components/admin/AdminOpportunityAnalyticsSidebar'
import { deriveInterestedCount } from '@/lib/interestCount'
import { OPPORTUNITY_STATUS_BADGE_MAP, resolveOpportunityStatusChip } from '@/lib/opportunityLabels'
import { COMPLETENESS_SCROLL_TARGETS, getCompletenessScore } from '@/lib/opportunityCompleteness'
import { getAdminOpportunityEditorChecklist } from '@/lib/adminOpportunityEditorChecklist'
import type { EditorChecklistItem } from '@/lib/adminOpportunityEditorChecklist'
import { AdminOpportunityEditorChecklistPanel } from '@/components/admin/AdminOpportunityEditorChecklistPanel'
import { StringListEditor } from '@/components/admin/StringListEditor'
import { DEFAULT_DISPLAY_CURRENCY_CODE } from '@/lib/displayCurrency'

type OpportunityRow = Record<string, any>

const inputClass =
  'border rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary w-full bg-background'

const labelClass = 'text-sm font-semibold text-foreground uppercase tracking-wider'
const BADGE_PROMPTS = [
  'New',
  'First opportunity',
  'High demand',
  'Fast payback',
  'Low setup',
  'Beginner friendly',
  'Trending now',
  'High margin',
  'Seasonal spike',
  'Quick launch',
  'Strong local demand',
  'Scalable',
  'Export potential',
  'Under served market',
  'Premium segment',
]
const TAB_FIELD_MAP: Record<string, string[]> = {
  core: ['title', 'slug', 'tagline', 'category_slug', 'status', 'badge', 'badge_label', 'country', 'country_flag', 'currency', 'currency_symbol', 'source', 'hero_image_url', 'logo_url', 'is_locked', 'is_saturated', 'seo_title', 'seo_description', 'seo_image_url', 'seo_canonical_path', 'seo_noindex', 'created_by', 'published_at'],
  financials: ['setup_min', 'setup_max', 'setup_cost_breakdown', 'monthly_rev_min', 'monthly_rev_max', 'monthly_profit_min', 'monthly_profit_max', 'payback_months_min', 'payback_months_max', 'first_profit_months', 'financial_projections', 'calculator_config', 'trend_velocity', 'score', 'score_label', 'score_breakdown', 'ease', 'subsidy_pct'],
  competition: ['competitors', 'market_demographics', 'market_trend_5yr'],
  location: ['tags', 'govt_schemes', 'state_tags', 'location_suitability', 'similar_slugs', 'target_customer_pills', 'target_customer', 'market_size'],
  'setup-cost-breakdown': ['machinery_list', 'raw_materials'],
  team: ['headcount'],
  compliance: ['licenses_required', 'license_cost_min', 'license_cost_max', 'govt_schemes', 'govt_scheme_details', 'saturation_note'],
  content: ['full_desc', 'faqs', 'expert_tips', 'expert_tips_structured', 'pros', 'cons'],
  other: ['tags', 'similar_slugs', 'supplier_tips', 'is_guest_preview'],
  'update-all': [],
}

type AiAuditResponse = {
  fixed_json?: Record<string, any> | null
  sql?: Array<{ statement: string; notes?: string | null }> | null
  notes?: string[] | null
}

function extractAiText(payload: unknown): string | null {
  const blocks = (payload as { content?: unknown })?.content
  if (!Array.isArray(blocks)) return null
  return blocks
    .filter((b: { type?: string; text?: string }) => b?.type === 'text' && typeof b?.text === 'string')
    .map((b: { text: string }) => b.text)
    .join('')
}

function safeParseJson<T = any>(v: unknown): T | null {
  if (v == null) return null
  if (typeof v === 'object') return v as T
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function isMeaningfullyPopulated(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'boolean') return true
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object') return Object.keys(v as Record<string, unknown>).length > 0
  return false
}

const DETAIL_PAGE_FIELD_COVERAGE: Array<{ section: string; fields: string[] }> = [
  { section: 'Core', fields: ['title', 'slug', 'tagline', 'full_desc', 'category_slug', 'badge', 'badge_label', 'hero_image_url', 'logo_url', 'country', 'currency', 'currency_symbol', 'status', 'is_locked', 'is_saturated', 'saturation_note'] },
  { section: 'Financials', fields: ['setup_min', 'setup_max', 'setup_cost_breakdown', 'monthly_rev_min', 'monthly_rev_max', 'monthly_profit_min', 'monthly_profit_max', 'payback_months_min', 'payback_months_max', 'first_profit_months', 'calculator_config'] },
  { section: 'Fit/Score', fields: ['score', 'score_label', 'score_breakdown', 'ease', 'trend_velocity'] },
  { section: 'Market/Competition', fields: ['competitors', 'market_demographics', 'market_trend_5yr'] },
  { section: 'Location', fields: ['location_suitability', 'state_tags'] },
  { section: 'Setup breakdown', fields: ['machinery_list', 'raw_materials'] },
  { section: 'Compliance', fields: ['licenses_required', 'license_cost_min', 'license_cost_max', 'govt_scheme_details', 'govt_schemes'] },
  { section: 'Content', fields: ['faqs', 'expert_tips_structured', 'pros', 'cons', 'supplier_tips'] },
  { section: 'Other', fields: ['target_customer_pills', 'target_customer', 'similar_slugs', 'tags', 'is_guest_preview'] },
]

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * When generating SQL quick-edit, empty json/jsonb fields use these literals instead of NULL
 * or [], so copy/paste into an AI prompt keeps useful keys to fill.
 */
const EMPTY_JSONB_SQL_SCAFFOLD: Record<string, unknown> = {
  market_demographics: {
    market_size_cr: '',
    market_cagr: '',
    notes: '',
    segments: [{ label: '', pct: 0 }],
  },
  score_breakdown: {
    profitability: 0,
    ease: 0,
    govt_support: 0,
    market_momentum: 0,
  },
  calculator_config: {
    financials: { revenueMode: 'auto', breakevenMode: 'auto', autoRevenuePctMin: 18, autoRevenuePctMax: 28 },
    revenue: { mode: 'range' },
    emi: { enabled: false },
  },
  financial_projections: {
    monthly: { revenue_low: 0, revenue_high: 0, profit_low: 0, profit_high: 0 },
  },
  setup_cost_breakdown: {
    lines: [{ category: '', label: '', amount: 0 }],
  },
  market_trend_5yr: { narrative: '', chart_caption: '', points: [{ year: 2026, index: 100, note: '' }] },
  market_intelligence: { summary: '', bullets: [''], risks: [''], sources: [''] },
  headcount: { min: 0, max: 0, total: 0, breakdown: [{ role: '', count: 1, type: 'full_time' }] },
  competitors: [
    {
      name: '',
      tag: '',
      description: '',
      funding: '',
      employees: '',
      locations: '',
      threat_level: 'Medium',
      logo_url: null,
    },
  ],
  machinery_list: [
    {
      name: '',
      qty: 1,
      cost_approx: 0,
      category: 'Core Equipment',
      mandatory: 'Required',
      new_or_used: 'Either',
      purpose: '',
      sourcing: '',
    },
  ],
  raw_materials: [
    {
      name: '',
      category: 'Other',
      cost_per_unit: '',
      rate_per_unit: 0,
      source: '',
      notes: '',
      unit: '',
      frequency: '',
    },
  ],
  licenses_required: [
    {
      name: '',
      priority: 'Mandatory',
      authority: '',
      cost: '',
      days: '',
      url: '',
      documents_needed: [],
      notes: '',
    },
  ],
  faqs: [{ q: '', a: '' }],
  govt_scheme_details: [
    {
      scheme: '',
      full_name: '',
      nodal_agency: '',
      apply_at: '',
      max_project_cost: '',
      subsidy: '',
      difficulty: 'medium',
      processing_days: '',
      notes: '',
      benefits: [],
      pros: [],
      cons: [],
      eligibility: [],
    },
  ],
  expert_tips_structured: { Operations: [''] },
}

const shouldUseSqlJsonScaffold = (key: string, value: unknown): boolean => {
  if (!Object.prototype.hasOwnProperty.call(EMPTY_JSONB_SQL_SCAFFOLD, key)) return false
  if (value === null || value === undefined) return true
  if (value === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) return true
  return false
}

/** Admin list links use UUID; bookmarks may use slug — support both. */
const ROUTE_ID_IS_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const readOnlyKeys = new Set(['id', 'created_at', 'search_vector'])

const COUNTRY_CURRENCY_MAP: Record<string, { currency: string, symbol: string, flag: string, source: string }> = {
  'USA':       { currency: 'USD', symbol: '$',   flag: '🇺🇸', source: 'usa' },
  'India':     { currency: 'INR', symbol: '₹',   flag: '🇮🇳', source: 'india' },
  'UAE':       { currency: 'AED', symbol: 'AED', flag: '🇦🇪', source: 'uae' },
  'UK':        { currency: 'GBP', symbol: '£',   flag: '🇬🇧', source: 'uk' },
  'Japan':     { currency: 'JPY', symbol: '¥',   flag: '🇯🇵', source: 'japan' },
  'Korea':     { currency: 'KRW', symbol: '₩',   flag: '🇰🇷', source: 'korea' },
  'Tanzania':  { currency: 'TZS', symbol: 'TSh', flag: '🇹🇿', source: 'tanzania' },
  'Singapore': { currency: 'SGD', symbol: 'S$',  flag: '🇸🇬', source: 'singapore' },
  'Nigeria':   { currency: 'NGN', symbol: '₦',   flag: '🇳🇬', source: 'nigeria' },
}

const VALID_COLUMNS = new Set([
  'slug','title','full_desc','tagline','category_slug',
  'badge','badge_label','status',
  'ease','score','score_label','tags',
  'score_breakdown',
  'setup_min','setup_max',
  'monthly_rev_min','monthly_rev_max','monthly_profit_min','monthly_profit_max',
  'payback_months_min','payback_months_max',
  'pros','cons','competitors',
  'market_demographics','target_customer_pills',
  'state_tags',
  'machinery_list','raw_materials','licenses_required',
  'faqs',
  'govt_schemes','govt_scheme_details','expert_tips_structured',
  'setup_cost_breakdown','calculator_config',
  'headcount','financial_projections',
  'hero_image_url','logo_url','is_saturated','saturation_note',
  'market_intelligence',
  'country',
  'seo_title','seo_description','seo_image_url','seo_canonical_path','seo_noindex',
  'published_at',
])

const TEXT_ARRAY_COLUMNS = new Set([
  'pros',
  'cons',
  'govt_schemes',
  'tags',
  'supplier_tips',
  'similar_slugs',
  'target_customer_pills',
  'state_tags',
  'location_suitability',
  'expert_tips',
])

const cleanPayload = (form: any) =>
  Object.fromEntries(Object.entries(form).filter(([k]) => VALID_COLUMNS.has(k)))

const safeArray = (v: any): any[] => (Array.isArray(v) ? v : [])
const safeStringArray = (v: any): string[] => safeArray(v).map(String).filter(Boolean)
const safeObject = (v: any): Record<string, any> => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

const normalizeFaqs = (faqs: any): any[] => {
  const rows = safeArray(faqs)
  return rows
    .map((r) => {
      const q = String(r?.q ?? r?.question ?? r?.title ?? '').trim()
      const a = String(r?.a ?? r?.answer ?? r?.text ?? '').trim()
      return { ...r, q, a }
    })
    .filter((r) => r.q || r.a)
}

const safeJsonObject = (v: any): Record<string, any> => {
  if (!v) return {}
  if (v && typeof v === 'object' && !Array.isArray(v)) return v
  if (typeof v !== 'string') return {}
  const trimmed = v.trim()
  if (!trimmed) return {}
  try {
    const parsed = JSON.parse(trimmed)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const sanitizeImageUrl = (url: string | null | undefined) => {
  if (!url) return null
  if (url.startsWith('undefined/')) return null
  if (url.includes('://undefined/')) return null
  return url
}

const normalizeForCompare = (value: any): any => {
  if (Array.isArray(value)) return value.map(normalizeForCompare)
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = normalizeForCompare(value[key])
        return acc
      }, {} as Record<string, any>)
  }
  return value
}

const isDeepEqual = (a: any, b: any) => {
  try {
    return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b))
  } catch {
    return a === b
  }
}

/** Indicative FX for admins: USD opportunities use USD→INR; others use INR→target. */
const ExchangeRateSnippet = ({ opportunityCurrency }: { opportunityCurrency: string }) => {
  const cur = String(opportunityCurrency || DEFAULT_DISPLAY_CURRENCY_CODE).toUpperCase()
  const [line, setLine] = useState<{ caption: string; body: string }>({ caption: 'FX', body: '—' })

  useEffect(() => {
    if (cur === 'INR') {
      setLine({ caption: 'Base', body: '₹1.00 INR' })
      return
    }
    if (cur === 'USD') {
      supabase
        .from('exchange_rates')
        .select('rates')
        .eq('base_currency', 'USD')
        .maybeSingle()
        .then(({ data }) => {
          const r = (data?.rates as any)?.INR
          setLine({
            caption: '1 USD ≈',
            body: r != null && Number.isFinite(Number(r)) ? `${Number(r).toFixed(2)} INR` : '—',
          })
        })
      return
    }
    supabase
      .from('exchange_rates')
      .select('rates')
      .eq('base_currency', 'INR')
      .maybeSingle()
      .then(({ data }) => {
        const r = (data?.rates as any)?.[cur]
        setLine({
          caption: '1 INR ≈',
          body: r != null && Number.isFinite(Number(r)) ? `${r} ${cur}` : '—',
        })
      })
  }, [cur])

  return (
    <>
      <div className="text-xs text-muted-foreground">{line.caption}</div>
      <div className="text-sm font-semibold font-bold text-foreground">{line.body}</div>
    </>
  )
}

const AdminOpportunityEditor = () => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { formatMoney, formatSetupCost } = useCurrency()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const [searchParams] = useSearchParams()
  const initialTab = (() => {
    const tab = searchParams.get('tab')
    if (tab) return tab
    const focus = searchParams.get('focus')
    if (focus === 'financials' || focus === 'fit-score') return 'financials'
    return 'core'
  })()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [quickMode, setQuickMode] = useState<'off' | 'json' | 'sql'>('off')
  const [quickText, setQuickText] = useState('')
  const [quickParseError, setQuickParseError] = useState<string | null>(null)
  const quickSeedRef = useRef<string>('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([])
  const [knownOpportunitySlugs, setKnownOpportunitySlugs] = useState<string[]>([])
  const [form, setForm] = useState<OpportunityRow>({})
  const [aiAuditLoading, setAiAuditLoading] = useState(false)
  const [aiAuditError, setAiAuditError] = useState<string | null>(null)
  const [aiAuditNotes, setAiAuditNotes] = useState<string[] | null>(null)
  const [aiAuditSql, setAiAuditSql] = useState<string | null>(null)
  const [completenessBannerDismissed, setCompletenessBannerDismissed] = useState(false)
  const [aiFillLoading, setAiFillLoading] = useState(false)
  const [aiSuggestedKeys, setAiSuggestedKeys] = useState<string[]>([])
  const [rawSetupBreakdown, setRawSetupBreakdown] = useState(false)
  const [rawFaqsJson, setRawFaqsJson] = useState(false)
  const [rawLicensesJson, setRawLicensesJson] = useState(false)
  const [machineryTab, setMachineryTab] = useState<'machinery' | 'raw'>('machinery')
  const previewDraftKey = useMemo(
    () => `admin_opp_preview_${form?.id ?? id ?? form?.slug ?? 'new'}`,
    [form?.id, form?.slug, id],
  )

  const { subdivisions: indiaGeoSubdivisions } = useGeoSubdivisions('IN')
  const indiaStateTagOptions = useMemo(
    () => indiaGeoSubdivisions.map((s) => s.name),
    [indiaGeoSubdivisions],
  )

  const load = async () => {
    setLoading(true)
    const catRes = await supabase.from('categories').select('slug,name').order('name', { ascending: true })
    if (catRes.error) toast('Failed to load categories', { description: catRes.error.message })
    setCategories((catRes.data as any[])?.map(c => ({ slug: c.slug, name: c.name })) ?? [])
    const slugRes = await supabase
      .from('user_opportunities')
      .select('slug')
      .eq('visibility', 'catalog')
      .not('slug', 'is', null)
    if (!slugRes.error) {
      setKnownOpportunitySlugs(
        ((slugRes.data as any[]) ?? [])
          .map((r) => String(r?.slug ?? '').trim())
          .filter(Boolean),
      )
    }

    if (!isNew && id) {
      setLoadError(null)
      let oppRes = ROUTE_ID_IS_UUID.test(id)
        ? await supabase
            .from('user_opportunities')
            .select('*')
            .eq('visibility', 'catalog')
            .eq('id', id)
            .maybeSingle()
        : await supabase
            .from('user_opportunities')
            .select('*')
            .eq('visibility', 'catalog')
            .eq('slug', id)
            .maybeSingle()

      if (!oppRes.data && !oppRes.error) {
        oppRes = ROUTE_ID_IS_UUID.test(id)
          ? await supabase
              .from('user_opportunities')
              .select('*')
              .eq('visibility', 'catalog')
              .eq('slug', id)
              .maybeSingle()
          : await supabase
              .from('user_opportunities')
              .select('*')
              .eq('visibility', 'catalog')
              .eq('id', id)
              .maybeSingle()
      }

      if (oppRes.error) {
        toast('Failed to load opportunity', { description: oppRes.error.message })
        setLoadError(oppRes.error.message)
        setLoading(false)
        return
      }
      if (!oppRes.data) {
        toast('Opportunity not found', { description: 'No row matches this id or slug.' })
        setLoadError('not_found')
        setLoading(false)
        return
      }

      const opp = oppRes.data as OpportunityRow
      const titleStr = String((opp as any)?.title ?? '').trim()
      const slugFromDb = String((opp as any)?.slug ?? '').trim()
      setForm({
        ...opp,
        slug: slugFromDb || slugify(titleStr),
        faqs: normalizeFaqs((opp as any).faqs),
        hero_image_url: sanitizeImageUrl((opp as any).hero_image_url),
        logo_url: sanitizeImageUrl((opp as any).logo_url),
      })
    } else {
      setLoadError(null)
      setForm({
        title: '',
        slug: '',
        status: 'draft',
        source: 'global',
        country: 'USA',
        country_flag: '🇺🇸',
        currency: 'USD',
        currency_symbol: '$',
        is_locked: false,
        is_saturated: false,
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    const tab = searchParams.get('tab')
    const focus = searchParams.get('focus')
    if (tab) {
      setActiveTab(tab)
      return
    }
    if (focus === 'financials' || focus === 'fit-score') setActiveTab('financials')
  }, [searchParams])

  useEffect(() => {
    if (loading) return
    if (searchParams.get('focus') !== 'fit-score') return
    const t = window.setTimeout(() => {
      document.getElementById('sec-fit-score')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [loading, searchParams])

  useEffect(() => {
    if (loading) return
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(previewDraftKey, JSON.stringify(form))
      } catch {}
    }, 150)
    return () => window.clearTimeout(timer)
  }, [form, previewDraftKey, loading])

  useEffect(() => {
    if (!form?.id) {
      setCompletenessBannerDismissed(false)
      return
    }
    setCompletenessBannerDismissed(sessionStorage.getItem(`admin_opp_comp_dismiss_${form.id}`) === '1')
  }, [form?.id])

  const completeness = useMemo(() => getCompletenessScore(form as Record<string, unknown>), [form])

  const editorChecklistItems = useMemo(
    () =>
      getAdminOpportunityEditorChecklist(form as Record<string, unknown>),
    [form],
  )

  const scrollToCompletenessField = (label: string) => {
    const target = COMPLETENESS_SCROLL_TARGETS[label]
    if (!target) return
    setActiveTab(target.tab)
    window.setTimeout(() => {
      const el = document.getElementById(target.anchorId)
      if (el instanceof HTMLDetailsElement) el.open = true
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el?.classList.add('ring-2', 'ring-saffron-400', 'ring-offset-2', 'rounded-xl')
      window.setTimeout(() => {
        el?.classList.remove('ring-2', 'ring-saffron-400', 'ring-offset-2', 'rounded-xl')
      }, 2200)
    }, 80)
  }

  const scrollToChecklistItem = (item: EditorChecklistItem) => {
    if (item.navigateTo) {
      navigate(item.navigateTo)
      return
    }
    setActiveTab(item.tab)
    window.setTimeout(() => {
      const el = document.getElementById(item.anchorId)
      if (el instanceof HTMLDetailsElement) el.open = true
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      el?.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-xl')
      window.setTimeout(() => {
        el?.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'rounded-xl')
      }, 2200)
    }, 80)
  }

  const handleAiFill = async () => {
    const apiKey = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined)?.trim()
    if (!apiKey) {
      toast.error('Missing API key', { description: 'Set VITE_ANTHROPIC_API_KEY in your environment.' })
      return
    }
    setAiFillLoading(true)
    try {
      const setupMin = Number(form.setup_min ?? 0)
      const setupMax = Number(form.setup_max ?? setupMin)
      const userPrompt = `You are filling data for an MSME business opportunity platform.

Business: ${form.title ?? ''}
Category: ${form.category_slug ?? ''}
Setup cost (whole USD): $${setupMin.toLocaleString('en-US')} – $${setupMax.toLocaleString('en-US')}
Current score: ${form.score ?? '—'}

Generate realistic data for this small business opportunity.
Return ONLY valid JSON (no markdown, no preamble) with this exact structure:
{
  "monthly_rev_min": number (whole USD per month),
  "monthly_rev_max": number (whole USD per month),
  "monthly_profit_min": number (whole USD per month),
  "monthly_profit_max": number (whole USD per month),
  "payback_months_min": number,
  "payback_months_max": number,
  "first_profit_months": string (e.g. "3-6 months"),
  "score_breakdown": {
    "profitability": number (0-100),
    "ease": number (0-100),
    "govt_support": number (0-100),
    "market_momentum": number (0-100)
  },
  "financial_projections": {
    "_unit": "USD",
    "monthly": {
      "cogs_pct": number,
      "opex": number (whole USD per month),
      "rent": number (whole USD per month),
      "revenue_low": number (whole USD per month),
      "revenue_high": number (whole USD per month)
    },
    "assumptions": {
      "initial_investment": number (whole USD),
      "loan_amount": number (whole USD),
      "equity_contribution": number (whole USD),
      "loan_interest_rate_pct": number,
      "loan_tenure_options": [number, number]
    },
    "year3": { "revenue": number (whole USD), "ebitda": number (whole USD), "pat_3yr": number (whole USD) },
    "year5": { "revenue": number (whole USD), "ebitda": number (whole USD), "pat_5yr": number (whole USD) }
  },
  "headcount": {
    "min": number,
    "max": number,
    "breakdown": [{ "role": string, "type": "full_time"|"part_time"|"contract", "count": number }]
  },
  "pros": [string, string, string, string],
  "cons": [string, string, string],
  "faqs": [
    { "question": string, "answer": string },
    { "question": string, "answer": string },
    { "question": string, "answer": string }
  ]
}`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
      const text = (data.content ?? [])
        .filter((c) => c?.type === 'text' && typeof c.text === 'string')
        .map((c) => c.text as string)
        .join('')
        .trim()
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      const filled = JSON.parse(clean) as Record<string, unknown>

      const merge: Record<string, unknown> = {}
      const keysApplied: string[] = []
      const topKeys = [
        'monthly_rev_min',
        'monthly_rev_max',
        'monthly_profit_min',
        'monthly_profit_max',
        'payback_months_min',
        'payback_months_max',
        'first_profit_months',
        'score_breakdown',
        'financial_projections',
        'headcount',
        'pros',
        'cons',
        'faqs',
        'full_desc',
      ] as const
      for (const k of topKeys) {
        if (filled[k] == null) continue
        merge[k] = filled[k]
        keysApplied.push(k)
      }

      if (Array.isArray(merge.faqs)) {
        merge.faqs = (merge.faqs as any[])
          .map((f) => ({
            q: String(f?.q ?? f?.question ?? '').trim(),
            a: String(f?.a ?? f?.answer ?? '').trim(),
          }))
          .filter((f) => f.q || f.a)
      }
      if (merge.headcount && typeof merge.headcount === 'object') {
        const hc = { ...(merge.headcount as Record<string, unknown>) }
        const bd = Array.isArray(hc.breakdown) ? hc.breakdown : []
        const allowed = new Set(['skilled', 'unskilled', 'admin', 'full_time', 'part_time', 'contract'])
        hc.breakdown = bd.map((r: any) => {
          const t = String(r?.type ?? 'full_time')
          return {
            role: String(r?.role ?? '').trim(),
            count: Number(r?.count) || 0,
            type: allowed.has(t) ? t : 'full_time',
            monthly_salary: r?.monthly_salary != null ? Number(r.monthly_salary) : undefined,
            notes: r?.notes != null ? String(r.notes) : undefined,
          }
        })
        const tot = (hc.breakdown as any[]).reduce((s, r) => s + (Number(r.count) || 0), 0)
        hc.total = typeof hc.total === 'number' ? hc.total : tot
        hc.min = typeof hc.min === 'number' ? hc.min : tot
        hc.max = typeof hc.max === 'number' ? hc.max : tot
        merge.headcount = hc
      }
      if (Array.isArray(merge.pros)) merge.pros = (merge.pros as unknown[]).map(String).filter(Boolean)
      if (Array.isArray(merge.cons)) merge.cons = (merge.cons as unknown[]).map(String).filter(Boolean)

      setForm((prev) => ({ ...prev, ...merge }))
      setAiSuggestedKeys(keysApplied)
      toast('AI filled fields — review and save when ready')
    } catch {
      toast.error('AI fill failed', { description: 'Try again or fill manually' })
    } finally {
      setAiFillLoading(false)
    }
  }

  const calculatorConfig = useMemo(() => safeJsonObject((form as any)?.calculator_config), [(form as any)?.calculator_config])
  const derivedMarginPct = useMemo(() => {
    const rmax = Number(form.monthly_rev_max ?? 0)
    const pmax = Number(form.monthly_profit_max ?? 0)
    if (rmax > 0 && Number.isFinite(pmax)) return Math.round((pmax / rmax) * 100)
    return null
  }, [form.monthly_rev_max, form.monthly_profit_max])
  const financialCfg = useMemo(() => safeObject(calculatorConfig.financials), [calculatorConfig])
  const revenueMode: 'auto' | 'manual' = financialCfg.revenueMode === 'manual' ? 'manual' : 'auto'
  const breakevenMode: 'auto' | 'manual' = financialCfg.breakevenMode === 'manual' ? 'manual' : 'auto'
  const autoRevenuePctMin = Number.isFinite(Number((financialCfg as any).autoRevenuePctMin)) ? Number((financialCfg as any).autoRevenuePctMin) : null
  const autoRevenuePctMax = Number.isFinite(Number((financialCfg as any).autoRevenuePctMax)) ? Number((financialCfg as any).autoRevenuePctMax) : null

  const setFinancialMode = (key: 'revenueMode' | 'breakevenMode', mode: 'auto' | 'manual') => {
    const base = safeJsonObject((form as any)?.calculator_config)
    const next = { ...base, financials: { ...(safeObject(base.financials)), [key]: mode } }
    setField('calculator_config', next)
  }

  const patchCalculatorDefaults = (patch: { revenue?: Record<string, unknown>; emi?: Record<string, unknown> }) => {
    const base = safeJsonObject((form as any)?.calculator_config)
    const next = {
      ...base,
      ...(patch.revenue != null ? { revenue: { ...safeObject(base.revenue), ...patch.revenue } } : {}),
      ...(patch.emi != null ? { emi: { ...safeObject(base.emi), ...patch.emi } } : {}),
      _derived: false,
    }
    setField('calculator_config', next)
  }

  const calcRevDefaults = useMemo(() => safeObject(calculatorConfig.revenue), [calculatorConfig])
  const calcEmiDefaults = useMemo(() => safeObject(calculatorConfig.emi), [calculatorConfig])

  useEffect(() => {
    if (loading) return
    if (revenueMode !== 'auto') return
    if (autoRevenuePctMin != null && autoRevenuePctMax != null) return

    // Persist a one-time auto % range (so it doesn't "change every time").
    const randInt = (lo: number, hi: number) => Math.floor(lo + Math.random() * (hi - lo + 1))
    const pctMin = randInt(15, 22)
    const pctMax = randInt(Math.min(30, pctMin + 1), 30)

    const base = safeJsonObject((form as any)?.calculator_config)
    const next = {
      ...base,
      financials: {
        ...(safeObject(base.financials)),
        autoRevenuePctMin: pctMin,
        autoRevenuePctMax: pctMax,
      },
    }
    setField('calculator_config', next)
  }, [loading, revenueMode, autoRevenuePctMin, autoRevenuePctMax])

  useEffect(() => {
    if (revenueMode !== 'auto') return
    const min = Number(form.setup_min ?? 0)
    const max = Number(form.setup_max ?? 0)
    if (!Number.isFinite(min) || !Number.isFinite(max) || (!min && !max)) return
    const pctMin = Math.max(0, Number(autoRevenuePctMin ?? 15)) / 100
    const pctMax = Math.max(pctMin, Number(autoRevenuePctMax ?? 30) / 100)
    const revMin = Math.round(min * pctMin)
    const revMax = Math.round(max * pctMax)
    if ((form.monthly_rev_min ?? null) !== revMin) setField('monthly_rev_min', revMin)
    if ((form.monthly_rev_max ?? null) !== revMax) setField('monthly_rev_max', revMax)
  }, [revenueMode, form.setup_min, form.setup_max, autoRevenuePctMin, autoRevenuePctMax])

  useEffect(() => {
    if (breakevenMode !== 'auto') return
    const setupMin = Number(form.setup_min ?? 0)
    const setupMax = Number(form.setup_max ?? 0)
    const profitMin = Number(form.monthly_profit_min ?? 0)
    const profitMax = Number(form.monthly_profit_max ?? 0)
    if (!setupMin || !setupMax || !profitMin || !profitMax) return
    if (!Number.isFinite(setupMin) || !Number.isFinite(setupMax) || !Number.isFinite(profitMin) || !Number.isFinite(profitMax)) return

    const payMin = Math.max(1, Math.ceil(setupMin / profitMax))
    const payMax = Math.max(payMin, Math.ceil(setupMax / profitMin))

    if ((form.payback_months_min ?? null) !== payMin) setField('payback_months_min', payMin)
    if ((form.payback_months_max ?? null) !== payMax) setField('payback_months_max', payMax)
  }, [breakevenMode, form.setup_min, form.setup_max, form.monthly_profit_min, form.monthly_profit_max])

  const knownKeys = useMemo(
    () =>
      new Set([
        ...Array.from(VALID_COLUMNS),
        ...Array.from(readOnlyKeys),
      ]),
    [],
  )

  const otherKeys = useMemo(() => {
    const keys = Object.keys(form ?? {})
    return keys
      .filter(k => !knownKeys.has(k))
      .sort((a, b) => a.localeCompare(b))
  }, [form, knownKeys])

  const expertTipsRows = useMemo(() => {
    const raw = (form as any)?.expert_tips_structured
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object') {
      const rows: any[] = []
      for (const [category, tips] of Object.entries(raw as Record<string, any>)) {
        const list = Array.isArray(tips) ? tips : tips != null ? [tips] : []
        for (const tip of list) {
          const t = String(tip ?? '').trim()
          if (!t) continue
          rows.push({ title: category, tip: t })
        }
      }
      return rows
    }
    return []
  }, [form.expert_tips_structured])

  const setField = (key: string, val: any) => {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const tabFields = useMemo(() => {
    if (activeTab === 'update-all') return Array.from(VALID_COLUMNS).sort()
    return TAB_FIELD_MAP[activeTab] ?? []
  }, [activeTab])
  const tabPayload = useMemo(
    () => Object.fromEntries(tabFields.map((k) => [k, form?.[k]])),
    [tabFields, form],
  )

  const globalMissingDetails = useMemo(() => {
    const missing: string[] = []

    // Core
    if (!form?.title || !String(form.title).trim()) missing.push('title')
    if (!form?.slug || !String(form.slug).trim()) missing.push('slug')
    if (!form?.category_slug) missing.push('category')
    if (!form?.tagline || !String(form.tagline).trim()) missing.push('tagline')
    if (!form?.full_desc || String(form.full_desc).trim().length < 80) missing.push('overview (full_desc)')

    // Financials
    if (!(form?.setup_min && form?.setup_max)) missing.push('setup range')
    if (!(form?.monthly_rev_min && form?.monthly_rev_max)) missing.push('revenue range')
    if (!(form?.monthly_profit_min && form?.monthly_profit_max)) missing.push('profit range')
    if (!(form?.payback_months_min && form?.payback_months_max)) missing.push('payback')
    if (form?.score == null) missing.push('score')

    // Key assets for detail page
    if (!form?.hero_image_url) missing.push('hero image')

    // Setup breakdown
    if (!Array.isArray(form?.machinery_list) || form.machinery_list.length === 0) missing.push('machinery')
    if (!Array.isArray(form?.raw_materials) || form.raw_materials.length === 0) missing.push('raw materials')

    // Compliance/content
    if (!Array.isArray(form?.licenses_required) || form.licenses_required.length === 0) missing.push('licenses')
    if (!Array.isArray(form?.faqs) || form.faqs.length === 0) missing.push('faqs')

    // Market demographics deeper checks (DB + JSON)
    const md = safeParseJson<Record<string, any>>((form as any)?.market_demographics)
    if (!md) {
      missing.push('market_demographics')
    } else {
      const hasAny = (k: string) => md[k] !== null && md[k] !== undefined && String(md[k]).trim() !== ''
      if (!hasAny('market_size_cr')) missing.push('market_demographics.market_size_cr')
      if (!hasAny('market_cagr')) missing.push('market_demographics.market_cagr')
    }

    // Licenses row completeness
    const licenses = Array.isArray((form as any)?.licenses_required) ? ((form as any).licenses_required as any[]) : []
    if (licenses.length > 0) {
      const incomplete = licenses.some((l) => {
        const nameOk = String(l?.name ?? '').trim().length > 0
        const authOk = String(l?.authority ?? '').trim().length > 0
        return !(nameOk && authOk)
      })
      if (incomplete) missing.push('licenses rows missing name/authority')
    }

    // Raw materials completeness
    const raws = Array.isArray((form as any)?.raw_materials) ? ((form as any).raw_materials as any[]) : []
    if (raws.length > 0) {
      const incomplete = raws.some((r) => String(r?.name ?? '').trim().length === 0)
      if (incomplete) missing.push('raw materials rows missing name')
    }

    return missing
  }, [form])

  const coverage = useMemo(() => {
    const coveredSet = new Set(DETAIL_PAGE_FIELD_COVERAGE.flatMap((s) => s.fields))
    const keys = Object.keys(form ?? {})
    const uncoveredPopulated = keys
      .filter((k) => !coveredSet.has(k) && isMeaningfullyPopulated((form as any)?.[k]))
      .sort((a, b) => a.localeCompare(b))

    const coveredMissing = Array.from(coveredSet)
      .filter((k) => !isMeaningfullyPopulated((form as any)?.[k]))
      .sort((a, b) => a.localeCompare(b))

    return { coveredSet, uncoveredPopulated, coveredMissing }
  }, [form])

  const runAiAudit = async () => {
    // This tool is intended for Update All only; force the tab.
    setActiveTab('update-all')
    setAiAuditLoading(true)
    setAiAuditError(null)
    setAiAuditNotes(null)
    setAiAuditSql(null)
    try {
      const payload = {
        id: form?.id ?? null,
        slug: form?.slug ?? null,
        title: form?.title ?? null,
        category_slug: form?.category_slug ?? null,
        country: (form as any)?.country ?? null,
        currency: (form as any)?.currency ?? null,
        tagline: form?.tagline ?? null,
        full_desc: (form as any)?.full_desc ?? null,
        setup_min: (form as any)?.setup_min ?? null,
        setup_max: (form as any)?.setup_max ?? null,
        monthly_rev_min: (form as any)?.monthly_rev_min ?? null,
        monthly_rev_max: (form as any)?.monthly_rev_max ?? null,
        monthly_profit_min: (form as any)?.monthly_profit_min ?? null,
        monthly_profit_max: (form as any)?.monthly_profit_max ?? null,
        derived_margin_pct: derivedMarginPct,
        payback_months_min: (form as any)?.payback_months_min ?? null,
        payback_months_max: (form as any)?.payback_months_max ?? null,
        market_demographics: (form as any)?.market_demographics ?? null,
        competitors: (form as any)?.competitors ?? null,
        machinery_list: (form as any)?.machinery_list ?? null,
        raw_materials: (form as any)?.raw_materials ?? null,
        licenses_required: (form as any)?.licenses_required ?? null,
        faqs: (form as any)?.faqs ?? null,
      }

      const { data, error } = await supabase.functions.invoke('admin-opportunity-audit', {
        body: { opportunity: payload },
      })

      if (error) throw error
      const ok = (data as any)?.success === true
      if (!ok) {
        const msg = typeof (data as any)?.error === 'string' ? (data as any).error : 'AI audit failed'
        throw new Error(msg)
      }

      const parsed = data as AiAuditResponse
      const fixedJson = (parsed as any)?.fixed_json && typeof (parsed as any).fixed_json === 'object' ? (parsed as any).fixed_json : null
      const notes = Array.isArray((parsed as any)?.notes) ? ((parsed as any).notes as any[]).map((s) => String(s)) : null
      setAiAuditNotes(notes)

      const sqlList = Array.isArray((parsed as any)?.sql) ? (parsed as any).sql : []
      const sqlText = sqlList
        .map((s: any) => String(s?.statement ?? '').trim())
        .filter(Boolean)
        .join('\n\n')
      setAiAuditSql(sqlText || null)

      // Autofill + open JSON edit with the fixed JSON.
      if (fixedJson) {
        setForm((prev) => ({ ...(prev as any), ...(fixedJson as any) }))
        setQuickMode('json')
        setQuickText(JSON.stringify(fixedJson, null, 2))
      } else if (sqlText) {
        setQuickMode('sql')
        setQuickText(sqlText)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI audit failed.'
      setAiAuditError(msg)
      toast('AI audit failed', { description: msg })
    } finally {
      setAiAuditLoading(false)
    }
  }

  const scopedMissingDetails = useMemo(() => {
    const missing: string[] = []
    const inScope = (key: string) => tabFields.includes(key)
    if (inScope('title') && (!form?.title || !String(form.title).trim())) missing.push('title')
    if (inScope('slug') && (!form?.slug || !String(form.slug).trim())) missing.push('slug')
    if (inScope('category_slug') && !form?.category_slug) missing.push('category')
    if (inScope('tagline') && (!form?.tagline || !String(form.tagline).trim())) missing.push('tagline')
    if (inScope('full_desc') && (!form?.full_desc || String(form.full_desc).trim().length < 20)) missing.push('overview')
    if ((inScope('setup_min') || inScope('setup_max')) && !(form?.setup_min && form?.setup_max)) missing.push('setup range')
    if ((inScope('monthly_rev_min') || inScope('monthly_rev_max')) && !(form?.monthly_rev_min && form?.monthly_rev_max)) missing.push('revenue range')
    if ((inScope('monthly_profit_min') || inScope('monthly_profit_max')) && !(form?.monthly_profit_min && form?.monthly_profit_max)) {
      missing.push('profit range')
    }
    if ((inScope('payback_months_min') || inScope('payback_months_max')) && !(form?.payback_months_min && form?.payback_months_max)) missing.push('payback')
    if (inScope('score') && form?.score == null) missing.push('score')
    if (inScope('hero_image_url') && !form?.hero_image_url) missing.push('hero image')
    if (inScope('machinery_list') && (!Array.isArray(form?.machinery_list) || form.machinery_list.length === 0)) missing.push('machinery')
    if (inScope('raw_materials') && (!Array.isArray(form?.raw_materials) || form.raw_materials.length === 0)) missing.push('raw materials')
    if (inScope('licenses_required') && (!Array.isArray(form?.licenses_required) || form.licenses_required.length === 0)) missing.push('licenses')
    if (inScope('faqs') && (!Array.isArray(form?.faqs) || form.faqs.length === 0)) missing.push('faqs')
    if (inScope('govt_scheme_details') && (!Array.isArray(form?.govt_scheme_details) || form.govt_scheme_details.length === 0)) missing.push('schemes')
    if (inScope('market_demographics') && !form?.market_demographics) missing.push('demographics')
    return missing
  }, [tabFields, form])

  const toSqlLiteral = (key: string, value: any): string => {
    if (TEXT_ARRAY_COLUMNS.has(key)) {
      const arr = Array.isArray(value) ? value : [value]
      const items = arr
        .map((v) => String(v ?? '').trim())
        .filter(Boolean)
        .map((v) => `'${v.replace(/'/g, "''")}'`)
      return `ARRAY[${items.join(', ')}]`
    }
    if (shouldUseSqlJsonScaffold(key, value)) {
      const template = EMPTY_JSONB_SQL_SCAFFOLD[key]
      return `'${JSON.stringify(template).replace(/'/g, "''")}'::jsonb`
    }
    if (value === null || value === undefined || value === '') return 'NULL'
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
    }
    return `'${String(value).replace(/'/g, "''")}'`
  }

  const tabSql = useMemo(() => {
    const assignments = tabFields
      .filter((key) => VALID_COLUMNS.has(key))
      .map((k) => `${k} = ${toSqlLiteral(k, form?.[k])}`)
      .join(',\n  ')
    return `UPDATE user_opportunities\nSET\n  ${assignments}\nWHERE id = '${form?.id ?? '<id>'}';`
  }, [tabFields, form])

  const splitSqlAssignments = (input: string): string[] => {
    const out: string[] = []
    let buf = ''
    let inQuote = false
    let bracketDepth = 0
    let parenDepth = 0
    let braceDepth = 0
    let inLineComment = false
    let inBlockComment = false
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i]
      const next = input[i + 1]
      if (!inQuote && !inBlockComment && ch === '-' && next === '-') {
        inLineComment = true
      }
      if (!inQuote && !inLineComment && ch === '/' && next === '*') {
        inBlockComment = true
      }
      if (inLineComment) {
        if (ch === '\n') inLineComment = false
        continue
      }
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false
          i += 1
        }
        continue
      }
      if (ch === "'") {
        buf += ch
        if (inQuote && next === "'") {
          buf += next
          i += 1
          continue
        }
        inQuote = !inQuote
        continue
      }
      if (!inQuote) {
        if (ch === '[') bracketDepth += 1
        else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1)
        else if (ch === '(') parenDepth += 1
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1)
        else if (ch === '{') braceDepth += 1
        else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1)
      }
      if (ch === ',' && !inQuote && bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
        const part = buf.trim()
        if (part) out.push(part)
        buf = ''
        continue
      }
      buf += ch
    }
    const tail = buf.trim()
    if (tail) out.push(tail)
    return out
  }

  const extractUpdateParts = (sql: string) => {
    const compact = sql.replace(/\r/g, '').trim().replace(/;+\s*$/, '')
    const lower = compact.toLowerCase()
    let inQuote = false
    let inLineComment = false
    let inBlockComment = false
    let setIdx = -1
    let whereIdx = -1
    for (let i = 0; i < compact.length; i += 1) {
      const ch = compact[i]
      const next = compact[i + 1]
      if (!inQuote && !inBlockComment && ch === '-' && next === '-') {
        inLineComment = true
      }
      if (!inQuote && !inLineComment && ch === '/' && next === '*') {
        inBlockComment = true
      }
      if (inLineComment) {
        if (ch === '\n') inLineComment = false
        continue
      }
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false
          i += 1
        }
        continue
      }
      if (ch === "'") {
        if (inQuote && next === "'") {
          i += 1
          continue
        }
        inQuote = !inQuote
        continue
      }
      if (inQuote) continue
      const hitSet = lower.slice(i, i + 5) === ' set ' || lower.slice(i, i + 5) === '\nset '
      if (setIdx === -1 && hitSet) {
        setIdx = i + 1
        continue
      }
      const hitWhere = lower.slice(i, i + 7) === ' where ' || lower.slice(i, i + 7) === '\nwhere '
      if (setIdx !== -1 && whereIdx === -1 && hitWhere) {
        whereIdx = i + 1
        break
      }
    }
    const updateIdx = lower.indexOf('update ')
    if (updateIdx !== 0 || setIdx === -1 || whereIdx === -1 || whereIdx < setIdx) return null
    const table = compact.slice('update '.length, setIdx).replace(/^set\s+/i, '').trim()
    const setClause = compact.slice(setIdx + 'set '.length, whereIdx).trim()
    const whereClause = compact.slice(whereIdx + 'where '.length).trim()
    return { table, setClause, whereClause }
  }

  const prettifySqlText = (sql: string) => {
    const compact = sql.replace(/\r/g, '').trim().replace(/;+\s*$/, '')
    const parts = extractUpdateParts(compact)
    if (!parts) return compact
    const { table, setClause, whereClause } = parts
    const assignments = splitSqlAssignments(setClause)
    const prettyAssignments = assignments.map((a) => `  ${a}`).join(',\n')
    return `UPDATE ${table}\nSET\n${prettyAssignments}\nWHERE ${whereClause};`
  }

  useEffect(() => {
    const seedKey = `${quickMode}:${activeTab}`
    if (quickMode === 'off') {
      quickSeedRef.current = ''
      setQuickParseError(null)
      return
    }
    if (quickSeedRef.current === seedKey) return
    quickSeedRef.current = seedKey
    if (quickMode === 'json') setQuickText(JSON.stringify(tabPayload, null, 2))
    if (quickMode === 'sql') setQuickText(prettifySqlText(tabSql))
    setQuickParseError(null)
  }, [quickMode, activeTab, tabPayload, tabSql])

  const prettifyQuickText = () => {
    if (quickMode === 'json') {
      try {
        setQuickText(JSON.stringify(JSON.parse(quickText), null, 2))
      } catch {}
      return
    }
    if (quickMode === 'sql') {
      setQuickText(prettifySqlText(quickText))
    }
  }

  const getPatchFromQuickText = () => {
    if (quickMode === 'json') {
      const parsed = JSON.parse(quickText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('JSON must be an object')
      const patch: Record<string, any> = {}
      const parsedKeys = Object.keys(parsed)
      for (const k of tabFields) {
        if (Object.prototype.hasOwnProperty.call(parsed, k)) patch[k] = (parsed as any)[k]
      }
      if (parsedKeys.length > 0 && Object.keys(patch).length === 0) {
        throw new Error(`No editable keys for this tab. Current tab: ${activeTab}`)
      }
      return patch
    }
    if (quickMode === 'sql') {
      const parts = extractUpdateParts(quickText)
      const regexSet = quickText.match(/set([\s\S]*?)where\b/i)?.[1]
      const setClause = parts?.setClause ?? regexSet ?? quickText
      const isFullOpportunitiesUpdate = !!(
        parts && /^user_opportunities\b/i.test(parts.table)
      )
      const editableFields = isFullOpportunitiesUpdate ? Array.from(VALID_COLUMNS) : tabFields
      const patch: Record<string, any> = {}
      const assignments = splitSqlAssignments(setClause)
      if (assignments.length === 0) {
        throw new Error('No SQL assignments found in SET clause.')
      }
      const recognizedKeys: string[] = []
      const scopedKeys: string[] = []
      for (const assignment of assignments) {
        const eqIdx = assignment.indexOf('=')
        if (eqIdx === -1) continue
        const key = assignment.slice(0, eqIdx).trim()
        recognizedKeys.push(key)
        if (!editableFields.includes(key)) continue
        scopedKeys.push(key)
        const raw = assignment.slice(eqIdx + 1).trim()
        patch[key] = parseSqlLiteral(key, raw)
      }
      if (recognizedKeys.length === 0) {
        throw new Error('No valid "field = value" assignments were found in SQL.')
      }
      if (scopedKeys.length === 0) {
        throw new Error(
          isFullOpportunitiesUpdate
            ? 'No editable opportunity fields were recognized in SQL.'
            : `Fields found in SQL are outside this tab scope (${activeTab}). Switch tab or use Update All.`,
        )
      }
      return patch
    }
    return {}
  }

  useEffect(() => {
    if (quickMode === 'off') return
    const timer = window.setTimeout(() => {
      try {
        const patch = getPatchFromQuickText()
        if (Object.keys(patch).length > 0) {
          setForm((prev) => ({ ...prev, ...patch }))
        }
        setQuickParseError(null)
      } catch (e: any) {
        setQuickParseError(e?.message ?? 'Invalid quick edit format')
      }
    }, 220)
    return () => window.clearTimeout(timer)
  }, [quickText, quickMode, tabFields])

  const parseSqlArrayLiteral = (raw: string): string[] => {
    const normalized = raw.trim().replace(/::\w+\[\]\s*$/i, '')
    const inner = normalized.replace(/^ARRAY\s*\[/i, '').replace(/\]$/, '')
    const out: string[] = []
    let buf = ''
    let inQuote = false
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i]
      const next = inner[i + 1]
      if (ch === "'") {
        buf += ch
        if (inQuote && next === "'") {
          buf += next
          i += 1
          continue
        }
        inQuote = !inQuote
        continue
      }
      if (ch === ',' && !inQuote) {
        const part = buf.trim()
        if (part) out.push(part.replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'"))
        buf = ''
        continue
      }
      buf += ch
    }
    const tail = buf.trim()
    if (tail) out.push(tail.replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'"))
    return out
  }

  const parseSqlLiteral = (key: string, raw: string): any => {
    const token = raw
      .trim()
      .replace(/\s+where\b[\s\S]*$/i, '')
      .trim()
    if (token === 'NULL') return null
    if (token === 'TRUE') return true
    if (token === 'FALSE') return false
    if (/^NOW\(\)$/i.test(token)) return new Date().toISOString()
    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token)
    if (/^ARRAY\s*\[/i.test(token)) return parseSqlArrayLiteral(token)
    if (/^'(?:''|[^'])*'::jsonb$/i.test(token)) {
      const str = token.replace(/^'/, '').replace(/'::jsonb$/i, '').replace(/''/g, "'")
      return JSON.parse(str)
    }
    if (/^'(?:''|[^'])*'$/.test(token)) {
      const str = token.replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'")
      if (TEXT_ARRAY_COLUMNS.has(key)) return str ? [str] : []
      return str
    }
    return token
  }

  const applyQuickEdit = () => {
    try {
      const patch = getPatchFromQuickText()
      if (Object.keys(patch).length === 0) {
        throw new Error('No changes detected in current quick edit content.')
      }
      setForm((prev) => ({ ...prev, ...patch }))
      setQuickParseError(null)
      if (quickMode === 'json') toast('Applied JSON changes')
      if (quickMode === 'sql') toast('Applied SQL changes')
    } catch (e: any) {
      setQuickParseError(e?.message ?? 'Invalid format')
      toast.error('Cannot apply quick edit', { description: e?.message ?? 'Invalid format' })
    }
  }

  const labelCls = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1'
  const inputCls = 'w-full px-3 py-2 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  const Field = ({ label, value, onChange, placeholder, type = 'text', multiline = false }: any) => (
    <div>
      <label className={labelCls}>{label}</label>
      {multiline ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className={inputCls + ' resize-none'}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
    </div>
  )

  const MachineryEditor = ({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) => {
    const MACHINE_CATEGORIES = [
      'Core Equipment',
      'Furniture & Display',
      'Technology',
      'Smallwares',
      'Branding',
      'Utilities',
      'Other',
    ]
    const MANDATORY_LEVELS = ['Essential', 'Required', 'Optional']
    const NEW_USED_BASE = ['New', 'Either', 'Used'] as const

    const update = (i: number, patch: Partial<any>) => {
      onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
    }

    const newUsedSelected = (item: any, opt: string) => {
      const cur = String(item.new_or_used ?? '').trim()
      if (!cur) return false
      if (cur === opt) return true
      const low = cur.toLowerCase()
      return low.startsWith(opt.toLowerCase())
    }

    const mandatoryChip: Record<string, string> = {
      Essential: 'bg-red-50 text-destructive border border-red-100',
      Required: 'bg-warning-bg text-warning border border-saffron-100',
      Optional: 'bg-muted text-muted-foreground border border-border-subtle',
    }

    const add = () =>
      onChange([
        ...value,
        {
          name: '',
          qty: 1,
          cost_approx: 0,
          category: 'Core Equipment',
          mandatory: 'Required',
          new_or_used: 'Either',
          purpose: '',
          sourcing: '',
        },
      ])

    return (
      <div className="flex flex-col gap-3">
        {value.map((item, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border-subtle bg-background">
            <div className="flex items-center justify-between border-b border-border-subtle bg-muted/30 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-semibold text-foreground">{item.name || 'Unnamed Machine'}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.category ? (
                  <span className="rounded-full border border-border-subtle px-2 py-0.5 text-xs text-muted-foreground">{item.category}</span>
                ) : null}
                {item.mandatory ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${mandatoryChip[String(item.mandatory)] ?? mandatoryChip.Optional}`}
                  >
                    {item.mandatory}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="col-span-2 flex flex-col gap-1 layout-sm:col-span-1">
                <label className={labelCls}>Machine Name *</label>
                <input
                  type="text"
                  value={item.name ?? ''}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="e.g. Commercial Tea Boiler (10-15L)"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Qty</label>
                <input
                  type="number"
                  min={1}
                  value={item.qty ?? ''}
                  onChange={(e) => update(i, { qty: e.target.value === '' ? 1 : Number(e.target.value) })}
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>
                  Cost approx <span className="font-normal text-muted-foreground">(USD)</span> *
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={item.cost_approx ?? ''}
                    onChange={(e) => update(i, { cost_approx: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className={`${inputCls} pl-7`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Category</label>
                <Select value={item.category ?? '__none__'} onValueChange={(v) => update(i, { category: v === '__none__' ? '' : v })}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select category</SelectItem>
                    {MACHINE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={labelCls}>Mandatory Level</label>
                <div className="flex flex-wrap gap-2">
                  {MANDATORY_LEVELS.map((level) => (
                    <Button
                      key={level}
                      type="button"
                      size="sm"
                      variant={
                        item.mandatory === level
                          ? level === 'Essential'
                            ? 'danger'
                            : 'secondary'
                          : 'secondary'
                      }
                      onClick={() => update(i, { mandatory: level })}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={labelCls}>New / Used</label>
                <div className="flex flex-wrap gap-2">
                  {NEW_USED_BASE.map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      size="sm"
                      variant={newUsedSelected(item, opt) ? 'primary' : 'secondary'}
                      onClick={() => update(i, { new_or_used: opt })}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className={labelCls}>Purpose / Description</label>
                <textarea
                  rows={2}
                  value={item.purpose ?? ''}
                  onChange={(e) => update(i, { purpose: e.target.value })}
                  placeholder="What this machine does and why it's needed"
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className={labelCls}>Where to Source</label>
                <input
                  type="text"
                  value={item.sourcing ?? item.supplier ?? ''}
                  onChange={(e) => update(i, { sourcing: e.target.value })}
                  placeholder="e.g. IndiaMart, local dealer name, brand recommendations"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex justify-end px-4 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                Remove this machine
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          full
          className="border-dashed py-3 text-muted-foreground hover:text-foreground"
          onClick={add}
        >
          + Add Machine
        </Button>
      </div>
    )
  }

  const RawMaterialsEditor = ({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) => {
    const RAW_CATEGORIES = [
      'Beverages',
      'Food Items',
      'Packaging',
      'Operations',
      'Raw Input',
      'Protein',
      'Other',
    ]

    const update = (i: number, patch: Partial<any>) => {
      onChange(value.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
    }

    const add = () =>
      onChange([
        ...value,
        {
          name: '',
          category: 'Other',
          cost_per_unit: '',
          rate_per_unit: 0,
          source: '',
          notes: '',
          unit: '',
          frequency: '',
        },
      ])

    return (
      <div className="flex flex-col gap-3">
        {value.map((item, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border-subtle bg-background">
            <div className="flex items-center justify-between border-b border-border-subtle bg-muted/30 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-semibold text-foreground">{item.name || 'Unnamed Material'}</span>
              </div>
              {item.category ? (
                <span className="shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-xs text-muted-foreground">{item.category}</span>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="col-span-2 flex flex-col gap-1 layout-sm:col-span-1">
                <label className={labelCls}>Material Name *</label>
                <input
                  type="text"
                  value={item.name ?? ''}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="e.g. Coffee Beans, Paper Cups"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Category</label>
                <Select value={item.category ?? '__none__'} onValueChange={(v) => update(i, { category: v === '__none__' ? '' : v })}>
                  <SelectTrigger className={inputCls}>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select category</SelectItem>
                    {RAW_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Cost per unit (display)</label>
                <input
                  type="text"
                  value={item.cost_per_unit ?? ''}
                  onChange={(e) => update(i, { cost_per_unit: e.target.value })}
                  placeholder="e.g. ₹62/litre or $4/kg"
                  className={`${inputCls} font-mono text-sm`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Rate per unit (USD, numeric)</label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={item.rate_per_unit === 0 || item.rate_per_unit == null ? '' : item.rate_per_unit}
                  onChange={(e) =>
                    update(i, { rate_per_unit: e.target.value === '' ? 0 : Number(e.target.value) })
                  }
                  placeholder="For calculations"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Unit</label>
                <input
                  type="text"
                  value={item.unit ?? ''}
                  onChange={(e) => update(i, { unit: e.target.value })}
                  placeholder="kg, litre, piece…"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelCls}>Frequency</label>
                <input
                  type="text"
                  value={item.frequency ?? ''}
                  onChange={(e) => update(i, { frequency: e.target.value })}
                  placeholder="Daily, Weekly, Monthly…"
                  className={inputCls}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className={labelCls}>Source / Supplier</label>
                <input
                  type="text"
                  value={item.source ?? ''}
                  onChange={(e) => update(i, { source: e.target.value })}
                  placeholder="e.g. Local Market, IndiaMart"
                  className={inputCls}
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className={labelCls}>Notes / Description</label>
                <textarea
                  rows={2}
                  value={item.notes ?? ''}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder="Quality tips, sourcing details…"
                  className={inputCls + ' resize-none'}
                />
              </div>
            </div>

            <div className="flex justify-end px-4 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                Remove this material
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          full
          className="border-dashed py-3 text-muted-foreground hover:text-foreground"
          onClick={add}
        >
          + Add Material
        </Button>
      </div>
    )
  }

  const LicensesEditor = ({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

    const update = (i: number, patch: Partial<any>) => {
      const next = value.map((item, idx) => (idx === i ? { ...item, ...patch } : item))
      onChange(next)
      
      // Auto-compute total license costs on the form when licenses change
      const totalMin = next.reduce((sum, lic) => sum + (Number(lic.cost_min) || Number(lic.cost) || 0), 0)
      const totalMax = next.reduce((sum, lic) => sum + (Number(lic.cost_max) || Number(lic.cost) || 0), 0)
      setField('license_cost_min', totalMin)
      setField('license_cost_max', totalMax)
    }

    const priorityColors: Record<string, string> = {
      'Mandatory': 'bg-red-50 text-destructive border-red-100',
      'Nice to Have': 'bg-warning-bg text-warning border-saffron-100',
      'Optional': 'bg-muted text-muted-foreground border-border-subtle',
    }

    return (
      <div className="space-y-2">
        {value.map((item, i) => {
          const isOpen = expandedIndex === i
          // Legacy support for boolean mandatory
          let priority = item.priority
          if (!priority) {
            priority = item.mandatory === true || item.mandatory === 'true' ? 'Mandatory' : 'Optional'
          }
          const mc = priorityColors[priority] ?? priorityColors.Optional

          return (
            <div key={i} className="border border-border-subtle rounded-xl overflow-hidden bg-background">
              <Button
                type="button"
                variant="ghost"
                full
                className="h-auto w-full justify-start gap-3 rounded-none px-4 py-3 font-normal hover:bg-muted/50"
                onClick={() => setExpandedIndex(isOpen ? null : i)}
              >
                <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-semibold shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-foreground truncate">
                  {item.name || 'Unnamed License'}
                </span>
                <span className="text-sm font-semibold text-foreground shrink-0">
                  {item.cost != null && item.cost !== '' ? formatMoney(Number(item.cost)) : '—'}
                </span>
                <span className={`text-[10px] font-semibold font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${mc}`}>
                  {priority}
                </span>
                <span className="text-muted-foreground text-xs shrink-0">{isOpen ? '▲' : '▼'}</span>
              </Button>

              {isOpen && (
                <div className="px-4 pb-4 pt-3 border-t border-border-subtle space-y-3">
                  <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-3">
                    <Field
                      label="License Name *"
                      value={item.name}
                      onChange={(v: string) => update(i, { name: v })}
                      placeholder="e.g. FSSAI, GST Registration"
                    />
                    <div>
                      <label className={labelCls}>Priority</label>
                      <div className="flex gap-2 mt-1">
                        {['Mandatory', 'Nice to Have', 'Optional'].map(level => (
                          <Button
                            key={level}
                            type="button"
                            size="sm"
                            variant={
                              priority === level
                                ? level === 'Mandatory'
                                  ? 'danger'
                                  : 'secondary'
                                : 'secondary'
                            }
                            onClick={() => update(i, { priority: level })}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 layout-sm:grid-cols-3 gap-3">
                    <Field
                      label="Authority"
                      value={item.authority}
                      onChange={(v: string) => update(i, { authority: v })}
                      placeholder="e.g. State Govt, FSSAI"
                    />
                    <Field
                      label="Cost (USD)"
                      value={item.cost}
                      onChange={(v: string) => update(i, { cost: v === '' ? '' : Number(v) })}
                      type="number"
                      placeholder="e.g. 1500"
                    />
                    <Field
                      label="Time (Days)"
                      value={item.days}
                      onChange={(v: string) => update(i, { days: v === '' ? '' : Number(v) })}
                      type="number"
                      placeholder="e.g. 15"
                    />
                  </div>

                  <Field
                    label="Portal URL"
                    value={item.url}
                    onChange={(v: string) => update(i, { url: v })}
                    placeholder="https://..."
                  />

                  <Field
                    label="Documents Needed (one per line)"
                    value={Array.isArray(item.documents_needed) ? item.documents_needed.join('\n') : item.documents_needed || ''}
                    onChange={(v: string) => update(i, { documents_needed: v.split('\n').map(s => s.trim()).filter(Boolean) })}
                    multiline
                    placeholder="Aadhar Card\nPAN Card\nRent Agreement..."
                  />

                  <Field
                    label="Notes"
                    value={item.notes}
                    onChange={(v: string) => update(i, { notes: v })}
                    multiline
                    placeholder="Any specific tips for getting this license..."
                  />

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        onChange(value.filter((_, idx) => idx !== i))
                        setExpandedIndex(null)
                      }}
                    >
                      Remove this license
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <Button
          type="button"
          variant="secondary"
          full
          className="border-dashed py-2.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            onChange([
              ...value,
              { name: '', priority: 'Mandatory', authority: '', cost: '', days: '', url: '', documents_needed: [], notes: '' },
            ])
            setExpandedIndex(value.length)
          }}
        >
          + Add License
        </Button>
      </div>
    )
  }

  const breakdownFields: FieldDef[] = [
    { key: 'role', label: 'Role', type: 'text' },
    { key: 'count', label: 'Count', type: 'number' },
    {
      key: 'type',
      label: 'Type',
      type: 'select',
      options: ['skilled', 'unskilled', 'admin', 'full_time', 'part_time', 'contract'],
    },
    { key: 'monthly_salary', label: 'Monthly Salary', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'text' },
  ]

  const faqFields: FieldDef[] = [
    { key: 'q', label: 'Question', type: 'text' },
    { key: 'a', label: 'Answer', type: 'textarea' },
  ]

  const expertTipFields: FieldDef[] = [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'tip', label: 'Tip', type: 'textarea' },
  ]

  const save = async () => {
    setSaving(true)
    try {
      const derivedForEstimator = deriveEstimatorCompletenessPayload(form)
      const base = cleanPayload(derivedForEstimator)

      const tipsStructured = (() => {
        const raw = (form as any).expert_tips_structured
        if (!raw) return null
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
        const rows = Array.isArray(raw) ? raw : []
        const out: Record<string, string[]> = {}
        for (const r of rows) {
          const category = String(r?.title ?? r?.category ?? 'Tips').trim() || 'Tips'
          const tip = String(r?.tip ?? r?.text ?? '').trim()
          if (!tip) continue
          if (!out[category]) out[category] = []
          out[category].push(tip)
        }
        return Object.keys(out).length ? out : null
      })()

      const prepared: any = {
        ...base,
        visibility: 'catalog',
        research_status: 'complete',
        slug:
          String((base as any)?.slug ?? '').trim() ||
          slugify(String((base as any)?.title ?? (derivedForEstimator as any)?.title ?? '').trim()),
        monthly_profit_min: (derivedForEstimator as any).monthly_profit_min ?? null,
        monthly_profit_max: (derivedForEstimator as any).monthly_profit_max ?? null,
        faqs: normalizeFaqs((derivedForEstimator as any).faqs),
        expert_tips_structured: tipsStructured,
        hero_image_url: sanitizeImageUrl((derivedForEstimator as any).hero_image_url),
        logo_url: sanitizeImageUrl((derivedForEstimator as any).logo_url),
        pros: safeStringArray((derivedForEstimator as any).pros),
        cons: safeStringArray((derivedForEstimator as any).cons),
      }

      delete prepared.margin_pct

      // Headline score = integer average of five canonical fit dimensions (same as product UI).
      const breakdown = prepared.score_breakdown
      if (breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown) && hasCanonicalScoreBreakdown(breakdown)) {
        prepared.score = getFitScoreDisplay(breakdown as Record<string, unknown>, null)
      }

      // Prevent silent UI failures by allowing only existing slugs.
      if (Array.isArray(prepared.similar_slugs)) {
        const selfSlug = String(prepared.slug ?? derivedForEstimator.slug ?? '').trim()
        const validSet = new Set(knownOpportunitySlugs)
        const next = prepared.similar_slugs
          .map((s: any) => String(s ?? '').trim())
          .filter(Boolean)
          .filter((s: string) => s !== selfSlug && validSet.has(s))
        if (next.length !== prepared.similar_slugs.length) {
          toast('Filtered invalid similar slugs', { description: 'Only existing opportunity slugs were kept.' })
        }
        prepared.similar_slugs = Array.from(new Set(next))
      }

      if (!isNew && form?.id) prepared.id = form.id
      if (isNew && profile?.id) prepared.user_id = profile.id

      const { data, error } = await supabase
        .from('user_opportunities')
        .upsert(prepared)
        .select('id')
        .maybeSingle()
      if (error) {
        const full = [error.message, (error as any).details, (error as any).hint, (error as any).code].filter(Boolean).join(' | ')
        toast.error('Save failed', { description: full || 'Unknown database error' })
        return
      }
      if (!data?.id) {
        toast('Save failed', { description: 'No row returned from server.' })
        return
      }
      const savedId = data.id as string
      const verifyFields = Object.keys(prepared).filter((k) => k !== 'id')
      if (savedId && verifyFields.length > 0) {
        const { data: verifyRow, error: verifyError } = await supabase
          .from('user_opportunities')
          .select(verifyFields.join(','))
          .eq('id', savedId)
          .eq('visibility', 'catalog')
          .maybeSingle()
        if (verifyError) {
          toast.error('Saved (verify failed)', { description: verifyError.message })
        } else if (verifyRow) {
          const mismatches = verifyFields.filter((k) => !isDeepEqual((verifyRow as any)[k], (prepared as any)[k]))
          if (mismatches.length > 0) {
            toast.error('Saved with mismatch warning', { description: `Not persisted exactly for: ${mismatches.slice(0, 6).join(', ')}${mismatches.length > 6 ? ' ...' : ''}` })
          } else {
            toast('✓ Saved and verified in Supabase')
          }
        } else {
          toast('✓ Saved', { description: 'Row not returned for verification.' })
        }
      } else {
        toast('✓ Saved')
      }
      setAiSuggestedKeys([])
      if (isNew && savedId) navigate(`/admin/opportunities/${savedId}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading opportunity…</p>
      </div>
    )
  }

  if (!isNew && loadError === 'not_found') {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <NotFoundState
          size="sm"
          message="This URL may be outdated, or the record was removed. Admin uses opportunity id (UUID) from the list."
        >
          <Link to="/admin/opportunities" className="inline-flex text-sm font-semibold text-primary hover:underline">
            ← Back to opportunities
          </Link>
        </NotFoundState>
      </div>
    )
  }

  if (!isNew && loadError && !form?.id) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Could not load</h1>
        <p className="text-sm text-muted-foreground font-semibold">{loadError}</p>
        <Link to="/admin/opportunities" className="inline-flex text-sm font-semibold text-primary hover:underline">
          ← Back to opportunities
        </Link>
      </div>
    )
  }

  if (!isNew && !form?.id) {
    return <Navigate to="/admin/opportunities" replace />
  }

  const headcount = safeObject(form.headcount)
  const headcountBreakdown = safeArray(headcount.breakdown)
  const statusChip = resolveOpportunityStatusChip((form as any)?.badge ?? null, (form as any)?.badge_label ?? null)
  const interestCount = deriveInterestedCount({
    interested_count: (form as any)?.interested_count,
    save_count: (form as any)?.save_count,
    view_count: (form as any)?.view_count,
    score: (form as any)?.score,
  })

  return (
    <div className="pb-28 w-full">
      <div className="mb-5 rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-canvas via-background to-primary-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 layout-sm:flex-row layout-sm:items-start layout-sm:justify-between">
          <div className="min-w-0 space-y-3">
            <Link
              to="/admin/opportunities"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              ← All opportunities
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl layout-sm:text-2xl font-bold text-foreground truncate max-w-full">
                {isNew ? 'New opportunity' : form.title?.trim() || 'Untitled opportunity'}
              </h1>
              {!isNew && form.status && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    form.status === 'published'
                      ? 'bg-success-bg text-success'
                      : form.status === 'archived'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-warning-bg text-warning'
                  }`}
                >
                  {form.status}
                </span>
              )}
              {!isNew ? (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Interest · {interestCount}
                </span>
              ) : null}
              {!isNew && statusChip ? (
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
                  style={{ background: statusChip.bg, color: statusChip.color }}
                  title={String((form as any)?.badge ?? '').trim() || undefined}
                >
                  {statusChip.label}
                </span>
              ) : null}
            </div>
            {!isNew && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {form.slug && (
                  <span className="font-semibold rounded-lg bg-background/90 px-2.5 py-1 border border-border-subtle text-foreground">
                    /{form.slug}
                  </span>
                )}
                {form.id && (
                  <span className="font-semibold rounded-lg bg-background/60 px-2.5 py-1 border border-border-subtle text-muted-foreground" title={form.id}>
                    id · {form.id.slice(0, 8)}…
                  </span>
                )}
                {form.slug && (
                  <a
                    href={`/opportunity/${form.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    View on site ↗
                  </a>
                )}
              </div>
            )}
            {isNew && (
              <p className="text-sm text-muted-foreground">
                Fill in core fields, then save. Set the slug with ↺ Regen from title, blur title when slug is empty, or leave it blank for the DB trigger on insert.
              </p>
            )}
          </div>
          <div className="flex flex-col layout-sm:flex-row gap-2 layout-sm:items-end shrink-0">
            {!isNew && completeness.score < 40 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={aiFillLoading}
                disabled={aiFillLoading}
                className="border-saffron-300 bg-warning-bg shadow-sm hover:bg-warning-bg"
                onClick={() => void handleAiFill()}
              >
                {aiFillLoading ? 'AI filling…' : 'AI Fill'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={saving}
              onClick={save}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {!isNew && completeness.score < 100 && !completenessBannerDismissed ? (
        <div className="rounded-lg border border-saffron-300/50 bg-warning-bg/90 p-4 mb-4">
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="text-sm font-semibold text-saffron-600">
              {completeness.score}% complete — {completeness.missing.length} field{completeness.missing.length !== 1 ? 's' : ''}{' '}
              missing
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-auto w-auto px-2 text-lg leading-none"
              aria-label="Dismiss"
              onClick={() => {
                setCompletenessBannerDismissed(true)
                if (form?.id) sessionStorage.setItem(`admin_opp_comp_dismiss_${form.id}`, '1')
              }}
            >
              ×
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {completeness.missing.map((field) => (
              <Button
                key={field}
                type="button"
                variant="secondary"
                size="sm"
                className="h-auto rounded-full border-saffron-400/60 px-2 py-0.5 text-xs text-saffron-600 hover:bg-warning-bg/80"
                onClick={() => scrollToCompletenessField(field)}
              >
                {field}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {aiSuggestedKeys.length > 0 ? (
        <div className="rounded-lg border border-saffron-400/70 bg-warning-bg p-3 mb-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-saffron-600">Review AI suggestions</span>
          <span className="text-xs text-saffron-600/90">
            Updated: {aiSuggestedKeys.slice(0, 12).join(', ')}
            {aiSuggestedKeys.length > 12 ? ` +${aiSuggestedKeys.length - 12}` : ''} — save to persist.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto underline underline-offset-2"
            onClick={() => setAiSuggestedKeys([])}
          >
            Dismiss highlights
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 layout-lg:grid-cols-[minmax(0,1fr)_520px] gap-4 items-start">
      <div className="bg-background rounded-xl border border-border-subtle shadow-sm p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="-mx-5 border-b border-border-subtle bg-background px-5 py-3">
            <TabsList>
              <TabsTrigger value="core" icon={<Sparkles className="h-4 w-4" />}>Core</TabsTrigger>
              <TabsTrigger value="financials" icon={<Coins className="h-4 w-4" />}>Financials</TabsTrigger>
              <TabsTrigger value="competition" icon={<Shield className="h-4 w-4" />}>Competition</TabsTrigger>
              <TabsTrigger value="setup-cost-breakdown" icon={<ListChecks className="h-4 w-4" />}>Setup Cost Breakdown</TabsTrigger>
              <TabsTrigger value="team" icon={<Users className="h-4 w-4" />}>Team</TabsTrigger>
              <TabsTrigger value="compliance" icon={<ClipboardCheck className="h-4 w-4" />}>Compliance</TabsTrigger>
              <TabsTrigger value="content" icon={<FileText className="h-4 w-4" />}>Content</TabsTrigger>
              <TabsTrigger value="location" icon={<MapPin className="h-4 w-4" />}>Tags</TabsTrigger>
              <TabsTrigger value="other" icon={<Settings2 className="h-4 w-4" />}>Other</TabsTrigger>
              <TabsTrigger value="update-all" icon={<Wrench className="h-4 w-4" />}>Update All</TabsTrigger>
            </TabsList>
            <div className="mt-3 flex items-center gap-2">
              <Button type="button" variant={quickMode === 'json' ? 'primary' : 'secondary'} size="sm" onClick={() => setQuickMode(quickMode === 'json' ? 'off' : 'json')}>
                {quickMode === 'json' ? 'Hide JSON' : 'JSON edit'}
              </Button>
              <Button type="button" variant={quickMode === 'sql' ? 'primary' : 'secondary'} size="sm" onClick={() => setQuickMode(quickMode === 'sql' ? 'off' : 'sql')}>
                {quickMode === 'sql' ? 'Hide SQL' : 'SQL edit'}
              </Button>
              {activeTab === 'update-all' ? (
                <Button type="button" variant="secondary" size="sm" disabled={aiAuditLoading} onClick={() => void runAiAudit()}>
                  {aiAuditLoading ? 'Running AI fix…' : 'Run AI fix'}
                </Button>
              ) : null}
              {activeTab === 'update-all' && aiAuditSql ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuickMode('sql')
                    setQuickText(aiAuditSql)
                  }}
                >
                  Open AI SQL
                </Button>
              ) : null}
              {quickMode !== 'off' && (
                <Button type="button" variant="secondary" size="sm" onClick={prettifyQuickText}>
                  Prettify
                </Button>
              )}
              {quickMode !== 'off' && (
                <Button type="button" variant="secondary" size="sm" onClick={applyQuickEdit}>
                  Apply {quickMode.toUpperCase()}
                </Button>
              )}
            </div>
            {(globalMissingDetails.length > 0 || coverage.uncoveredPopulated.length > 0 || aiAuditError || (activeTab === 'update-all' && (aiAuditNotes || aiAuditSql))) && (
              <div className="mt-3 grid gap-2">
                {globalMissingDetails.length > 0 && (
                  <div className="rounded-md border border-red-100 bg-red-50 p-2">
                    <div className="text-[11px] font-semibold text-destructive mb-1">Missing details (overall)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {globalMissingDetails.slice(0, 1).map((m) => (
                        <span key={m} className="text-[10px] font-semibold text-destructive bg-background border border-red-200 px-1.5 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                      {globalMissingDetails.length > 1 ? (
                        <span className="text-[10px] font-semibold text-destructive bg-background border border-red-200 px-1.5 py-0.5 rounded">
                          +{globalMissingDetails.length - 1} more
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}

                {coverage.uncoveredPopulated.length > 0 && (
                  <div className="rounded-md border border-saffron-100 bg-warning-bg p-2">
                    <div className="text-[11px] font-semibold text-warning mb-1">Populated but not shown on detail page (coverage)</div>
                    <div className="flex flex-wrap gap-1.5">
                      {coverage.uncoveredPopulated.slice(0, 40).map((k) => (
                        <span key={k} className="text-[10px] font-semibold text-warning bg-background border border-saffron-100 px-1.5 py-0.5 rounded">
                          {k}
                        </span>
                      ))}
                      {coverage.uncoveredPopulated.length > 40 && (
                        <span className="text-[10px] font-semibold text-warning bg-background border border-saffron-100 px-1.5 py-0.5 rounded">
                          +{coverage.uncoveredPopulated.length - 40} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {aiAuditError && (
                  <div className="rounded-md border border-red-100 bg-red-50 p-2 text-[11px] font-semibold text-destructive">
                    AI audit failed: {aiAuditError}
                  </div>
                )}

                {activeTab === 'update-all' && (aiAuditNotes || aiAuditSql) ? (
                  <div className="rounded-md border border-border-subtle bg-background p-2">
                    <div className="text-[11px] font-semibold text-foreground mb-1">AI fix</div>
                    {aiAuditNotes?.length ? (
                      <ul className="list-disc pl-4 text-[11px] text-foreground space-y-0.5">
                        {aiAuditNotes.slice(0, 8).map((n, idx) => (
                          <li key={idx}>{n}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-[11px] text-muted-foreground">Applied. Review JSON/SQL and click “Apply”.</div>
                    )}
                    {aiAuditSql ? <div className="mt-1 text-[11px] text-muted-foreground">SQL ready. Use “Open AI SQL”.</div> : null}
                  </div>
                ) : null}
              </div>
            )}
            {quickMode !== 'off' && (
              <div className="mt-2">
                <textarea
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onBlur={prettifyQuickText}
                  rows={10}
                  className="w-full rounded-lg border border-border-subtle bg-background px-3 py-2 font-semibold text-[12px] leading-5"
                />
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Editing only fields mapped to the <span className="font-semibold">{activeTab}</span> tab.
                </div>
                {quickParseError ? (
                  <div className="mt-2 rounded-md border border-red-100 bg-red-50 p-2 text-[11px] font-semibold text-destructive">
                    {quickParseError}
                  </div>
                ) : null}
                {scopedMissingDetails.length > 0 && (
                  <div className="mt-2 rounded-md border border-red-100 bg-red-50 p-2">
                    <div className="text-[11px] font-semibold text-destructive mb-1">Missing details in this scope</div>
                    <div className="flex flex-wrap gap-1.5">
                      {scopedMissingDetails.map((m) => (
                        <span key={m} className="text-[10px] font-semibold text-destructive bg-background border border-red-200 px-1.5 py-0.5 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <TabsContent value="core">
            <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4 mt-4">
              <div id="sec-core-identity" className="scroll-mt-24 layout-sm:col-span-2 h-px w-full" aria-hidden />
              <label className="space-y-1 layout-sm:col-span-2">
                <div className={labelClass}>Title</div>
                <input
                  value={form.title ?? ''}
                  onChange={(e) => setField('title', e.target.value)}
                  onBlur={(e) => {
                    if (!String(form.slug ?? '').trim()) {
                      setField('slug', slugify(e.target.value))
                    }
                  }}
                  className={inputClass}
                />
              </label>

              <div className="space-y-1 layout-sm:col-span-2">
                <div className={labelClass}>
                  Slug{' '}
                  <span className="normal-case font-normal text-muted-foreground text-xs">(auto-generated from title)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    value={form.slug ?? ''}
                    className={`${inputClass} flex-1 cursor-default bg-muted/30 font-mono text-sm text-foreground`}
                    placeholder="auto-generated from title"
                    aria-readonly
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setField('slug', slugify(String(form.title ?? '').trim()))}
                  >
                    ↺ Regen
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  /opportunity/<strong>{form.slug || '…'}</strong>
                </p>
              </div>

              <label className="space-y-1">
                <div className={labelClass}>Tagline</div>
                <input value={form.tagline ?? ''} onChange={(e) => setField('tagline', e.target.value)} className={inputClass} />
              </label>

              <label className="space-y-1">
                <div className={labelClass}>Category</div>
                <Select value={form.category_slug ?? '__none__'} onValueChange={(v) => setField('category_slug', v === '__none__' ? null : v)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1">
                <div className={labelClass}>Status</div>
                <Select value={form.status ?? 'draft'} onValueChange={(v) => setField('status', v)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="published">published</SelectItem>
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1">
                <div className={labelClass}>Badge</div>
                <Select value={form.badge ?? '__none__'} onValueChange={(v) => setField('badge', v === '__none__' ? '' : v)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Badge style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None</SelectItem>
                    {(['trending', 'hot', 'low', 'new', 'global'] as const).map((x) => {
                      const cfg = OPPORTUNITY_STATUS_BADGE_MAP[x]
                      return (
                        <SelectItem key={x} value={x} textValue={`${cfg.label} ${x}`}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                              style={{ backgroundColor: cfg.color }}
                              aria-hidden
                            />
                            <span
                              className="rounded-md px-2 py-0.5 text-xs font-semibold"
                              style={{ color: cfg.color, background: cfg.bg }}
                            >
                              {cfg.label}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">{x}</span>
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-1">
                <div className={labelClass}>Badge Label</div>
                <input value={form.badge_label ?? ''} onChange={(e) => setField('badge_label', e.target.value)} className={inputClass} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {BADGE_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2.5 py-1 text-[11px] hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                      onClick={() => setField('badge_label', prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </label>

              <label className="space-y-1">
                <div className={labelClass}>Country</div>
                <Select
                  value={form.country ?? 'India'}
                  onValueChange={(val) => {
                    const map = COUNTRY_CURRENCY_MAP[val];
                    if (map) {
                      setForm(f => ({
                        ...f,
                        country: val,
                        country_flag: map.flag,
                        source: map.source
                      }));
                    } else {
                      setField('country', val);
                    }
                  }}
                >
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(COUNTRY_CURRENCY_MAP).map(k => (
                      <SelectItem key={k} value={k}>{COUNTRY_CURRENCY_MAP[k].flag} {k}</SelectItem>
                    ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <div className="layout-sm:col-span-2 p-4 bg-muted/30 border border-border-subtle rounded-xl flex items-center gap-6">
                <div className="text-3xl">{form.country_flag ?? '🏳'}</div>
                <div>
                  <div className="text-sm font-bold text-foreground">$ USD</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    All monetary values on this opportunity are stored in whole US dollars (forced on save).
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <ExchangeRateSnippet opportunityCurrency="USD" />
                </div>
              </div>

              <label className="space-y-1">
                <div className={labelClass}>Source</div>
                <Select value={form.source ?? 'global'} onValueChange={(v) => setField('source', v)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">global</SelectItem>
                    <SelectItem value="india">india</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <div id="sec-hero-image" className="space-y-1 layout-sm:col-span-2 scroll-mt-24">
                <ImageUploader
                  label="Hero Image"
                  hint="Wide banner image shown at top of detail page. Recommended: 1200×630px (1.91:1)"
                  value={form.hero_image_url ?? null}
                  onChange={(url) => setField('hero_image_url', url)}
                  folder={`heroes/${form.slug || 'new'}`}
                  aspect="hero"
                />
              </div>

              <div id="sec-logo" className="space-y-1 layout-sm:col-span-2 scroll-mt-24">
                <ImageUploader
                  label="Logo / Brand Icon"
                  hint="Listing cover image shown on opportunity cards and franchise page. Recommended: 1200×675px (16:9). It will be cropped to fit (grid ~190px height; list ~180px height)."
                  value={form.logo_url ?? null}
                  onChange={(url) => setField('logo_url', url)}
                  folder={`logos/${form.slug || 'new'}`}
                  aspect="square"
                />
              </div>

              <div className="flex items-center justify-between gap-3 layout-sm:col-span-2 py-2 border-b border-border-subtle">
                <div>
                  <div className={labelClass}>Require Credits to Unlock</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Users pay credits to view full details</div>
                </div>
                <Switch checked={form.is_locked ?? false} onCheckedChange={(v) => setField('is_locked', v)} />
              </div>

              <div className="flex items-center justify-between gap-3 layout-sm:col-span-2 py-2 border-b border-border-subtle">
                <div>
                  <div className={labelClass}>Market Saturated</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Shows saturation warning on detail page</div>
                </div>
                <Switch checked={form.is_saturated ?? false} onCheckedChange={(v) => setField('is_saturated', v)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financials">
            <div className="flex flex-col layout-sm:flex-row gap-6 mt-4 items-start">
              {/* Main Content Area */}
              <div className="flex-1 min-w-0 space-y-4">

                {/* 1. Setup Cost */}
                <details open id="sec-setup" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">
                      1. Setup Cost <span className="text-xs font-normal text-muted-foreground">(USD)</span>
                    </span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5">
                    <div className="grid grid-cols-1 layout-sm:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">
                          Setup min <span className="text-muted-foreground font-normal">(USD)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                          <input
                            type="number"
                            min={0}
                            value={form.setup_min ?? ''}
                            onChange={(e) => {
                              const next = e.target.value === '' ? null : Number(e.target.value)
                              setForm((f) => ({
                                ...f,
                                setup_min: next,
                              }))
                            }}
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                        {form.setup_min > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Display: {formatMoney(Number(form.setup_min))}</p>
                        )}
                        {form.setup_min > 0 && form.setup_max > 0 && form.setup_min >= form.setup_max && (
                          <div className="text-xs text-red-500">Min must be less than Max</div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">
                          Setup max <span className="text-muted-foreground font-normal">(USD)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                          <input
                            type="number"
                            min={0}
                            value={form.setup_max ?? ''}
                            onChange={(e) => {
                              const next = e.target.value === '' ? null : Number(e.target.value)
                              setForm((f) => ({
                                ...f,
                                setup_max: next,
                              }))
                            }}
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                        {form.setup_max > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Display: {formatMoney(Number(form.setup_max))}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">Setup range (preview)</label>
                        <div className={`${inputClass} bg-muted text-foreground py-2`}>
                          {formatSetupCost(form.setup_min, form.setup_max)}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">Derived client-side from Min/Max (not stored).</div>
                      </div>
                    </div>
                  </div>
                </details>

                {/* 2. Setup cost breakdown */}
                <details id="sec-investment" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden scroll-mt-24">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">2. Setup Cost (Breakdown)</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5 space-y-3">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rawSetupBreakdown}
                        onChange={(e) => setRawSetupBreakdown(e.target.checked)}
                        className="rounded border"
                      />
                      Edit raw JSON
                    </label>
                    {rawSetupBreakdown ? (
                      <textarea
                        value={JSON.stringify(safeArray(form.setup_cost_breakdown), null, 2)}
                        onChange={(e) => {
                          try {
                            const p = JSON.parse(e.target.value)
                            setField('setup_cost_breakdown', Array.isArray(p) ? p : [])
                          } catch {
                            /* keep typing */
                          }
                        }}
                        rows={12}
                        className={`${inputClass} font-mono text-xs`}
                      />
                    ) : (
                    <JsonArrayEditor
                      value={safeArray(form.setup_cost_breakdown)}
                      onChange={(v) => setField('setup_cost_breakdown', v)}
                      fields={[
                        { key: 'item', label: 'Cost Item', type: 'text' },
                        { key: 'min', label: 'Min (USD)', type: 'number' },
                        { key: 'max', label: 'Max (USD)', type: 'number' },
                        { key: 'type', label: 'Type', type: 'select', options: ['one-time', 'working-capital'] },
                        { key: 'notes', label: 'Notes', type: 'text' },
                      ]}
                      itemLabel="Cost Item"
                    />
                    )}
                    <div className="flex items-center gap-4 text-sm font-medium text-foreground bg-muted/30 p-3 rounded-lg border border-border-subtle mt-4">
                      <div>
                        Total Min:{' '}
                        {formatMoney(safeArray(form.setup_cost_breakdown).reduce((sum, item) => sum + (Number(item?.min) || 0), 0))}
                      </div>
                      <div>
                        Total Max:{' '}
                        {formatMoney(safeArray(form.setup_cost_breakdown).reduce((sum, item) => sum + (Number(item?.max) || 0), 0))}
                      </div>
                    </div>
                  </div>
                </details>

                {/* 3. Monthly Revenue */}
                <details id="sec-revenue" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden scroll-mt-24">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">3. Monthly Revenue</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</div>
                        <div className="text-sm font-semibold text-foreground">
                          {revenueMode === 'auto'
                            ? `Auto (${Math.round(Number(autoRevenuePctMin ?? 15))}%–${Math.round(Number(autoRevenuePctMax ?? 30))}% of setup cost)`
                            : 'Manual'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {revenueMode === 'auto'
                            ? 'Revenue range is derived from setup cost. Switch to Manual to edit directly.'
                            : 'Set revenue range manually; profit will still be derived from margin.'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Auto</span>
                        <Switch
                          checked={revenueMode === 'manual'}
                          onCheckedChange={(v) => setFinancialMode('revenueMode', v ? 'manual' : 'auto')}
                        />
                        <span className="text-xs font-semibold text-muted-foreground">Manual</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">
                          Min revenue / month <span className="text-muted-foreground font-normal">(USD)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                          <input
                            type="number"
                            min={0}
                            value={form.monthly_rev_min ?? ''}
                            onChange={(e) => setField('monthly_rev_min', e.target.value === '' ? null : Number(e.target.value))}
                            disabled={revenueMode === 'auto'}
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">
                          Max revenue / month <span className="text-muted-foreground font-normal">(USD)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                          <input
                            type="number"
                            min={0}
                            value={form.monthly_rev_max ?? ''}
                            onChange={(e) => setField('monthly_rev_max', e.target.value === '' ? null : Number(e.target.value))}
                            disabled={revenueMode === 'auto'}
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border-subtle inline-block mt-4">
                      Yearly (display): {formatMoney((form.monthly_rev_min || 0) * 12)} – {formatMoney((form.monthly_rev_max || 0) * 12)}
                    </div>
                  </div>
                </details>

                {/* 4. Monthly Profit */}
                <details id="sec-profit" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden scroll-mt-24">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">4. Monthly Profit</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5">
                    <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">
                          Min profit / month <span className="text-muted-foreground font-normal">(USD)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                          <input
                            type="number"
                            min={0}
                            value={form.monthly_profit_min ?? ''}
                            onChange={(e) => setField('monthly_profit_min', e.target.value === '' ? null : Number(e.target.value))}
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-foreground">
                          Max profit / month <span className="text-muted-foreground font-normal">(USD)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                          <input
                            type="number"
                            min={0}
                            value={form.monthly_profit_max ?? ''}
                            onChange={(e) => setField('monthly_profit_max', e.target.value === '' ? null : Number(e.target.value))}
                            className={`${inputClass} pl-7`}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border-subtle inline-block mt-4">
                      Annual (display): {formatMoney((Number(form.monthly_profit_min || 0)) * 12)} –{' '}
                      {formatMoney((Number(form.monthly_profit_max || 0)) * 12)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-3">
                      Band label: {formatProfitEst(form.monthly_profit_min, form.monthly_profit_max, formatMoney)}
                    </div>
                  </div>
                </details>

                {/* 5. Gross Margin */}
                <details id="sec-margin" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">5. Gross Margin</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5">
                    <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <div className={labelClass}>Margin %</div>
                        <div className="rounded-md border border-border-subtle bg-muted/30 px-3 py-2 text-sm text-foreground">
                          {(form as any).margin_pct != null && Number.isFinite(Number((form as any).margin_pct))
                            ? `${Math.round(Number((form as any).margin_pct))}% (from database, auto-calculated)`
                            : derivedMarginPct != null
                              ? `${derivedMarginPct}% (preview from revenue & profit max)`
                              : '— (enter revenue and profit max first)'}
                        </div>
                        {derivedMarginPct != null && (
                          <div
                            className={`h-3 w-full max-w-[120px] rounded-full flex-shrink-0 mt-1 ${
                              derivedMarginPct > 25
                                ? 'bg-primary'
                                : derivedMarginPct >= 15
                                  ? 'bg-warning'
                                  : 'bg-destructive'
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </details>

                {/* 6. Breakeven / ROI Timeline */}
                <details id="sec-breakeven" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">6. Breakeven / ROI Timeline</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</div>
                        <div className="text-sm font-semibold text-foreground">{breakevenMode === 'auto' ? 'Auto (from setup + margin)' : 'Manual'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {breakevenMode === 'auto'
                            ? 'Payback months are derived from setup and derived monthly profit.'
                            : 'Set payback months manually.'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Auto</span>
                        <Switch
                          checked={breakevenMode === 'manual'}
                          onCheckedChange={(v) => setFinancialMode('breakevenMode', v ? 'manual' : 'auto')}
                        />
                        <span className="text-xs font-semibold text-muted-foreground">Manual</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                      <label className="space-y-1">
                        <div className={labelClass}>Payback Min (months)</div>
                        <input
                          type="number"
                          value={form.payback_months_min ?? ''}
                          onChange={(e) => setField('payback_months_min', e.target.value === '' ? null : Number(e.target.value))}
                          disabled={breakevenMode === 'auto'}
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-1">
                        <div className={labelClass}>Payback Max (months)</div>
                        <input
                          type="number"
                          value={form.payback_months_max ?? ''}
                          onChange={(e) => setField('payback_months_max', e.target.value === '' ? null : Number(e.target.value))}
                          disabled={breakevenMode === 'auto'}
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <div className="text-xs text-muted-foreground mt-3">
                      Preview: {formatPaybackEst(form.payback_months_min, form.payback_months_max)}
                    </div>
                  </div>
                </details>

                {/* 6b. Calculator defaults (product estimator) */}
                <details id="sec-calculator-defaults" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden scroll-mt-24">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">Calculator defaults</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5 space-y-6">
                    <p className="text-xs text-muted-foreground">
                      Values are stored in <code className="text-[11px]">calculator_config</code> (USD for money fields). Editing marks{' '}
                      <code className="text-[11px]">_derived: false</code>.
                    </p>
                    <div>
                      <div className="text-sm font-semibold text-foreground mb-3">Revenue defaults</div>
                      <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                        <label className="space-y-1">
                          <div className={labelClass}>Daily customers</div>
                          <input
                            type="number"
                            className={inputClass}
                            value={calcRevDefaults.default_daily_customers ?? ''}
                            placeholder="50"
                            onChange={(e) =>
                              patchCalculatorDefaults({
                                revenue: {
                                  default_daily_customers: e.target.value === '' ? undefined : Number(e.target.value),
                                },
                              })
                            }
                          />
                        </label>
                        <label className="space-y-1">
                          <div className={labelClass}>
                            Avg bill / ticket <span className="text-muted-foreground font-normal normal-case">(USD)</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                            <input
                              type="number"
                              className={`${inputClass} pl-7`}
                              value={calcRevDefaults.default_avg_bill ?? ''}
                              placeholder="25"
                              onChange={(e) =>
                                patchCalculatorDefaults({
                                  revenue: {
                                    default_avg_bill: e.target.value === '' ? undefined : Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        </label>
                        <label className="space-y-1">
                          <div className={labelClass}>Working days / month</div>
                          <input
                            type="number"
                            className={inputClass}
                            value={calcRevDefaults.default_working_days ?? ''}
                            placeholder="26"
                            onChange={(e) =>
                              patchCalculatorDefaults({
                                revenue: {
                                  default_working_days: e.target.value === '' ? undefined : Number(e.target.value),
                                },
                              })
                            }
                          />
                        </label>
                        <label className="space-y-1">
                          <div className={labelClass}>Unit label</div>
                          <input
                            type="text"
                            className={inputClass}
                            value={calcRevDefaults.unit_label ?? ''}
                            placeholder="customers"
                            onChange={(e) =>
                              patchCalculatorDefaults({ revenue: { unit_label: e.target.value || undefined } })
                            }
                          />
                        </label>
                        <label className="space-y-1 layout-sm:col-span-2">
                          <div className={labelClass}>Bill label</div>
                          <input
                            type="text"
                            className={inputClass}
                            value={calcRevDefaults.bill_label ?? ''}
                            placeholder="Avg Ticket Size"
                            onChange={(e) =>
                              patchCalculatorDefaults({ revenue: { bill_label: e.target.value || undefined } })
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground mb-3">EMI defaults</div>
                      <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                        <label className="space-y-1">
                          <div className={labelClass}>
                            Loan amount <span className="text-muted-foreground font-normal normal-case">(USD)</span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                            <input
                              type="number"
                              className={`${inputClass} pl-7`}
                              value={calcEmiDefaults.default_loan_amount ?? ''}
                              onChange={(e) =>
                                patchCalculatorDefaults({
                                  emi: {
                                    default_loan_amount: e.target.value === '' ? undefined : Number(e.target.value),
                                  },
                                })
                              }
                            />
                          </div>
                        </label>
                        <label className="space-y-1">
                          <div className={labelClass}>Interest rate %</div>
                          <input
                            type="number"
                            className={inputClass}
                            value={calcEmiDefaults.default_interest_rate ?? ''}
                            placeholder="11"
                            onChange={(e) =>
                              patchCalculatorDefaults({
                                emi: {
                                  default_interest_rate: e.target.value === '' ? undefined : Number(e.target.value),
                                },
                              })
                            }
                          />
                        </label>
                        <label className="space-y-1">
                          <div className={labelClass}>Tenure (months)</div>
                          <input
                            type="number"
                            className={inputClass}
                            value={calcEmiDefaults.default_tenure_months ?? ''}
                            placeholder="36"
                            onChange={(e) =>
                              patchCalculatorDefaults({
                                emi: {
                                  default_tenure_months: e.target.value === '' ? undefined : Number(e.target.value),
                                },
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </details>

                {/* 7. Setup Time */}
                <details id="sec-time" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">7. Setup Time</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5">
                    <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                      <label className="space-y-1">
                        <div className={labelClass}>Setup Time / First Profit (months)</div>
                        <input
                          type="text"
                          value={form.first_profit_months ?? ''}
                          onChange={(e) => setField('first_profit_months', e.target.value)}
                          placeholder="e.g. 4-6"
                          className={inputClass}
                        />
                      </label>
                      <label className="space-y-1">
                        <div className={labelClass}>Display Label</div>
                        <input
                          type="text"
                          value={form.first_profit_months ? `${form.first_profit_months} months` : ''}
                          readOnly
                          className={`${inputClass} bg-muted cursor-not-allowed`}
                        />
                      </label>
                    </div>
                  </div>
                </details>

                <details id="sec-financial-projections" open className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden scroll-mt-24">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">Financial projections (structured)</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5 overflow-x-auto">
                    <FinancialsGrid
                      fp={safeJsonObject((form as any).financial_projections)}
                      setFP={(next) => setField('financial_projections', next && Object.keys(next).length ? next : null)}
                    />
                  </div>
                </details>

                {/* 8. Fit score (5 dimensions) */}
                <details open id="sec-fit-score" className="group border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden scroll-mt-24">
                  <summary className="font-bold text-lg px-5 py-4 cursor-pointer list-none flex justify-between items-center outline-none bg-muted/30 border-b border-transparent group-open:border-border-subtle">
                    <span className="flex items-center gap-2">8. Fit score breakdown</span>
                    <span className="transition group-open:rotate-180 text-muted-foreground">
                      <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="p-5">
                    <p className="text-sm text-muted-foreground mb-3">
                      Four dimensions (0–100 each). The headline <span className="font-semibold text-foreground">score</span> column is set on save to the
                      integer average of these values (missing slots count as 0). Extra keys in JSON are preserved but ignored for the headline.
                    </p>
                    <div className="text-sm font-semibold font-semibold text-foreground mb-4 bg-muted/30 border border-border-subtle rounded-lg px-3 py-2 inline-block">
                      Aggregate (preview):{' '}
                      {hasCanonicalScoreBreakdown(form.score_breakdown)
                        ? `${getFitScoreDisplay(form.score_breakdown as Record<string, unknown>, form.score ?? null)}/100`
                        : form.score != null && Number.isFinite(Number(form.score))
                          ? `${Math.round(Number(form.score))}/100`
                          : '—'}
                    </div>
                    <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                      {FIT_SCORE_KEYS.map((key) => {
                        const meta = SCORE_DIMENSION_META[key]
                        const cur = safeObject(form.score_breakdown)[key]
                        const n = typeof cur === 'number' ? cur : Number(cur)
                        const displayVal = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : ''
                        return (
                          <label key={key} className="space-y-1">
                            <div className={labelClass}>{meta.label}</div>
                            <div className="text-xs text-muted-foreground normal-case font-normal tracking-normal">{meta.desc}</div>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={displayVal === '' ? '' : displayVal}
                              onChange={(e) => {
                                const v = e.target.value.trim()
                                const nextBD = { ...safeObject(form.score_breakdown) }
                                if (v === '') {
                                  delete nextBD[key]
                                } else {
                                  const parsed = Math.max(0, Math.min(100, Number(v)))
                                  nextBD[key] = Number.isFinite(parsed) ? parsed : 0
                                }
                                setField('score_breakdown', Object.keys(nextBD).length ? nextBD : null)
                              }}
                              className={inputClass}
                            />
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </details>

              </div>

              {/* Sticky Sidebar */}
              <div className="w-full shrink-0 space-y-1 rounded-xl border border-border-subtle bg-background p-5 shadow-sm layout-lg:w-64">
                <h3 className="font-bold text-foreground mb-4 text-base border-b border-border-subtle pb-2">Quick Navigate</h3>
                <a href="#sec-setup" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">1. Setup Cost</a>
                <a href="#sec-investment" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">2. Investment Required</a>
                <a href="#sec-revenue" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">3. Monthly Revenue</a>
                <a href="#sec-profit" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">4. Monthly Profit</a>
                <a href="#sec-margin" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">5. Gross Margin</a>
                <a href="#sec-breakeven" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">6. Breakeven / ROI</a>
                <a href="#sec-calculator-defaults" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">Calculator defaults</a>
                <a href="#sec-time" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">7. Setup Time</a>
                <a href="#sec-financial-projections" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">Financial projections</a>
                <a href="#sec-fit-score" className="block text-sm font-medium text-muted-foreground hover:text-primary py-1.5 transition-colors">8. Fit score breakdown</a>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="competition">
            <div id="sec-competition" className="mt-4 space-y-6 scroll-mt-24">
              <div>
                <div className="text-sm font-semibold text-foreground mb-2">Competitors</div>
                <CompetitorsEditor value={safeArray(form.competitors) as any} onChange={(v) => setField('competitors', v as any)} />
              </div>

              <div className="border border-border-subtle rounded-lg p-4 bg-muted/30">
                <div className="text-sm font-semibold text-foreground mb-4">Market Opportunity Extras (inside market_demographics)</div>
                <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                  <label className="space-y-1">
                    <div className={labelClass}>Uncaptured market (USD millions)</div>
                    <input
                      type="number"
                      value={form.market_demographics?.uncaptured_market_cr ?? ''}
                      onChange={(e) => {
                        const md = { ...(form.market_demographics || {}) }
                        md.uncaptured_market_cr = e.target.value === '' ? null : Number(e.target.value)
                        setField('market_demographics', md)
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="space-y-1">
                    <div className={labelClass}>Uncaptured Market Note</div>
                    <input
                      type="text"
                      value={form.market_demographics?.uncaptured_market_note ?? ''}
                      onChange={(e) => {
                        const md = { ...(form.market_demographics || {}) }
                        md.uncaptured_market_note = e.target.value
                        setField('market_demographics', md)
                      }}
                      className={inputClass}
                    />
                  </label>
                  <label className="space-y-1 layout-sm:col-span-2">
                    <div className={labelClass}>Market Opportunity Notes</div>
                    <textarea
                      value={form.market_demographics?.market_opportunity_notes ?? ''}
                      onChange={(e) => {
                        const md = { ...(form.market_demographics || {}) }
                        md.market_opportunity_notes = e.target.value
                        setField('market_demographics', md)
                      }}
                      rows={2}
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="location">
            <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1 layout-sm:col-span-2">
                <div className={labelClass}>Tags</div>
                <TagEditor value={safeStringArray(form.tags)} onChange={(v) => setField('tags', v)} placeholder="Type and Enter" />
              </div>
              <div className="space-y-1 layout-sm:col-span-2">
                <div className={labelClass}>Government Schemes</div>
                <TagEditor value={safeStringArray(form.govt_schemes)} onChange={(v) => setField('govt_schemes', v)} placeholder="Type and Enter" />
              </div>
              <div id="sec-state-tags" className="space-y-1 layout-sm:col-span-2 scroll-mt-24">
                <div className={labelClass}>State Tags</div>
                <MultiSelectDropdown
                  value={safeStringArray(form.state_tags)}
                  options={indiaStateTagOptions}
                  onChange={(v) => setField('state_tags', v)}
                  placeholder="Select states"
                  searchPlaceholder="Search states…"
                />
              </div>
              <div id="sec-location-suitability" className="space-y-1 layout-sm:col-span-2 scroll-mt-24">
                <div className={labelClass}>Location Suitability</div>
                <MultiSelectDropdown
                  value={safeStringArray(form.location_suitability)}
                  options={LOCATION_SUITABILITY_OPTIONS}
                  onChange={(v) => setField('location_suitability', v)}
                  placeholder="Select suitability"
                  searchPlaceholder="Search suitability…"
                />
              </div>
              <div id="sec-similar-slugs" className="space-y-1 layout-sm:col-span-2 scroll-mt-24">
                <div className={labelClass}>Similar Slugs</div>
                <TagEditor value={safeStringArray(form.similar_slugs)} onChange={(v) => setField('similar_slugs', v)} placeholder="Type and Enter" />
              </div>
              <div id="sec-target-pills" className="space-y-1 layout-sm:col-span-2 scroll-mt-24">
                <div className={labelClass}>Target customer pills</div>
                <TagEditor
                  value={safeStringArray(form.target_customer_pills)}
                  onChange={(v) => setField('target_customer_pills', v)}
                  placeholder="Type and Enter"
                />
              </div>
              <label className="space-y-1 layout-sm:col-span-2">
                <div className={labelClass}>Target customer (summary)</div>
                <textarea
                  value={form.target_customer ?? ''}
                  onChange={(e) => setField('target_customer', e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </label>
              <label className="space-y-1 layout-sm:col-span-2">
                <div className={labelClass}>Market size (note)</div>
                <input
                  value={form.market_size ?? ''}
                  onChange={(e) => setField('market_size', e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </TabsContent>

          <TabsContent value="setup-cost-breakdown">
            <div id="sec-machinery" className="mt-4 space-y-4 scroll-mt-24">
              {(() => {
                const machinery = safeArray(form.machinery_list)
                const rawMaterials = safeArray(form.raw_materials)
                const machineryTotal = machinery.reduce((sum: number, m: any) => sum + (Number(m?.cost_approx) || 0) * (Number(m?.qty) || 1), 0)
                const rawAnnualTotal = rawMaterials.reduce((sum: number, r: any) => {
                  const rate = Number(r?.rate_per_unit ?? r?.rate ?? r?.cost)
                  const qty = Number(r?.annual_qty_100pct ?? r?.annual_qty ?? r?.annual_quantity)
                  if (!Number.isFinite(rate) || !Number.isFinite(qty)) return sum
                  return sum + rate * qty
                }, 0)
                const fmt = (n: number) => formatMoney(n)
                return (
                  <div className="border border-border-subtle rounded-xl bg-background shadow-sm overflow-hidden">
                    <div className="px-5 py-4 bg-muted/30 border-b border-border-subtle">
                      <div className="font-bold text-lg">Investment breakdown</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Machinery is the primary capex. Raw materials shown as annualized estimate when available.
                      </div>
                    </div>
                    <div className="p-5 grid grid-cols-1 layout-sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border-subtle p-4">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Machinery total</div>
                        <div className="mt-1 text-lg font-semibold font-bold text-foreground">{machineryTotal > 0 ? fmt(machineryTotal) : '—'}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{machinery.length} items</div>
                      </div>
                      <div className="rounded-xl border border-border-subtle p-4">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Raw materials (annual)</div>
                        <div className="mt-1 text-lg font-semibold font-bold text-foreground">{rawAnnualTotal > 0 ? fmt(rawAnnualTotal) : '—'}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{rawMaterials.length} items</div>
                      </div>
                      <div className="rounded-xl border border-border-subtle p-4">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Combined</div>
                        <div className="mt-1 text-lg font-semibold font-bold text-foreground">{(machineryTotal + rawAnnualTotal) > 0 ? fmt(machineryTotal + rawAnnualTotal) : '—'}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Capex + annual opex estimate</div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="mt-4 flex flex-wrap gap-2">
                {(['machinery', 'raw'] as const).map((tab) => (
                  <Button
                    key={tab}
                    type="button"
                    size="sm"
                    variant={machineryTab === tab ? 'primary' : 'secondary'}
                    onClick={() => setMachineryTab(tab)}
                  >
                    {tab === 'machinery' ? '🏭 Machinery' : '📦 Raw Materials'}
                  </Button>
                ))}
              </div>

              {machineryTab === 'machinery' ? (
                <div className="mt-4">
                  <MachineryEditor value={safeArray(form.machinery_list)} onChange={(v) => setField('machinery_list', v)} />
                </div>
              ) : (
                <div className="mt-4">
                  <RawMaterialsEditor value={safeArray(form.raw_materials)} onChange={(v) => setField('raw_materials', v)} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div id="sec-headcount" className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4 mt-4 scroll-mt-24">
              {[
                ['total', 'Total'],
                ['skilled', 'Skilled'],
                ['unskilled', 'Unskilled'],
                ['admin', 'Admin'],
              ].map(([k, label]) => (
                <label key={k} className="space-y-1">
                  <div className={labelClass}>{label}</div>
                  <input
                    type="number"
                    value={headcount[k] ?? ''}
                    onChange={(e) => {
                      const next = { ...headcount, [k]: e.target.value === '' ? null : Number(e.target.value) }
                      setField('headcount', next)
                    }}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border-subtle bg-muted/30 p-4 space-y-3">
              <div className="text-sm font-semibold text-foreground">Monthly payroll band (detail estimator)</div>
              <p className="text-xs text-muted-foreground">
                Stored in <code className="text-[11px]">headcount</code> as monthly payroll in <strong>local currency</strong> (full units per month). Leave blank to infer from role breakdown salaries. The revenue estimator converts this to USD using exchange rates.
              </p>
              <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <div className={labelClass}>Payroll min (local / month)</div>
                  <input
                    type="number"
                    value={headcount.monthly_payroll_min ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value)
                      setField('headcount', { ...headcount, monthly_payroll_min: v })
                    }}
                    className={inputClass}
                    placeholder="e.g. 120000"
                  />
                </label>
                <label className="space-y-1">
                  <div className={labelClass}>Payroll max (local / month)</div>
                  <input
                    type="number"
                    value={headcount.monthly_payroll_max ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number(e.target.value)
                      setField('headcount', { ...headcount, monthly_payroll_max: v })
                    }}
                    className={inputClass}
                    placeholder="e.g. 180000"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm font-semibold text-foreground mb-2">Breakdown</div>
              <JsonArrayEditor
                value={headcountBreakdown}
                onChange={(v) => {
                  const tot = v.reduce((s, r) => s + (Number((r as any)?.count) || 0), 0)
                  setField('headcount', { ...headcount, breakdown: v, total: tot })
                }}
                fields={breakdownFields}
                itemLabel="Role"
              />
            </div>
          </TabsContent>

          <TabsContent value="compliance">
            <div className="mt-4 space-y-6">
              <div id="sec-licenses" className="scroll-mt-24">
                <div className="text-sm font-semibold text-foreground mb-2">Licenses Required</div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rawLicensesJson}
                    onChange={(e) => setRawLicensesJson(e.target.checked)}
                    className="rounded border"
                  />
                  Edit raw JSON
                </label>
                {rawLicensesJson ? (
                  <textarea
                    value={JSON.stringify(safeArray(form.licenses_required), null, 2)}
                    onChange={(e) => {
                      try {
                        const p = JSON.parse(e.target.value)
                        setField('licenses_required', Array.isArray(p) ? p : [])
                      } catch {
                        /* */
                      }
                    }}
                    rows={14}
                    className={`${inputClass} font-mono text-xs`}
                  />
                ) : (
                <LicensesEditor
                  value={safeArray(form.licenses_required)}
                  onChange={(v) => setField('licenses_required', v)}
                />
                )}
              </div>
              <div id="sec-govt-schemes" className="scroll-mt-24">
                <div className="text-sm font-semibold text-foreground mb-2">Government Scheme Details</div>
                <GovtSchemesEditor
                  value={safeArray(form.govt_scheme_details)}
                  onChange={(v) => setField('govt_scheme_details', v)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="mt-4 space-y-6">
              <div
                id="sec-full-desc"
                className={`rounded-xl border border-border-subtle bg-background p-5 space-y-4 scroll-mt-24 ${aiSuggestedKeys.includes('full_desc') ? 'ring-2 ring-saffron-300' : ''}`}
              >
                <div className="text-sm font-semibold text-foreground">Description</div>
                <label className="space-y-1 block">
                  <div className={labelClass}>Full description (overview)</div>
                  <textarea
                    value={form.full_desc ?? ''}
                    onChange={(e) => setField('full_desc', e.target.value)}
                    rows={10}
                    className={inputClass}
                    placeholder="Rich overview for the detail page…"
                  />
                </label>
              </div>

              <Accordion
                id="sec-pros-cons"
                type="multiple"
                defaultValue={['faqs', 'tips', 'pros', 'cons']}
                className="w-full border border-border-subtle rounded-xl overflow-hidden bg-background scroll-mt-24"
              >
                <AccordionItem value="faqs" className="border-b border-border-subtle">
                  <AccordionTrigger className="px-5 hover:no-underline">FAQs</AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <div id="sec-faqs" className={`space-y-3 scroll-mt-24 ${aiSuggestedKeys.includes('faqs') ? 'ring-2 ring-saffron-300 rounded-lg p-2 -m-2' : ''}`}>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rawFaqsJson}
                          onChange={(e) => setRawFaqsJson(e.target.checked)}
                          className="rounded border"
                        />
                        Edit raw JSON
                      </label>
                      {rawFaqsJson ? (
                        <textarea
                          value={JSON.stringify(normalizeFaqs(form.faqs), null, 2)}
                          onChange={(e) => {
                            try {
                              const p = JSON.parse(e.target.value)
                              setField('faqs', Array.isArray(p) ? p : [])
                            } catch {
                              /* */
                            }
                          }}
                          rows={14}
                          className={`${inputClass} font-mono text-xs`}
                        />
                      ) : (
                        <JsonArrayEditor value={safeArray(form.faqs)} onChange={(v) => setField('faqs', v)} fields={faqFields} itemLabel="FAQ" />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tips" className="border-b border-border-subtle">
                  <AccordionTrigger className="px-5 hover:no-underline">Expert Tips</AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Structured Tips</div>
                      <JsonArrayEditor
                        value={expertTipsRows}
                        onChange={(v) => setField('expert_tips_structured', v)}
                        fields={expertTipFields}
                        itemLabel="Tip"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pros" className="border-b border-border-subtle">
                  <AccordionTrigger className="px-5 hover:no-underline">The Good's (Pros)</AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 space-y-2">
                      <StringListEditor
                        label="Pros"
                        hint="Key advantages, strengths, and tailwinds. 4–6 items ideal."
                        value={safeStringArray(form.pros)}
                        onChange={(v) => setField('pros', v)}
                        highlight={aiSuggestedKeys.includes('pros')}
                      />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cons" className="border-b-0">
                  <AccordionTrigger className="px-5 hover:no-underline">The Bad's (Cons)</AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 space-y-2">
                    <StringListEditor
                      label="Cons"
                      hint="Honest risks and challenges — builds trust."
                      value={safeStringArray(form.cons)}
                      onChange={(v) => setField('cons', v)}
                      highlight={aiSuggestedKeys.includes('cons')}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          <TabsContent value="other">
            <div id="sec-seo-extra" className="mt-4 space-y-4 scroll-mt-24">
              <div className="bg-muted/30 border border-border-subtle rounded-lg p-3">
                <div className="text-sm font-semibold text-foreground mb-1">Read-only</div>
                <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-3">
                  {['id', 'created_at', 'search_vector'].map((k) => (
                    <label key={k} className="space-y-1">
                      <div className={labelClass}>{k}</div>
                      <input value={form[k] ?? ''} readOnly className={`${inputClass} font-semibold bg-muted`} />
                    </label>
                  ))}
                </div>
              </div>

              {otherKeys.length === 0 ? (
                <div className="text-sm text-muted-foreground">No extra fields.</div>
              ) : (
                <div className="grid grid-cols-1 layout-sm:grid-cols-2 gap-4">
                  {otherKeys.map((k) => {
                    const v = form[k]
                    const isBool = typeof v === 'boolean'
                    const isNum = typeof v === 'number'
                    const isArr = Array.isArray(v)
                    const isObj = v && typeof v === 'object' && !isArr
                    const readOnly = readOnlyKeys.has(k)

                    if (readOnly) {
                      return (
                        <label key={k} className="space-y-1 layout-sm:col-span-2">
                          <div className={labelClass}>{k}</div>
                          <input value={String(v ?? '')} readOnly className={`${inputClass} font-semibold bg-muted`} />
                        </label>
                      )
                    }

                    if (isBool) {
                      return (
                        <div
                          key={k}
                          className="flex items-center justify-between gap-3 layout-sm:col-span-2 py-2 border-b border-border-subtle"
                        >
                          <div className={labelClass}>{k}</div>
                          <Switch checked={Boolean(v)} onCheckedChange={(val) => setField(k, val)} />
                        </div>
                      )
                    }

                    if (isArr || isObj) {
                      return (
                        <label key={k} className="space-y-1 layout-sm:col-span-2">
                          <div className={labelClass}>{k}</div>
                          <textarea
                            value={JSON.stringify(v ?? (isArr ? [] : {}), null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                setField(k, parsed)
                              } catch {
                                setField(k, e.target.value)
                              }
                            }}
                            rows={6}
                            className={`${inputClass} font-semibold`}
                          />
                        </label>
                      )
                    }

                    return (
                      <label key={k} className="space-y-1">
                        <div className={labelClass}>{k}</div>
                        <input
                          type={isNum ? 'number' : 'text'}
                          value={v ?? ''}
                          onChange={(e) => setField(k, e.target.value)}
                          className={inputClass}
                        />
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="update-all">
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border-subtle bg-muted/30 p-4 text-[13px] text-foreground">
                Use <span className="font-semibold">JSON edit</span> or <span className="font-semibold">SQL edit</span> above to update the entire opportunity in one pass.
                This tab maps to all editable columns.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <aside className="max-h-[calc(100vh-80px)] overflow-hidden overflow-y-auto rounded-xl border border-border-subtle bg-background shadow-sm">
        <div className="space-y-3 p-3">
          {!isNew && form.id ? (
            <AdminOpportunityEditorChecklistPanel items={editorChecklistItems} onJump={scrollToChecklistItem} />
          ) : null}
          {!isNew && form.id && (
            <AdminOpportunityAnalyticsSidebar opportunityId={form.id} slug={form.slug} />
          )}
        </div>
        <div className="p-3 border-t border-border-subtle">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-border-subtle">
            <div>
              <div className="text-sm font-semibold text-foreground">Live preview</div>
              <div className="text-xs text-muted-foreground">Editing: {activeTab}</div>
            </div>
          {form.slug ? (
            <a
              href={`/opportunity/${form.slug}?previewDraft=${encodeURIComponent(previewDraftKey)}&focus=${encodeURIComponent(activeTab)}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Open full ↗
            </a>
          ) : null}
        </div>
        {form.slug ? (
          <iframe
            title="Opportunity live preview"
            src={`/opportunity/${form.slug}?previewDraft=${encodeURIComponent(previewDraftKey)}&focus=${encodeURIComponent(activeTab)}`}
            className="w-full h-[78vh] rounded-lg mt-3 border border-border-subtle"
          />
        ) : (
            <div className="mt-3 rounded-lg border border-border-subtle bg-muted/30 p-4 text-sm text-muted-foreground">
              Save once with a slug to enable live preview.
            </div>
          )}
        </div>
      </aside>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-background/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)] py-3 px-4 flex items-center justify-between gap-3"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <span className="text-xs text-muted-foreground truncate hidden layout-sm:block">
          {isNew ? 'Draft — save to create' : `Editing · ${form.slug || form.id?.slice(0, 8)}`}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <Link
            to="/admin/opportunities"
            className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted"
          >
            Cancel
          </Link>
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={saving}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function validateFP(fp: Record<string, any>): Record<string, string> {
  const e: Record<string, string> = {}
  const m = fp?.monthly ?? {}
  const a = fp?.assumptions ?? {}

  if ((m.revenue_low ?? 0) < 0) e.revenue_low = 'Cannot be negative'
  if ((m.revenue_high ?? 0) < 0) e.revenue_high = 'Cannot be negative'
  if (m.revenue_low != null && m.revenue_high != null) {
    if (m.revenue_low >= m.revenue_high) e.revenue_high = 'Must be greater than Revenue Low'
  }
  if (m.cogs_pct != null && (m.cogs_pct < 0 || m.cogs_pct > 100)) e.cogs_pct = '0–100 only'
  if (m.cogs_min != null && (m.cogs_min < 0 || m.cogs_min > 100)) e.cogs_min = 'COGS min: 0–100%'
  if (m.cogs_max != null && (m.cogs_max < 0 || m.cogs_max > 100)) e.cogs_max = 'COGS max: 0–100%'
  if (m.cogs_min != null && m.cogs_max != null && m.cogs_min >= m.cogs_max) e.cogs_max = 'COGS max must be > min'
  if (m.opex_min_pct != null && (m.opex_min_pct < 0 || m.opex_min_pct > 100)) e.opex_min_pct = 'OpEx min: 0–100%'
  if (m.opex_max_pct != null && (m.opex_max_pct < 0 || m.opex_max_pct > 100)) e.opex_max_pct = 'OpEx max: 0–100%'
  if (m.opex_min_pct != null && m.opex_max_pct != null && m.opex_min_pct >= m.opex_max_pct) e.opex_max_pct = 'OpEx max % must be > min %'
  if ((m.opex ?? 0) < 0) e.opex = 'Cannot be negative'
  if ((m.rent ?? 0) < 0) e.rent = 'Cannot be negative'
  if (a.loan_amount != null && a.initial_investment != null && a.loan_amount > a.initial_investment) e.loan_amount = 'Cannot exceed Initial Investment'
  if (a.equity_contribution != null && a.loan_amount != null && a.initial_investment != null) {
    const sum = Number(a.equity_contribution) + Number(a.loan_amount)
    if (Math.abs(sum - Number(a.initial_investment)) > 0.05)
      e.equity = `Equity+Loan $${Math.round(sum).toLocaleString('en-US')} ≠ Investment $${Math.round(Number(a.initial_investment)).toLocaleString('en-US')}`
  }
  if (a.loan_interest_rate_pct != null && (a.loan_interest_rate_pct < 5 || a.loan_interest_rate_pct > 24)) e.rate = 'Interest must be 5–24%'
  return e
}

function deriveEstimatorCompletenessPayload(input: any): any {
  const next = { ...(input ?? {}) }

  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
  const toNum = (v: any): number | null => {
    const n = typeof v === 'number' ? v : v == null ? NaN : Number(v)
    return Number.isFinite(n) ? n : null
  }

  const oppUsdAmt = (value: any): number => {
    const n = toNum(value)
    if (n == null || !Number.isFinite(n) || n <= 0) return 0
    return n
  }

  // ---- financial_projections (all money fields are whole USD) ----
  const fp = { ...(next.financial_projections ?? {}) }
  const monthly = { ...(fp.monthly ?? {}) }
  const assumptions = { ...(fp.assumptions ?? {}) }

  // Revenue mid (USD) drives default OPEX and OpEx % bands.
  const revenueLowUsd = toNum(monthly.revenue_low) ?? 0
  const revenueHighUsd = toNum(monthly.revenue_high) ?? 0
  const revenueMidUsd =
    revenueLowUsd > 0 && revenueHighUsd > 0
      ? (revenueLowUsd + revenueHighUsd) / 2
      : revenueLowUsd > 0
        ? revenueLowUsd
        : revenueHighUsd

  const cogsPct = toNum(monthly.cogs_pct)
  if (cogsPct == null) monthly.cogs_pct = 45
  const derivedCogsPct = toNum(monthly.cogs_pct) ?? 45

  if (toNum(monthly.opex) == null) {
    // Approximate: default OPEX at ~15% of revenue mid.
    monthly.opex = revenueMidUsd > 0 ? revenueMidUsd * 0.15 : 0
  }

  // COGS % band required by estimator: monthly.cogs_min / monthly.cogs_max
  if (toNum(monthly.cogs_min) == null) {
    monthly.cogs_min = derivedCogsPct <= 0 ? 20 : Math.round(clamp(derivedCogsPct * 0.7, 0, 100))
  }
  if (toNum(monthly.cogs_max) == null) {
    monthly.cogs_max = derivedCogsPct <= 0 ? 80 : Math.round(clamp(derivedCogsPct * 1.3, 0, 100))
  }
  const cMin = toNum(monthly.cogs_min) ?? 20
  let cMax = toNum(monthly.cogs_max) ?? 80
  if (!Number.isFinite(cMax) || cMax <= cMin) cMax = Math.min(100, cMin + 15)
  monthly.cogs_min = Math.round(clamp(cMin, 0, 100))
  monthly.cogs_max = Math.round(clamp(cMax, 0, 100))

  // OpEx % band required by estimator: monthly.opex_min_pct / monthly.opex_max_pct
  const opexUsd = toNum(monthly.opex) ?? 0
  const baseOpexPct = revenueMidUsd > 0 ? (opexUsd / revenueMidUsd) * 100 : null
  const defaultOpexPct = baseOpexPct != null && Number.isFinite(baseOpexPct) && baseOpexPct > 0 ? baseOpexPct : 15

  if (toNum(monthly.opex_min_pct) == null) monthly.opex_min_pct = Math.round(clamp(defaultOpexPct * 0.6, 0, 100))
  if (toNum(monthly.opex_max_pct) == null) monthly.opex_max_pct = Math.round(clamp(defaultOpexPct * 1.6, 0, 100))

  const oMin = toNum(monthly.opex_min_pct) ?? 5
  let oMax = toNum(monthly.opex_max_pct) ?? 60
  if (!Number.isFinite(oMax) || oMax <= oMin) oMax = Math.min(100, oMin + 10)
  monthly.opex_min_pct = Math.round(clamp(oMin, 0, 100))
  monthly.opex_max_pct = Math.round(clamp(oMax, 0, 100))

  fp.monthly = monthly
  fp.assumptions = assumptions
  fp._unit = 'USD'
  next.financial_projections = fp

  // ---- headcount ----
  const hc = { ...(next.headcount ?? {}) }
  const breakdown = Array.isArray(hc.breakdown) ? [...hc.breakdown] : []

  const revenueMinUsd = oppUsdAmt(next.monthly_rev_min)
  const revenueMaxUsd = oppUsdAmt(next.monthly_rev_max)
  const revenueMidOppUsd =
    revenueMinUsd > 0 && revenueMaxUsd > 0
      ? (revenueMinUsd + revenueMaxUsd) / 2
      : revenueMaxUsd > 0
        ? revenueMaxUsd
        : revenueMinUsd
  const fallbackRevenueMidUsd =
    Number.isFinite(revenueMidOppUsd) && (revenueMidOppUsd ?? 0) > 0 ? revenueMidOppUsd : 5000

  const hcTotalFromBreakdown = breakdown.reduce((s: number, r: any) => s + (Number(r?.count) || 0), 0)
  const hcTotal = toNum(hc.total) ?? (hcTotalFromBreakdown > 0 ? hcTotalFromBreakdown : 1)
  if (hc.total == null) hc.total = hcTotal
  if (hc.min == null) hc.min = hcTotal
  if (hc.max == null) hc.max = hcTotal

  const payrollMinExisting = toNum(hc.monthly_payroll_min)
  const payrollMaxExisting = toNum(hc.monthly_payroll_max)
  const payrollPctMin = toNum(hc.payroll_rev_pct_min)
  const payrollPctMax = toNum(hc.payroll_rev_pct_max)

  const knownPayroll = breakdown.reduce((s: number, r: any) => {
    const salary = toNum(r?.monthly_salary)
    const count = Number(r?.count ?? 1) || 1
    return salary != null && salary > 0 ? s + salary * count : s
  }, 0)

  let payrollMin = payrollMinExisting
  if (payrollMin == null) {
    if (payrollPctMin != null && payrollPctMin > 0) payrollMin = (fallbackRevenueMidUsd * payrollPctMin) / 100
    else if (knownPayroll > 0) payrollMin = knownPayroll
    else payrollMin = fallbackRevenueMidUsd * 0.12
  }

  let payrollMax = payrollMaxExisting
  if (payrollMax == null) {
    if (payrollPctMax != null && payrollPctMax > 0) payrollMax = (fallbackRevenueMidUsd * payrollPctMax) / 100
    else payrollMax = payrollMin * 1.4
  }

  if (payrollMax < payrollMin) payrollMax = payrollMin * 1.2
  payrollMin = Math.round(Math.max(0, payrollMin))
  payrollMax = Math.round(Math.max(payrollMin + 1, payrollMax))
  hc.monthly_payroll_min = payrollMin
  hc.monthly_payroll_max = payrollMax

  const mapBreakdownType = (type: any, role: any): string => {
    const t = String(type ?? '').trim()
    if (['skilled', 'unskilled', 'admin'].includes(t)) return t
    if (!['full_time', 'part_time', 'contract'].includes(t)) return t || 'unskilled'
    const r = String(role ?? '').toLowerCase()
    if (r.includes('admin') || r.includes('account') || r.includes('owner') || r.includes('director') || r.includes('manager')) return 'admin'
    if (r.includes('technician') || r.includes('electric') || r.includes('operator') || r.includes('mill') || r.includes('packing')) return 'skilled'
    if (r.includes('skilled')) return 'skilled'
    return 'unskilled'
  }

  const weightFor = (t: string) => (t === 'admin' ? 1.3 : t === 'skilled' ? 1.2 : t === 'unskilled' ? 0.9 : 1)

  const missingIdx: number[] = []
  breakdown.forEach((r: any, idx: number) => {
    const salary = toNum(r?.monthly_salary)
    if (salary == null || salary <= 0) missingIdx.push(idx)
    r.type = mapBreakdownType(r?.type, r?.role)
  })

  if (missingIdx.length > 0) {
    const knownContribution = breakdown.reduce((s: number, r: any) => {
      const salary = toNum(r?.monthly_salary)
      const count = Number(r?.count ?? 1) || 1
      return salary != null && salary > 0 ? s + salary * count : s
    }, 0)

    const remaining = payrollMin - knownContribution
    const missingWeightedCount = missingIdx.reduce((s: number, idx: number) => {
      const r = breakdown[idx]
      const count = Number(r?.count ?? 1) || 1
      return s + count * weightFor(String(r?.type ?? 'unskilled'))
    }, 0)

    missingIdx.forEach((idx) => {
      const r = breakdown[idx]
      const count = Number(r?.count ?? 1) || 1
      const w = weightFor(String(r?.type ?? 'unskilled'))
      const baseContribution =
        missingWeightedCount > 0
          ? (remaining * w) / missingWeightedCount
          : remaining / Math.max(1, missingIdx.length)
      const salaryPerPerson = baseContribution / count
      r.monthly_salary = Math.round(Math.max(0, salaryPerPerson))
    })
  }

  hc.breakdown = breakdown
  next.headcount = hc

  // ---- calculator_config ----
  const cc = { ...(next.calculator_config ?? {}) }
  const ccRevenue = { ...(cc.revenue ?? {}) }
  const ccEmi = { ...(cc.emi ?? {}) }

  const fpMonthly = (next.financial_projections?.monthly ?? {}) as Record<string, any>
  const revenueLowFpUsd = toNum(fpMonthly?.revenue_low) ?? 0

  const avgBill = toNum(ccRevenue.default_avg_bill) ?? 25
  const workingDays = toNum(ccRevenue.default_working_days) ?? 26
  const dailyCfg = toNum(ccRevenue.default_daily_customers)
  const dailyFromFp =
    revenueLowFpUsd > 0 ? Math.max(10, Math.round(revenueLowFpUsd / Math.max(1, workingDays) / Math.max(1, avgBill))) : 50

  if (dailyCfg == null) ccRevenue.default_daily_customers = dailyFromFp
  if (toNum(ccRevenue.default_avg_bill) == null) ccRevenue.default_avg_bill = avgBill
  if (toNum(ccRevenue.default_working_days) == null) ccRevenue.default_working_days = workingDays
  if (!ccRevenue.unit_label) ccRevenue.unit_label = 'Customers'
  if (!ccRevenue.bill_label) ccRevenue.bill_label = 'Avg Ticket Size'

  const assumptionsLoan = toNum((next.financial_projections?.assumptions ?? {}).loan_amount) ?? 0
  const setupMaxUsd = toNum(next.setup_max) ?? 0
  const setupMinUsd = toNum(next.setup_min) ?? 0
  const setupUsd = setupMaxUsd > 0 ? setupMaxUsd : setupMinUsd
  const loanFromSetup = setupUsd > 0 ? setupUsd * 0.6 : 18_000

  if (toNum(ccEmi.default_loan_amount) == null) ccEmi.default_loan_amount = assumptionsLoan > 0 ? assumptionsLoan : loanFromSetup
  if (toNum(ccEmi.default_interest_rate) == null) ccEmi.default_interest_rate = toNum((next.financial_projections?.assumptions ?? {}).loan_interest_rate_pct) ?? 11

  if (toNum(ccEmi.default_tenure_months) == null) {
    const tenureYears = toNum((next.financial_projections?.assumptions ?? {}).loan_tenure_options?.[0])
    ccEmi.default_tenure_months = tenureYears != null && tenureYears > 0 ? Math.round(tenureYears * 12) : 36
  }

  cc.revenue = ccRevenue
  cc.emi = ccEmi
  next.calculator_config = cc

  return next
}

function calcYear1(fp: Record<string, any>) {
  const m = fp?.monthly ?? {}
  const a = fp?.assumptions ?? {}
  const rev = Number(m.revenue_low ?? 0) * 12
  const cogs = (rev * Number(m.cogs_pct ?? 0)) / 100
  const gp = rev - cogs
  const opex = (Number(m.opex ?? 0) + Number(m.rent ?? 0)) * 12
  const ebitda = gp - opex
  const depr = Number(a.initial_investment ?? 0) * 0.1
  const L = Number(a.loan_amount ?? 0)
  const n = Number((a.loan_tenure_options ?? [3])[0]) * 12
  const emi = L > 0 && n > 0 ? monthlyLoanEmi(L, Number(a.loan_interest_rate_pct ?? 11), Math.round(n)) : 0
  const int1 = L > 0 ? (L * Number(a.loan_interest_rate_pct ?? 11)) / 100 * 0.9 : 0
  const pbt = ebitda - depr - int1
  const pat = pbt > 0 ? pbt * 0.75 : pbt
  const p = (v: number) => parseFloat(v.toFixed(2))
  return { revenue: p(rev), gross_profit: p(gp), ebitda: p(ebitda), pat: p(pat), emi: p(emi) }
}

function Cell({
  value,
  onChange,
  suffix,
  readOnly,
  highlight,
  error,
  auto,
}: {
  value: any
  onChange?: (v: any) => void
  suffix?: string
  readOnly?: boolean
  highlight?: boolean
  error?: boolean
  auto?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const base: React.CSSProperties = {
    padding: '8px 10px',
    textAlign: 'right' as const,
    fontSize: '13px',
    fontFamily: 'monospace',
  }
  if (readOnly || auto)
    return (
      <td
        style={{
          ...base,
          color: highlight ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          background: auto ? 'hsl(var(--primary-50))' : 'hsl(var(--bg-sunken))',
          fontWeight: highlight ? 600 : 400,
          fontStyle: auto ? 'italic' : 'normal',
          borderLeft: auto ? '2px solid hsl(var(--primary-200))' : 'none',
        }}
      >
        {value != null && value !== '' ? `${value}${suffix ?? ''}` : '—'}
        {auto && value != null && <span style={{ fontSize: '9px', marginLeft: '3px', opacity: 0.5 }}>auto</span>}
      </td>
    )
  return (
    <td
      style={{
        padding: 0,
        position: 'relative',
        background: error ? 'hsl(var(--red-50))' : focused ? 'hsl(var(--primary-50))' : 'transparent',
        outline: error ? '2px solid hsl(var(--destructive))' : 'none',
        transition: 'background 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', gap: '2px' }}>
        <input
          type="number"
          step="any"
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value === '' ? null : Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: '36px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: 'hsl(var(--foreground))',
            textAlign: 'right',
            padding: 0,
          }}
        />
        {suffix && <span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', flexShrink: 0 }}>{suffix}</span>}
      </div>
      {focused && !error && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', border: '2px solid hsl(var(--primary))', zIndex: 2 }} />}
    </td>
  )
}

function TH({ children, width, auto }: { children: React.ReactNode; width?: string; auto?: boolean }) {
  return (
    <th
      style={{
        padding: '8px 10px',
        fontSize: '11px',
        fontWeight: 700,
        color: auto ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        textAlign: 'right' as const,
        background: auto ? 'hsl(var(--primary-50))' : 'hsl(var(--bg-sunken))',
        borderBottom: `2px solid ${auto ? 'hsl(var(--primary-200))' : 'hsl(var(--border-default))'}`,
        whiteSpace: 'nowrap',
        width,
      }}
    >
      {children}
    </th>
  )
}

function THL({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: '8px 12px',
        fontSize: '11px',
        fontWeight: 700,
        textAlign: 'left' as const,
        color: 'hsl(var(--muted-foreground))',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        background: 'hsl(var(--bg-sunken))',
        borderBottom: '2px solid hsl(var(--border-default))',
        whiteSpace: 'nowrap',
        width: '170px',
      }}
    >
      {children}
    </th>
  )
}

function RL({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '8px 12px', fontSize: '13px', color: 'hsl(var(--foreground))', whiteSpace: 'nowrap' }}>{children}</td>
}

function GR({ label, cols }: { label: string; cols: number }) {
  return (
    <tr>
      <td
        colSpan={cols}
        style={{
          padding: '8px 12px 4px',
          fontSize: '10px',
          fontWeight: 700,
          color: 'hsl(var(--primary))',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          background: 'hsl(var(--primary-50))',
          borderTop: '2px solid hsl(var(--primary-200))',
          borderBottom: '1px solid hsl(var(--primary-200))',
        }}
      >
        {label}
      </td>
    </tr>
  )
}

function TR({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border-subtle">{children}</tr>
}

function FinancialsGrid({ fp, setFP }: { fp: Record<string, any>; setFP: (v: Record<string, any>) => void }) {
  const m = fp?.monthly ?? {}
  const a = fp?.assumptions ?? {}
  const y3 = fp?.year3 ?? {}
  const y5 = fp?.year5 ?? {}

  const errors = useMemo(() => validateFP(fp), [fp])
  const y1 = useMemo(() => calcYear1(fp), [fp])

  const setM = (k: string, v: any) => setFP({ ...fp, monthly: { ...m, [k]: v } })
  const setA = (k: string, v: any) => setFP({ ...fp, assumptions: { ...a, [k]: v } })
  const setY3 = (k: string, v: any) => setFP({ ...fp, year3: { ...y3, [k]: v } })
  const setY5 = (k: string, v: any) => setFP({ ...fp, year5: { ...y5, [k]: v } })

  const L = Number(a.loan_amount ?? 0)
  const n = Number((a.loan_tenure_options ?? [3])[0]) * 12
  const emi = L > 0 && n > 0 ? monthlyLoanEmi(L, Number(a.loan_interest_rate_pct ?? 11), Math.round(n)) : 0
  const revL = Number(m.revenue_low ?? 0)
  const revH = Number(m.revenue_high ?? 0)
  const cogs = Number(m.cogs_pct ?? 0)
  const opex = Number(m.opex ?? 0)
  const rent = Number(m.rent ?? 0)
  const gpL = revL - (revL * cogs) / 100
  const gpH = revH - (revH * cogs) / 100
  const netL = gpL - opex - rent - emi
  const netH = gpH - opex - rent - emi
  const initInv = Number(a.initial_investment ?? 0)
  const be = netL > 0 ? Math.ceil(initInv / netL) : null
  const y3rev = Number(y3.revenue ?? 0)
  const y5rev = Number(y5.revenue ?? 0)
  const cagr = y3rev > 0 && y5rev > 0 ? ((Math.pow(y5rev / y3rev, 0.5) - 1) * 100).toFixed(1) : null

  const fmt = (v: number | null | undefined) => {
    if (v == null || Number.isNaN(Number(v))) return '—'
    const n = Number(v)
    const sign = n < 0 ? '-' : ''
    const abs = Math.abs(n)
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`
  }

  const hasErr = Object.keys(errors).length > 0

  return (
    <div>
      <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 mb-4 flex items-start gap-2">
        <span className="text-warning text-sm mt-0.5">⚠️</span>
        <p className="text-xs text-warning/90">
          All financial projection values are now stored in <strong>USD</strong>. Enter monthly revenue, opex, and loan amounts as whole dollar amounts (e.g.{' '}
          <strong>5000</strong> = $5,000/month).
        </p>
      </div>
      {hasErr && (
        <div
          style={{
            marginBottom: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'hsl(var(--red-50))',
            border: '1px solid hsl(var(--red-100))',
            fontSize: '12px',
            color: 'hsl(var(--destructive))',
          }}
        >
          <strong>⚠ Fix before saving:</strong>{' '}
          {Object.values(errors).join(' · ')}
        </div>
      )}

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid hsl(var(--border-default))' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
          <thead>
            <tr>
              <THL>Metric</THL>
              <TH width="105px">Monthly Low</TH>
              <TH width="105px">Monthly High</TH>
              <TH width="95px" auto>
                Year 1 ⚡
              </TH>
              <TH width="95px">Year 3</TH>
              <TH width="95px">Year 5</TH>
              <TH width="110px" auto>
                Preview ⚡
              </TH>
            </tr>
          </thead>
          <tbody>
            <GR label="Revenue (USD $ / month)" cols={7} />
            <TR>
              <RL>Revenue</RL>
              <Cell value={m.revenue_low} onChange={v => setM('revenue_low', v)} error={!!errors.revenue_low} />
              <Cell value={m.revenue_high} onChange={v => setM('revenue_high', v)} error={!!errors.revenue_high} />
              <Cell value={y1.revenue} auto />
              <Cell value={y3.revenue} onChange={v => setY3('revenue', v)} />
              <Cell value={y5.revenue} onChange={v => setY5('revenue', v)} />
              <Cell value={`${fmt(revL)}–${fmt(revH)}/mo`} readOnly highlight />
            </TR>
            <TR>
              <RL>Gross Profit</RL>
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={y1.gross_profit} auto />
              <Cell value={y3.gross_profit} onChange={v => setY3('gross_profit', v)} />
              <Cell value={y5.gross_profit} onChange={v => setY5('gross_profit', v)} />
              <Cell value={`${fmt(gpL)}–${fmt(gpH)}/mo`} readOnly />
            </TR>

            <GR label="Costs (USD $ / month)" cols={7} />
            <TR>
              <RL>COGS %</RL>
              <Cell value={m.cogs_pct} onChange={v => setM('cogs_pct', v)} suffix="%" error={!!errors.cogs_pct} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={cogs > 0 ? `${fmt((revL * cogs) / 100)}/mo` : null} readOnly />
            </TR>
            <TR>
              <RL>OpEx (USD / mo)</RL>
              <Cell value={m.opex} onChange={v => setM('opex', v)} error={!!errors.opex} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={opex > 0 ? `${fmt(opex * 12)}/yr` : null} readOnly />
            </TR>
            <TR>
              <RL>Rent (USD / mo)</RL>
              <Cell value={m.rent} onChange={v => setM('rent', v)} error={!!errors.rent} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={rent > 0 ? `${fmt(rent * 12)}/yr` : null} readOnly />
            </TR>

            <GR label="Public Revenue Estimator — slider bounds" cols={7} />
            <TR>
              <RL>COGS % min / max</RL>
              <Cell value={m.cogs_min} onChange={v => setM('cogs_min', v)} suffix="%" error={!!errors.cogs_min} />
              <Cell value={m.cogs_max} onChange={v => setM('cogs_max', v)} suffix="%" error={!!errors.cogs_max} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value="Detail COGS slider" readOnly />
            </TR>
            <TR>
              <RL>OpEx % of revenue min / max</RL>
              <Cell value={m.opex_min_pct} onChange={v => setM('opex_min_pct', v)} suffix="%" error={!!errors.opex_min_pct} />
              <Cell value={m.opex_max_pct} onChange={v => setM('opex_max_pct', v)} suffix="%" error={!!errors.opex_max_pct} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value="Detail OpEx slider" readOnly />
            </TR>

            <GR label="Profitability" cols={7} />
            <TR>
              <RL>EBITDA</RL>
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={y1.ebitda} auto />
              <Cell value={y3.ebitda} onChange={v => setY3('ebitda', v)} />
              <Cell value={y5.ebitda} onChange={v => setY5('ebitda', v)} />
              <Cell value={null} readOnly />
            </TR>
            <TR>
              <RL>PAT</RL>
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={y1.pat} auto highlight />
              <Cell value={y3.pat_3yr} onChange={v => setY3('pat_3yr', v)} />
              <Cell value={y5.pat_5yr} onChange={v => setY5('pat_5yr', v)} />
              <Cell value={`${fmt(netL)}–${fmt(netH)}/mo`} readOnly highlight={netL > 0} />
            </TR>

            <GR label="Loan & Investment" cols={7} />
            <TR>
              <RL>Initial Investment</RL>
              <Cell value={a.initial_investment} onChange={v => setA('initial_investment', v)} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
            </TR>
            <TR>
              <RL>Loan Amount</RL>
              <Cell value={a.loan_amount} onChange={v => setA('loan_amount', v)} error={!!errors.loan_amount} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
            </TR>
            <TR>
              <RL>Equity</RL>
              <Cell value={a.equity_contribution} onChange={v => setA('equity_contribution', v)} error={!!errors.equity} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
            </TR>
            <TR>
              <RL>Interest Rate</RL>
              <Cell value={a.loan_interest_rate_pct} onChange={v => setA('loan_interest_rate_pct', v)} suffix="%" error={!!errors.rate} />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
            </TR>
            <TR>
              <RL>Tenure Options</RL>
              <td colSpan={5} style={{ padding: '0 8px' }}>
                <input
                  type="text"
                  value={(a.loan_tenure_options ?? []).join(',')}
                  onChange={e => {
                    const vals = e.target.value
                      .split(',')
                      .map((v: string) => parseInt(v.trim()))
                      .filter((n: number) => !isNaN(n) && n > 0)
                    setA('loan_tenure_options', vals)
                  }}
                  placeholder="e.g. 1,2,3,5"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 4px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </td>
              <Cell value={emi > 0 ? `${fmt(emi)}/mo` : null} readOnly highlight />
            </TR>

            <GR label="Summary" cols={7} />
            <TR>
              <RL>Breakeven</RL>
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={null} readOnly />
              <Cell value={be ? `${be} mo` : netL <= 0 ? '⚠ N/A' : '—'} readOnly highlight={!!be} />
            </TR>
            {cagr && (
              <TR>
                <RL>Yr3→5 CAGR</RL>
                <Cell value={null} readOnly />
                <Cell value={null} readOnly />
                <Cell value={null} readOnly />
                <Cell value={null} readOnly />
                <Cell value={null} readOnly />
                <Cell value={`${cagr}%`} readOnly highlight />
              </TR>
            )}
          </tbody>
        </table>
      </div>

      <p
        style={{
          marginTop: '14px',
          fontSize: '12px',
          lineHeight: 1.45,
          color: 'hsl(var(--muted-foreground))',
          maxWidth: '720px',
        }}
      >
        Revenue and loan slider limits on the public page are derived from opportunity columns and{' '}
        <code style={{ fontSize: '11px' }}>financial_projections.monthly</code> (not{' '}
        <code style={{ fontSize: '11px' }}>parameters.*</code>). COGS and OpEx bounds are the rows above labeled &quot;Public Revenue Estimator&quot;.
      </p>
    </div>
  )
}

export default AdminOpportunityEditor

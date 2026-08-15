import { supabase } from '@/lib/supabaseClient'
import type { Investor } from '@/types/investors'

export const INVESTOR_PUBLIC_SELECT =
  'id, slug, name, logo_url, firm_type, description, thesis, hq_country, operating_countries, stages, sectors, check_size_min_usd, check_size_max_usd, portfolio_companies, website_url, linkedin_url, contact_form_url, founded_year, notable_exits, is_india_focused, is_active, created_at, updated_at'

export function investorDetailPath(slug: string): string {
  return `/investors/${encodeURIComponent(slug)}`
}

export function investorMatchesSearch(investor: Investor, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  const haystack = [
    investor.name,
    investor.description,
    investor.thesis,
    investor.hq_country,
    investor.firm_type,
    ...(investor.stages ?? []),
    ...(investor.sectors ?? []),
    ...(investor.operating_countries ?? []),
    ...(investor.notable_exits ?? []),
    ...(investor.portfolio_companies ?? []).flatMap((company) => [company.name, company.sector]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(q)
}

export function collectInvestorSectors(investors: Investor[]): string[] {
  const values = new Set<string>()
  for (const investor of investors) {
    for (const sector of investor.sectors ?? []) {
      if (sector) values.add(sector)
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

export function collectPortfolioCompanyNames(investors: Investor[]): string[] {
  const values = new Set<string>()
  for (const investor of investors) {
    for (const company of investor.portfolio_companies ?? []) {
      if (company.name) values.add(company.name)
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b))
}

export async function fetchInvestorsActiveCount(): Promise<number> {
  const { data, error } = await supabase.rpc('investors_active_count')
  if (error) throw error
  return typeof data === 'number' ? data : Number(data ?? 0)
}

export async function fetchAllInvestors(): Promise<Investor[]> {
  const { data, error } = await supabase
    .from('investors_public')
    .select(INVESTOR_PUBLIC_SELECT)
    .order('name', { ascending: true })

  if (error) throw error
  return (data as Investor[] | null) ?? []
}

export async function fetchInvestorBySlug(slug: string): Promise<Investor | null> {
  const { data, error } = await supabase
    .from('investors_public')
    .select(INVESTOR_PUBLIC_SELECT)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return (data as Investor | null) ?? null
}

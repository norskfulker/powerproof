export type InvestorPortfolioCompany = {
  name: string
  sector?: string
}

export type Investor = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  firm_type: string
  description: string | null
  thesis: string | null
  hq_country: string
  operating_countries: string[] | null
  stages: string[] | null
  sectors: string[] | null
  check_size_min_usd: number | null
  check_size_max_usd: number | null
  portfolio_companies: InvestorPortfolioCompany[] | null
  website_url: string | null
  linkedin_url: string | null
  contact_form_url: string | null
  founded_year: number | null
  notable_exits: string[] | null
  is_india_focused: boolean | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

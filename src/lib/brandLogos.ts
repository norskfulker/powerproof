import type { ResearchStyle } from '@/lib/researchStyles'

export const BRAND_LOGO_BASE_URL =
  'https://hoqdmbsimyizfbwyoqru.supabase.co/storage/v1/object/public/opportunity-images/logos-1'

export const GEMINI_LOGO_URL = `${BRAND_LOGO_BASE_URL}/gemini_logo.svg`

export const POWERPROOF_BRAND_LOGO_URL =
  'https://hoqdmbsimyizfbwyoqru.supabase.co/storage/v1/object/public/opportunity-images/branding/logos/powerproof.svg'

export const POWERPROOF_SHORT_LOGO_URL =
  'https://hoqdmbsimyizfbwyoqru.supabase.co/storage/v1/object/public/opportunity-images/branding/logos/powerproof-short.svg'

export const RESEARCH_STYLE_LOGO_FILES: Partial<Record<ResearchStyle, string>> = {
  mckinsey: 'McKinsey_and_Company_Logo.svg',
  bcg: 'Boston_Consulting_Group_logo.svg',
  bain: 'Bain_and_Company_logo.svg',
  goldman_sachs: 'Goldman_Sachs_logo.svg',
  jp_morgan: 'J_P_Morgan_Logo.svg',
  kpmg: 'KPMG.svg',
}

export function brandLogoUrl(filename: string): string {
  return `${BRAND_LOGO_BASE_URL}/${filename}`
}

export function researchStyleLogoUrl(style: ResearchStyle): string | null {
  const file = RESEARCH_STYLE_LOGO_FILES[style]
  return file ? brandLogoUrl(file) : null
}

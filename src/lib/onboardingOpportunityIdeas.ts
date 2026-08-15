import { fetchPublicCatalogFeedPage } from '@/lib/publicCatalog'

const ONBOARDING_OPP_POOL_SIZE = 24

export type OnboardingOppChip = {
  id: string
  slug: string
  title: string
}

/**
 * Instant onboarding idea chips from catalog opportunities
 * (same feed as discover hero — no generate-idea-chips wait).
 */
export async function fetchOnboardingOpportunityChips(
  limit = ONBOARDING_OPP_POOL_SIZE,
): Promise<OnboardingOppChip[]> {
  const { rows: rawRows } = await fetchPublicCatalogFeedPage(
    { budget: 'all', category: 'all', sort: 'trending', search: '' },
    '',
    0,
    limit,
  )
  const chips: OnboardingOppChip[] = []
  const seen = new Set<string>()

  for (const row of rawRows) {
    const id = String(row.id ?? '').trim()
    const slug = String(row.slug ?? '').trim()
    const title = String(row.title ?? '').trim()
    if (!id || !slug || !title) continue
    const key = slug.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    chips.push({ id, slug, title })
  }

  return chips
}

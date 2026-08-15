/** Canonical effort label for OpportunityCard meter + colors (Easy | Medium | Hard). */
export function normalizeEaseLevel(raw: unknown): 'Easy' | 'Medium' | 'Hard' | '' {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (!s) return ''
  if (s === 'easy' || s === 'low') return 'Easy'
  if (s === 'medium' || s === 'moderate' || s === 'med') return 'Medium'
  if (s === 'hard' || s === 'high' || s === 'difficult') return 'Hard'
  const titled = s.charAt(0).toUpperCase() + s.slice(1)
  if (titled === 'Easy' || titled === 'Medium' || titled === 'Hard') return titled
  return ''
}

/** Segmented effort meter — 10 dashes; more filled = higher effort. */
export const EFFORT_DASH_COUNT = 10

export function easeLevelFilledDashes(level: 'Easy' | 'Medium' | 'Hard' | ''): number {
  if (level === 'Easy') return 3
  if (level === 'Medium') return 6
  if (level === 'Hard') return 9
  return 0
}

export function easeLevelBadgeVariant(
  level: 'Easy' | 'Medium' | 'Hard' | '',
): 'green' | 'amber' | 'red' | 'gray' {
  if (level === 'Easy') return 'green'
  if (level === 'Medium') return 'amber'
  if (level === 'Hard') return 'red'
  return 'gray'
}

export function easeLevelDashFillClass(level: 'Easy' | 'Medium' | 'Hard' | ''): string {
  if (level === 'Easy') return 'bg-[hsl(var(--success))]'
  if (level === 'Medium') return 'bg-[hsl(var(--saffron-600))]'
  if (level === 'Hard') return 'bg-destructive'
  return 'bg-muted-foreground/20'
}

/** Human-readable category title from slug (matches opportunity list cards). */
export function formatCategoryBadge(slug?: string | null) {
  if (!slug) return 'Opportunity'
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const OPPORTUNITY_STATUS_BADGE_MAP: Record<string, { bg: string; color: string; label: string }> = {
  trending: { bg: 'hsl(var(--saffron-100))', color: 'hsl(var(--saffron-600))', label: '🔥 Trending' },
  hot: { bg: 'hsl(var(--red-50))', color: 'hsl(var(--red-600))', label: '⚡ Hot' },
  new: { bg: 'hsl(var(--blue-100))', color: 'hsl(var(--blue-800))', label: '✦ New' },
  low: { bg: 'hsl(var(--blue-50))', color: 'hsl(var(--blue-700))', label: '💰 Low Investment' },
  global: { bg: 'hsl(var(--bg-sunken))', color: 'hsl(var(--muted-foreground))', label: '🌍 Global' },
}

/** Status chip next to category: DB label wins, else map by `badge` key. */
export function resolveOpportunityStatusChip(
  badge: string | null | undefined,
  badgeLabel: string | null | undefined,
): { label: string; color: string; bg: string } | null {
  const trimmed = String(badgeLabel ?? '').trim()
  if (trimmed) {
    const cfg = badge ? OPPORTUNITY_STATUS_BADGE_MAP[badge] : null
    return {
      label: trimmed,
      color: cfg?.color ?? 'hsl(var(--foreground))',
      bg: cfg?.bg ?? 'hsl(var(--bg-surface-alt))',
    }
  }
  if (!badge) return null
  const cfg = OPPORTUNITY_STATUS_BADGE_MAP[badge]
  if (cfg) return { label: cfg.label, color: cfg.color, bg: cfg.bg }
  return {
    label: badge,
    color: 'hsl(var(--foreground))',
    bg: 'hsl(var(--bg-sunken))',
  }
}

/**
 * Setup-cost filter buckets for catalog `setup_min` / `setup_max` values
 * to whole USD. Values approximate legacy INR lakh bands (÷ ~83.5).
 */
export const SETUP_BUDGET_USD = {
  under1lMax: 1200,
  l1to5Min: 1200,
  l1to5Max: 6000,
  l5to20Min: 6000,
  l5to20Max: 24000,
  above20Min: 24000,
} as const

/** Human-readable bucket labels (amounts are USD; keys match stored `budget_range` / filter values). */
export const BUDGET_BUCKET_LABELS_USD: Record<string, string> = {
  under_1l: 'Under $1,200',
  '1l_5l': '$1,200–$6,000',
  '5l_20l': '$6,000–$24,000',
  '20l_50l': '$24,000–$50,000',
  '50l_plus': '$50,000+',
  above_20l: '$24,000+',
}

/**
 * Slim projection for discover / list feeds (not opportunity detail pages).
 * Keep in sync with discover hero chips and list feed helpers.
 * Omit large JSONB / non-existent columns (detail-only or missing in DB).
 */
export const OPPORTUNITIES_FEED_COLUMNS = [
  'id',
  'slug',
  'title',
  'tagline',
  'badge',
  'badge_label',
  'category_slug',
  'setup_min',
  'setup_max',
  'monthly_rev_min',
  'monthly_rev_max',
  'monthly_profit_min',
  'monthly_profit_max',
  'payback_months_min',
  'payback_months_max',
  'first_profit_months',
  'ease',
  'score',
  'score_label',
  'score_breakdown',
  'trend_velocity',
  'is_locked',
  'is_saturated',
  'is_guest_preview',
  'status',
  'logo_url',
  'hero_image_url',
  'tags',
  'location_suitability',
  'country',
  'country_flag',
  'currency',
  'currency_symbol',
  'view_count',
  'save_count',
  'interested_count',
  'margin_pct',
  'source',
  'similar_slugs',
  'govt_schemes',
  'state_tags',
] as const

const OPPORTUNITIES_FEED_COLUMNS_STR = OPPORTUNITIES_FEED_COLUMNS.join(', ')

/** Includes categories FK join used by discover feed. */
export const OPPORTUNITIES_FEED_SELECT = `${OPPORTUNITIES_FEED_COLUMNS_STR}, categories(name, icon, color)`

/** Flat columns only (no join) — for hooks that do not need `categories`. */
export const OPPORTUNITIES_FEED_SELECT_FLAT = OPPORTUNITIES_FEED_COLUMNS_STR

/**
 * Feed projection for `user_opportunities` list cards.
 * Only columns that exist on `user_opportunities` (not catalog `opportunities`).
 */
export const USER_OPPORTUNITIES_FEED_COLUMNS = [
  'id',
  'user_id',
  'slug',
  'title',
  'tagline',
  'badge',
  'badge_label',
  'category_slug',
  'setup_min',
  'setup_max',
  'monthly_rev_min',
  'monthly_rev_max',
  'monthly_profit_min',
  'monthly_profit_max',
  'payback_months_min',
  'payback_months_max',
  'ease',
  'score',
  'score_breakdown',
  'is_saturated',
  'status',
  'visibility',
  'logo_url',
  'hero_image_url',
  'tags',
  'country',
  'govt_schemes',
  'state_tags',
] as const

const USER_OPPORTUNITIES_RESEARCH_COLUMNS = [
  'project_id',
  'research_version',
  'research_query',
  'research_status',
  'research_style',
  'fit_index',
  'credits_used',
  'model_used',
  'byok_used',
  'created_at',
  'updated_at',
] as const

export const USER_OPPORTUNITIES_FEED_SELECT_FLAT = [
  ...USER_OPPORTUNITIES_FEED_COLUMNS,
  ...USER_OPPORTUNITIES_RESEARCH_COLUMNS,
].join(', ')

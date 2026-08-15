-- get_discover_feed still referenced dropped user_unlocks after 20260704230000.
-- Catalog opportunities are free to browse; no per-user unlock exclusion.

CREATE OR REPLACE FUNCTION public.get_discover_feed(
  p_category text DEFAULT NULL::text,
  p_country text DEFAULT NULL::text,
  p_source text DEFAULT NULL::text,
  p_budget text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_sort text DEFAULT 'trending'::text,
  p_preferred_cats text[] DEFAULT NULL::text[],
  p_budget_range text DEFAULT NULL::text,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  tagline text,
  short_desc text,
  badge text,
  badge_label text,
  category_slug text,
  setup_min integer,
  setup_max integer,
  monthly_rev_min integer,
  monthly_rev_max integer,
  monthly_profit_min integer,
  monthly_profit_max integer,
  payback_months_min integer,
  payback_months_max integer,
  first_profit_months text,
  ease text,
  score integer,
  score_label text,
  score_breakdown jsonb,
  trend_velocity numeric,
  is_locked boolean,
  is_saturated boolean,
  is_guest_preview boolean,
  status text,
  logo_url text,
  hero_image_url text,
  tags text[],
  location_suitability text[],
  country text,
  country_flag text,
  currency text,
  currency_symbol text,
  view_count integer,
  save_count integer,
  interested_count integer,
  margin_pct integer,
  source text,
  similar_slugs text[],
  govt_schemes text[],
  state_tags text[],
  priority_rank integer,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH filtered AS (
    SELECT o.*
    FROM public.opportunities o
    WHERE o.status = 'live'
      AND o.slug IS DISTINCT FROM 'ancggh'
      AND (auth.uid() IS NOT NULL OR COALESCE(o.is_guest_preview, false) = true)
      AND (p_category IS NULL OR o.category_slug = p_category)
      AND (
        p_country IS NULL
        OR (p_country = 'India' AND (o.country = 'India' OR o.country IS NULL))
        OR o.country = p_country
      )
      AND (p_source IS NULL OR o.source = p_source)
      AND (
        p_budget IS NULL OR p_budget = 'all'
        OR (p_budget = 'under_1l'  AND COALESCE(o.setup_max, o.setup_min, 0) <= 1200)
        OR (p_budget = '1l_5l'     AND COALESCE(o.setup_min,0) <= 6000  AND COALESCE(o.setup_max,0) >= 1200)
        OR (p_budget = '5l_20l'    AND COALESCE(o.setup_min,0) <= 24000 AND COALESCE(o.setup_max,0) >= 6000)
        OR (p_budget = 'above_20l' AND COALESCE(o.setup_min,0) >= 24000)
      )
      AND (
        p_search IS NULL OR btrim(p_search) = ''
        OR o.title ILIKE '%' || p_search || '%'
        OR COALESCE(o.short_desc,'') ILIKE '%' || p_search || '%'
        OR COALESCE(o.tagline,'')    ILIKE '%' || p_search || '%'
      )
      AND (
        p_preferred_cats IS NULL OR cardinality(p_preferred_cats) = 0
        OR o.category_slug = ANY(p_preferred_cats)
      )
  ),
  ranked AS (
    SELECT
      f.*,
      0::integer AS priority_rank,
      COUNT(*) OVER ()::bigint AS total_count,
      CASE
        WHEN p_sort = 'setup_min'  THEN ROW_NUMBER() OVER (ORDER BY f.setup_min  ASC  NULLS LAST, f.score DESC NULLS LAST)
        WHEN p_sort = 'margin_pct' THEN ROW_NUMBER() OVER (ORDER BY f.margin_pct DESC NULLS LAST, f.score DESC NULLS LAST)
        WHEN p_sort = 'score'      THEN ROW_NUMBER() OVER (ORDER BY f.score DESC NULLS LAST, f.trend_velocity DESC NULLS LAST)
        ELSE                            ROW_NUMBER() OVER (ORDER BY f.trend_velocity DESC NULLS LAST, f.score DESC NULLS LAST)
      END AS rn
    FROM filtered f
  )
  SELECT
    r.id, r.slug, r.title, r.tagline, r.short_desc,
    r.badge, r.badge_label, r.category_slug,
    r.setup_min, r.setup_max,
    r.monthly_rev_min, r.monthly_rev_max,
    r.monthly_profit_min, r.monthly_profit_max,
    r.payback_months_min, r.payback_months_max,
    r.first_profit_months,
    r.ease, r.score, r.score_label, r.score_breakdown, r.trend_velocity,
    r.is_locked, r.is_saturated, r.is_guest_preview, r.status,
    r.logo_url, r.hero_image_url,
    r.tags, r.location_suitability,
    r.country, r.country_flag, r.currency, r.currency_symbol,
    r.view_count, r.save_count, r.interested_count,
    r.margin_pct, r.source,
    r.similar_slugs, r.govt_schemes, r.state_tags,
    r.priority_rank, r.total_count
  FROM ranked r
  WHERE r.rn > GREATEST(COALESCE(p_offset,0), 0)
    AND r.rn <= GREATEST(COALESCE(p_offset,0), 0) + GREATEST(COALESCE(p_limit,25), 1)
  ORDER BY r.rn;
$function$;

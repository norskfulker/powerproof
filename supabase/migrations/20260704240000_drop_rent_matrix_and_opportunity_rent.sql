-- Drop space-type rent matrix and opportunity rent columns.

DROP VIEW IF EXISTS public.opportunities_with_details;

ALTER TABLE public.opportunities
  DROP COLUMN IF EXISTS rent_profile,
  DROP COLUMN IF EXISTS supported_space_types;

DROP TABLE IF EXISTS public.space_type_rent_matrix;

CREATE VIEW public.opportunities_with_details AS
SELECT
  o.id,
  o.slug,
  o.title,
  o.short_desc,
  o.full_desc,
  o.category_slug,
  o.badge,
  o.badge_label,
  o.source,
  o.setup_min,
  o.setup_max,
  o.margin_pct,
  o.monthly_rev_min,
  o.monthly_rev_max,
  o.monthly_profit_min,
  o.monthly_profit_max,
  o.payback_months_min,
  o.payback_months_max,
  o.first_profit_months,
  o.ease,
  o.score,
  o.score_label,
  o.trend_velocity,
  o.is_locked,
  o.status,
  o.govt_schemes,
  o.tags,
  o.view_count,
  o.save_count,
  o.unlock_click_count,
  o.created_by,
  o.published_at,
  o.created_at,
  o.updated_at,
  o.tagline,
  o.hero_image_url,
  o.logo_url,
  o.location_suitability,
  o.state_tags,
  o.target_customer_pills,
  o.similar_slugs,
  o.pros,
  o.cons,
  o.competitors,
  o.license_cost_min,
  o.license_cost_max,
  c.name AS category_name,
  c.lucide AS category_icon,
  p.full_name AS created_by_name
FROM public.opportunities o
LEFT JOIN public.categories c ON c.slug = o.category_slug
LEFT JOIN public.profiles p ON p.id = o.created_by;

CREATE OR REPLACE FUNCTION public.get_opportunity_teaser(p_slug text)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT row_to_json(t)
  FROM (
    SELECT
      o.id,
      o.slug,
      o.title,
      o.tagline,
      o.full_desc,
      o.category_slug,
      o.badge,
      o.badge_label,
      o.source,
      o.ease,
      o.score,
      o.score_label,
      o.score_breakdown,
      o.trend_velocity,
      o.is_locked,
      o.setup_min,
      o.setup_max,
      o.monthly_rev_min,
      o.monthly_rev_max,
      o.monthly_profit_min,
      o.monthly_profit_max,
      o.payback_months_min,
      o.payback_months_max,
      o.first_profit_months,
      o.margin_pct,
      o.market_size,
      o.target_customer,
      o.tags,
      o.state_tags,
      o.location_suitability,
      o.govt_schemes,
      o.govt_scheme_details,
      o.faqs,
      o.pros,
      o.cons,
      o.hero_image_url,
      o.logo_url,
      o.currency,
      o.currency_symbol,
      o.country,
      o.country_flag,
      o.interested_count,
      o.save_count,
      o.view_count,
      o.is_saturated,
      o.saturation_note,
      o.published_at,
      o.seo_title,
      o.seo_description,
      o.seo_image_url,
      o.seo_canonical_path,
      o.seo_noindex,
      o.financial_projections,
      o.setup_cost_breakdown,
      o.machinery_list,
      o.revenue_streams,
      o.target_customer_pills,
      o.market_demographics
    FROM public.opportunities o
    WHERE o.slug = p_slug
      AND o.status = 'live'
      AND coalesce(o.seo_noindex, false) = false
  ) t
$$;

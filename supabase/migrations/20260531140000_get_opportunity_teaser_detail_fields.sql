-- Extend public preview payload for detail-page parity (score rail, trends, FAQs, schemes).
create or replace function public.get_opportunity_teaser(p_slug text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  result json;
begin
  select json_build_object(
    'id',                   o.id,
    'slug',                 o.slug,
    'title',                o.title,
    'tagline',              o.tagline,
    'short_desc',           o.short_desc,
    'full_desc',            o.full_desc,
    'category_slug',        o.category_slug,
    'badge',                o.badge,
    'badge_label',          o.badge_label,
    'source',               o.source,
    'ease',                 o.ease,
    'score',                o.score,
    'score_label',          o.score_label,
    'score_breakdown',      o.score_breakdown,
    'trend_velocity',       o.trend_velocity,
    'is_locked',            o.is_locked,
    'setup_min',            o.setup_min,
    'setup_max',            o.setup_max,
    'monthly_rev_min',      o.monthly_rev_min,
    'monthly_rev_max',      o.monthly_rev_max,
    'monthly_profit_min',   o.monthly_profit_min,
    'monthly_profit_max',   o.monthly_profit_max,
    'payback_months_min',   o.payback_months_min,
    'payback_months_max',   o.payback_months_max,
    'first_profit_months',  o.first_profit_months,
    'margin_pct',           o.margin_pct,
    'market_size',          o.market_size,
    'target_customer',      o.target_customer,
    'tags',                 o.tags,
    'state_tags',           o.state_tags,
    'location_suitability', o.location_suitability,
    'govt_schemes',         o.govt_schemes,
    'govt_scheme_details',  o.govt_scheme_details,
    'faqs',                 o.faqs,
    'pros',                 o.pros,
    'cons',                 o.cons,
    'hero_image_url',       o.hero_image_url,
    'logo_url',             o.logo_url,
    'currency',             o.currency,
    'currency_symbol',      o.currency_symbol,
    'country',              o.country,
    'country_flag',         o.country_flag,
    'interested_count',     o.interested_count,
    'save_count',           o.save_count,
    'view_count',           o.view_count,
    'is_saturated',         o.is_saturated,
    'saturation_note',      o.saturation_note,
    'published_at',         o.published_at,
    'seo_title',            o.seo_title,
    'seo_description',      o.seo_description,
    'seo_image_url',        o.seo_image_url,
    'seo_canonical_path',   o.seo_canonical_path,
    'seo_noindex',          o.seo_noindex
  )
  into result
  from opportunities o
  where o.slug = p_slug
    and o.status = 'live'
    and o.seo_noindex = false;

  return result;
end;
$function$;

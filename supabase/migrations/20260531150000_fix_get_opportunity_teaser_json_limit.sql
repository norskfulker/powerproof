-- json_build_object caps at 100 args (50 pairs). Use row_to_json instead.
create or replace function public.get_opportunity_teaser(p_slug text)
returns json
language sql
security definer
set search_path to 'public'
stable
as $$
  select row_to_json(t)
  from (
    select
      o.id,
      o.slug,
      o.title,
      o.tagline,
      o.short_desc,
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
      o.seo_noindex
    from public.opportunities o
    where o.slug = p_slug
      and o.status = 'live'
      and coalesce(o.seo_noindex, false) = false
  ) t
$$;

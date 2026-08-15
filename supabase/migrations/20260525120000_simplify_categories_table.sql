-- Simplify categories: Lucide icons only; drop legacy display fields.

DROP VIEW IF EXISTS public.admin_category_stats;
DROP VIEW IF EXISTS public.admin_top_opportunities;
DROP VIEW IF EXISTS public.opportunities_with_details;

UPDATE public.categories
SET icon = CASE slug
  WHEN 'daily-cashflow' THEN 'Banknote'
  WHEN 'franchise' THEN 'Handshake'
  WHEN 'ev-energy' THEN 'Zap'
  WHEN 'food-agri' THEN 'Wheat'
  WHEN 'healthcare' THEN 'HeartPulse'
  WHEN 'digital' THEN 'Monitor'
  WHEN 'manufacturing' THEN 'Factory'
  WHEN 'retail' THEN 'ShoppingBag'
  WHEN 'textile' THEN 'Shirt'
  WHEN 'services' THEN 'Briefcase'
  WHEN 'construction' THEN 'Hammer'
  WHEN 'beauty-wellness' THEN 'Sparkles'
  WHEN 'education' THEN 'GraduationCap'
  WHEN 'logistics-supply' THEN 'Truck'
  WHEN 'logistics-mobility' THEN 'Truck'
  WHEN 'fintech-finance' THEN 'CreditCard'
  WHEN 'defence-deeptech' THEN 'Shield'
  ELSE CASE
    WHEN icon ~ '^[A-Z][a-zA-Z0-9]*$' THEN icon
    ELSE 'Shapes'
  END
END;

ALTER TABLE public.categories RENAME COLUMN icon TO lucide;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_heat_check;

ALTER TABLE public.categories
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS heat,
  DROP COLUMN IF EXISTS color,
  DROP COLUMN IF EXISTS sort_order;

CREATE VIEW public.admin_category_stats AS
SELECT
  c.slug,
  c.name,
  c.lucide,
  count(o.id) AS opp_count,
  COALESCE(sum(o.view_count), 0::bigint) AS total_views,
  COALESCE(sum(o.save_count), 0::bigint) AS total_saves
FROM public.categories c
LEFT JOIN public.opportunities o
  ON o.category_slug = c.slug
  AND o.status = 'live'::text
  AND o.slug <> 'ancggh'::text
WHERE c.is_active = true
GROUP BY c.slug, c.name, c.lucide
ORDER BY COALESCE(sum(o.view_count), 0::bigint) DESC;

CREATE VIEW public.admin_top_opportunities AS
SELECT
  o.slug,
  o.title,
  o.category_slug,
  o.score,
  o.view_count,
  o.save_count,
  o.unlock_click_count,
  c.name AS category_name,
  c.lucide AS category_icon
FROM public.opportunities o
LEFT JOIN public.categories c ON c.slug = o.category_slug
WHERE o.status = 'live'::text AND o.slug <> 'ancggh'::text
ORDER BY o.view_count DESC;

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
  o.supported_space_types,
  o.license_cost_min,
  o.license_cost_max,
  c.name AS category_name,
  c.lucide AS category_icon,
  p.full_name AS created_by_name
FROM public.opportunities o
LEFT JOIN public.categories c ON c.slug = o.category_slug
LEFT JOIN public.profiles p ON p.id = o.created_by;

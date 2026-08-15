-- Drop legacy tables (keep location_tiers, market_test_chat_sessions, geo_city).

DROP TABLE IF EXISTS public.help_faq_items CASCADE;
DROP TABLE IF EXISTS public.help_faq_categories CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.platform_settings CASCADE;
DROP TABLE IF EXISTS public.investor_interests CASCADE;
DROP TABLE IF EXISTS public.market_artifacts CASCADE;

DROP TABLE IF EXISTS public.geo_subdivision CASCADE;

ALTER TABLE public.geo_city DROP CONSTRAINT IF EXISTS geo_city_country_iso_fkey;

DROP TABLE IF EXISTS public.geo_country_iso CASCADE;

-- Drop legacy config tables (exchange_rates retained for currency conversion).

DROP TABLE IF EXISTS public.generated_docs CASCADE;
DROP TABLE IF EXISTS public.doc_templates CASCADE;
DROP TABLE IF EXISTS public.compliance_presets CASCADE;
DROP TABLE IF EXISTS public.category_taxonomy CASCADE;
DROP TABLE IF EXISTS public.feature_costs CASCADE;

-- Keep only Indian cities in geo_city.
DELETE FROM public.geo_city WHERE country_iso IS DISTINCT FROM 'IN';

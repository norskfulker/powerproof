-- Convert legacy INR market sizing (crore / lakh) to USD millions in JSON fields.
-- Matches app parser: values < 100k = crore; >= 100k = lakh; then stored as USD millions with market_size_unit = 'usd_m'.

CREATE OR REPLACE FUNCTION public.legacy_market_cr_to_usd_millions(val numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN val IS NULL OR val <= 0 THEN NULL
    WHEN val >= 100000 THEN ROUND((val * 100000.0 / 83.0 / 1000000.0)::numeric, 4)
    ELSE ROUND((val * 10000000.0 / 83.0 / 1000000.0)::numeric, 4)
  END;
$$;

-- market_intelligence: TAM / SAM / SOM
UPDATE public.opportunities o
SET market_intelligence = (
  COALESCE(o.market_intelligence, '{}'::jsonb)
  || jsonb_build_object('market_size_unit', 'usd_m')
  || jsonb_strip_nulls(
    jsonb_build_object(
      'tam_cr',
        CASE
          WHEN o.market_intelligence ? 'tam_cr'
          THEN to_jsonb(public.legacy_market_cr_to_usd_millions((o.market_intelligence->>'tam_cr')::numeric))
        END,
      'sam_cr',
        CASE
          WHEN o.market_intelligence ? 'sam_cr'
          THEN to_jsonb(public.legacy_market_cr_to_usd_millions((o.market_intelligence->>'sam_cr')::numeric))
        END,
      'som_cr',
        CASE
          WHEN o.market_intelligence ? 'som_cr'
          THEN to_jsonb(public.legacy_market_cr_to_usd_millions((o.market_intelligence->>'som_cr')::numeric))
        END
    )
  )
)
WHERE o.market_intelligence IS NOT NULL
  AND COALESCE(o.market_intelligence->>'market_size_unit', '') <> 'usd_m'
  AND (
    o.market_intelligence ? 'tam_cr'
    OR o.market_intelligence ? 'sam_cr'
    OR o.market_intelligence ? 'som_cr'
  );

-- market_demographics: uncaptured market
UPDATE public.opportunities o
SET market_demographics = (
  COALESCE(o.market_demographics, '{}'::jsonb)
  || jsonb_build_object('market_size_unit', 'usd_m')
  || jsonb_strip_nulls(
    jsonb_build_object(
      'uncaptured_market_cr',
        CASE
          WHEN o.market_demographics ? 'uncaptured_market_cr'
          THEN to_jsonb(
            public.legacy_market_cr_to_usd_millions((o.market_demographics->>'uncaptured_market_cr')::numeric)
          )
        END
    )
  )
)
WHERE o.market_demographics IS NOT NULL
  AND o.market_demographics ? 'uncaptured_market_cr'
  AND COALESCE(o.market_demographics->>'market_size_unit', '') <> 'usd_m';

-- Research copies on user_opportunities
UPDATE public.user_opportunities uo
SET market_intelligence = (
  COALESCE(uo.market_intelligence, '{}'::jsonb)
  || jsonb_build_object('market_size_unit', 'usd_m')
  || jsonb_strip_nulls(
    jsonb_build_object(
      'tam_cr',
        CASE
          WHEN uo.market_intelligence ? 'tam_cr'
          THEN to_jsonb(public.legacy_market_cr_to_usd_millions((uo.market_intelligence->>'tam_cr')::numeric))
        END,
      'sam_cr',
        CASE
          WHEN uo.market_intelligence ? 'sam_cr'
          THEN to_jsonb(public.legacy_market_cr_to_usd_millions((uo.market_intelligence->>'sam_cr')::numeric))
        END,
      'som_cr',
        CASE
          WHEN uo.market_intelligence ? 'som_cr'
          THEN to_jsonb(public.legacy_market_cr_to_usd_millions((uo.market_intelligence->>'som_cr')::numeric))
        END
    )
  )
)
WHERE uo.market_intelligence IS NOT NULL
  AND COALESCE(uo.market_intelligence->>'market_size_unit', '') <> 'usd_m'
  AND (
    uo.market_intelligence ? 'tam_cr'
    OR uo.market_intelligence ? 'sam_cr'
    OR uo.market_intelligence ? 'som_cr'
  );

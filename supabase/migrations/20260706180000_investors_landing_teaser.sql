-- Public teaser payload for /investors-landing (unlisted marketing URL).

CREATE OR REPLACE FUNCTION public.investors_landing_teaser(p_limit integer DEFAULT 12)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'count',
    (SELECT count(*)::integer FROM public.investors WHERE is_active = true),
    'investors',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'slug', i.slug,
            'name', i.name,
            'firm_type', i.firm_type,
            'hq_country', i.hq_country,
            'is_india_focused', i.is_india_focused,
            'founded_year', i.founded_year,
            'stages', i.stages,
            'sectors', i.sectors,
            'check_size_min_usd', i.check_size_min_usd,
            'check_size_max_usd', i.check_size_max_usd
          )
          ORDER BY i.name
        )
        FROM (
          SELECT *
          FROM public.investors
          WHERE is_active = true
          ORDER BY name
          LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 12), 24))
        ) i
      ),
      '[]'::jsonb
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.investors_landing_teaser(integer) TO anon, authenticated;

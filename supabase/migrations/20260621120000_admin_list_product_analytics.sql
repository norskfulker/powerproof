-- Admin list RPCs for roadmap, market test, and ItchMyBack analytics.

CREATE OR REPLACE FUNCTION public.admin_list_user_roadmaps()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.admin_assert_admin();
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_data ORDER BY created_at DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', ur.id,
          'user_id', ur.user_id,
          'title', ur.title,
          'goal_input', ur.goal_input,
          'domain', ur.domain,
          'generation_status', ur.generation_status,
          'total_phases', ur.total_phases,
          'total_tasks', ur.total_tasks,
          'total_weeks', ur.total_weeks,
          'credits_used', ur.credits_used,
          'created_at', ur.created_at,
          'updated_at', ur.updated_at
        ) AS row_data,
        ur.created_at
        FROM public.user_roadmaps ur
        ORDER BY ur.created_at DESC
        LIMIT 500
      ) rm
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_market_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.admin_assert_admin();
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_data ORDER BY created_at DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', mt.id,
          'user_id', mt.user_id,
          'query', mt.query,
          'generation_status', mt.generation_status,
          'verdict', mt.verdict,
          'market_reality_score', mt.market_reality_score,
          'credits_used', mt.credits_used,
          'model_used', mt.model_used,
          'created_at', mt.created_at
        ) AS row_data,
        mt.created_at
        FROM public.market_tests mt
        ORDER BY mt.created_at DESC
        LIMIT 500
      ) mts
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_itch_cards()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.admin_assert_admin();
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_data ORDER BY created_at DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', ic.id,
          'title', ic.title,
          'persona', ic.persona,
          'country', ic.country,
          'category_slug', ic.category_slug,
          'source', ic.source,
          'created_by', ic.created_by,
          'status', ic.status,
          'nirmaan_score', ic.nirmaan_score,
          'upvote_count', ic.upvote_count,
          'is_public', ic.is_public,
          'created_at', ic.created_at
        ) AS row_data,
        ic.created_at
        FROM public.itch_cards ic
        ORDER BY ic.created_at DESC
        LIMIT 500
      ) itch
    ),
    '[]'::jsonb
  );
END;
$$;

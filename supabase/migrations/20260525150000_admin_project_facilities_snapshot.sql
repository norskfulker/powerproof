-- Extend admin project snapshot with War Room, research, and sourcing data for support view.

CREATE OR REPLACE FUNCTION public.admin_get_project_snapshot(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT pr.user_id INTO v_user_id
  FROM public.projects pr
  WHERE pr.id = p_project_id;

  RETURN jsonb_build_object(
    'project',
      (SELECT to_jsonb(pr) FROM public.projects pr WHERE pr.id = p_project_id),
    'war_room',
      COALESCE(
        (
          SELECT jsonb_agg(row_data ORDER BY created_at DESC)
          FROM (
            SELECT jsonb_build_object(
              'id', up.id,
              'business_name', up.business_name,
              'business_description', up.business_description,
              'generation_status', up.generation_status,
              'credits_used', up.credits_used,
              'steps_checked', up.steps_checked,
              'step_count', COALESCE(jsonb_array_length(up.steps), 0),
              'created_at', up.created_at
            ) AS row_data,
            up.created_at
            FROM public.user_playbooks up
            WHERE up.project_id = p_project_id
            ORDER BY up.created_at DESC
            LIMIT 50
          ) wr
        ),
        '[]'::jsonb
      ),
    'research',
      COALESCE(
        (
          SELECT jsonb_agg(row_data ORDER BY created_at DESC)
          FROM (
            SELECT jsonb_build_object(
              'id', uo.id,
              'title', uo.title,
              'slug', uo.slug,
              'research_query', uo.research_query,
              'research_status', uo.research_status,
              'research_version', uo.research_version,
              're_research_count', COALESCE(uo.re_research_count, 0),
              'created_at', uo.created_at,
              'updated_at', uo.updated_at
            ) AS row_data,
            uo.created_at
            FROM public.user_opportunities uo
            WHERE uo.project_id = p_project_id
            ORDER BY uo.created_at DESC
            LIMIT 50
          ) rs
        ),
        '[]'::jsonb
      ),
    'sourcing_searches',
      CASE
        WHEN v_user_id IS NULL THEN '[]'::jsonb
        ELSE COALESCE(
          (
            SELECT jsonb_agg(row_data ORDER BY searched_at DESC)
            FROM (
              SELECT jsonb_build_object(
                'search_id', sh.search_id,
                'keyword', sh.keyword,
                'budget_max', sh.budget_max,
                'searched_at', sh.searched_at,
                'total_results', sh.total_results,
                'sources', sh.sources
              ) AS row_data,
              sh.searched_at
              FROM public.sourcing_search_history sh
              WHERE sh.user_id = v_user_id
              ORDER BY sh.searched_at DESC
              LIMIT 50
            ) ss
          ),
          '[]'::jsonb
        )
      END,
    'sourced_suppliers',
      COALESCE(
        (
          SELECT jsonb_agg(row_data ORDER BY created_at DESC)
          FROM (
            SELECT jsonb_build_object(
              'id', ss.id,
              'keyword', ss.keyword,
              'source', ss.source,
              'title', ss.title,
              'supplier_name', ss.supplier_name,
              'status', ss.status,
              'price_min', ss.price_min,
              'price_max', ss.price_max,
              'price_unit', ss.price_unit,
              'location', ss.location,
              'created_at', ss.created_at
            ) AS row_data,
            ss.created_at
            FROM public.sourced_suppliers ss
            WHERE ss.project_id = p_project_id
            ORDER BY ss.created_at DESC
            LIMIT 100
          ) sp
        ),
        '[]'::jsonb
      )
  );
END;
$$;

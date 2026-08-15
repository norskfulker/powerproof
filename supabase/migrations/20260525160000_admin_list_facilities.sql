-- Admin list RPCs for War Room, research, and sourcing (cross-workspace).

CREATE OR REPLACE FUNCTION public.admin_assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_war_room_playbooks()
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
          'id', up.id,
          'user_id', up.user_id,
          'project_id', up.project_id,
          'project_name', p.name,
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
        LEFT JOIN public.projects p ON p.id = up.project_id
        ORDER BY up.created_at DESC
        LIMIT 500
      ) wr
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_user_research()
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
          'id', uo.id,
          'user_id', uo.user_id,
          'project_id', uo.project_id,
          'project_name', p.name,
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
        LEFT JOIN public.projects p ON p.id = uo.project_id
        WHERE uo.research_status IS NOT NULL
           OR NULLIF(trim(uo.research_query), '') IS NOT NULL
        ORDER BY uo.created_at DESC
        LIMIT 500
      ) rs
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_sourcing_activity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  PERFORM public.admin_assert_admin();
  RETURN jsonb_build_object(
    'searches',
      COALESCE(
        (
          SELECT jsonb_agg(row_data ORDER BY searched_at DESC)
          FROM (
            SELECT jsonb_build_object(
              'search_id', sh.search_id,
              'user_id', sh.user_id,
              'keyword', sh.keyword,
              'budget_max', sh.budget_max,
              'searched_at', sh.searched_at,
              'total_results', sh.total_results,
              'sources', sh.sources
            ) AS row_data,
            sh.searched_at
            FROM public.sourcing_search_history sh
            ORDER BY sh.searched_at DESC
            LIMIT 500
          ) ss
        ),
        '[]'::jsonb
      ),
    'suppliers',
      COALESCE(
        (
          SELECT jsonb_agg(row_data ORDER BY created_at DESC)
          FROM (
            SELECT jsonb_build_object(
              'id', sp.id,
              'user_id', sp.user_id,
              'project_id', sp.project_id,
              'project_name', p.name,
              'keyword', sp.keyword,
              'source', sp.source,
              'title', sp.title,
              'supplier_name', sp.supplier_name,
              'status', sp.status,
              'price_min', sp.price_min,
              'price_max', sp.price_max,
              'price_unit', sp.price_unit,
              'location', sp.location,
              'created_at', sp.created_at
            ) AS row_data,
            sp.created_at
            FROM public.sourced_suppliers sp
            LEFT JOIN public.projects p ON p.id = sp.project_id
            ORDER BY sp.created_at DESC
            LIMIT 500
          ) sup
        ),
        '[]'::jsonb
      )
  );
END;
$$;

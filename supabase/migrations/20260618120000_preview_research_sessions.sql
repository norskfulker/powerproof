-- Landing hero preview research: anonymous sessions + post-signup claim

CREATE TABLE IF NOT EXISTS public.preview_research_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  client_key text NOT NULL,
  query text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  preview_data jsonb NOT NULL,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  opportunity_id uuid REFERENCES public.user_opportunities(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_preview_sessions_client_key_created
  ON public.preview_research_sessions (client_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_preview_sessions_token
  ON public.preview_research_sessions (session_token);

ALTER TABLE public.preview_research_sessions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.preview_research_sessions IS
  'Anonymous landing-page research previews; claimed after signup via claim_preview_session.';

CREATE OR REPLACE FUNCTION public.claim_preview_session(
  p_session_token uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.preview_research_sessions%ROWTYPE;
  v_opp_id uuid;
  v_slug text;
  v_preview jsonb;
  v_title text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_session
  FROM public.preview_research_sessions
  WHERE session_token = p_session_token
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'opportunity_id', null,
      'slug', null,
      'already_claimed', false,
      'error', 'session_not_found'
    );
  END IF;

  IF v_session.claimed_by IS NOT NULL THEN
    IF v_session.claimed_by = p_user_id AND v_session.opportunity_id IS NOT NULL THEN
      SELECT slug INTO v_slug FROM public.user_opportunities WHERE id = v_session.opportunity_id;
      RETURN jsonb_build_object(
        'opportunity_id', v_session.opportunity_id,
        'slug', v_slug,
        'already_claimed', true
      );
    END IF;
    RETURN jsonb_build_object(
      'opportunity_id', null,
      'slug', null,
      'already_claimed', true
    );
  END IF;

  v_preview := v_session.preview_data;
  v_title := coalesce(nullif(trim(v_preview->>'title'), ''), left(v_session.query, 80));

  v_slug := lower(regexp_replace(v_title, '[^a-zA-Z0-9\s-]', '', 'g'));
  v_slug := regexp_replace(trim(v_slug), '\s+', '-', 'g');
  v_slug := left(v_slug, 60) || '-preview-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.user_opportunities (
    user_id,
    slug,
    title,
    tagline,
    research_query,
    research_status,
    research_context,
    country,
    status,
    fit_index
  ) VALUES (
    p_user_id,
    v_slug,
    v_title,
    nullif(trim(v_preview->>'tagline'), ''),
    v_session.query,
    'initial',
    jsonb_build_object(
      'preview_data', v_preview,
      'preview_country', v_session.country
    ),
    v_session.country,
    'draft',
    CASE
      WHEN (v_preview->>'opportunity_score') ~ '^\d+$'
      THEN (v_preview->>'opportunity_score')::int
      ELSE NULL
    END
  )
  RETURNING id, slug INTO v_opp_id, v_slug;

  UPDATE public.preview_research_sessions
  SET
    claimed_by = p_user_id,
    claimed_at = now(),
    opportunity_id = v_opp_id
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'opportunity_id', v_opp_id,
    'slug', v_slug,
    'already_claimed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_preview_session(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_preview_session(uuid, uuid) TO authenticated;

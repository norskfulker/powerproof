-- Realtime email registration check for landing sign-in (anon-safe, profiles only)

CREATE OR REPLACE FUNCTION public.check_email_registered(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF v_email = '' OR position('@' in v_email) < 2 OR length(v_email) < 5 THEN
    RETURN jsonb_build_object('valid_format', false, 'exists', false);
  END IF;

  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RETURN jsonb_build_object('valid_format', false, 'exists', false);
  END IF;

  RETURN jsonb_build_object(
    'valid_format', true,
    'exists', EXISTS (
      SELECT 1 FROM public.profiles
      WHERE lower(trim(email)) = v_email
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_registered(text) TO anon, authenticated;

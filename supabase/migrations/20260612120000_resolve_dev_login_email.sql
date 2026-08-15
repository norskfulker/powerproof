-- Local dev: resolve @username or email to profiles.email for password sign-in (anon-safe).

CREATE OR REPLACE FUNCTION public.resolve_dev_login_email(p_alias text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_raw text := trim(COALESCE(p_alias, ''));
  v_alias text;
  v_email text;
BEGIN
  IF v_raw = '' THEN
    RETURN NULL;
  END IF;

  IF position('@' in v_raw) > 0 THEN
    v_email := lower(v_raw);
    SELECT p.email INTO v_email
    FROM public.profiles p
    WHERE lower(trim(p.email)) = v_email
    LIMIT 1;
    RETURN v_email;
  END IF;

  v_alias := lower(trim(both '@' from v_raw));
  IF v_alias = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.email INTO v_email
  FROM public.profiles p
  WHERE lower(trim(p.username)) = v_alias
  LIMIT 1;

  RETURN NULLIF(trim(v_email), '');
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_dev_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_dev_login_email(text) TO anon, authenticated;

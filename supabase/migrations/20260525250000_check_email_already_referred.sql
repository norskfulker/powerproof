-- Extend email presence check with referral status for landing sign-in

CREATE OR REPLACE FUNCTION public.check_email_registered(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_email = '' OR position('@' in v_email) < 2 OR length(v_email) < 5 THEN
    RETURN jsonb_build_object('valid_format', false, 'exists', false, 'already_referred', false);
  END IF;

  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RETURN jsonb_build_object('valid_format', false, 'exists', false, 'already_referred', false);
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE lower(trim(email)) = v_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid_format', true, 'exists', false, 'already_referred', false);
  END IF;

  RETURN jsonb_build_object(
    'valid_format', true,
    'exists', true,
    'already_referred', (
      v_profile.referred_by_user_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.user_referrals ur
        WHERE ur.referred_user_id = v_profile.id
      )
    )
  );
END;
$$;

-- Block self-referral during landing sign-in (no session yet) by comparing signer email.

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text, p_email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_norm text := public.normalize_referral_code(p_code);
  v_referrer public.profiles%ROWTYPE;
  v_signer_email text := lower(trim(COALESCE(p_email, '')));
BEGIN
  IF length(v_norm) <> 8 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_length');
  END IF;

  SELECT * INTO v_referrer
  FROM public.profiles
  WHERE upper(referral_code) = v_norm;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'not_found');
  END IF;

  IF auth.uid() IS NOT NULL AND v_referrer.id = auth.uid() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'self_referral');
  END IF;

  IF v_signer_email <> ''
     AND v_referrer.email IS NOT NULL
     AND lower(trim(v_referrer.email)) = v_signer_email THEN
    RETURN jsonb_build_object('valid', false, 'error', 'self_referral');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'referrer_user_id', v_referrer.id,
    'referrer_username', v_referrer.username,
    'referrer_display', COALESCE(v_referrer.display_name, v_referrer.full_name, v_referrer.email)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_norm text := public.normalize_referral_code(p_code);
  v_validation jsonb;
  v_referrer_id uuid;
  v_profile public.profiles%ROWTYPE;
  v_referrer_email text;
  v_user_email text;
  v_signup_reward integer := 100;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF length(v_norm) <> 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  v_validation := public.validate_referral_code(v_norm, NULL);
  IF COALESCE((v_validation->>'valid')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_validation->>'error', 'invalid_code'));
  END IF;

  v_referrer_id := (v_validation->>'referrer_user_id')::uuid;

  IF v_referrer_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  SELECT email INTO v_referrer_email FROM public.profiles WHERE id = v_referrer_id;
  SELECT email INTO v_user_email FROM public.profiles WHERE id = v_uid;

  IF v_referrer_email IS NOT NULL
     AND v_user_email IS NOT NULL
     AND lower(trim(v_referrer_email)) = lower(trim(v_user_email)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_profile.referred_by_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_referrals ur WHERE ur.referred_user_id = v_uid) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred');
  END IF;

  UPDATE public.profiles
  SET referred_by_user_id = v_referrer_id, updated_at = now()
  WHERE id = v_uid;

  INSERT INTO public.user_referrals (
    referrer_user_id,
    referred_user_id,
    referral_code_used,
    status,
    signup_reward_credits
  )
  VALUES (v_referrer_id, v_uid, v_norm, 'registered', v_signup_reward);

  PERFORM public.internal_grant_credits(
    v_referrer_id,
    v_signup_reward,
    'referral_signup',
    'referral_signup',
    jsonb_build_object('referred_user_id', v_uid, 'code', v_norm)
  );

  RETURN jsonb_build_object('success', true, 'signup_reward', v_signup_reward);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(text, text) TO anon, authenticated;

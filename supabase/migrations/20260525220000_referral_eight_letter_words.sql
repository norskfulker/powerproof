-- 8-letter random word referral codes (letters only)

CREATE OR REPLACE FUNCTION public.generate_referral_word()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  v_words text[] := ARRAY[
    'BALANCE', 'BRIGHTEN', 'BUILDING', 'CATALOG', 'CREATIVE', 'DISCOVER', 'ELEVATE', 'EMERALD',
    'FRIENDLY', 'HARMONY', 'INSIGHT', 'JOURNEY', 'KEYSTONE', 'LAUNCHER', 'METRICS', 'NETWORK',
    'OPENINGS', 'QUALITY', 'REACHING', 'STARTING', 'TRUSTED', 'VENTURE', 'WINNING', 'YEARBOOK',
    'ZEPPELIN', 'ABUNDANT', 'BLOSSOM', 'COURAGE', 'DYNAMIC', 'EMPOWER', 'FREEDOM', 'HORIZON',
    'INSPIRE', 'JUSTICE', 'KINDNESS', 'MOMENTUM', 'NIRVANA', 'OPTIMAL', 'PIONEER', 'QUANTUM',
    'RESOLVE', 'STELLAR', 'THRIVING', 'UNIFIED', 'VIBRANT', 'AMPLIFY', 'BOLDNESS', 'CLARITY',
    'DRIVING', 'ENERGIZE', 'GROWING', 'HONESTY', 'KINGDOM', 'LEADING', 'MASTERY', 'NIMBLE',
    'OUTCOME', 'PROGRESS', 'RISING', 'SUCCESS', 'WEALTHY'
  ];
  v_word text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_result text := '';
  i integer;
BEGIN
  IF array_length(v_words, 1) > 0 AND random() < 0.65 THEN
    v_word := v_words[1 + floor(random() * array_length(v_words, 1))::int];
    IF length(v_word) = 8 THEN
      RETURN upper(v_word);
    END IF;
  END IF;

  FOR i IN 1..8 LOOP
    v_result := v_result || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
  END LOOP;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_referral_word(p_exclude_user_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  LOOP
    v_code := public.generate_referral_word();
    v_attempts := v_attempts + 1;
    IF v_attempts > 200 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE upper(p.referral_code) = v_code
        AND (p_exclude_user_id IS NULL OR p.id <> p_exclude_user_id)
    );
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(left(regexp_replace(trim(COALESCE(p_code, '')), '[^a-zA-Z]', '', 'g'), 8));
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  IF v_profile.referral_code IS NOT NULL
     AND length(trim(v_profile.referral_code)) = 8
     AND v_profile.referral_code ~ '^[A-Za-z]{8}$' THEN
    RETURN upper(v_profile.referral_code);
  END IF;

  v_code := public.generate_unique_referral_word(v_uid);

  UPDATE public.profiles
  SET referral_code = v_code, updated_at = now()
  WHERE id = v_uid;

  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_norm text := public.normalize_referral_code(p_code);
  v_referrer public.profiles%ROWTYPE;
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
  v_signup_reward integer := 100;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF length(v_norm) <> 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  v_validation := public.validate_referral_code(v_norm);
  IF COALESCE((v_validation->>'valid')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', COALESCE(v_validation->>'error', 'invalid_code'));
  END IF;

  v_referrer_id := (v_validation->>'referrer_user_id')::uuid;

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

-- Re-backfill every profile with a new unique 8-letter word
DO $$
DECLARE
  r RECORD;
  v_code text;
BEGIN
  FOR r IN SELECT id FROM public.profiles ORDER BY created_at
  LOOP
    v_code := public.generate_unique_referral_word(r.id);
    UPDATE public.profiles
    SET referral_code = v_code, updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

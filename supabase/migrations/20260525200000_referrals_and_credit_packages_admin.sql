-- Referral program + admin write access to credit_packages

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_unique_idx
  ON public.profiles (upper(referral_code))
  WHERE referral_code IS NOT NULL AND length(trim(referral_code)) > 0;

CREATE INDEX IF NOT EXISTS profiles_referred_by_user_id_idx
  ON public.profiles (referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_used text NOT NULL,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'purchased')),
  signup_reward_credits integer NOT NULL DEFAULT 0,
  purchase_reward_credits integer NOT NULL DEFAULT 0,
  referred_purchase_credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_referrals_referred_user_unique UNIQUE (referred_user_id)
);

CREATE INDEX IF NOT EXISTS user_referrals_referrer_idx
  ON public.user_referrals (referrer_user_id, created_at DESC);

ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_referrals_select_own ON public.user_referrals;
CREATE POLICY user_referrals_select_own ON public.user_referrals
  FOR SELECT
  USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

DROP POLICY IF EXISTS user_referrals_admin_all ON public.user_referrals;
CREATE POLICY user_referrals_admin_all ON public.user_referrals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

GRANT SELECT ON public.user_referrals TO authenticated;
GRANT ALL ON public.user_referrals TO authenticated;

-- Admin manage credit packages
DROP POLICY IF EXISTS credit_packages_admin_all ON public.credit_packages;
CREATE POLICY credit_packages_admin_all ON public.credit_packages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(regexp_replace(trim(COALESCE(p_code, '')), '[^a-zA-Z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.internal_grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_feature text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_balance integer;
  v_new integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;

  SELECT balance INTO v_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new := COALESCE(v_balance, 0) + p_amount;

  IF v_balance IS NULL THEN
    INSERT INTO public.user_credits (user_id, balance, lifetime_earned, lifetime_purchased, lifetime_spent)
    VALUES (p_user_id, v_new, p_amount, 0, 0);
  ELSE
    UPDATE public.user_credits
    SET balance = v_new,
        lifetime_earned = lifetime_earned + p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_before, balance_after, feature, metadata)
  VALUES (
    p_user_id,
    COALESCE(p_type, 'bonus'),
    p_amount,
    COALESCE(v_balance, 0),
    v_new,
    COALESCE(p_feature, 'referral'),
    COALESCE(p_metadata, '{}'::jsonb)
  );

  RETURN v_new;
END;
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
  v_base text;
  v_suffix integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  IF v_profile.referral_code IS NOT NULL AND length(trim(v_profile.referral_code)) > 0 THEN
    RETURN v_profile.referral_code;
  END IF;

  v_base := upper(regexp_replace(COALESCE(v_profile.username, ''), '[^a-zA-Z0-9]', '', 'g'));
  IF length(v_base) < 3 THEN
    v_base := 'NIR' || upper(substr(replace(v_uid::text, '-', ''), 1, 6));
  END IF;

  v_code := v_base;
  WHILE EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id <> v_uid AND upper(p.referral_code) = v_code
  ) LOOP
    v_suffix := v_suffix + 1;
    v_code := v_base || v_suffix::text;
  END LOOP;

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
  IF length(v_norm) < 3 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'too_short');
  END IF;

  SELECT * INTO v_referrer
  FROM public.profiles
  WHERE upper(referral_code) = v_norm
     OR upper(regexp_replace(COALESCE(username, ''), '[^a-zA-Z0-9]', '', 'g')) = v_norm
  ORDER BY CASE WHEN upper(referral_code) = v_norm THEN 0 ELSE 1 END
  LIMIT 1;

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

  IF length(v_norm) < 3 THEN
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

CREATE OR REPLACE FUNCTION public.process_referral_purchase_bonus(
  p_referred_user_id uuid,
  p_purchased_credits integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id uuid;
  v_bonus integer;
  v_ref public.user_referrals%ROWTYPE;
BEGIN
  IF p_purchased_credits IS NULL OR p_purchased_credits <= 0 THEN
    RETURN;
  END IF;

  SELECT referred_by_user_id INTO v_referrer_id
  FROM public.profiles
  WHERE id = p_referred_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_ref
  FROM public.user_referrals
  WHERE referred_user_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_ref.purchase_reward_credits > 0 THEN
    RETURN;
  END IF;

  v_bonus := p_purchased_credits * 2;

  UPDATE public.user_referrals
  SET status = 'purchased',
      purchase_reward_credits = v_bonus,
      referred_purchase_credits = p_purchased_credits,
      updated_at = now()
  WHERE id = v_ref.id;

  PERFORM public.internal_grant_credits(
    v_referrer_id,
    v_bonus,
    'referral_purchase',
    'referral_purchase',
    jsonb_build_object(
      'referred_user_id', p_referred_user_id,
      'purchased_credits', p_purchased_credits,
      'multiplier', 2
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_credit_purchase(
  p_purchase_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid;
  v_pkg uuid;
  v_credits int;
  v_status text;
  v_bal int;
  v_new int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT user_id, package_id, credits_bought, status
  INTO v_user, v_pkg, v_credits, v_status
  FROM public.credit_purchases
  WHERE id = p_purchase_id
  FOR UPDATE;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'purchase not found';
  END IF;
  IF v_user <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF v_status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'invalid purchase status';
  END IF;

  UPDATE public.credit_purchases
  SET status = 'completed',
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature = p_razorpay_signature,
      completed_at = now()
  WHERE id = p_purchase_id;

  SELECT balance INTO v_bal FROM public.user_credits WHERE user_id = v_user FOR UPDATE;
  v_new := COALESCE(v_bal, 0) + v_credits;

  IF v_bal IS NULL THEN
    INSERT INTO public.user_credits (user_id, balance, lifetime_earned, lifetime_purchased, lifetime_spent)
    VALUES (v_user, v_new, 0, v_credits, 0);
  ELSE
    UPDATE public.user_credits
    SET balance = v_new,
        lifetime_purchased = lifetime_purchased + v_credits,
        updated_at = now()
    WHERE user_id = v_user;
  END IF;

  INSERT INTO public.credit_transactions (user_id, type, amount, balance_before, balance_after, feature, metadata)
  VALUES (
    v_user,
    'purchase',
    v_credits,
    COALESCE(v_bal, 0),
    v_new,
    'credit_package',
    jsonb_build_object('purchase_id', p_purchase_id, 'razorpay_payment_id', p_razorpay_payment_id)
  );

  PERFORM public.process_referral_purchase_bonus(v_user, v_credits);

  RETURN jsonb_build_object('success', true, 'balance', v_new);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_user_referral_code() TO authenticated;

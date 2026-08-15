-- Signup: auto-generate username from Google/email, ensure profile exists, fix free-credit check.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_name text;
  v_username text;
BEGIN
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(split_part(new.email, '@', 1)), ''),
    'user'
  );

  v_username := public.generate_username(v_name);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    username,
    avatar_url,
    home_country,
    preferred_currency,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    new.id,
    new.email,
    v_name,
    v_name,
    v_username,
    new.raw_user_meta_data->>'avatar_url',
    'IN',
    'INR',
    true,
    3
  );

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user auth.users%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_name text;
  v_username text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF FOUND THEN
    IF v_profile.username IS NULL OR trim(v_profile.username) = '' THEN
      v_name := coalesce(
        nullif(trim(v_profile.full_name), ''),
        nullif(trim(v_profile.display_name), ''),
        nullif(trim(split_part(v_profile.email, '@', 1)), ''),
        'user'
      );
      v_username := public.generate_username(v_name);
      UPDATE public.profiles
      SET
        username = v_username,
        full_name = coalesce(full_name, v_name),
        display_name = coalesce(display_name, v_name),
        home_country = coalesce(nullif(trim(home_country), ''), 'IN'),
        preferred_currency = coalesce(nullif(trim(preferred_currency), ''), 'INR'),
        onboarding_completed = coalesce(onboarding_completed, true),
        onboarding_step = greatest(coalesce(onboarding_step, 0), 3)
      WHERE id = v_uid
      RETURNING * INTO v_profile;
    END IF;
    RETURN v_profile;
  END IF;

  SELECT * INTO v_user FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  v_name := coalesce(
    nullif(trim(v_user.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(v_user.raw_user_meta_data->>'name'), ''),
    nullif(trim(split_part(v_user.email, '@', 1)), ''),
    'user'
  );
  v_username := public.generate_username(v_name);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    display_name,
    username,
    avatar_url,
    home_country,
    preferred_currency,
    onboarding_completed,
    onboarding_step
  )
  VALUES (
    v_uid,
    v_user.email,
    v_name,
    v_name,
    v_username,
    v_user.raw_user_meta_data->>'avatar_url',
    'IN',
    'INR',
    true,
    3
  )
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_claimed_free_credits()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.credit_purchases cp
    INNER JOIN public.credit_packages pkg ON pkg.id = cp.package_id
    WHERE cp.user_id = auth.uid()
      AND cp.status = 'completed'
      AND COALESCE(pkg.price_inr, 0) = 0
  );
$$;

-- Orphan auth.users without profiles (e.g. trigger missed on older signups).
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  display_name,
  username,
  home_country,
  preferred_currency,
  onboarding_completed,
  onboarding_step
)
SELECT
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'name'), ''),
    split_part(u.email, '@', 1)
  ),
  public.generate_username(
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      split_part(u.email, '@', 1)
    )
  ),
  'IN',
  'INR',
  true,
  3
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.profiles p
SET username = public.generate_username(
      coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.display_name), ''), split_part(p.email, '@', 1), 'user')
    )
WHERE p.username IS NULL OR trim(p.username) = '';

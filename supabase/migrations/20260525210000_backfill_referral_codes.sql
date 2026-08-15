-- Generate referral_code for all existing profiles that lack one

DO $$
DECLARE
  r RECORD;
  v_base text;
  v_code text;
  v_suffix integer;
BEGIN
  FOR r IN
    SELECT id, username
    FROM public.profiles
    WHERE referral_code IS NULL OR length(trim(referral_code)) = 0
  LOOP
    v_base := upper(regexp_replace(COALESCE(r.username, ''), '[^a-zA-Z0-9]', '', 'g'));
    IF length(v_base) < 3 THEN
      v_base := 'NIR' || upper(substr(replace(r.id::text, '-', ''), 1, 6));
    END IF;

    v_code := v_base;
    v_suffix := 0;

    WHILE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id <> r.id AND upper(p.referral_code) = v_code
    ) LOOP
      v_suffix := v_suffix + 1;
      v_code := v_base || v_suffix::text;
    END LOOP;

    UPDATE public.profiles
    SET referral_code = v_code, updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Guest checkout for investors landing (pay without signing in first).

ALTER TABLE public.investor_list_purchases
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.investor_list_purchases
  ADD COLUMN IF NOT EXISTS guest_email text;

ALTER TABLE public.investor_list_purchases
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.investor_list_email_unlocks (
  email text PRIMARY KEY,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  purchase_id uuid REFERENCES public.investor_list_purchases(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS investor_list_email_unlocks_lower_email_idx
  ON public.investor_list_email_unlocks (lower(email));

CREATE INDEX IF NOT EXISTS investor_list_purchases_guest_email_idx
  ON public.investor_list_purchases (lower(guest_email))
  WHERE guest_email IS NOT NULL;

ALTER TABLE public.investor_list_email_unlocks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_investors_list_email_unlock()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_unlocked boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(trim(p.email))
  INTO v_email
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_email IS NULL OR v_email = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.investor_list_email_unlocks u
    WHERE lower(u.email) = v_email
  ) THEN
    UPDATE public.profiles
    SET investors_list_unlocked_at = COALESCE(investors_list_unlocked_at, now()),
        updated_at = now()
    WHERE id = auth.uid()
      AND investors_list_unlocked_at IS NULL;

    v_unlocked := FOUND;
  END IF;

  RETURN v_unlocked;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_investors_list_email_unlock() TO authenticated;

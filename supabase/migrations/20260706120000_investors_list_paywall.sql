-- Investors list paywall: unlock via one-time ₹499 purchase.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS investors_list_unlocked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.investor_list_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_paid_inr integer NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS investor_list_purchases_user_id_idx
  ON public.investor_list_purchases (user_id);

CREATE INDEX IF NOT EXISTS investor_list_purchases_order_id_idx
  ON public.investor_list_purchases (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

ALTER TABLE public.investor_list_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own investor list purchases" ON public.investor_list_purchases;
CREATE POLICY "Users read own investor list purchases"
  ON public.investor_list_purchases
  FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.user_has_investors_list_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.investors_list_unlocked_at IS NOT NULL
        OR p.role IN ('admin', 'super_admin')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_investors_list_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.investors_active_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.investors WHERE is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.investors_active_count() TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read investors" ON public.investors;
CREATE POLICY "Investors list unlocked users can read investors"
  ON public.investors
  FOR SELECT
  USING (is_active = true AND public.user_has_investors_list_access());

CREATE OR REPLACE FUNCTION public.complete_investors_list_purchase(
  p_purchase_id uuid,
  p_razorpay_payment_id text,
  p_razorpay_signature text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT user_id, status
  INTO v_user, v_status
  FROM public.investor_list_purchases
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

  UPDATE public.investor_list_purchases
  SET status = 'completed',
      razorpay_payment_id = p_razorpay_payment_id,
      razorpay_signature = p_razorpay_signature,
      completed_at = now()
  WHERE id = p_purchase_id;

  UPDATE public.profiles
  SET investors_list_unlocked_at = COALESCE(investors_list_unlocked_at, now()),
      updated_at = now()
  WHERE id = v_user;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_investors_list_purchase(uuid, text, text) TO authenticated;

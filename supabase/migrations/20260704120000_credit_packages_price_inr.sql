-- Credit packages: canonical INR list price (matches Razorpay checkout amount).

ALTER TABLE public.credit_packages
  ADD COLUMN IF NOT EXISTS price_inr numeric;

-- Backfill from legacy USD column using the checkout rate (84) when INR is unset.
UPDATE public.credit_packages
SET price_inr = ROUND(price_usd * 94)
WHERE price_inr IS NULL
  AND price_usd IS NOT NULL
  AND price_usd > 0;

UPDATE public.credit_packages
SET price_inr = 0
WHERE price_inr IS NULL;

ALTER TABLE public.credit_packages
  ALTER COLUMN price_inr SET DEFAULT 0;

COMMENT ON COLUMN public.credit_packages.price_inr IS 'List price in whole INR rupees (Razorpay charge amount).';

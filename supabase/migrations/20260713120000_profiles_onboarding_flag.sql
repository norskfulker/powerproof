-- First-time research opportunity reveal onboarding (distinct from account setup).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.onboarding IS
  'True after the user completes the first-time research opportunity reveal onboarding.';

-- Columns referenced by Profile type / ProfilePage but missing from live schema.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_description boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_language text,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.display_description IS 'Show opportunity descriptions in feed cards';
COMMENT ON COLUMN public.profiles.ai_language IS 'Preferred language code for AI features (e.g. en, hi)';
COMMENT ON COLUMN public.profiles.is_verified IS 'Identity/business verification badge on profile and B2B';

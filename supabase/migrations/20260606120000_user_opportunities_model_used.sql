-- Store the AI model selected when research was run (for My Research history cards).
ALTER TABLE public.user_opportunities
  ADD COLUMN IF NOT EXISTS model_used text;

COMMENT ON COLUMN public.user_opportunities.model_used IS
  'Preferred AI model id at research time (gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.5-pro).';

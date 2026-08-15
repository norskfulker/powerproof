-- Drop profile columns with no application usage (verified against codebase + live schema).
-- Kept: full_name, notification prefs, onboarding, budget/categories/state, employment_status,
--       username, display_name, bio, and other actively referenced fields.

-- Public profile browse was never wired in the app; policy referenced is_public.
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS saved_opportunities,
  DROP COLUMN IF EXISTS viewed_opportunities,
  DROP COLUMN IF EXISTS display_scores,
  DROP COLUMN IF EXISTS display_ease,
  DROP COLUMN IF EXISTS default_view,
  DROP COLUMN IF EXISTS preferred_city,
  DROP COLUMN IF EXISTS business_experience,
  DROP COLUMN IF EXISTS primary_goal,
  DROP COLUMN IF EXISTS theme_preference,
  DROP COLUMN IF EXISTS cancellation_reason,
  DROP COLUMN IF EXISTS selected_city,
  DROP COLUMN IF EXISTS selected_zone,
  DROP COLUMN IF EXISTS selected_state,
  DROP COLUMN IF EXISTS cover_url,
  DROP COLUMN IF EXISTS is_individual,
  DROP COLUMN IF EXISTS individual_unlocked_at,
  DROP COLUMN IF EXISTS is_public,
  DROP COLUMN IF EXISTS follower_count,
  DROP COLUMN IF EXISTS following_count,
  DROP COLUMN IF EXISTS ai_language,
  DROP COLUMN IF EXISTS is_verified;

-- Drop unused / legacy tables (preview_sessions kept for landing claim flow).

DROP TABLE IF EXISTS public.unlocked_opportunities CASCADE;
DROP TABLE IF EXISTS public.profile_comments CASCADE;
DROP TABLE IF EXISTS public.preview_rate_limits CASCADE;
DROP TABLE IF EXISTS public.user_saves CASCADE;
DROP TABLE IF EXISTS public.user_unlocks CASCADE;
DROP TABLE IF EXISTS public.location_tiers CASCADE;

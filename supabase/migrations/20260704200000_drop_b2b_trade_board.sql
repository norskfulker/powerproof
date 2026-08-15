-- Remove B2B Trade Board tables and RPCs.
-- Does not touch sourcing (b2b-sourcing-* edge functions, sourcing_results, etc.).

DELETE FROM public.user_saves WHERE entity_type = 'b2b_post';

DROP TABLE IF EXISTS public.b2b_reports CASCADE;
DROP TABLE IF EXISTS public.b2b_messages CASCADE;
DROP TABLE IF EXISTS public.b2b_responses CASCADE;
DROP TABLE IF EXISTS public.b2b_posts CASCADE;
DROP TABLE IF EXISTS public.b2b_categories CASCADE;

DROP FUNCTION IF EXISTS public.admin_set_b2b_post_status CASCADE;
DROP FUNCTION IF EXISTS public.b2b_posts_sync_legacy_columns CASCADE;
DROP FUNCTION IF EXISTS public.find_b2b_matches CASCADE;
DROP FUNCTION IF EXISTS public.get_b2b_category_counts CASCADE;
DROP FUNCTION IF EXISTS public.get_b2b_unread_count CASCADE;
DROP FUNCTION IF EXISTS public.increment_b2b_inquiry_count CASCADE;
DROP FUNCTION IF EXISTS public.increment_b2b_response CASCADE;
DROP FUNCTION IF EXISTS public.increment_b2b_view CASCADE;
DROP FUNCTION IF EXISTS public.mark_b2b_thread_read CASCADE;
DROP FUNCTION IF EXISTS public.respond_to_b2b_post CASCADE;
DROP FUNCTION IF EXISTS public.send_b2b_thread_message CASCADE;
DROP FUNCTION IF EXISTS public.spend_credits_for_b2b_message CASCADE;
DROP FUNCTION IF EXISTS public.trg_redact_b2b_messages CASCADE;
DROP FUNCTION IF EXISTS public.trg_redact_b2b_responses CASCADE;

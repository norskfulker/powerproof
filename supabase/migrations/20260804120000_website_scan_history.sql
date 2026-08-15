-- Persist website scanner reports so users can re-open past scans.
-- One row per scan (duplicates allowed; no dedupe or retention logic).

CREATE TABLE IF NOT EXISTS public.website_scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  normalized_url text NOT NULL,
  final_url text,
  status integer NOT NULL,
  duration_ms integer NOT NULL,
  page_count integer NOT NULL,
  site_title text,
  seo_score integer NOT NULL,
  business_score integer NOT NULL,
  competitor_score integer NOT NULL,
  roadmap_score integer NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS website_scan_history_user_created_idx
  ON public.website_scan_history (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS website_scan_history_user_normalized_url_idx
  ON public.website_scan_history (user_id, normalized_url, created_at DESC);

ALTER TABLE public.website_scan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS website_scan_history_insert_own ON public.website_scan_history;
CREATE POLICY website_scan_history_insert_own ON public.website_scan_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS website_scan_history_select_own ON public.website_scan_history;
CREATE POLICY website_scan_history_select_own ON public.website_scan_history
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS website_scan_history_delete_own ON public.website_scan_history;
CREATE POLICY website_scan_history_delete_own ON public.website_scan_history
  FOR DELETE
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.website_scan_history TO authenticated;

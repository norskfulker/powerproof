-- Persist Firecrawl crawl payloads on website_scan_history so audits can
-- re-use a recent crawl instead of paying to re-crawl the same site.

ALTER TABLE public.website_scan_history
  ADD COLUMN IF NOT EXISTS crawl_payload jsonb,
  ADD COLUMN IF NOT EXISTS crawl_source text
    CHECK (crawl_source IN ('fresh', 'cache', 'inhouse')),
  ADD COLUMN IF NOT EXISTS crawl_at timestamptz,
  ADD COLUMN IF NOT EXISTS firecrawl_job_id text;

CREATE INDEX IF NOT EXISTS website_scan_history_user_url_recent_idx
  ON public.website_scan_history (user_id, normalized_url, created_at DESC)
  WHERE crawl_payload IS NOT NULL;
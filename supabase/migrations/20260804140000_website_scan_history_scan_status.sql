-- Progressive scan lifecycle so detail pages can poll while Gemini passes finish.

ALTER TABLE public.website_scan_history
  ADD COLUMN IF NOT EXISTS scan_status text NOT NULL DEFAULT 'complete';

UPDATE public.website_scan_history
SET scan_status = 'complete'
WHERE scan_status IS NULL OR scan_status = '';

ALTER TABLE public.website_scan_history
  DROP CONSTRAINT IF EXISTS website_scan_history_scan_status_check;

ALTER TABLE public.website_scan_history
  ADD CONSTRAINT website_scan_history_scan_status_check
  CHECK (scan_status IN ('running', 'complete', 'error'));

COMMENT ON COLUMN public.website_scan_history.scan_status IS
  'running while crawl/AI passes are in flight; complete or error when finished.';

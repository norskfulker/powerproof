-- sourcing_search_history is a view over sourcing_results.
-- Without security_invoker, the view bypasses RLS and exposed all users' searches.

CREATE OR REPLACE VIEW public.sourcing_search_history
WITH (security_invoker = true)
AS
SELECT
  search_id,
  user_id,
  keyword,
  budget_max,
  min(scraped_at) AS searched_at,
  sum(returned_count) AS total_results,
  array_agg(source ORDER BY source) AS sources,
  jsonb_object_agg(source, results) AS results_by_source,
  jsonb_object_agg(source, returned_count) AS counts_by_source
FROM public.sourcing_results
WHERE search_id IS NOT NULL
GROUP BY search_id, user_id, keyword, budget_max;

COMMENT ON VIEW public.sourcing_search_history IS
  'Per-user aggregated sourcing searches; security_invoker applies sourcing_results RLS.';

DROP POLICY IF EXISTS "Users can delete own sourcing results" ON public.sourcing_results;

CREATE POLICY "Users can delete own sourcing results"
  ON public.sourcing_results
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

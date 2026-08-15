-- In-app feedback: bug reports, feature requests, incorrect data reports

CREATE TABLE IF NOT EXISTS public.user_feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type text NOT NULL
    CHECK (feedback_type IN ('bug_report', 'feature_request', 'incorrect_data')),
  message text NOT NULL CHECK (char_length(trim(message)) >= 3),
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_feedback_submissions_user_created_idx
  ON public.user_feedback_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_feedback_submissions_type_created_idx
  ON public.user_feedback_submissions (feedback_type, created_at DESC);

ALTER TABLE public.user_feedback_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_feedback_submissions_insert_own ON public.user_feedback_submissions;
CREATE POLICY user_feedback_submissions_insert_own ON public.user_feedback_submissions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_feedback_submissions_select_own ON public.user_feedback_submissions;
CREATE POLICY user_feedback_submissions_select_own ON public.user_feedback_submissions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_feedback_submissions_admin_all ON public.user_feedback_submissions;
CREATE POLICY user_feedback_submissions_admin_all ON public.user_feedback_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    )
  );

GRANT SELECT, INSERT ON public.user_feedback_submissions TO authenticated;

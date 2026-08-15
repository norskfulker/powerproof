-- Anon users hit 42501 when RLS policies FOR PUBLIC call get_my_role() (EXECUTE granted
-- only to authenticated). Scope admin policies to authenticated; split profile SELECT.

-- opportunities: admin paths must not run for anon
DROP POLICY IF EXISTS opportunities_select_admin ON public.opportunities;
CREATE POLICY opportunities_select_admin ON public.opportunities
  FOR SELECT
  TO authenticated
  USING (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

DROP POLICY IF EXISTS opportunities_insert_admin ON public.opportunities;
CREATE POLICY opportunities_insert_admin ON public.opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

DROP POLICY IF EXISTS opportunities_update_admin ON public.opportunities;
CREATE POLICY opportunities_update_admin ON public.opportunities
  FOR UPDATE
  TO authenticated
  USING (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

DROP POLICY IF EXISTS opportunities_delete_admin ON public.opportunities;
CREATE POLICY opportunities_delete_admin ON public.opportunities
  FOR DELETE
  TO authenticated
  USING (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

-- profiles: avoid OR branch that calls get_my_role() for anon
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;

CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (get_my_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

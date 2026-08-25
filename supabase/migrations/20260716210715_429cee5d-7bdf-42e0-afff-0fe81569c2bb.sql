CREATE POLICY "kyc_submissions_admin_select" ON public.kyc_submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_submissions_admin_update" ON public.kyc_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kyc_documents_admin_select" ON public.kyc_documents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
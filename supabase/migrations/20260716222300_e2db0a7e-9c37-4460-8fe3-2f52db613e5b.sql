CREATE POLICY "Read platform-assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'platform-assets');

CREATE POLICY "Admins upload platform-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'platform-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update platform-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'platform-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete platform-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'platform-assets' AND public.has_role(auth.uid(), 'admin'));

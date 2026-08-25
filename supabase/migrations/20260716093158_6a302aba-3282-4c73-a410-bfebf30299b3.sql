CREATE POLICY "Users can read own product files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own product files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own product files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own product files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Read platform-assets" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated read product images" ON storage.objects;
CREATE POLICY "Users read own product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

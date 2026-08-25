
CREATE TABLE public.product_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  description TEXT,
  video_source TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_files TO authenticated;
GRANT ALL ON public.product_files TO service_role;

ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage product files"
  ON public.product_files FOR ALL
  USING (public.is_product_owner(product_id, auth.uid()))
  WITH CHECK (public.is_product_owner(product_id, auth.uid()));

CREATE TRIGGER update_product_files_updated_at
  BEFORE UPDATE ON public.product_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for products bucket (owners of a product can manage files under products/<product_id>/*)
CREATE POLICY "Owners upload product files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND public.is_product_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Owners read product files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'products'
    AND public.is_product_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

CREATE POLICY "Owners delete product files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'products'
    AND public.is_product_owner((storage.foldername(name))[1]::uuid, auth.uid())
  );

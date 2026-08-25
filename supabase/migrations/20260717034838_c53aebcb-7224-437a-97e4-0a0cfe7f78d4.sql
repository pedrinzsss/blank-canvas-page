
CREATE TABLE public.member_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  comments_config TEXT NOT NULL DEFAULT 'approve_auto',
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_areas TO authenticated;
GRANT ALL ON public.member_areas TO service_role;

ALTER TABLE public.member_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage member areas" ON public.member_areas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_member_areas_updated_at
  BEFORE UPDATE ON public.member_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.product_coproducers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_coproducers TO authenticated;
GRANT ALL ON public.product_coproducers TO service_role;

ALTER TABLE public.product_coproducers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage coproducers"
  ON public.product_coproducers FOR ALL
  USING (public.is_product_owner(product_id, auth.uid()))
  WITH CHECK (public.is_product_owner(product_id, auth.uid()));

CREATE POLICY "Coproducer can view own row"
  ON public.product_coproducers FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_product_coproducers_updated_at
  BEFORE UPDATE ON public.product_coproducers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS affiliation_mode text NOT NULL DEFAULT 'approve',
  ADD COLUMN IF NOT EXISTS affiliate_commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_description text;

CREATE TABLE IF NOT EXISTS public.affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, affiliate_user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliations TO authenticated;
GRANT ALL ON public.affiliations TO service_role;

ALTER TABLE public.affiliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view their own affiliations"
  ON public.affiliations FOR SELECT
  USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Product owners can view affiliations"
  ON public.affiliations FOR SELECT
  USING (public.is_product_owner(product_id, auth.uid()));

CREATE POLICY "Users can request to affiliate"
  ON public.affiliations FOR INSERT
  WITH CHECK (auth.uid() = affiliate_user_id);

CREATE POLICY "Product owners can update affiliations"
  ON public.affiliations FOR UPDATE
  USING (public.is_product_owner(product_id, auth.uid()))
  WITH CHECK (public.is_product_owner(product_id, auth.uid()));

CREATE POLICY "Product owners or affiliate can delete"
  ON public.affiliations FOR DELETE
  USING (public.is_product_owner(product_id, auth.uid()) OR auth.uid() = affiliate_user_id);

CREATE TRIGGER update_affiliations_updated_at
  BEFORE UPDATE ON public.affiliations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

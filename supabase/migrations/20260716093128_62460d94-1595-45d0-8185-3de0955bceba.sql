CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  show_in_showcase BOOLEAN NOT NULL DEFAULT false,
  payment_type TEXT NOT NULL DEFAULT 'unico' CHECK (payment_type IN ('unico','recorrente')),
  recurrence_frequency TEXT CHECK (recurrence_frequency IN ('mensal','trimestral','semestral','anual')),
  delivery_type TEXT NOT NULL DEFAULT 'area_membros' CHECK (delivery_type IN ('area_membros','arquivo')),
  delivery_file_url TEXT,
  category TEXT,
  sales_page_url TEXT,
  different_first_charge BOOLEAN NOT NULL DEFAULT false,
  first_charge_price_cents INTEGER,
  recurrence_price_cents INTEGER,
  price_cents INTEGER,
  sac_display_name TEXT,
  sac_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products" ON public.products
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view showcase products" ON public.products
  FOR SELECT TO anon
  USING (show_in_showcase = true);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
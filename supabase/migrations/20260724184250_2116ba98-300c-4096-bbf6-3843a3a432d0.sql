CREATE TABLE public.shopify_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_domain text NOT NULL,
  access_token_encrypted text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  shop_name text,
  shop_email text,
  currency text,
  status text NOT NULL DEFAULT 'connected',
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_domain)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_connections TO authenticated;
GRANT ALL ON public.shopify_connections TO service_role;

ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own shopify connections"
  ON public.shopify_connections
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER shopify_connections_set_updated_at
  BEFORE UPDATE ON public.shopify_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.shopify_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.shopify_connections(id) ON DELETE CASCADE,
  shopify_product_id bigint NOT NULL,
  handle text,
  title text NOT NULL,
  description text,
  status text,
  price_cents integer,
  currency text,
  sku text,
  image_url text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, shopify_product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_products TO authenticated;
GRANT ALL ON public.shopify_products TO service_role;

ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own shopify products"
  ON public.shopify_products
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX shopify_products_user_idx ON public.shopify_products(user_id);
CREATE INDEX shopify_products_connection_idx ON public.shopify_products(connection_id);

CREATE TRIGGER shopify_products_set_updated_at
  BEFORE UPDATE ON public.shopify_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
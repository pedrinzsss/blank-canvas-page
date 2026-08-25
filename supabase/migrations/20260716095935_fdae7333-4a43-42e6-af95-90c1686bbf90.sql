
SET check_function_bodies = off;

DO $$ BEGIN CREATE TYPE public.offer_billing_type AS ENUM ('one_time','recurring'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.offer_status AS ENUM ('draft','active','inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('pix','credit_card','debit_card','boleto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.product_status AS ENUM ('active','inactive','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status public.product_status NOT NULL DEFAULT 'active';

-- Tabelas primeiro
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0,
  billing_type public.offer_billing_type NOT NULL DEFAULT 'one_time',
  max_installments integer NOT NULL DEFAULT 12,
  show_interest boolean NOT NULL DEFAULT false,
  status public.offer_status NOT NULL DEFAULT 'draft',
  checkout_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(6),'hex'),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS offers_product_id_idx ON public.offers(product_id);
CREATE INDEX IF NOT EXISTS offers_checkout_token_idx ON public.offers(checkout_token);

CREATE TABLE IF NOT EXISTS public.offer_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  max_installments integer,
  show_interest boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, method)
);
CREATE INDEX IF NOT EXISTS opm_offer_idx ON public.offer_payment_methods(offer_id);

CREATE TABLE IF NOT EXISTS public.checkout_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL UNIQUE REFERENCES public.offers(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#7c3aed',
  secondary_color text NOT NULL DEFAULT '#a855f7',
  button_color text NOT NULL DEFAULT '#7c3aed',
  background_color text NOT NULL DEFAULT '#0b0b12',
  layout text NOT NULL DEFAULT 'default',
  title text,
  description text,
  image_url text,
  button_text text NOT NULL DEFAULT 'COMPRAR AGORA',
  show_logo boolean NOT NULL DEFAULT true,
  show_description boolean NOT NULL DEFAULT true,
  show_guarantee boolean NOT NULL DEFAULT true,
  show_testimonials boolean NOT NULL DEFAULT false,
  show_faq boolean NOT NULL DEFAULT false,
  show_timer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tracking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL UNIQUE REFERENCES public.offers(id) ON DELETE CASCADE,
  meta_pixel_id text,
  meta_access_token text,
  meta_test_event_code text,
  google_ads_conversion_id text,
  google_ads_conversion_label text,
  ga_measurement_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_bumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  bump_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ob_offer_idx ON public.order_bumps(offer_id);

CREATE TABLE IF NOT EXISTS public.upsells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL UNIQUE REFERENCES public.offers(id) ON DELETE CASCADE,
  upsell_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT ON public.offers TO anon;
GRANT ALL ON public.offers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_payment_methods TO authenticated;
GRANT SELECT ON public.offer_payment_methods TO anon;
GRANT ALL ON public.offer_payment_methods TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_settings TO authenticated;
GRANT SELECT ON public.checkout_settings TO anon;
GRANT ALL ON public.checkout_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracking_settings TO authenticated;
GRANT ALL ON public.tracking_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_bumps TO authenticated;
GRANT SELECT ON public.order_bumps TO anon;
GRANT ALL ON public.order_bumps TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsells TO authenticated;
GRANT SELECT ON public.upsells TO anon;
GRANT ALL ON public.upsells TO service_role;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_product_owner(_product_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.products WHERE id = _product_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_offer_owner(_offer_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.products p ON p.id = o.product_id
    WHERE o.id = _offer_id AND p.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_offer_active(_offer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.offers WHERE id = _offer_id AND status = 'active');
$$;

-- RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers owner all" ON public.offers FOR ALL TO authenticated
  USING (public.is_product_owner(product_id, auth.uid()))
  WITH CHECK (public.is_product_owner(product_id, auth.uid()));
CREATE POLICY "offers public read active" ON public.offers FOR SELECT TO anon
  USING (status = 'active');

ALTER TABLE public.offer_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opm owner all" ON public.offer_payment_methods FOR ALL TO authenticated
  USING (public.is_offer_owner(offer_id, auth.uid()))
  WITH CHECK (public.is_offer_owner(offer_id, auth.uid()));
CREATE POLICY "opm public read active" ON public.offer_payment_methods FOR SELECT TO anon
  USING (public.is_offer_active(offer_id));

ALTER TABLE public.checkout_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs owner all" ON public.checkout_settings FOR ALL TO authenticated
  USING (public.is_offer_owner(offer_id, auth.uid()))
  WITH CHECK (public.is_offer_owner(offer_id, auth.uid()));
CREATE POLICY "cs public read active" ON public.checkout_settings FOR SELECT TO anon
  USING (public.is_offer_active(offer_id));

ALTER TABLE public.tracking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ts owner all" ON public.tracking_settings FOR ALL TO authenticated
  USING (public.is_offer_owner(offer_id, auth.uid()))
  WITH CHECK (public.is_offer_owner(offer_id, auth.uid()));

ALTER TABLE public.order_bumps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ob owner all" ON public.order_bumps FOR ALL TO authenticated
  USING (public.is_offer_owner(offer_id, auth.uid()))
  WITH CHECK (public.is_offer_owner(offer_id, auth.uid()));
CREATE POLICY "ob public read active" ON public.order_bumps FOR SELECT TO anon
  USING (enabled = true AND public.is_offer_active(offer_id));

ALTER TABLE public.upsells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "up owner all" ON public.upsells FOR ALL TO authenticated
  USING (public.is_offer_owner(offer_id, auth.uid()))
  WITH CHECK (public.is_offer_owner(offer_id, auth.uid()));
CREATE POLICY "up public read active" ON public.upsells FOR SELECT TO anon
  USING (enabled = true AND public.is_offer_active(offer_id));

-- Triggers updated_at
CREATE TRIGGER trg_offers_updated BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_opm_updated BEFORE UPDATE ON public.offer_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.checkout_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ts_updated BEFORE UPDATE ON public.tracking_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ob_updated BEFORE UPDATE ON public.order_bumps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_up_updated BEFORE UPDATE ON public.upsells
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

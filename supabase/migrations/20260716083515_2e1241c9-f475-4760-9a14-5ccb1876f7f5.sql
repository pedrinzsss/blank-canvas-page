
-- ENUMS
DO $$ BEGIN CREATE TYPE public.api_env AS ENUM ('sandbox','live'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.api_key_status AS ENUM ('active','revoked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.charge_status AS ENUM ('pending','paid','failed','canceled','refunded','chargeback'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('pix','credit_card','boleto'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.link_status AS ENUM ('active','inactive','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.refund_status AS ENUM ('pending','succeeded','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payout_status AS ENUM ('requested','processing','paid','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tx_type AS ENUM ('charge','refund','payout','fee','adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.webhook_delivery_status AS ENUM ('pending','delivered','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- API CLIENTS (um por ambiente por usuário)
CREATE TABLE IF NOT EXISTS public.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  environment public.api_env NOT NULL,
  webhook_secret_hash text,
  webhook_secret_prefix text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, environment)
);
GRANT SELECT ON public.api_clients TO authenticated;
GRANT ALL ON public.api_clients TO service_role;
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view api_clients" ON public.api_clients FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- API KEYS
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  public_key text NOT NULL UNIQUE,
  secret_key_hash text NOT NULL,
  secret_key_prefix text NOT NULL,
  status public.api_key_status NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
GRANT SELECT ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view api_keys" ON public.api_keys FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = api_keys.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX IF NOT EXISTS api_keys_client_idx ON public.api_keys(client_id);
CREATE INDEX IF NOT EXISTS api_keys_public_idx ON public.api_keys(public_key);

-- CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  document text,
  phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view customers" ON public.customers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = customers.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX IF NOT EXISTS customers_client_idx ON public.customers(client_id);

-- CHARGES
CREATE TABLE IF NOT EXISTS public.charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'BRL',
  status public.charge_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.charges TO authenticated;
GRANT ALL ON public.charges TO service_role;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view charges" ON public.charges FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = charges.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX IF NOT EXISTS charges_client_idx ON public.charges(client_id);

-- PAYMENT LINKS
CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'BRL',
  url_slug text NOT NULL UNIQUE,
  status public.link_status NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_links TO authenticated;
GRANT ALL ON public.payment_links TO service_role;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view payment_links" ON public.payment_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = payment_links.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- REFUNDS
CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  charge_id uuid NOT NULL REFERENCES public.charges(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  reason text,
  status public.refund_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view refunds" ON public.refunds FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = refunds.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- PAYOUTS
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  status public.payout_status NOT NULL DEFAULT 'requested',
  bank_account jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view payouts" ON public.payouts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = payouts.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

-- TRANSACTIONS (ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  type public.tx_type NOT NULL,
  amount_cents bigint NOT NULL,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view transactions" ON public.transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = transactions.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE INDEX IF NOT EXISTS transactions_client_idx ON public.transactions(client_id, created_at DESC);

-- WEBHOOK ENDPOINTS
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.api_clients(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view webhook_endpoints" ON public.webhook_endpoints FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.api_clients c WHERE c.id = webhook_endpoints.client_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.webhook_delivery_status NOT NULL DEFAULT 'pending',
  response_code int,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin can view webhook_deliveries" ON public.webhook_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.webhook_endpoints e
    JOIN public.api_clients c ON c.id = e.client_id
    WHERE e.id = webhook_deliveries.endpoint_id
      AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

-- updated_at triggers
CREATE TRIGGER trg_api_clients_updated BEFORE UPDATE ON public.api_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_charges_updated BEFORE UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

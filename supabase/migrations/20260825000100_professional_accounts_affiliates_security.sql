-- Professional plan: secure administrative access, account-level affiliates,
-- automatic split ledger and account eligibility for payment credentials.

-- Account classification and operational status.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'client',
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_kind_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_kind_check
  CHECK (account_kind IN ('fintech', 'client', 'affiliate', 'partner'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('active', 'blocked'));

-- Legacy collaborators no longer authenticate with plaintext passwords.
ALTER TABLE public.admin_collaborators
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE public.admin_collaborators c
SET user_id = p.id
FROM public.profiles p
WHERE c.user_id IS NULL AND lower(p.email) = lower(c.email);

ALTER TABLE public.admin_collaborators DROP COLUMN IF EXISTS password;
CREATE UNIQUE INDEX IF NOT EXISTS admin_collaborators_user_idx
  ON public.admin_collaborators(user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.can_access_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = _user_id AND r.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.admin_collaborators c
    WHERE c.user_id = _user_id AND c.active
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "Admins can manage collaborators" ON public.admin_collaborators;
CREATE POLICY "Admins can view collaborators"
  ON public.admin_collaborators FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_add_collaborator(_email text)
RETURNS public.admin_collaborators
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
  result public.admin_collaborators;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT id INTO target_user FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'O colaborador precisa criar uma conta antes de receber acesso';
  END IF;

  INSERT INTO public.admin_collaborators (email, user_id, role, active)
  VALUES (lower(trim(_email)), target_user, 'admin', true)
  ON CONFLICT (email) DO UPDATE
    SET user_id = EXCLUDED.user_id, role = 'admin', active = true
  RETURNING * INTO result;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_collaborator_active(_id uuid, _active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT user_id INTO target_user FROM public.admin_collaborators WHERE id = _id;
  UPDATE public.admin_collaborators SET active = _active WHERE id = _id;
  IF target_user IS NOT NULL THEN
    IF _active THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (target_user, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      DELETE FROM public.user_roles WHERE user_id = target_user AND role = 'admin';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_collaborator(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT user_id INTO target_user FROM public.admin_collaborators WHERE id = _id;
  DELETE FROM public.admin_collaborators WHERE id = _id;
  IF target_user IS NOT NULL AND target_user <> auth.uid() THEN
    DELETE FROM public.user_roles WHERE user_id = target_user AND role = 'admin';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_collaborator(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_collaborator_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_remove_collaborator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_collaborator(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_collaborator_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_collaborator(uuid) TO authenticated;

-- Affiliates attached to an entire client account, as required by the fintech split model.
CREATE TABLE IF NOT EXISTS public.account_affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  percentage numeric(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_affiliates_distinct_users CHECK (client_user_id <> affiliate_user_id),
  UNIQUE (client_user_id, affiliate_user_id)
);

CREATE INDEX IF NOT EXISTS account_affiliates_client_idx
  ON public.account_affiliates(client_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS account_affiliates_affiliate_idx
  ON public.account_affiliates(affiliate_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_account_affiliate_percentage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allocated numeric(7,2);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.client_user_id::text));
  IF NEW.status = 'active' THEN
    SELECT COALESCE(sum(percentage), 0) INTO allocated
    FROM public.account_affiliates
    WHERE client_user_id = NEW.client_user_id
      AND status = 'active'
      AND id <> NEW.id;
    IF allocated + NEW.percentage > 100 THEN
      RAISE EXCEPTION 'A soma dos splits ativos não pode ultrapassar 100%%';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS account_affiliates_validate_percentage ON public.account_affiliates;
CREATE TRIGGER account_affiliates_validate_percentage
BEFORE INSERT OR UPDATE ON public.account_affiliates
FOR EACH ROW EXECUTE FUNCTION public.validate_account_affiliate_percentage();

REVOKE ALL ON FUNCTION public.validate_account_affiliate_percentage() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.account_affiliates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_affiliates TO authenticated;
GRANT ALL ON public.account_affiliates TO service_role;

CREATE POLICY "Participants and admins view account affiliates"
  ON public.account_affiliates FOR SELECT TO authenticated
  USING (
    auth.uid() IN (client_user_id, affiliate_user_id)
    OR public.can_access_admin(auth.uid())
  );
CREATE POLICY "Clients and admins create account affiliates"
  ON public.account_affiliates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_user_id OR public.can_access_admin(auth.uid()));
CREATE POLICY "Clients and admins update account affiliates"
  ON public.account_affiliates FOR UPDATE TO authenticated
  USING (auth.uid() = client_user_id OR public.can_access_admin(auth.uid()))
  WITH CHECK (auth.uid() = client_user_id OR public.can_access_admin(auth.uid()));
CREATE POLICY "Clients and admins delete account affiliates"
  ON public.account_affiliates FOR DELETE TO authenticated
  USING (auth.uid() = client_user_id OR public.can_access_admin(auth.uid()));

CREATE POLICY "Affiliate participants view counterpart profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.account_affiliates a
      WHERE (a.client_user_id = auth.uid() AND a.affiliate_user_id = profiles.id)
         OR (a.affiliate_user_id = auth.uid() AND a.client_user_id = profiles.id)
    )
  );

CREATE OR REPLACE FUNCTION public.upsert_my_account_affiliate(_affiliate_email text, _percentage numeric)
RETURNS public.account_affiliates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affiliate_id uuid;
  result public.account_affiliates;
BEGIN
  SELECT id INTO affiliate_id FROM public.profiles
  WHERE lower(email) = lower(trim(_affiliate_email)) LIMIT 1;
  IF affiliate_id IS NULL THEN RAISE EXCEPTION 'Afiliado não encontrado'; END IF;

  INSERT INTO public.account_affiliates
    (client_user_id, affiliate_user_id, percentage, status, created_by)
  VALUES (auth.uid(), affiliate_id, _percentage, 'active', auth.uid())
  ON CONFLICT (client_user_id, affiliate_user_id) DO UPDATE
    SET percentage = EXCLUDED.percentage, status = 'active', updated_at = now()
  RETURNING * INTO result;

  UPDATE public.profiles SET account_kind = 'affiliate'
  WHERE id = affiliate_id AND account_kind = 'client'
    AND NOT EXISTS (SELECT 1 FROM public.api_clients WHERE user_id = affiliate_id);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upsert_account_affiliate(
  _client_email text,
  _affiliate_email text,
  _percentage numeric
)
RETURNS public.account_affiliates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_id uuid;
  affiliate_id uuid;
  result public.account_affiliates;
BEGIN
  IF NOT public.can_access_admin(auth.uid()) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  SELECT id INTO client_id FROM public.profiles WHERE lower(email) = lower(trim(_client_email)) LIMIT 1;
  SELECT id INTO affiliate_id FROM public.profiles WHERE lower(email) = lower(trim(_affiliate_email)) LIMIT 1;
  IF client_id IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  IF affiliate_id IS NULL THEN RAISE EXCEPTION 'Afiliado não encontrado'; END IF;

  INSERT INTO public.account_affiliates
    (client_user_id, affiliate_user_id, percentage, status, created_by)
  VALUES (client_id, affiliate_id, _percentage, 'active', auth.uid())
  ON CONFLICT (client_user_id, affiliate_user_id) DO UPDATE
    SET percentage = EXCLUDED.percentage, status = 'active', updated_at = now()
  RETURNING * INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_account_affiliate(text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_account_affiliate(text, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_my_account_affiliate(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_account_affiliate(text, text, numeric) TO authenticated;

-- Immutable financial ledger for the affiliate share of each paid charge.
CREATE TABLE IF NOT EXISTS public.split_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  charge_id uuid NOT NULL REFERENCES public.charges(id) ON DELETE RESTRICT,
  account_affiliate_id uuid NOT NULL REFERENCES public.account_affiliates(id) ON DELETE RESTRICT,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  affiliate_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  gross_amount_cents bigint NOT NULL CHECK (gross_amount_cents > 0),
  percentage numeric(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('pending', 'available', 'paid', 'reversed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  UNIQUE (charge_id, account_affiliate_id)
);

CREATE INDEX IF NOT EXISTS split_entries_affiliate_idx
  ON public.split_entries(affiliate_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS split_entries_client_idx
  ON public.split_entries(client_user_id, created_at DESC);

ALTER TABLE public.split_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.split_entries TO authenticated;
GRANT ALL ON public.split_entries TO service_role;
CREATE POLICY "Participants and admins view split entries"
  ON public.split_entries FOR SELECT TO authenticated
  USING (
    auth.uid() IN (client_user_id, affiliate_user_id)
    OR public.can_access_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.create_charge_split_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  IF NEW.status = 'paid' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    SELECT user_id INTO owner_id FROM public.api_clients WHERE id = NEW.client_id;
    INSERT INTO public.split_entries (
      charge_id, account_affiliate_id, client_user_id, affiliate_user_id,
      gross_amount_cents, percentage, amount_cents, status, created_at
    )
    SELECT
      NEW.id, a.id, a.client_user_id, a.affiliate_user_id,
      NEW.amount_cents, a.percentage,
      round(NEW.amount_cents::numeric * a.percentage / 100)::bigint,
      'available', COALESCE(NEW.paid_at, now())
    FROM public.account_affiliates a
    WHERE a.client_user_id = owner_id AND a.status = 'active'
    ON CONFLICT (charge_id, account_affiliate_id) DO NOTHING;
  ELSIF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    UPDATE public.split_entries
    SET status = 'reversed', reversed_at = now()
    WHERE charge_id = NEW.id AND status <> 'reversed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS charges_create_split_entries ON public.charges;
CREATE TRIGGER charges_create_split_entries
AFTER INSERT OR UPDATE OF status ON public.charges
FOR EACH ROW EXECUTE FUNCTION public.create_charge_split_entries();

REVOKE ALL ON FUNCTION public.create_charge_split_entries() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_create_payment_credentials(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND account_status = 'active' AND account_kind <> 'affiliate'
  );
$$;

REVOKE ALL ON FUNCTION public.can_create_payment_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_payment_credentials(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users manage own api_clients" ON public.api_clients;
CREATE POLICY "Eligible users manage own api_clients"
  ON public.api_clients FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.can_create_payment_credentials(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.can_create_payment_credentials(auth.uid()));

-- Prevent users from promoting/unblocking their own account through the generic profile update policy.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, phone, display_name, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_account(
  _user_id uuid,
  _account_kind text,
  _account_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF _account_kind NOT IN ('fintech', 'client', 'affiliate', 'partner') THEN RAISE EXCEPTION 'Tipo de conta inválido'; END IF;
  IF _account_status NOT IN ('active', 'blocked') THEN RAISE EXCEPTION 'Status de conta inválido'; END IF;
  UPDATE public.profiles SET account_kind = _account_kind, account_status = _account_status WHERE id = _user_id;
  IF _account_status = 'blocked' THEN
    UPDATE public.api_keys SET status = 'revoked', revoked_at = now()
    WHERE client_id IN (SELECT id FROM public.api_clients WHERE user_id = _user_id)
      AND status = 'active';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_account(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_account(uuid, text, text) TO authenticated;

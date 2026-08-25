ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Conta criada exclusivamente para homologação do fluxo na Lovable.
UPDATE public.profiles
SET is_demo = true
WHERE lower(email) = 'teste.zunvipay.20260825@gmail.com';

CREATE OR REPLACE FUNCTION public.admin_set_demo_account(
  _user_id uuid,
  _is_demo boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.profiles SET is_demo = _is_demo WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_demo_account(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_demo_account(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_create_payment_credentials(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id
      AND account_status = 'active'
      AND account_kind <> 'affiliate'
      AND is_demo = false
  );
$$;

REVOKE ALL ON FUNCTION public.can_create_payment_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_create_payment_credentials(uuid) TO authenticated;

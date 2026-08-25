
-- 1) Add referral columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

-- Generate a random 8-char referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill codes for existing profiles
UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- 2) Replace handle_new_user to assign code and resolve referrer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  incoming_code text;
  referrer_id uuid;
BEGIN
  incoming_code := NULLIF(upper(COALESCE(NEW.raw_user_meta_data->>'referral_code','')), '');
  IF incoming_code IS NOT NULL THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = incoming_code LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, phone, email, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email,
    public.generate_referral_code(),
    referrer_id
  );
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Referral commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  charge_id uuid REFERENCES public.charges(id) ON DELETE SET NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_commissions_referrer_idx ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS referral_commissions_referred_idx ON public.referral_commissions(referred_id);

GRANT SELECT ON public.referral_commissions TO authenticated;
GRANT ALL ON public.referral_commissions TO service_role;

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrers can view their commissions"
  ON public.referral_commissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

-- 4) Auto-create commission entry on paid charge
CREATE OR REPLACE FUNCTION public.create_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer uuid;
  commission_cents bigint;
BEGIN
  -- Only act on transitions to paid
  IF NEW.status::text <> 'paid' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'paid' THEN
    RETURN NEW;
  END IF;

  SELECT referred_by INTO referrer FROM public.profiles WHERE id = NEW.client_id;
  IF referrer IS NULL THEN
    RETURN NEW;
  END IF;

  commission_cents := floor(NEW.amount_cents::numeric * 0.01)::bigint;
  IF commission_cents <= 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.referral_commissions (referrer_id, referred_id, charge_id, amount_cents, created_at)
  VALUES (referrer, NEW.client_id, NEW.id, commission_cents, COALESCE(NEW.paid_at, now()));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referral_commission_on_charge_insert ON public.charges;
CREATE TRIGGER referral_commission_on_charge_insert
  AFTER INSERT ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_commission();

DROP TRIGGER IF EXISTS referral_commission_on_charge_update ON public.charges;
CREATE TRIGGER referral_commission_on_charge_update
  AFTER UPDATE OF status ON public.charges
  FOR EACH ROW EXECUTE FUNCTION public.create_referral_commission();

-- 5) Stats function for the current user
CREATE OR REPLACE FUNCTION public.get_referral_stats(_user_id uuid)
RETURNS TABLE (
  liberated_cents bigint,
  pending_cents bigint,
  liberated_count bigint,
  pending_count bigint,
  active_count bigint,
  inactive_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT amount_cents, created_at
    FROM public.referral_commissions
    WHERE referrer_id = _user_id
  ),
  r AS (
    SELECT p.id, p.created_at AS joined_at,
      (
        SELECT max(x.created_at) FROM (
          SELECT created_at FROM public.charges WHERE client_id = p.id
          UNION ALL
          SELECT created_at FROM public.transactions WHERE client_id = p.id
        ) x
      ) AS last_activity
    FROM public.profiles p
    WHERE p.referred_by = _user_id
  )
  SELECT
    COALESCE((SELECT sum(amount_cents) FROM c WHERE created_at < now() - interval '30 days'), 0)::bigint AS liberated_cents,
    COALESCE((SELECT sum(amount_cents) FROM c WHERE created_at >= now() - interval '30 days'), 0)::bigint AS pending_cents,
    COALESCE((SELECT count(*) FROM c WHERE created_at < now() - interval '30 days'), 0)::bigint AS liberated_count,
    COALESCE((SELECT count(*) FROM c WHERE created_at >= now() - interval '30 days'), 0)::bigint AS pending_count,
    COALESCE((SELECT count(*) FROM r WHERE COALESCE(last_activity, joined_at) >= now() - interval '30 days'), 0)::bigint AS active_count,
    COALESCE((SELECT count(*) FROM r WHERE COALESCE(last_activity, joined_at) < now() - interval '30 days'), 0)::bigint AS inactive_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats(uuid) TO authenticated;

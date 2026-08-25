
ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_percent_range
  CHECK (discount_type <> 'percent' OR (discount_value >= 0 AND discount_value <= 100));

CREATE OR REPLACE FUNCTION public.coupons_enforce_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.max_uses IS NOT NULL AND NEW.uses_count > NEW.max_uses THEN
    RAISE EXCEPTION 'Cupom % excedeu o limite de usos', NEW.code
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER coupons_enforce_limits_trg
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.coupons_enforce_limits();

CREATE OR REPLACE FUNCTION public.validate_coupon(
  _owner_id UUID,
  _code TEXT,
  _offer_id UUID DEFAULT NULL,
  _subtotal_cents BIGINT DEFAULT 0
)
RETURNS TABLE (
  valid BOOLEAN,
  reason TEXT,
  coupon_id UUID,
  discount_type public.coupon_type,
  discount_value NUMERIC,
  discount_cents BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  d BIGINT := 0;
BEGIN
  SELECT * INTO c
  FROM public.coupons
  WHERE user_id = _owner_id
    AND code = upper(_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Cupom não encontrado'::TEXT, NULL::UUID, NULL::public.coupon_type, NULL::NUMERIC, 0::BIGINT;
    RETURN;
  END IF;

  IF NOT c.active THEN
    RETURN QUERY SELECT false, 'Cupom inativo'::TEXT, c.id, c.discount_type, c.discount_value, 0::BIGINT;
    RETURN;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Cupom expirado'::TEXT, c.id, c.discount_type, c.discount_value, 0::BIGINT;
    RETURN;
  END IF;

  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotou o limite de usos'::TEXT, c.id, c.discount_type, c.discount_value, 0::BIGINT;
    RETURN;
  END IF;

  IF array_length(c.offer_ids, 1) IS NOT NULL AND _offer_id IS NOT NULL AND NOT (_offer_id = ANY (c.offer_ids)) THEN
    RETURN QUERY SELECT false, 'Cupom não válido para esta oferta'::TEXT, c.id, c.discount_type, c.discount_value, 0::BIGINT;
    RETURN;
  END IF;

  IF c.discount_type = 'percent' THEN
    d := floor(_subtotal_cents::NUMERIC * least(100, greatest(0, c.discount_value)) / 100)::BIGINT;
  ELSE
    d := least(_subtotal_cents, greatest(0, c.discount_value)::BIGINT);
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT, c.id, c.discount_type, c.discount_value, d;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_coupon(UUID, TEXT, UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(UUID, TEXT, UUID, BIGINT) TO anon, authenticated;

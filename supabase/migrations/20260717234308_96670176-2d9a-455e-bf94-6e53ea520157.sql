
DROP POLICY IF EXISTS "ts public read active" ON public.tracking_settings;
REVOKE SELECT ON public.tracking_settings FROM anon;
REVOKE SELECT (id, offer_id, meta_pixel_id, google_ads_conversion_id, google_ads_conversion_label, ga_measurement_id, created_at, updated_at) ON public.tracking_settings FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_tracking(_offer_id uuid)
RETURNS TABLE(meta_pixel_id text, ga_measurement_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ts.meta_pixel_id, ts.ga_measurement_id
  FROM public.tracking_settings ts
  JOIN public.offers o ON o.id = ts.offer_id
  WHERE ts.offer_id = _offer_id AND o.status = 'active'
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_tracking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tracking(uuid) TO anon, authenticated;

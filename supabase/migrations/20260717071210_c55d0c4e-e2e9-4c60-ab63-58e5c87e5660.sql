
REVOKE SELECT ON public.tracking_settings FROM anon;
GRANT SELECT (id, offer_id, meta_pixel_id, google_ads_conversion_id, google_ads_conversion_label, ga_measurement_id, created_at, updated_at) ON public.tracking_settings TO anon;

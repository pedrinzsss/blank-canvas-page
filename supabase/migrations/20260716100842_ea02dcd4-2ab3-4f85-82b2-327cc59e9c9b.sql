GRANT SELECT (offer_id, meta_pixel_id, ga_measurement_id) ON public.tracking_settings TO anon;
CREATE POLICY "ts public read active" ON public.tracking_settings FOR SELECT TO anon
  USING (public.is_offer_active(offer_id));
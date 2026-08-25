
REVOKE EXECUTE ON FUNCTION public.is_product_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_offer_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_offer_active(uuid) FROM PUBLIC, anon, authenticated;

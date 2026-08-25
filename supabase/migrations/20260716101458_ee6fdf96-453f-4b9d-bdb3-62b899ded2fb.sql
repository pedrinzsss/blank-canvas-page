GRANT EXECUTE ON FUNCTION public.is_product_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_offer_owner(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_offer_active(uuid) TO authenticated, anon;
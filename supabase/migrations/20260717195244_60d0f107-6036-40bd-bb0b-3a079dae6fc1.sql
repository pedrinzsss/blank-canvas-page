-- Drop the overly-permissive anon read policy that exposed sensitive columns
DROP POLICY IF EXISTS "public read products with active offer" ON public.products;

-- Safe helper returning only fields needed for the public checkout page
CREATE OR REPLACE FUNCTION public.get_public_checkout_product(_offer_code text)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  image_url text,
  sales_page_url text,
  support_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.title, p.description, p.image_url, p.sales_page_url, p.support_email
  FROM public.products p
  JOIN public.offers o ON o.product_id = p.id
  WHERE o.offer_code = _offer_code
    AND o.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_checkout_product(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_checkout_product(text) TO anon, authenticated;
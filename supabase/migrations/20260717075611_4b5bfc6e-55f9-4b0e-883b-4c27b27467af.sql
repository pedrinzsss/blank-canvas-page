
DROP POLICY IF EXISTS "public read products with active offer" ON public.products;
CREATE POLICY "public read products with active offer"
ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.product_id = products.id AND o.status = 'active'
  )
);

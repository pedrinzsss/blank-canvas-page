import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a product image value (stored in products.image_url) to a
 * displayable URL. Legacy values may already be absolute URLs; new values
 * are storage paths inside the private `product-images` bucket and need
 * to be signed for display.
 */
export async function resolveProductImageUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = await supabase.storage
    .from("product-images")
    .createSignedUrl(value, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

export async function resolveProductImageUrls(
  values: Array<string | null | undefined>,
): Promise<Array<string | null>> {
  return Promise.all(values.map((v) => resolveProductImageUrl(v)));
}

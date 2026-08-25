import { createFileRoute } from "@tanstack/react-router";


type ShopifyImage = { src: string };
type ShopifyVariant = { price: string; sku: string };
type ShopifyProductPayload = {
  id: number;
  title?: string;
  handle?: string;
  body_html?: string | null;
  status?: string;
  image?: ShopifyImage | null;
  images?: ShopifyImage[];
  variants?: ShopifyVariant[];
};

export const Route = createFileRoute("/api/public/shopify/webhook/$token")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const token = params.token;
        if (!token || token.length < 20) {
          return new Response("Invalid token", { status: 401 });
        }
        const topic = request.headers.get("x-shopify-topic") ?? "";
        const shopDomain = (request.headers.get("x-shopify-shop-domain") ?? "").toLowerCase();
        const rawBody = await request.text();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: connByToken } = await supabaseAdmin
          .from("shopify_connections")
          .select("id, user_id, shop_domain, webhook_token")
          .eq("webhook_token", token)
          .maybeSingle();

        if (!connByToken) return new Response("Unauthorized", { status: 401 });
        if (shopDomain && shopDomain !== connByToken.shop_domain) {
          return new Response("Shop mismatch", { status: 401 });
        }

        let payload: ShopifyProductPayload | null = null;
        try {
          payload = JSON.parse(rawBody) as ShopifyProductPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (!payload?.id) return new Response("Missing product id", { status: 400 });

        try {
          if (topic === "products/delete") {
            await supabaseAdmin
              .from("shopify_products")
              .delete()
              .eq("user_id", connByToken.user_id)
              .eq("shopify_product_id", payload.id);
          } else if (topic === "products/create" || topic === "products/update") {
            const priceStr = payload.variants?.[0]?.price ?? "0";
            const priceCents = Math.round(Number.parseFloat(priceStr) * 100) || 0;
            await supabaseAdmin.from("shopify_products").upsert(
              {
                user_id: connByToken.user_id,
                connection_id: connByToken.id,
                shopify_product_id: payload.id,
                handle: payload.handle ?? null,
                title: payload.title ?? "",
                description: payload.body_html ?? null,
                status: payload.status ?? null,
                price_cents: priceCents,
                currency: null,
                sku: payload.variants?.[0]?.sku ?? null,
                image_url: payload.image?.src ?? payload.images?.[0]?.src ?? null,
                raw: payload as unknown as never,
                synced_at: new Date().toISOString(),
              },
              { onConflict: "user_id,shopify_product_id" },
            );
          } else {
            // ignore unknown topics
            return new Response("ok", { status: 200 });
          }

          await supabaseAdmin
            .from("shopify_connections")
            .update({ last_sync_at: new Date().toISOString(), last_error: null })
            .eq("id", connByToken.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await supabaseAdmin
            .from("shopify_connections")
            .update({ last_error: `Webhook ${topic}: ${msg.slice(0, 200)}` })
            .eq("id", connByToken.id);
          return new Response("Error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

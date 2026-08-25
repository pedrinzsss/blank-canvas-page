import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SHOPIFY_API_VERSION = "2024-10";

function key(): Buffer {
  const secret = process.env.SHOPIFY_TOKEN_KEY;
  if (!secret) throw new Error("SHOPIFY_TOKEN_KEY not configured");
  return createHash("sha256").update(secret).digest();
}

function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

function decryptToken(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function normalizeDomain(raw: string): string {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!d.endsWith(".myshopify.com")) {
    // allow "minhaloja" → "minhaloja.myshopify.com"
    if (!d.includes(".")) d = `${d}.myshopify.com`;
  }
  return d;
}

async function shopifyFetch(shop: string, token: string, path: string) {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}${path}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });
  return res;
}

const WEBHOOK_TOPICS = ["products/create", "products/update", "products/delete"] as const;

async function registerWebhooks(
  shop: string,
  token: string,
  webhookToken: string,
  origin: string,
) {
  const address = `${origin.replace(/\/+$/, "")}/api/public/shopify/webhook/${webhookToken}`;
  // list existing to avoid duplicates
  const listRes = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`,
    { headers: { "X-Shopify-Access-Token": token } },
  );
  const existing = listRes.ok
    ? ((await listRes.json()) as { webhooks: { id: number; topic: string; address: string }[] })
        .webhooks
    : [];
  for (const topic of WEBHOOK_TOPICS) {
    const match = existing.find((w) => w.topic === topic);
    if (match) {
      if (match.address === address) continue;
      // delete stale
      await fetch(
        `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks/${match.id}.json`,
        { method: "DELETE", headers: { "X-Shopify-Access-Token": token } },
      );
    }
    await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ webhook: { topic, address, format: "json" } }),
    });
  }
}

// ---------- getShopifyConnection ----------

export const getShopifyConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: conn } = await supabase
      .from("shopify_connections")
      .select("id, shop_domain, shop_name, shop_email, currency, status, last_sync_at, last_error")
      .eq("user_id", userId)
      .maybeSingle();
    if (!conn) return { connected: false as const };
    const { count } = await supabase
      .from("shopify_products")
      .select("id", { count: "exact", head: true })
      .eq("connection_id", conn.id);
    return { connected: true as const, connection: conn, productCount: count ?? 0 };
  });

// ---------- connectShopify ----------

const connectSchema = z.object({
  shop: z.string().min(3).max(255),
  token: z.string().min(10).max(255),
});

export const connectShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => connectSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const shop = normalizeDomain(data.shop);
    const token = data.token.trim();

    const test = await shopifyFetch(shop, token, "/shop.json");
    if (!test.ok) {
      const body = await test.text();
      throw new Error(
        test.status === 401
          ? "Token inválido ou sem permissão para essa loja."
          : `Falha ao conectar (${test.status}): ${body.slice(0, 200)}`,
      );
    }
    const shopInfo = (await test.json()) as {
      shop: { name: string; email: string; currency: string };
    };

    const { data: upserted, error } = await supabase
      .from("shopify_connections")
      .upsert(
        {
          user_id: userId,
          shop_domain: shop,
          access_token_encrypted: encryptToken(token),
          shop_name: shopInfo.shop.name,
          shop_email: shopInfo.shop.email,
          currency: shopInfo.shop.currency,
          status: "connected",
          last_error: null,
        },
        { onConflict: "user_id,shop_domain" },
      )
      .select("id, webhook_token")
      .single();
    if (error) throw new Error(error.message);

    // register webhooks so shop pushes changes back to us
    try {
      const req = getRequest();
      const origin =
        process.env.PUBLIC_SITE_URL ?? new URL(req.url).origin;
      await registerWebhooks(shop, token, upserted.webhook_token, origin);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase
        .from("shopify_connections")
        .update({ last_error: `Webhook register: ${msg.slice(0, 200)}` })
        .eq("id", upserted.id);
    }

    // fire first sync
    await runSync(supabase, userId, upserted.id, shop, token);

    return { ok: true as const, shop };
  });

// ---------- syncShopifyProducts ----------

export const syncShopifyProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: conn, error } = await supabase
      .from("shopify_connections")
      .select("id, shop_domain, access_token_encrypted")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conn) throw new Error("Nenhuma conexão Shopify encontrada.");
    const token = decryptToken(conn.access_token_encrypted);
    const count = await runSync(supabase, userId, conn.id, conn.shop_domain, token);
    return { ok: true as const, count };
  });

// ---------- disconnectShopify ----------

export const disconnectShopify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // best-effort: remove our webhooks from Shopify before deleting the row
    const { data: conn } = await supabase
      .from("shopify_connections")
      .select("shop_domain, access_token_encrypted")
      .eq("user_id", userId)
      .maybeSingle();
    if (conn) {
      try {
        const token = decryptToken(conn.access_token_encrypted);
        const listRes = await fetch(
          `https://${conn.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/webhooks.json`,
          { headers: { "X-Shopify-Access-Token": token } },
        );
        if (listRes.ok) {
          const { webhooks } = (await listRes.json()) as {
            webhooks: { id: number; address: string }[];
          };
          for (const w of webhooks) {
            if (w.address.includes("/api/public/shopify/webhook/")) {
              await fetch(
                `https://${conn.shop_domain}/admin/api/${SHOPIFY_API_VERSION}/webhooks/${w.id}.json`,
                { method: "DELETE", headers: { "X-Shopify-Access-Token": token } },
              );
            }
          }
        }
      } catch {
        // ignore — deletion should still proceed
      }
    }
    const { error } = await supabase
      .from("shopify_connections")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- getShopifyProducts ----------

export const getShopifyProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("shopify_products")
      .select("id, title, handle, description, price_cents, currency, sku, image_url, status, synced_at")
      .eq("user_id", userId)
      .order("synced_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- shared sync logic ----------

type ShopifyImage = { src: string };
type ShopifyVariant = { price: string; sku: string };
type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  body_html: string | null;
  status: string;
  image: ShopifyImage | null;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
};

function parseLinkHeader(link: string | null): string | null {
  if (!link) return null;
  const parts = link.split(",");
  for (const p of parts) {
    const m = p.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runSync(supabase: any, userId: string, connectionId: string, shop: string, token: string) {
  let url: string | null = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;
  let total = 0;
  const seenIds: number[] = [];

  while (url) {
    const res = await fetch(url, {
      headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const body = await res.text();
      await supabase
        .from("shopify_connections")
        .update({ status: "error", last_error: `Sync ${res.status}: ${body.slice(0, 200)}` })
        .eq("id", connectionId);
      throw new Error(`Sync falhou: ${res.status}`);
    }
    const json = (await res.json()) as { products: ShopifyProduct[] };
    const rows = json.products.map((p) => {
      const priceStr = p.variants?.[0]?.price ?? "0";
      const priceCents = Math.round(Number.parseFloat(priceStr) * 100) || 0;
      seenIds.push(p.id);
      return {
        user_id: userId,
        connection_id: connectionId,
        shopify_product_id: p.id,
        handle: p.handle,
        title: p.title,
        description: p.body_html,
        status: p.status,
        price_cents: priceCents,
        currency: null,
        sku: p.variants?.[0]?.sku ?? null,
        image_url: p.image?.src ?? p.images?.[0]?.src ?? null,
        raw: p as unknown as Record<string, unknown>,
        synced_at: new Date().toISOString(),
      };
    });
    if (rows.length) {
      const { error } = await supabase
        .from("shopify_products")
        .upsert(rows, { onConflict: "user_id,shopify_product_id" });
      if (error) throw new Error(error.message);
      total += rows.length;
    }
    url = parseLinkHeader(res.headers.get("link"));
  }

  // remove products no longer in the store
  if (seenIds.length > 0) {
    await supabase
      .from("shopify_products")
      .delete()
      .eq("user_id", userId)
      .not("shopify_product_id", "in", `(${seenIds.join(",")})`);
  } else {
    await supabase.from("shopify_products").delete().eq("user_id", userId);
  }

  await supabase
    .from("shopify_connections")
    .update({ status: "connected", last_sync_at: new Date().toISOString(), last_error: null })
    .eq("id", connectionId);

  return total;
}

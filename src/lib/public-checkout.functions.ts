import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export interface PublicCheckoutData {
  offer: {
    id: string;
    name: string;
    price_cents: number;
    billing_type: string;
    max_installments: number;
    checkout_token: string;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
  };
  settings: {
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    button_color: string;
    background_color: string;
    layout: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    button_text: string;
    show_logo: boolean;
    show_description: boolean;
    show_guarantee: boolean;
    show_testimonials: boolean;
    show_faq: boolean;
    show_timer: boolean;
  } | null;
  payment_methods: Array<{ method: string; enabled: boolean }>;
  order_bump: {
    title: string;
    description: string | null;
    price_cents: number;
  } | null;
  tracking: {
    meta_pixel_id: string | null;
    ga_measurement_id: string | null;
  } | null;
}

export const getPublicCheckout = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: z.string().min(4).max(64) }).parse(data))
  .handler(async ({ data }): Promise<PublicCheckoutData | null> => {
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      key,
      {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        global: {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
              h.delete("Authorization");
            }
            h.set("apikey", key);
            return fetch(input, { ...init, headers: h });
          },
        },
      },
    );

    const { data: offer } = await supabasePublic
      .from("offers")
      .select("id, name, price_cents, billing_type, max_installments, checkout_token, product_id, status")
      .eq("checkout_token", data.token)
      .eq("status", "active")
      .maybeSingle();

    if (!offer) return null;

    const [productRes, settingsRes, methodsRes, bumpRes, trackingRes] = await Promise.all([
      supabasePublic
        .from("products")
        .select("id, title, description, image_url")
        .eq("id", offer.product_id)
        .maybeSingle(),
      supabasePublic
        .from("checkout_settings")
        .select("*")
        .eq("offer_id", offer.id)
        .maybeSingle(),
      supabasePublic
        .from("offer_payment_methods")
        .select("method, enabled")
        .eq("offer_id", offer.id)
        .eq("enabled", true),
      supabasePublic
        .from("order_bumps")
        .select("title, description, price_cents")
        .eq("offer_id", offer.id)
        .eq("enabled", true)
        .maybeSingle(),
      // Public-safe tracking fields returned via SECURITY DEFINER RPC
      supabasePublic
        .rpc("get_public_tracking", { _offer_id: offer.id })
        .maybeSingle(),
    ]);

    if (!productRes.data) return null;

    return {
      offer: {
        id: offer.id,
        name: offer.name,
        price_cents: offer.price_cents,
        billing_type: offer.billing_type,
        max_installments: offer.max_installments,
        checkout_token: offer.checkout_token,
      },
      product: productRes.data,
      settings: settingsRes.data ?? null,
      payment_methods: methodsRes.data ?? [],
      order_bump: bumpRes.data ?? null,
      tracking: trackingRes.data ?? null,
    };
  });

const CreateChargeSchema = z.object({
  offer_id: z.string().uuid(),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    cpf: z.string().trim().min(11).max(20),
    phone: z.string().trim().max(30).optional(),
  }),
});

export interface PublicChargeResult {
  charge_id: string;
  status: string;
  pix_qrcode: string | null;
  pix_expiration_at: string | null;
  amount_cents: number;
}

export const createCheckoutPixCharge = createServerFn({ method: "POST" })
  .inputValidator((d) => CreateChargeSchema.parse(d))
  .handler(async ({ data }): Promise<PublicChargeResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: offer, error: offerErr } = await supabaseAdmin
      .from("offers")
      .select("id, price_cents, status, product_id, name")
      .eq("id", data.offer_id)
      .eq("status", "active")
      .maybeSingle();
    if (offerErr || !offer) throw new Error("Oferta não encontrada ou inativa");

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, user_id, title")
      .eq("id", offer.product_id)
      .maybeSingle();
    if (!product?.user_id) throw new Error("Produto sem produtor definido");

    // Ensure api_client (production) exists for the producer.
    let { data: client } = await supabaseAdmin
      .from("api_clients")
      .select("id")
      .eq("user_id", product.user_id)
      .eq("environment", "live")
      .maybeSingle();
    if (!client) {
      const ins = await supabaseAdmin
        .from("api_clients")
        .insert({ user_id: product.user_id, name: "Checkout", environment: "live" })
        .select("id")
        .single();
      if (ins.error || !ins.data) throw new Error("Falha ao preparar cliente do produtor");
      client = ins.data;
    }

    const cpfDigits = data.customer.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11 && cpfDigits.length !== 14) throw new Error("CPF/CNPJ inválido");

    // Upsert customer by email under this client.
    let customerId: string | null = null;
    const existing = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("client_id", client.id)
      .eq("email", data.customer.email)
      .maybeSingle();
    if (existing.data) {
      customerId = existing.data.id;
      await supabaseAdmin
        .from("customers")
        .update({
          name: data.customer.name,
          phone: data.customer.phone ?? null,
          document: cpfDigits,
        })
        .eq("id", customerId);
    } else {
      const ins = await supabaseAdmin
        .from("customers")
        .insert({
          client_id: client.id,
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone ?? null,
          document: cpfDigits,
        })
        .select("id")
        .single();
      if (!ins.error && ins.data) customerId = ins.data.id;
    }

    // Create pending charge.
    const insertCharge = await supabaseAdmin
      .from("charges")
      .insert({
        client_id: client.id,
        customer_id: customerId,
        amount_cents: offer.price_cents,
        currency: "BRL",
        payment_method: "pix",
        status: "pending",
        description: product.title,
        metadata: { offer_id: offer.id, offer_name: offer.name } as never,
      })
      .select("id")
      .single();
    if (insertCharge.error || !insertCharge.data) {
      throw new Error(insertCharge.error?.message ?? "Falha ao criar cobrança");
    }
    const chargeId = insertCharge.data.id;

    // Call Medusa for PIX QR.
    const { getMedusaConfig, createPixTransaction } = await import("@/lib/acquirers/medusa.server");
    const cfg = await getMedusaConfig();
    if (!cfg || !cfg.active) {
      throw new Error("Adquirente PIX não configurada");
    }

    try {
      const origin = process.env.PUBLIC_BASE_URL ?? "https://paglinkapp.com.br";
      const tx = await createPixTransaction(cfg, {
        amountCents: offer.price_cents,
        postbackUrl: `${origin}/api/public/v1/medusa/webhook`,
        externalRef: chargeId,
        customer: {
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone,
          document: {
            type: cpfDigits.length > 11 ? "cnpj" : "cpf",
            number: cpfDigits,
          },
        },
        itemTitle: product.title,
      });
      await supabaseAdmin
        .from("charges")
        .update({
          acquirer: "medusa",
          acquirer_ref: String(tx.id),
          pix_qrcode: tx.pix?.qrcode ?? null,
          pix_expiration_at: tx.pix?.expirationDate
            ? new Date(tx.pix.expirationDate).toISOString()
            : null,
          secure_url: tx.secureUrl ?? null,
        })
        .eq("id", chargeId);
      return {
        charge_id: chargeId,
        status: "pending",
        pix_qrcode: tx.pix?.qrcode ?? null,
        pix_expiration_at: tx.pix?.expirationDate ?? null,
        amount_cents: offer.price_cents,
      };
    } catch (e) {
      console.error("[checkout] Medusa PIX failed", e);
      throw new Error("Falha ao gerar PIX. Tente novamente em instantes.");
    }
  });

export const getCheckoutChargeStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ charge_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: charge } = await supabaseAdmin
      .from("charges")
      .select("id, status, paid_at, pix_qrcode, pix_expiration_at, amount_cents")
      .eq("id", data.charge_id)
      .maybeSingle();
    if (!charge) throw new Error("Cobrança não encontrada");
    return charge;
  });

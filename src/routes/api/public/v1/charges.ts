import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

const CustomerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  document: z.object({
    type: z.enum(["cpf", "cnpj"]),
    number: z.string().min(11).max(20),
  }),
});

const ChargeSchema = z.object({
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).default("BRL"),
  payment_method: z.enum(["pix", "credit_card", "boleto"]),
  customer_id: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
  customer: CustomerSchema.optional(),
});

export const Route = createFileRoute("/api/public/v1/charges")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("charges")
          .select("*")
          .eq("client_id", auth.clientId)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (err) return error(err.message, 500, "database_error");
        return json({ data });
      },
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return error("Invalid JSON body");
        }
        const parsed = ChargeSchema.safeParse(body);
        if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Insert charge as pending.
        const { data: charge, error: err } = await supabaseAdmin
          .from("charges")
          .insert({
            client_id: auth.clientId,
            customer_id: parsed.data.customer_id ?? null,
            amount_cents: parsed.data.amount_cents,
            currency: parsed.data.currency,
            payment_method: parsed.data.payment_method,
            description: parsed.data.description ?? null,
            metadata: (parsed.data.metadata ?? {}) as never,
            status: "pending",
          })
          .select()
          .single();
        if (err || !charge) return error(err?.message ?? "insert failed", 500, "database_error");

        // 2. Route PIX through Medusa when configured & active.
        if (parsed.data.payment_method === "pix") {
          try {
            const { getMedusaConfig, createPixTransaction } = await import(
              "@/lib/acquirers/medusa.server"
            );
            const cfg = await getMedusaConfig();
            if (cfg && cfg.active) {
              // Customer is required by Medusa. Fall back to stored customer.
              let customer = parsed.data.customer;
              if (!customer && parsed.data.customer_id) {
                const { data: c } = await supabaseAdmin
                  .from("customers")
                  .select("name, email, phone, document")
                  .eq("id", parsed.data.customer_id)
                  .maybeSingle();
                if (c && c.name && c.email && c.document) {
                  const doc = String(c.document).replace(/\D/g, "");
                  customer = {
                    name: c.name,
                    email: c.email,
                    phone: c.phone ?? undefined,
                    document: {
                      type: doc.length > 11 ? "cnpj" : "cpf",
                      number: doc,
                    },
                  };
                }
              }
              if (customer) {
                const origin = new URL(request.url).origin;
                const tx = await createPixTransaction(cfg, {
                  amountCents: parsed.data.amount_cents,
                  postbackUrl: `${origin}/api/public/v1/medusa/webhook`,
                  externalRef: charge.id,
                  metadata: parsed.data.description ?? undefined,
                  customer,
                  itemTitle: parsed.data.description ?? "Cobrança PIX",
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
                  .eq("id", charge.id);
                return json(
                  {
                    ...charge,
                    acquirer: "medusa",
                    acquirer_ref: String(tx.id),
                    pix: {
                      qrcode: tx.pix?.qrcode ?? null,
                      expiration_date: tx.pix?.expirationDate ?? null,
                    },
                    secure_url: tx.secureUrl ?? null,
                  },
                  201,
                );
              }
            }
          } catch (e) {
            // Log but do not fail — charge stays pending for retry/manual handling.
            console.error("[medusa] createPixTransaction failed", e);
          }
        }

        return json(charge, 201);
      },
    },
  },
});

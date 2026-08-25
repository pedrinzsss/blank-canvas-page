import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateSchema = z.object({
  amount_cents: z.number().int().positive().max(100_000_00),
  description: z.string().trim().max(120).optional(),
  is_static: z.boolean().optional(),
});

export interface LinktapChargeResult {
  charge_id: string;
  status: string;
  pix_qrcode: string | null;
  pix_expiration_at: string | null;
  amount_cents: number;
}

export const createLinktapPixCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateSchema.parse(d))
  .handler(async ({ data, context }): Promise<LinktapChargeResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    // Ensure api_client (live) for the producer.
    let { data: client } = await supabaseAdmin
      .from("api_clients")
      .select("id")
      .eq("user_id", userId)
      .eq("environment", "live")
      .maybeSingle();
    if (!client) {
      const ins = await supabaseAdmin
        .from("api_clients")
        .insert({ user_id: userId, name: "LinkTap", environment: "live" })
        .select("id")
        .single();
      if (ins.error || !ins.data) throw new Error("Falha ao preparar cliente");
      client = ins.data;
    }

    // Fetch producer profile for customer info fallback.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const description = data.description?.trim() || "Cobrança LinkTap";

    // Create pending charge.
    const insertCharge = await supabaseAdmin
      .from("charges")
      .insert({
        client_id: client.id,
        amount_cents: data.amount_cents,
        currency: "BRL",
        payment_method: "pix",
        status: "pending",
        description,
        metadata: { source: "linktap", is_static: !!data.is_static } as never,
      })
      .select("id")
      .single();
    if (insertCharge.error || !insertCharge.data) {
      console.error("[createLinktapPixCharge] DB error:", insertCharge.error);
      throw new Error(insertCharge.error?.message ?? "Falha ao criar cobrança no banco");
    }
    const chargeId = insertCharge.data.id;

    const { getMedusaConfig, createPixTransaction } = await import(
      "@/lib/acquirers/medusa.server"
    );
    const cfg = await getMedusaConfig();
    if (!cfg || !cfg.active) throw new Error("Adquirente PIX não configurada");

    try {
      const origin = process.env.PUBLIC_BASE_URL ?? "https://paglinkapp.com.br";
      const tx = await createPixTransaction(cfg, {
        amountCents: data.amount_cents,
        postbackUrl: `${origin}/api/public/v1/medusa/webhook`,
        externalRef: chargeId,
        customer: {
          name: profile?.full_name || "Cliente LinkTap",
          email: profile?.email || "cliente@paglinkapp.com.br",
          document: { type: "cpf", number: "11144477735" },
        },
        itemTitle: description,
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
        amount_cents: data.amount_cents,
      };
    } catch (e) {
      console.error("[linktap] Medusa PIX failed", e);
      throw new Error("Falha ao gerar PIX. Tente novamente em instantes.");
    }
  });

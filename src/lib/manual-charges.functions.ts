import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createManualCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        amountCents: z.number().int().positive(),
        email: z.string().email().optional().or(z.literal("")),
        customerName: z.string().optional(),
        description: z.string().optional(),
        origin: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getMedusaConfig, createPixTransaction } = await import(
      "@/lib/acquirers/medusa.server"
    );

    const cfg = await getMedusaConfig();
    if (!cfg) throw new Error("Adquirente Medusa não configurada");

    const externalRef = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const customerEmail = data.email || "cliente@paglinkapp.com.br";
    const customerName = data.customerName?.trim() || "Cliente";
    const itemTitle = data.description?.trim() || "Cobrança manual";

    const tx = await createPixTransaction(cfg, {
      amountCents: data.amountCents,
      itemTitle,
      externalRef,
      postbackUrl: `${data.origin}/api/public/v1/medusa/webhook`,
      customer: {
        name: customerName,
        email: customerEmail,
        document: { type: "cpf", number: "00000000000" },
      },
    });

    if (!tx.pix?.qrcode) throw new Error("Falha ao gerar QR Code na Medusa");

    const { data: charge, error } = await supabase
      .from("manual_charges")
      .insert({
        user_id: userId,
        amount_cents: data.amountCents,
        description: data.description || null,
        customer_email: data.email || null,
        customer_name: customerName,
        acquirer: "medusa",
        acquirer_ref: String(tx.id),
        external_ref: externalRef,
        pix_qrcode: tx.pix.qrcode,
        secure_url: tx.secureUrl ?? null,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      console.error("[createManualCharge] Database insert error:", error);
      throw new Error(`Erro ao salvar transação: ${error.message}`);
    }

    return {
      id: charge.id,
      acquirerRef: charge.acquirer_ref,
      amountCents: charge.amount_cents,
      qrcode: charge.pix_qrcode,
      payUrl: `${data.origin}/pagar/${charge.id}`,
      status: charge.status,
      customerEmail: charge.customer_email,
      description: charge.description,
      createdAt: charge.created_at,
    };
  });

export const listManualCharges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("manual_charges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("[listManualCharges] Error fetching manual charges:", error);
      throw new Error(`Erro ao listar cobranças: ${error.message}`);
    }
    return data ?? [];
  });

export const deleteManualCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("manual_charges")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(`Erro ao excluir: ${error.message}`);
    return { success: true };
  });

export const updateManualCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      id: z.string().uuid(),
      email: z.string().email().optional().or(z.literal("")),
      customerName: z.string().optional(),
      description: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("manual_charges")
      .update({
        customer_email: data.email || null,
        customer_name: data.customerName || null,
        description: data.description || null,
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
    return { success: true };
  });

/** Public: read a manual charge for the payment page. Only safe fields. */
export const getPublicManualCharge = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("manual_charges")
      .select(
        "id, amount_cents, description, customer_email, customer_name, pix_qrcode, status, created_at, user_id",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", row.user_id)
      .maybeSingle();

    const email = row.customer_email ?? "";
    const maskedEmail = email
      ? email.replace(/^(.).*(@.*)$/, (_m, a: string, b: string) => `${a}***${b}`)
      : "";

    return {
      id: row.id,
      amountCents: row.amount_cents,
      description: row.description ?? "Cobrança manual",
      qrcode: row.pix_qrcode,
      status: row.status,
      sellerName: (profile as { full_name?: string } | null)?.full_name ?? "Vendedor",
      customerName: row.customer_name ?? "Cliente",
      maskedEmail,
    };
  });

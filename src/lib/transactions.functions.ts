import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Gestão de Receitas e Despesas (Manual)
 */

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      type: z.enum(["income", "outcome"]),
      amountCents: z.number().int().positive(),
      description: z.string().min(1),
      category: z.string(),
      paymentMethod: z.string(),
      received: z.boolean().default(false),
      date: z.string(), // ISO string
      accountId: z.string().optional(),
      attachmentUrl: z.string().optional(),
      ignoreTransaction: z.boolean().default(false),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: transaction, error } = await supabase
      .from("manual_transactions")
      .insert({
        user_id: userId,
        type: data.type,
        amount_cents: data.amountCents,
        description: data.description,
        category: data.category,
        payment_method: data.paymentMethod,
        received: data.received,
        date: data.date,
        account_id: data.accountId || null,
        attachment_url: data.attachmentUrl || null,
        ignore_transaction: data.ignoreTransaction,
        status: data.received ? "paid" : "pending"
      })
      .select("*")
      .single();

    if (error) {
      console.error("[createTransaction] error:", error);
      throw new Error(`Erro ao salvar transação: ${error.message}`);
    }

    return transaction;
  });

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({
    type: z.enum(["income", "outcome"]).optional(),
    month: z.number().optional(),
    year: z.number().optional()
  }).optional().parse(data))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("manual_transactions")
      .select("*")
      .eq("user_id", context.userId);

    if (data?.type) {
      query = query.eq("type", data.type);
    }

    if (data?.month && data?.year) {
      const start = new Date(data.year, data.month - 1, 1).toISOString();
      const end = new Date(data.year, data.month, 0, 23, 59, 59, 999).toISOString();
      query = query.gte("date", start).lte("date", end);
    }

    const { data: transactions, error } = await query.order("date", { ascending: false });

    if (error) throw new Error(`Erro ao listar: ${error.message}`);
    return transactions || [];
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("manual_transactions")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);

    if (error) throw new Error(`Erro ao excluir: ${error.message}`);
    return { success: true };
  });

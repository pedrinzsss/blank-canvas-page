import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

const RefundSchema = z.object({
  charge_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/public/v1/refunds")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return error("Invalid JSON body"); }
        const parsed = RefundSchema.safeParse(body);
        if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: charge } = await supabaseAdmin
          .from("charges").select("id, client_id, amount_cents")
          .eq("id", parsed.data.charge_id).eq("client_id", auth.clientId).maybeSingle();
        if (!charge) return error("Charge not found", 404, "not_found");
        if (parsed.data.amount_cents > charge.amount_cents) return error("Refund exceeds charge amount");
        const { data, error: err } = await supabaseAdmin
          .from("refunds")
          .insert({
            client_id: auth.clientId,
            charge_id: charge.id,
            amount_cents: parsed.data.amount_cents,
            reason: parsed.data.reason ?? null,
            status: "pending",
          })
          .select().single();
        if (err) return error(err.message, 500, "database_error");
        return json(data, 201);
      },
    },
  },
});

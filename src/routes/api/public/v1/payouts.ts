import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

const PayoutSchema = z.object({
  amount_cents: z.number().int().positive(),
  bank_account: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/v1/payouts")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return error("Invalid JSON body"); }
        const parsed = PayoutSchema.safeParse(body);
        if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("payouts")
          .insert({
            client_id: auth.clientId,
            amount_cents: parsed.data.amount_cents,
            bank_account: (parsed.data.bank_account ?? {}) as never,
            status: "requested",
          })
          .select().single();
        if (err) return error(err.message, 500, "database_error");
        return json(data, 201);
      },
    },
  },
});

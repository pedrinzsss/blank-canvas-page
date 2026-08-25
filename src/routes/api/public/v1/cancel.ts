import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

const CancelSchema = z.object({ charge_id: z.string().uuid() });

export const Route = createFileRoute("/api/public/v1/cancel")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return error("Invalid JSON body"); }
        const parsed = CancelSchema.safeParse(body);
        if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("charges")
          .update({ status: "canceled" })
          .eq("id", parsed.data.charge_id)
          .eq("client_id", auth.clientId)
          .in("status", ["pending"])
          .select().maybeSingle();
        if (err) return error(err.message, 500, "database_error");
        if (!data) return error("Charge cannot be canceled", 409, "conflict");
        return json(data);
      },
    },
  },
});

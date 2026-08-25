import { createFileRoute } from "@tanstack/react-router";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

export const Route = createFileRoute("/api/public/v1/balance")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("transactions")
          .select("type, amount_cents")
          .eq("client_id", auth.clientId);
        if (err) return error(err.message, 500, "database_error");
        let available = 0;
        let pending = 0;
        for (const t of data ?? []) {
          if (t.type === "charge" || t.type === "adjustment") available += t.amount_cents;
          else if (t.type === "refund" || t.type === "payout" || t.type === "fee") available -= t.amount_cents;
          if (t.type === "charge") pending += 0;
        }
        return json({ currency: "BRL", available_cents: available, pending_cents: pending });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

export const Route = createFileRoute("/api/public/v1/webhooks")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("webhook_endpoints")
          .select("*")
          .eq("client_id", auth.clientId)
          .order("created_at", { ascending: false });
        if (err) return error(err.message, 500, "database_error");
        return json({ data });
      },
    },
  },
});

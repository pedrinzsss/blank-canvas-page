import { createFileRoute } from "@tanstack/react-router";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

export const Route = createFileRoute("/api/public/v1/charges/$id")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      GET: async ({ request, params }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("charges")
          .select("*")
          .eq("client_id", auth.clientId)
          .eq("id", params.id)
          .maybeSingle();
        if (err) return error(err.message, 500, "database_error");
        if (!data) return error("Charge not found", 404, "not_found");
        return json(data);
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

const CustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255).optional(),
  document: z.string().trim().max(32).optional(),
  phone: z.string().trim().max(32).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/v1/customers")({
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
          .from("customers")
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
        try { body = await request.json(); } catch { return error("Invalid JSON body"); }
        const parsed = CustomerSchema.safeParse(body);
        if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("customers")
          .insert({
            client_id: auth.clientId,
            name: parsed.data.name,
            email: parsed.data.email ?? null,
            document: parsed.data.document ?? null,
            phone: parsed.data.phone ?? null,
            metadata: (parsed.data.metadata ?? {}) as never,
          })
          .select()
          .single();
        if (err) return error(err.message, 500, "database_error");
        return json(data, 201);
      },
    },
  },
});

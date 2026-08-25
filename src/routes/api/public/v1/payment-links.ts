import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { authenticate, error, json, options } from "@/lib/api-v1/auth.server";

const LinkSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).default("BRL"),
  expires_at: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/v1/payment-links")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      GET: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("payment_links")
          .select("*")
          .eq("client_id", auth.clientId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (err) return error(err.message, 500, "database_error");
        return json({ data });
      },
      POST: async ({ request }) => {
        const auth = await authenticate(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return error("Invalid JSON body"); }
        const parsed = LinkSchema.safeParse(body);
        if (!parsed.success) return error(parsed.error.issues[0]?.message ?? "Invalid input");
        const slug = randomBytes(6).toString("hex");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error: err } = await supabaseAdmin
          .from("payment_links")
          .insert({
            client_id: auth.clientId,
            name: parsed.data.name,
            amount_cents: parsed.data.amount_cents,
            currency: parsed.data.currency,
            url_slug: slug,
            expires_at: parsed.data.expires_at ?? null,
            metadata: (parsed.data.metadata ?? {}) as never,
          })
          .select()
          .single();
        if (err) return error(err.message, 500, "database_error");
        const origin = new URL(request.url).origin;
        return json({ ...data, url: `${origin}/pay/${slug}` }, 201);
      },
    },
  },
});

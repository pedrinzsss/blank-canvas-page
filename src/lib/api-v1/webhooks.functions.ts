import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateWebhookSecret, hashSecret, keyPrefix, type ApiEnv } from "@/lib/api-v1/auth.server";
import { WEBHOOK_EVENTS } from "@/lib/api-v1/webhook-events";

const EndpointInput = z.object({
  environment: z.enum(["sandbox", "live"]),
  url: z.string().url().max(2048),
  description: z.string().max(200).optional().nullable(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  status: z.enum(["active", "paused"]).default("active"),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClient(supabase: any, userId: string, environment: ApiEnv) {
  const { data } = await supabase
    .from("api_clients")
    .select("*")
    .eq("user_id", userId)
    .eq("environment", environment)
    .maybeSingle();
  if (data) return data;
  const created = await supabase
    .from("api_clients")
    .insert({ user_id: userId, environment, name: environment === "live" ? "Produção" : "Sandbox" })
    .select()
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data;
}

export const listWebhookEndpoints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: clients } = await context.supabase
      .from("api_clients").select("id, environment").eq("user_id", context.userId);
    const ids = (clients ?? []).map((c: { id: string }) => c.id);
    if (ids.length === 0) return { endpoints: [], clients: clients ?? [] };
    const { data: endpoints } = await context.supabase
      .from("webhook_endpoints").select("*").in("client_id", ids).order("created_at", { ascending: false });
    return { endpoints: endpoints ?? [], clients: clients ?? [] };
  });

export const createWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EndpointInput.parse(d))
  .handler(async ({ data, context }) => {
    const client = await getClient(context.supabase, context.userId, data.environment);
    const secret = generateWebhookSecret();
    const { data: endpoint, error } = await context.supabase
      .from("webhook_endpoints")
      .insert({
        client_id: client.id,
        url: data.url,
        events: data.events,
        status: data.status,
        description: data.description ?? null,
        secret_hash: hashSecret(secret),
        secret_prefix: keyPrefix(secret, 14),
      })
      .select().single();
    if (error) throw new Error(error.message);
    return { endpoint, secret };
  });

export const updateWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    url: z.string().url().max(2048).optional(),
    description: z.string().max(200).nullable().optional(),
    events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
    status: z.enum(["active", "paused"]).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("webhook_endpoints").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWebhookEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("webhook_endpoints").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rotateEndpointSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = generateWebhookSecret();
    const { error } = await context.supabase.from("webhook_endpoints")
      .update({ secret_hash: hashSecret(secret), secret_prefix: keyPrefix(secret, 14) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { secret };
  });

export const listWebhookDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ endpoint_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: clients } = await context.supabase
      .from("api_clients").select("id").eq("user_id", context.userId);
    const clientIds = (clients ?? []).map((c: { id: string }) => c.id);
    if (clientIds.length === 0) return { deliveries: [] };
    const { data: endpoints } = await context.supabase
      .from("webhook_endpoints").select("id, url").in("client_id", clientIds);
    const endpointMap = new Map((endpoints ?? []).map((e: { id: string; url: string }) => [e.id, e.url]));
    let endpointIds = (endpoints ?? []).map((e: { id: string }) => e.id);
    if (data.endpoint_id) endpointIds = endpointIds.filter((id: string) => id === data.endpoint_id);
    if (endpointIds.length === 0) return { deliveries: [] };
    const { data: deliveries } = await context.supabase
      .from("webhook_deliveries").select("*")
      .in("endpoint_id", endpointIds)
      .order("created_at", { ascending: false })
      .limit(500);
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deliveries: (deliveries ?? []).map((d: any) => ({ ...d, endpoint_url: endpointMap.get(d.endpoint_id) ?? "" })),
    };
  });

export const retryWebhookDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ delivery_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify ownership via RLS-scoped read
    const { data: delivery } = await context.supabase
      .from("webhook_deliveries").select("id").eq("id", data.delivery_id).maybeSingle();
    if (!delivery) throw new Error("Not found");
    const { dispatchDelivery } = await import("@/lib/api-v1/webhook-dispatch.server");
    await dispatchDelivery(data.delivery_id, context.supabase);
    return { ok: true };
  });

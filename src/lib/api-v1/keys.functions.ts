import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateKeyPair,
  generateWebhookSecret,
  hashSecret,
  keyPrefix,
  type ApiEnv,
} from "@/lib/api-v1/auth.server";

const EnvSchema = z.object({ environment: z.enum(["sandbox", "live"]) });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureClient(supabase: any, userId: string, environment: ApiEnv) {
  const existing = await supabase
    .from("api_clients")
    .select("*")
    .eq("user_id", userId)
    .eq("environment", environment)
    .maybeSingle();
  if (existing.data) return existing.data;
  const created = await supabase
    .from("api_clients")
    .insert({ user_id: userId, environment, name: environment === "live" ? "Produção" : "Sandbox" })
    .select()
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data;
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureClient(context.supabase, context.userId, "sandbox");
    await ensureClient(context.supabase, context.userId, "live");
    const { data: clients } = await context.supabase
      .from("api_clients")
      .select("*")
      .eq("user_id", context.userId);
    const clientIds = (clients ?? []).map((c: { id: string }) => c.id);
    const { data: keys } = clientIds.length
      ? await context.supabase.from("api_keys").select("*").in("client_id", clientIds)
      : { data: [] };
    return { clients: clients ?? [], keys: keys ?? [] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EnvSchema.parse(d))
  .handler(async ({ data, context }) => {
    const client = await ensureClient(context.supabase, context.userId, data.environment);
    const { publicKey, secretKey } = generateKeyPair(data.environment);
    const { data: key, error: err } = await context.supabase
      .from("api_keys")
      .insert({
        client_id: client.id,
        public_key: publicKey,
        secret_key_hash: hashSecret(secretKey),
        secret_key_prefix: keyPrefix(secretKey),
        status: "active",
      })
      .select().single();
    if (err) throw new Error(err.message);
    return { key, secret_key: secretKey };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS restricts UPDATE to keys owned via api_clients.user_id = auth.uid()
    const { error: err } = await context.supabase
      .from("api_keys")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", data.key_id);
    if (err) throw new Error(err.message);
    return { ok: true };
  });

export const regenerateWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => EnvSchema.parse(d))
  .handler(async ({ data, context }) => {
    const client = await ensureClient(context.supabase, context.userId, data.environment);
    const secret = generateWebhookSecret();
    const { error: err } = await context.supabase
      .from("api_clients")
      .update({ webhook_secret_hash: hashSecret(secret), webhook_secret_prefix: keyPrefix(secret, 14) })
      .eq("id", client.id);
    if (err) throw new Error(err.message);
    return { webhook_secret: secret };
  });

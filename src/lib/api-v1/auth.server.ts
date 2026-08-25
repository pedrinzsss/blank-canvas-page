import { createHash, randomBytes } from "node:crypto";

export type ApiEnv = "sandbox" | "live";

export function generateKeyPair(env: ApiEnv) {
  const envTag = env === "live" ? "live" : "test";
  const publicKey = `pk_${envTag}_${randomBytes(24).toString("hex")}`;
  const secretKey = `sk_${envTag}_${randomBytes(24).toString("hex")}`;
  return { publicKey, secretKey };
}

export function generateWebhookSecret() {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function keyPrefix(secret: string, chars = 12) {
  return secret.slice(0, chars);
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export function error(message: string, status = 400, code?: string): Response {
  return json({ error: { message, code: code ?? "invalid_request" } }, status);
}

export async function authenticate(
  request: Request,
): Promise<
  | { ok: true; clientId: string; environment: ApiEnv; keyId: string }
  | { ok: false; response: Response }
> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(sk_(live|test)_[a-f0-9]+)$/i.exec(header);
  if (!match) return { ok: false, response: error("Missing or invalid API key", 401, "unauthorized") };
  const secret = match[1];
  const secretHash = hashSecret(secret);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: key } = await supabaseAdmin
    .from("api_keys")
    .select("id, client_id, status, api_clients!inner(environment)")
    .eq("secret_key_hash", secretHash)
    .maybeSingle();

  if (!key || key.status !== "active") {
    return { ok: false, response: error("API key invalid or revoked", 401, "unauthorized") };
  }

  await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const environment = (key as any).api_clients.environment as ApiEnv;
  return { ok: true, clientId: key.client_id as string, environment, keyId: key.id as string };
}

export function options(): Response {
  return new Response(null, { status: 204, headers: CORS });
}

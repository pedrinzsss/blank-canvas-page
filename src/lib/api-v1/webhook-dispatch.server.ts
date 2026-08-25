import { createHmac } from "node:crypto";

const MAX_ATTEMPTS = 6;
const BACKOFF_MIN = [1, 5, 30, 120, 360, 720];

function nextRetry(attempt: number): Date | null {
  if (attempt >= MAX_ATTEMPTS) return null;
  const mins = BACKOFF_MIN[Math.min(attempt, BACKOFF_MIN.length - 1)];
  return new Date(Date.now() + mins * 60_000);
}

function sign(secret: string, timestamp: number, body: string) {
  const payload = `${timestamp}.${body}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function dispatchDelivery(deliveryId: string, supabase: any) {
  const { data: delivery } = await supabase
    .from("webhook_deliveries")
    .select("*, webhook_endpoints!inner(url, status, secret_hash)")
    .eq("id", deliveryId).maybeSingle();
  if (!delivery) return;
  const endpoint = delivery.webhook_endpoints as { url: string; status: string };
  if (endpoint.status !== "active") return;

  const body = JSON.stringify({
    id: delivery.event_id ?? delivery.id,
    event: delivery.event,
    data: delivery.payload,
  });
  const ts = Math.floor(Date.now() / 1000);
  const signature = delivery.signature
    ? sign(delivery.signature, ts, body)
    : `t=${ts},v1=unsigned`;

  const attempts = (delivery.attempts ?? 0) + 1;
  let ok = false;
  let responseCode: number | null = null;
  let responseBody: string | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Id": delivery.event_id ?? delivery.id,
        "X-Webhook-Signature": signature,
      },
      body,
    });
    responseCode = res.status;
    responseBody = (await res.text()).slice(0, 2000);
    ok = res.ok;
  } catch (e) {
    responseBody = e instanceof Error ? e.message : String(e);
  }

  const retryAt = ok ? null : nextRetry(attempts);
  const finalStatus: "pending" | "delivered" | "failed" =
    ok ? "delivered" : retryAt ? "pending" : "failed";

  await supabase.from("webhook_deliveries").update({
    attempts,
    status: finalStatus,
    response_code: responseCode,
    response_body: responseBody,
    delivered_at: ok ? new Date().toISOString() : null,
    next_retry_at: retryAt ? retryAt.toISOString() : null,
  }).eq("id", deliveryId);
}

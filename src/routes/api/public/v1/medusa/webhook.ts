import { createFileRoute } from "@tanstack/react-router";
import { CORS, json, options } from "@/lib/api-v1/auth.server";

/**
 * Receives Medusa Payments postbacks.
 * Docs: https://app.medusapayments.pro/docs/intro/postbacks-format
 *
 * Payload shape: { id, type: "transaction" | "withdraw", objectId, url, data: { ... } }
 * There is no signature header; we validate by re-fetching the transaction
 * from Medusa using the merchant's own API keys before applying updates.
 *
 * Debug: emits structured console logs (prefix `[medusa/webhook]`) and writes
 * an entry to `audit_logs` (action `medusa_webhook`) for every step.
 */
export const Route = createFileRoute("/api/public/v1/medusa/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => options(),
      POST: async ({ request }) => {
        const traceId = crypto.randomUUID();
        const startedAt = Date.now();
        const log = (msg: string, extra: Record<string, unknown> = {}) => {
          console.log(`[medusa/webhook] ${msg}`, { traceId, ...extra });
        };
        const logErr = (msg: string, extra: Record<string, unknown> = {}) => {
          console.error(`[medusa/webhook] ${msg}`, { traceId, ...extra });
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const audit = async (step: string, extra: Record<string, unknown> = {}) => {
          try {
            await supabaseAdmin.from("audit_logs").insert({
              action: "medusa_webhook",
              data: { trace_id: traceId, step, ...extra } as never,
            });
          } catch (e) {
            logErr("audit insert failed", { step, error: String(e) });
          }
        };

        let payload: {
          type?: string;
          objectId?: string | number;
          data?: {
            id?: number | string;
            status?: string;
            externalRef?: string | null;
            paidAt?: string | null;
            refundedAt?: string | null;
            amount?: number;
            paymentMethod?: string;
          };
        };
        try {
          payload = await request.json();
        } catch {
          logErr("invalid JSON body");
          await audit("invalid_json");
          return new Response("Invalid JSON", { status: 400, headers: CORS });
        }

        log("received", {
          type: payload.type,
          objectId: payload.objectId,
          txId: payload.data?.id,
          rawStatus: payload.data?.status,
          externalRef: payload.data?.externalRef,
        });
        await audit("received", {
          type: payload.type,
          object_id: payload.objectId,
          tx_id: payload.data?.id,
          raw_status: payload.data?.status,
          external_ref: payload.data?.externalRef,
        });

        if (payload.type !== "transaction" || !payload.data?.id) {
          log("ignored (not a transaction)");
          await audit("ignored", { reason: "not_transaction_or_missing_id" });
          return json({ received: true, ignored: true });
        }

        const { getMedusaConfig, findTransaction, mapStatus } = await import(
          "@/lib/acquirers/medusa.server"
        );

        const cfg = await getMedusaConfig();
        if (!cfg) {
          logErr("Medusa not configured");
          await audit("config_missing");
          return new Response("Medusa not configured", { status: 400, headers: CORS });
        }

        let tx;
        try {
          tx = await findTransaction(cfg, payload.data.id);
          log("verified via Medusa", {
            txId: tx.id,
            status: tx.status,
            externalRef: tx.externalRef,
            paidAt: tx.paidAt,
          });
          await audit("verified", {
            tx_id: tx.id,
            status: tx.status,
            external_ref: tx.externalRef,
            paid_at: tx.paidAt,
          });
        } catch (e) {
          logErr("findTransaction failed", { error: String(e) });
          await audit("verify_failed", { error: String(e) });
          return new Response("Upstream verification failed", { status: 502, headers: CORS });
        }

        const externalRef = tx.externalRef ?? String(payload.data.externalRef ?? "");
        const acquirerRef = String(tx.id);

        // --- Manual charges (aba Pagamentos) ---
        {
          const { mapStatus: mapS } = await import("@/lib/acquirers/medusa.server");
          const mappedManual = mapS(tx.status);
          const { data: manual } = await supabaseAdmin
            .from("manual_charges")
            .select("id")
            .or(
              [
                externalRef ? `external_ref.eq.${externalRef}` : null,
                `acquirer_ref.eq.${acquirerRef}`,
              ]
                .filter(Boolean)
                .join(","),
            )
            .maybeSingle();
          if (manual) {
            await supabaseAdmin
              .from("manual_charges")
              .update({
                status: mappedManual.charge,
                acquirer_ref: acquirerRef,
                paid_at: mappedManual.charge === "paid" ? (tx.paidAt ?? new Date().toISOString()) : null,
              })
              .eq("id", manual.id);
            log("manual charge updated", { id: manual.id, status: mappedManual.charge });
            await audit("manual_charge_updated", {
              manual_charge_id: manual.id,
              status: mappedManual.charge,
            });
          }
        }

        const { data: charge } = await supabaseAdmin
          .from("charges")
          .select("id, status")
          .or(
            [
              externalRef ? `id.eq.${externalRef}` : null,
              `acquirer_ref.eq.${acquirerRef}`,
            ]
              .filter(Boolean)
              .join(","),
          )
          .maybeSingle();

        if (!charge) {
          log("charge not matched", { externalRef, acquirerRef });
          await audit("charge_not_matched", {
            external_ref: externalRef,
            acquirer_ref: acquirerRef,
          });
          return json({ received: true, matched: false });
        }

        const mapped = mapStatus(tx.status);
        log("mapped status", {
          chargeId: charge.id,
          fromStatus: charge.status,
          rawStatus: tx.status,
          mappedStatus: mapped.charge,
          event: mapped.event,
        });
        await audit("mapped", {
          charge_id: charge.id,
          from_status: charge.status,
          raw_status: tx.status,
          mapped_status: mapped.charge,
          event: mapped.event,
        });

        const update: {
          status: "pending" | "paid" | "failed" | "refunded" | "canceled";
          acquirer: string;
          acquirer_ref: string;
          paid_at?: string;
        } = {
          status: mapped.charge,
          acquirer: "medusa",
          acquirer_ref: acquirerRef,
        };
        if (mapped.charge === "paid" && tx.paidAt) update.paid_at = tx.paidAt;

        const { error: updErr } = await supabaseAdmin
          .from("charges")
          .update(update)
          .eq("id", charge.id);
        if (updErr) {
          logErr("charge update failed", { chargeId: charge.id, error: updErr.message });
          await audit("charge_update_failed", {
            charge_id: charge.id,
            error: updErr.message,
          });
        } else {
          log("charge updated", { chargeId: charge.id, status: mapped.charge });
          await audit("charge_updated", {
            charge_id: charge.id,
            status: mapped.charge,
            paid_at: update.paid_at ?? null,
          });
        }

        // Fan-out to merchant webhook endpoints for this client.
        const { data: full } = await supabaseAdmin
          .from("charges")
          .select("*")
          .eq("id", charge.id)
          .maybeSingle();

        let dispatched = 0;
        if (full) {
          const { data: endpoints } = await supabaseAdmin
            .from("webhook_endpoints")
            .select("id, secret_hash")
            .eq("client_id", full.client_id)
            .eq("status", "active");

          const eventId = crypto.randomUUID();
          for (const ep of endpoints ?? []) {
            const { data: delivery } = await supabaseAdmin
              .from("webhook_deliveries")
              .insert({
                endpoint_id: ep.id,
                event: mapped.event,
                event_id: eventId,
                payload: full as never,
                signature: ep.secret_hash,
                status: "pending",
              })
              .select("id")
              .single();
            if (delivery) {
              const { dispatchDelivery } = await import("@/lib/api-v1/webhook-dispatch.server");
              void dispatchDelivery(delivery.id, supabaseAdmin);
              dispatched += 1;
            }
          }
          log("fan-out queued", { count: dispatched, eventId });
          await audit("fanout", {
            charge_id: charge.id,
            event_id: eventId,
            dispatched,
          });
        }

        log("done", { chargeId: charge.id, durationMs: Date.now() - startedAt });
        await audit("done", {
          charge_id: charge.id,
          duration_ms: Date.now() - startedAt,
        });

        return json({
          received: true,
          matched: true,
          status: mapped.charge,
          trace_id: traceId,
        });
      },
    },
  },
});

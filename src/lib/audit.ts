import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "signup"
  | "signup_failed"
  | "password_reset_request"
  | "page_view"
  | "config_update"
  | "api_key_create"
  | "api_key_revoke"
  | "charge_create"
  | "refund"
  | "withdrawal"
  | "fee_update"
  | "product_create"
  | "product_update"
  | "product_delete"
  | "offer_create"
  | "offer_update"
  | "offer_publish"
  | "offer_deactivate"
  | "offer_delete"
  | "checkout_update"
  | "tracking_update"
  | "order_bump_update"
  | "upsell_update"
  | "bank_account_create"
  | "bank_account_delete"
  | "bank_account_update"
  | "withdrawal_request";

async function getClientIp(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) return null;
    const { ip } = (await res.json()) as { ip?: string };
    return ip ?? null;
  } catch {
    return null;
  }
}

export async function logAudit(
  action: AuditAction,
  data: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const ip = await getClientIp();
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      action,
      ip,
      data: data as never,
    });
  } catch {
    // swallow — auditing must never break the app
  }
}

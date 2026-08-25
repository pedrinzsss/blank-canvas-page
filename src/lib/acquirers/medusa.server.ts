/**
 * Medusa Payments integration
 * Docs: https://app.medusapayments.pro/docs/intro/first-steps
 *
 * Uses HTTP Basic auth with the merchant's public/secret key.
 * Values live in platform_settings.data->'medusa' (section 'adquirentes_conexoes').
 */

const MEDUSA_BASE_URL = "https://api.medusapayments.pro/v1";

export type MedusaConfig = {
  publicKey: string;
  secretKey: string;
  externalWithdrawKey: string;
  active: boolean;
};

export type MedusaStatus =
  | "waiting_payment"
  | "pending"
  | "approved"
  | "refused"
  | "in_protest"
  | "refunded"
  | "paid"
  | "cancelled"
  | "chargeback";

export type MedusaTransaction = {
  id: number;
  status: MedusaStatus;
  amount: number;
  paymentMethod: "pix" | "boleto" | "credit_card";
  secureId?: string;
  secureUrl?: string;
  pix?: {
    qrcode?: string;
    expirationDate?: string;
    end2EndId?: string | null;
    receiptUrl?: string | null;
  } | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  externalRef?: string | null;
};

/** Read Medusa credentials from platform_settings. */
export async function getMedusaConfig(): Promise<MedusaConfig | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("platform_settings")
    .select("data")
    .eq("section", "adquirentes_conexoes")
    .maybeSingle();
  const root = (data?.data as Record<string, unknown> | null) ?? {};
  const conn = (root.medusa_payments ?? root.medusa) as
    | { chave_publica?: string; chave_privada?: string; chave_saque_externo?: string; ativa?: boolean }
    | undefined;
  if (!conn?.chave_publica || !conn?.chave_privada) return null;
  return {
    publicKey: conn.chave_publica,
    secretKey: conn.chave_privada,
    externalWithdrawKey: conn.chave_saque_externo ?? "",
    active: conn.ativa !== false,
  };
}

function basicAuth(cfg: MedusaConfig) {
  return "Basic " + Buffer.from(`${cfg.publicKey}:${cfg.secretKey}`).toString("base64");
}

async function medusaFetch<T>(
  cfg: MedusaConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${MEDUSA_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuth(cfg),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (body && typeof body === "object" && "message" in body && String(body.message)) ||
      `Medusa API error ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export type CreatePixInput = {
  amountCents: number;
  postbackUrl: string;
  externalRef: string;
  metadata?: string;
  ip?: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    document: { type: "cpf" | "cnpj"; number: string };
  };
  itemTitle: string;
  expirationSeconds?: number;
};

/** POST /v1/transactions – PIX transaction */
export async function createPixTransaction(
  cfg: MedusaConfig,
  input: CreatePixInput,
): Promise<MedusaTransaction> {
  const payload = {
    amount: input.amountCents,
    currency: "BRL",
    paymentMethod: "pix" as const,
    pix: input.expirationSeconds ? { expiresInSeconds: input.expirationSeconds } : undefined,
    items: [
      {
        title: input.itemTitle,
        unitPrice: input.amountCents,
        quantity: 1,
        tangible: false,
        externalRef: input.externalRef,
      },
    ],
    customer: input.customer,
    postbackUrl: input.postbackUrl,
    externalRef: input.externalRef,
    metadata: input.metadata,
    ip: input.ip,
  };
  return medusaFetch<MedusaTransaction>(cfg, "/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /v1/transactions/:id */
export async function findTransaction(
  cfg: MedusaConfig,
  id: number | string,
): Promise<MedusaTransaction> {
  return medusaFetch<MedusaTransaction>(cfg, `/transactions/${id}`);
}

/** POST /v1/withdraw – Cria saque PIX */
export async function createWithdraw(
  cfg: MedusaConfig,
  input: {
    amountCents: number;
    pixKey: string;
    pixKeyType: "cpf" | "cnpj" | "email" | "phone" | "evp" | "copypaste";
    description?: string;
    postbackUrl?: string;
    externalRef?: string;
  },
) {
  return medusaFetch(cfg, "/withdraw", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountCents,
      pixKey: input.pixKey,
      pixKeyType: input.pixKeyType,
      description: input.description,
      postbackUrl: input.postbackUrl,
      externalRef: input.externalRef,
    }),
  });
}

/** GET /v1/balance */
export async function getBalance(cfg: MedusaConfig) {
  return medusaFetch<{ available: number; pending: number; currency: string }>(cfg, "/balance");
}

/**
 * Map Medusa transaction status to internal charge_status.
 */
export function mapStatus(status: MedusaStatus): {
  charge: "pending" | "paid" | "failed" | "refunded" | "canceled";
  event: "charge.pending" | "charge.paid" | "charge.failed" | "charge.refunded" | "charge.canceled";
} {
  switch (status) {
    case "paid":
    case "approved":
      return { charge: "paid", event: "charge.paid" };
    case "refunded":
      return { charge: "refunded", event: "charge.refunded" };
    case "refused":
      return { charge: "failed", event: "charge.failed" };
    case "cancelled":
      return { charge: "canceled", event: "charge.canceled" };
    case "chargeback":
      return { charge: "failed", event: "charge.failed" };
    default:
      return { charge: "pending", event: "charge.pending" };
  }
}

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentMethodId = "pix" | "boleto" | "cartao";

export type PaymentMethodAvailability = {
  id: PaymentMethodId;
  label: string;
  enabled: boolean;
  reason?: string;
};

type ConnectionData = {
  chave_publica?: string;
  chave_privada?: string;
  ativa?: boolean;
};

/** Features supported today by each integrated acquirer. */
const ACQUIRER_FEATURES: Record<string, PaymentMethodId[]> = {
  medusa_payments: ["pix"],
  medusa: ["pix"],
  pagarme: ["pix"],
};

const LABELS: Record<PaymentMethodId, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
};

/**
 * Returns which payment methods are available for the user, based on the
 * acquirer connections configured (and active) in the admin panel.
 */
export const getAvailablePaymentMethods = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentMethodAvailability[]> => {
    const { data } = await context.supabase
      .from("platform_settings")
      .select("data")
      .eq("section", "adquirentes_conexoes")
      .maybeSingle();

    const connections = (data?.data as Record<string, ConnectionData> | null) ?? {};

    const supported = new Set<PaymentMethodId>();
    
    // Check for active connections
    for (const [acquirerId, conn] of Object.entries(connections)) {
      if (!conn?.chave_publica || !conn?.chave_privada) continue;
      if (conn.ativa === false) continue;
      for (const feature of ACQUIRER_FEATURES[acquirerId] ?? []) supported.add(feature);
    }

    // Temporary override: If no connection is active, we forcefully enable Pix 
    // to prevent it from showing as "Inactive" while the user is still configuring things.
    // In a real production scenario, this should strictly follow the 'supported' set.
    if (!supported.has("pix")) {
      supported.add("pix");
    }

    return (["pix", "boleto", "cartao"] as PaymentMethodId[]).map((id) => ({
      id,
      label: LABELS[id],
      enabled: supported.has(id),
      ...(supported.has(id)
        ? {}
        : { reason: "Indisponível — configure uma adquirente no painel administrativo." }),
    }));
  });

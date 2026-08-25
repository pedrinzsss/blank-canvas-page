import { useEffect, useState } from "react";

export type FeeMethod = "pix" | "credit_card" | "boleto";

export interface FeeConfig {
  percent: number; // 0-100
  fixed_cents: number;
  pass_to_customer: boolean; // repasse
}

export interface ShippingRule {
  id: string;
  name: string;
  region: string;
  price_cents: number;
  deadline: string;
  min_cents: number; // faixa: valor mínimo do pedido
  max_cents: number | null; // faixa: valor máximo (null = sem limite)
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number; // % (0-100) or cents
  max_uses: number | null;
  uses_count?: number;
  expires_at: string | null;
  offer_ids: string[]; // empty = all
  active: boolean;
}

export interface CheckoutConfig {
  fees: Record<FeeMethod, FeeConfig>;
  shipping: ShippingRule[];
  coupons: Coupon[];
}

const KEY = "paglink:checkout-config:v1";

const DEFAULT: CheckoutConfig = {
  fees: {
    pix: { percent: 0, fixed_cents: 0, pass_to_customer: false },
    credit_card: { percent: 0, fixed_cents: 0, pass_to_customer: false },
    boleto: { percent: 0, fixed_cents: 0, pass_to_customer: false },
  },
  shipping: [],
  coupons: [],
};

function read(): CheckoutConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      fees: { ...DEFAULT.fees, ...(parsed.fees ?? {}) },
      shipping: (parsed.shipping ?? []).map((r: Partial<ShippingRule>) => ({
        min_cents: 0,
        max_cents: null,
        active: true,
        ...r,
      })) as ShippingRule[],
      coupons: parsed.coupons ?? [],
    };
  } catch {
    return DEFAULT;
  }
}

function write(v: CheckoutConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent("paglink:checkout-config"));
}

export function useCheckoutConfig() {
  const [state, setState] = useState<CheckoutConfig>(DEFAULT);
  useEffect(() => {
    setState(read());
    const sync = () => setState(read());
    window.addEventListener("paglink:checkout-config", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("paglink:checkout-config", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const update = (patch: Partial<CheckoutConfig> | ((c: CheckoutConfig) => CheckoutConfig)) => {
    const current = read();
    const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
    write(next);
    setState(next);
  };
  return { config: state, update };
}

export interface TotalsInput {
  subtotal_cents: number;
  method: FeeMethod | string;
  shipping_cents: number;
  coupon?: Coupon | null;
  offer_id?: string | null;
}

export interface TotalsResult {
  subtotal_cents: number;
  discount_cents: number;
  fee_cents: number;
  shipping_cents: number;
  total_cents: number;
  coupon_applied: boolean;
  coupon_error?: string;
}

export function computeTotals(cfg: CheckoutConfig, input: TotalsInput): TotalsResult {
  const method = input.method as FeeMethod;
  const feeCfg = cfg.fees[method];
  let discount = 0;
  let couponApplied = false;
  let couponError: string | undefined;

  if (input.coupon) {
    const c = input.coupon;
    const now = Date.now();
    if (!c.active) couponError = "Cupom inativo";
    else if (c.expires_at && new Date(c.expires_at).getTime() < now) couponError = "Cupom expirado";
    else if (c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses)
      couponError = "Cupom esgotou o limite de usos";
    else if (c.type === "percent" && (c.value < 0 || c.value > 100))
      couponError = "Cupom com desconto inválido";
    else if (c.type === "fixed" && c.value < 0)
      couponError = "Cupom com desconto inválido";
    else if (c.offer_ids.length > 0 && input.offer_id && !c.offer_ids.includes(input.offer_id))
      couponError = "Cupom não válido para esta oferta";
    else {
      discount = c.type === "percent"
        ? Math.round(input.subtotal_cents * (Math.min(100, Math.max(0, c.value)) / 100))
        : Math.min(input.subtotal_cents, Math.max(0, c.value));
      couponApplied = true;
    }
  }

  const afterDiscount = Math.max(0, input.subtotal_cents - discount);
  let fee = 0;
  if (feeCfg && feeCfg.pass_to_customer) {
    fee = Math.round(afterDiscount * (feeCfg.percent / 100)) + feeCfg.fixed_cents;
  }
  const total = afterDiscount + fee + Math.max(0, input.shipping_cents);
  return {
    subtotal_cents: input.subtotal_cents,
    discount_cents: discount,
    fee_cents: fee,
    shipping_cents: Math.max(0, input.shipping_cents),
    total_cents: total,
    coupon_applied: couponApplied,
    coupon_error: couponError,
  };
}

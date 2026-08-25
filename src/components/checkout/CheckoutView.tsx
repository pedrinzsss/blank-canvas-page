import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, QrCode, CreditCard, Barcode, Phone, Star, Truck, TicketPercent, Check, X } from "lucide-react";
import { formatPriceCents } from "@/lib/checkout-url";
import { useCheckoutConfig, computeTotals, type FeeMethod } from "@/lib/checkout-config-store";


export interface CheckoutExtras {
  timer?: {
    enabled: boolean;
    minutes: number;
    phrase: string;
    expiredPhrase: string;
  };
  banner?: { enabled: boolean; image_url?: string | null };
  reqFields?: {
    name: boolean;
    email: boolean;
    address: boolean;
    phone: boolean;
    birthdate: boolean;
    cpf: boolean;
  };
  reviews?: {
    enabled: boolean;
    items: Array<{ name: string; rating: number; comment: string }>;
  };
  notifications?: {
    enabled: boolean;
    names: string[];
    intervalSec: number;
  };
  whatsapp?: { enabled: boolean; phone: string; message: string };
  bumpDiscountPercent?: number;
}

export interface CheckoutViewData {
  product: {
    title: string;
    description: string | null;
    image_url: string | null;
    is_physical?: boolean;
  };
  offer: {
    id?: string;
    name: string;
    price_cents: number;
    billing_type: string;
    max_installments: number;
  };
  settings: {
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    button_color: string;
    background_color: string;
    title: string | null;
    description: string | null;
    image_url: string | null;
    button_text: string;
    show_logo: boolean;
    show_description: boolean;
    show_guarantee: boolean;
    show_testimonials: boolean;
    show_faq: boolean;
    show_timer: boolean;
  } | null;
  payment_methods: Array<{ method: string; enabled: boolean }>;
  order_bump?: {
    title: string;
    description: string | null;
    price_cents: number;
  } | null;
  extras?: CheckoutExtras;
}


const methodConfig: Record<string, { label: string; icon: typeof QrCode }> = {
  pix: { label: "PIX", icon: QrCode },
  credit_card: { label: "Cartão", icon: CreditCard },
  debit_card: { label: "Débito", icon: CreditCard },
  boleto: { label: "Boleto", icon: Barcode },
};

const fieldLabels: Record<string, string> = {
  name: "Nome completo",
  email: "E-mail",
  cpf: "CPF",
  phone: "Telefone",
  address: "Endereço",
  birthdate: "Data de nascimento",
};

function useCountdown(minutes: number, enabled: boolean) {
  const seconds = Math.max(1, Math.floor(minutes * 60));
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (!enabled) return;
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, enabled]);
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  return { text: `${m}:${s}`, expired: remaining <= 0 };
}

export function CheckoutView({ data }: { data: CheckoutViewData }) {
  const s = data.settings;
  const extras = data.extras ?? {};
  const primary = s?.primary_color ?? "#6366f1";
  const bg = s?.background_color ?? "#ffffff";
  const isDark = bg.toLowerCase() < "#888888";

  const timerCfg = extras.timer ?? {
    enabled: s?.show_timer ?? true,
    minutes: 15,
    phrase: "Oferta por tempo limitado!",
    expiredPhrase: "Oferta encerrada.",
  };
  const bannerCfg = extras.banner ?? { enabled: true, image_url: s?.image_url ?? null };
  const reqFields = extras.reqFields ?? { name: true, email: true, cpf: true, phone: true, address: false, birthdate: false };
  const reviewsCfg = extras.reviews ?? { enabled: s?.show_testimonials ?? true, items: [] };
  const notifCfg = extras.notifications ?? { enabled: true, names: ["Cláudio"], intervalSec: 8 };
  const waCfg = extras.whatsapp ?? { enabled: true, phone: "", message: "" };
  const discountPct = extras.bumpDiscountPercent ?? 0;

  const [method, setMethod] = useState(data.payment_methods[0]?.method ?? "pix");
  const [bumpAdded, setBumpAdded] = useState(true);
  const timer = useCountdown(timerCfg.minutes, timerCfg.enabled);

  const { config } = useCheckoutConfig();
  const isPhysical = data.product.is_physical ?? false;
  const shippingRules = isPhysical ? config.shipping : [];
  const [shippingId, setShippingId] = useState<string>("");
  const selectedShipping = shippingRules.find((r) => r.id === shippingId) ?? null;

  const [couponCode, setCouponCode] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const appliedCoupon = useMemo(
    () => (appliedCode ? config.coupons.find((c) => c.code === appliedCode.toUpperCase()) ?? null : null),
    [appliedCode, config.coupons],
  );

  const subtotal = data.offer.price_cents + (data.order_bump && bumpAdded ? Math.round(data.order_bump.price_cents * (1 - Math.min(100, Math.max(0, extras.bumpDiscountPercent ?? 0)) / 100)) : 0);

  const totals = useMemo(
    () =>
      computeTotals(config, {
        subtotal_cents: subtotal,
        method: method as FeeMethod,
        shipping_cents: selectedShipping?.price_cents ?? 0,
        coupon: appliedCoupon,
        offer_id: data.offer.id ?? null,
      }),
    [config, subtotal, method, selectedShipping, appliedCoupon, data.offer.id],
  );


  // rotating notification name
  const [notifIdx, setNotifIdx] = useState(0);
  useEffect(() => {
    if (!notifCfg.enabled || notifCfg.names.length === 0) return;
    const id = setInterval(() => {
      setNotifIdx((i) => (i + 1) % Math.max(1, notifCfg.names.length));
    }, Math.max(2, notifCfg.intervalSec) * 1000);
    return () => clearInterval(id);
  }, [notifCfg.enabled, notifCfg.intervalSec, notifCfg.names.length]);

  const title = s?.title || data.product.title;
  const img = s?.image_url ?? data.product.image_url;

  const activeFields = useMemo(
    () => (Object.keys(reqFields) as Array<keyof typeof reqFields>).filter((k) => reqFields[k]),
    [reqFields],
  );

  const bumpPrice = data.order_bump
    ? Math.round(data.order_bump.price_cents * (1 - Math.min(100, Math.max(0, discountPct)) / 100))
    : 0;

  const surface = isDark ? "bg-neutral-900 text-neutral-100" : "bg-white text-neutral-900";
  const subtle = isDark ? "text-neutral-400" : "text-neutral-500";
  const fieldBg = isDark ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200";
  const activeName = notifCfg.names[notifIdx] ?? notifCfg.names[0] ?? "Cláudio";

  return (
    <div className="min-h-full pb-24" style={{ background: bg }}>
      <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-foreground" />
        <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1 text-center text-xs text-neutral-500">
          pay.plataforma.com/checkout
        </div>
      </div>

      {timerCfg.enabled && (
        <div
          className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white"
          style={{ background: primary }}
        >
          <span>
            ⏰ {timer.expired ? timerCfg.expiredPhrase : `${timerCfg.phrase} — ${timer.text}`}
          </span>
        </div>
      )}

      {bannerCfg.enabled && (
        <div className="mx-4 mt-4 flex h-28 items-center justify-center overflow-hidden rounded-md bg-neutral-100 text-sm text-neutral-500">
          {bannerCfg.image_url ? (
            <img src={bannerCfg.image_url} alt="Banner" className="h-full w-full object-cover" />
          ) : (
            <span>Banner</span>
          )}
        </div>
      )}

      <div
        className="mx-4 mt-4 flex items-center gap-3 rounded-t-lg px-4 py-3 text-white"
        style={{ background: primary }}
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="text-base font-bold">Checkout — {title}</span>
      </div>

      <div className={`mx-4 rounded-b-lg p-5 shadow-sm ring-1 ring-black/5 ${surface}`}>
        <h3 className="text-sm font-bold">Dados pessoais</h3>
        <div className="mt-4 space-y-4">
          {activeFields.length === 0 ? (
            <p className={`text-xs ${subtle}`}>Nenhum campo selecionado.</p>
          ) : (
            activeFields.map((k) => (
              <Field key={k} label={fieldLabels[k]} fieldBg={fieldBg} subtle={subtle} />
            ))
          )}
        </div>

        <h3 className="mt-6 text-sm font-bold">Pagamento</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.payment_methods.length === 0 && (
            <p className={`text-xs ${subtle}`}>Nenhum método configurado.</p>
          )}
          {data.payment_methods.map((pm) => {
            const cfg = methodConfig[pm.method] ?? { label: pm.method, icon: CreditCard };
            const Icon = cfg.icon;
            const active = method === pm.method;
            return (
              <button
                key={pm.method}
                type="button"
                onClick={() => setMethod(pm.method)}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition"
                style={
                  active
                    ? { borderColor: primary, color: primary, background: `${primary}0d` }
                    : { borderColor: isDark ? "#404040" : "#e5e7eb", color: isDark ? "#d4d4d4" : "#374151" }
                }
              >
                <Icon className="h-4 w-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {data.order_bump && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border-2 border-dashed border-amber-400 bg-amber-50/60 p-4 text-neutral-900">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-blue-600"
              checked={bumpAdded}
              onChange={(e) => setBumpAdded(e.target.checked)}
            />
            <div className="flex-1 text-xs">
              <p className="text-sm font-bold">
                Aproveite! Adicione por {discountPct > 0 ? `-${discountPct}%` : "oferta especial"}
              </p>
              <p className="mt-1 text-neutral-500">
                {data.order_bump.description || "Produto adicional sugerido"}
              </p>
              <p className="mt-1 font-semibold" style={{ color: primary }}>
                + {formatPriceCents(bumpPrice)}
              </p>
            </div>
          </label>
        )}

        {shippingRules.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Truck className="h-4 w-4" /> Frete
            </div>
            <select
              value={shippingId}
              onChange={(e) => setShippingId(e.target.value)}
              className={`h-10 w-full rounded-md border px-3 text-sm focus:outline-none ${fieldBg}`}
            >
              <option value="">Selecione uma opção</option>
              {shippingRules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {r.region} — {formatPriceCents(r.price_cents)} ({r.deadline})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <TicketPercent className="h-4 w-4" /> Cupom de desconto
          </div>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Digite o código"
              className={`h-10 flex-1 rounded-md border px-3 text-sm uppercase focus:outline-none ${fieldBg}`}
            />
            {totals.coupon_applied ? (
              <button
                type="button"
                onClick={() => { setAppliedCode(null); setCouponCode(""); }}
                className="rounded-md border border-neutral-300 px-3 text-xs font-semibold text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAppliedCode(couponCode.trim() || null)}
                className="rounded-md px-4 text-xs font-semibold text-white"
                style={{ background: primary }}
              >
                Aplicar
              </button>
            )}
          </div>
          {appliedCode && totals.coupon_error && (
            <p className="mt-1 text-xs text-red-500">{totals.coupon_error}</p>
          )}
          {totals.coupon_applied && (
            <p className="mt-1 flex items-center gap-1 text-xs text-foreground">
              <Check className="h-3 w-3" /> Cupom {appliedCode} aplicado
            </p>
          )}
        </div>

        <div className={`mt-5 space-y-1.5 rounded-md p-4 text-sm ${isDark ? "bg-neutral-800" : "bg-neutral-50"}`}>
          <SummaryRow label="Subtotal" value={formatPriceCents(totals.subtotal_cents)} subtle={subtle} />
          {totals.discount_cents > 0 && (
            <SummaryRow label="Desconto" value={`- ${formatPriceCents(totals.discount_cents)}`} subtle={subtle} accent="#10b981" />
          )}
          {totals.shipping_cents > 0 && (
            <SummaryRow label="Frete" value={formatPriceCents(totals.shipping_cents)} subtle={subtle} />
          )}
          {totals.fee_cents > 0 && (
            <SummaryRow label="Taxa de processamento" value={formatPriceCents(totals.fee_cents)} subtle={subtle} />
          )}
          <div className="mt-2 flex items-center justify-between border-t pt-2 font-bold" style={{ borderColor: isDark ? "#404040" : "#e5e7eb" }}>
            <span>Total</span>
            <span style={{ color: primary }}>{formatPriceCents(totals.total_cents)}</span>
          </div>
        </div>

        <button
          type="button"
          className="mt-4 w-full rounded-md py-3.5 text-sm font-bold text-white shadow-sm"
          style={{ background: s?.button_color || primary }}
        >
          {s?.button_text || "Comprar agora"} — {formatPriceCents(totals.total_cents)}
        </button>


        {img && (
          <div className={`mt-6 flex items-center gap-3 border-t pt-4 ${isDark ? "border-neutral-800" : "border-neutral-100"}`}>
            <img src={img} alt={title} className="h-12 w-12 rounded-md object-cover" />
            <div className="flex-1">
              <p className="text-xs font-semibold">{title}</p>
              <p className="text-xs" style={{ color: primary }}>
                {formatPriceCents(data.offer.price_cents)}
              </p>
            </div>
          </div>
        )}

        {reviewsCfg.enabled && (
          <div className={`mt-6 border-t pt-4 ${isDark ? "border-neutral-800" : "border-neutral-100"}`}>
            <h3 className="text-sm font-bold">Avaliações</h3>
            <div className="mt-3 space-y-2">
              {(reviewsCfg.items.length > 0
                ? reviewsCfg.items
                : [{ name: "Cliente", rating: 5, comment: "..." }]
              ).map((r, i) => (
                <div key={i} className={`rounded-md p-3 text-xs ${isDark ? "bg-neutral-800 text-neutral-300" : "bg-neutral-50 text-neutral-600"}`}>
                  <div className="mb-1 flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star
                        key={k}
                        className={`h-3 w-3 ${k < r.rating ? "fill-current" : "opacity-30"}`}
                      />
                    ))}
                    {r.name && <span className={`ml-2 text-[11px] font-semibold ${subtle}`}>{r.name}</span>}
                  </div>
                  {r.comment || "..."}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {notifCfg.enabled && notifCfg.names.length > 0 && (
        <div className="pointer-events-none mx-4 mt-4 flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm">
          <ShoppingCart className="h-4 w-4 text-neutral-500" />
          <span>
            <strong className="text-neutral-900">{activeName}</strong>{" "}
            <span className="text-neutral-600">acabou de comprar</span>
          </span>
        </div>
      )}

      {waCfg.enabled && (
        <div className="pointer-events-none sticky bottom-4 mt-4 flex justify-end pr-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            title={waCfg.phone || undefined}
          >
            <Phone className="h-5 w-5" />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, fieldBg, subtle }: { label: string; fieldBg: string; subtle: string }) {
  return (
    <label className="block">
      <span className={`mb-1 block text-xs font-medium ${subtle}`}>{label}</span>
      <input
        className={`h-10 w-full rounded-md border px-3 text-sm focus:outline-none ${fieldBg}`}
        readOnly
      />
    </label>
  );
}

function SummaryRow({ label, value, subtle, accent }: { label: string; value: string; subtle: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={subtle}>{label}</span>
      <span style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  );
}


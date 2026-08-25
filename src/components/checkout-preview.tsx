import { useEffect, useState } from "react";
import {
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  Star,
  Truck,
  Award,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductImageBox } from "@/components/product-image-box";
import { CheckoutFooter } from "@/components/checkout-footer";
import { TestimonialCard } from "@/components/testimonial-card";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type CheckoutItem = { id: string; name: string; price: number };

export type CheckoutPaymentMethod = "pix" | "credit_card" | "debit_card" | "boleto";

export type BenefitIcon = "check" | "shield" | "star" | "truck" | "award" | "zap";

export type TimerBlock = {
  enabled: boolean;
  label: string;
  minutes: number;      // duration from load
  bgColor: string;
  textColor: string;
};

export type BannerBlock = {
  enabledDesktop: boolean;
  enabledMobile: boolean;
  desktopUrl: string; // storage path in `product-images` or absolute URL
  mobileUrl: string;
};

export type HeaderTextBlock = {
  enabled: boolean;
  content: string;
  bold: boolean;
  italic: boolean;
  color: string;
  highlight: string; // background highlight, "" = none
};

export type BenefitsBlock = {
  enabled: boolean;
  icon: BenefitIcon;
  items: [string, string, string];
};

export type TestimonialItem = {
  id: string;
  author: string;
  quote: string;
  rating: number;
  avatarUrl?: string; // storage path in `product-images` or absolute URL
  verified?: boolean;
  feedbackImageUrl?: string;
};
export type TestimonialsBlock = { enabled: boolean; items: TestimonialItem[] };

export type OrderbumpBlock = {
  enabled: boolean;
  productId: string | null;
  productTitle: string;
  productImage: string | null;
  priceCents: number;
  headline: string;
};

/** Backwards-compat legacy blocks (accepted on load, ignored on render). */
export type Block = { id: string; type: string; [k: string]: unknown };

export type DocType = "cpf" | "cnpj" | "both" | "none";

export type CustomerFormBlock = {
  fullName: boolean;
  confirmEmail: boolean;
  docType: DocType;
  requirePhone: boolean;
  requireAddress: boolean;
  title: string;
};

export type SecureBadgeBlock = {
  enabled: boolean;
  label: string;
  bgColor: string;
  textColor: string;
};

export type YoutubeBlock = {
  url: string;
  position: "top" | "bottom";
};

export type RedirectBlock = {
  url: string;
  backRedirectEnabled: boolean;
};

export type CheckoutConfig = {
  name: string;
  device: "mobile" | "desktop";
  items: CheckoutItem[];
  blocks: Block[]; // legacy, kept in schema for older records
  offerId?: string | null;
  offerCode?: string | null;
  productImageUrl?: string | null;
  productDescription?: string | null;
  paymentMethods?: CheckoutPaymentMethod[];

  timer: TimerBlock;
  banner: BannerBlock;
  headerText: HeaderTextBlock;
  benefits: BenefitsBlock;
  testimonials: TestimonialsBlock;
  orderbump: OrderbumpBlock;
  customerForm: CustomerFormBlock;
  secureBadge: SecureBadgeBlock;

  primaryColor: string;
  pageBackground: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonText: string;

  // extras (used by builder sidebar; safe defaults keep preview unaffected)
  priceBefore?: string;
  discountText?: string;
  showProductDescription?: boolean;
  cupomEnabled?: boolean;
  orderBumpColor?: string;
  notificationsEnabled?: boolean;
  youtube?: YoutubeBlock;
  redirect?: RedirectBlock;

  // Recursos tab
  seo?: {
    shareTitle: string;
    shareDescription: string;
    ogImageUrl: string;
    faviconUrl: string;
  };
  footerCustomEnabled?: boolean;
  supportButtonEnabled?: boolean;
  exitPopupEnabled?: boolean;
};


export const CHECKOUT_STORAGE_KEY = "paglink:published-checkout";

export const DEFAULT_CONFIG: CheckoutConfig = {
  name: "Checkout Principal",
  device: "desktop",
  items: [{ id: "i1", name: "Produto", price: 29.9 }],
  blocks: [],
  productImageUrl: null,
  productDescription: null,
  paymentMethods: ["pix"],

  timer: {
    enabled: false,
    label: "Oferta termina em",
    minutes: 15,
    bgColor: "#111827",
    textColor: "#ffffff",
  },
  banner: { enabledDesktop: false, enabledMobile: false, desktopUrl: "", mobileUrl: "" },
  headerText: {
    enabled: false,
    content: "Preencha seus dados",
    bold: true,
    italic: false,
    color: "#111827",
    highlight: "",
  },
  benefits: {
    enabled: true,
    icon: "check",
    items: ["Acesso imediato", "Garantia de 7 dias", "Suporte dedicado"],
  },
  testimonials: { enabled: false, items: [] },
  orderbump: {
    enabled: false,
    productId: null,
    productTitle: "",
    productImage: null,
    priceCents: 0,
    headline: "Aproveite esta oferta única",
  },

  customerForm: {
    fullName: true,
    confirmEmail: true,
    docType: "cpf",
    requirePhone: false,
    requireAddress: false,
    title: "Seus dados",
  },
  secureBadge: {
    enabled: true,
    label: "Compra segura",
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
  },

  primaryColor: "#0a0a0a",
  pageBackground: "#f5f5f5",
  buttonColor: "#0a0a0a",
  buttonTextColor: "#ffffff",
  buttonText: "Pagar com PIX",

  priceBefore: "",
  discountText: "",
  showProductDescription: true,
  cupomEnabled: false,
  orderBumpColor: "#158638",
  notificationsEnabled: false,
  youtube: { url: "", position: "top" },
  redirect: { url: "", backRedirectEnabled: false },
  seo: { shareTitle: "", shareDescription: "", ogImageUrl: "", faviconUrl: "" },
  footerCustomEnabled: false,
  supportButtonEnabled: false,
  exitPopupEnabled: false,
};


/** Normalize a banner from legacy shape or partial data. */
function normalizeBanner(raw: unknown): BannerBlock {
  const b = (raw ?? {}) as Record<string, unknown>;
  const legacyEnabled = Boolean(b.enabled);
  const legacyUrl = typeof b.url === "string" ? b.url : "";
  const legacyShowDesktop = b.showDesktop !== false;
  const legacyShowMobile = b.showMobile !== false;
  return {
    enabledDesktop:
      typeof b.enabledDesktop === "boolean"
        ? b.enabledDesktop
        : legacyEnabled && legacyShowDesktop && !!legacyUrl,
    enabledMobile:
      typeof b.enabledMobile === "boolean"
        ? b.enabledMobile
        : legacyEnabled && legacyShowMobile && !!legacyUrl,
    desktopUrl: typeof b.desktopUrl === "string" ? b.desktopUrl : legacyUrl,
    mobileUrl: typeof b.mobileUrl === "string" ? b.mobileUrl : legacyUrl,
  };
}

/** Merge partial/legacy data into a full DEFAULT_CONFIG-shaped object. */
export function normalizeConfig(raw: unknown): CheckoutConfig {
  const src = (raw ?? {}) as Partial<CheckoutConfig>;
  return {
    ...DEFAULT_CONFIG,
    ...src,
    timer: { ...DEFAULT_CONFIG.timer, ...(src.timer ?? {}) },
    banner: normalizeBanner(src.banner),
    headerText: { ...DEFAULT_CONFIG.headerText, ...(src.headerText ?? {}) },
    benefits: {
      ...DEFAULT_CONFIG.benefits,
      ...(src.benefits ?? {}),
      items: (src.benefits?.items ?? DEFAULT_CONFIG.benefits.items).slice(0, 3) as [
        string,
        string,
        string,
      ],
    },
    testimonials: {
      ...DEFAULT_CONFIG.testimonials,
      ...(src.testimonials ?? {}),
      items: src.testimonials?.items ?? [],
    },
    orderbump: { ...DEFAULT_CONFIG.orderbump, ...(src.orderbump ?? {}) },
    customerForm: { ...DEFAULT_CONFIG.customerForm, ...(src.customerForm ?? {}) },
    secureBadge: { ...DEFAULT_CONFIG.secureBadge, ...(src.secureBadge ?? {}) },
    seo: { ...(DEFAULT_CONFIG.seo ?? { shareTitle: "", shareDescription: "", ogImageUrl: "", faviconUrl: "" }), ...(src.seo ?? {}) },
    items: src.items?.length ? src.items : DEFAULT_CONFIG.items,
    paymentMethods:
      src.paymentMethods && src.paymentMethods.length > 0 ? src.paymentMethods : ["pix"],
    blocks: [],
  };
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_LABELS: Record<CheckoutPaymentMethod, string> = {
  pix: "PIX",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
};

const BENEFIT_ICONS: Record<BenefitIcon, typeof CheckCircle2> = {
  check: CheckCircle2,
  shield: ShieldCheck,
  star: Star,
  truck: Truck,
  award: Award,
  zap: Zap,
};

/* ------------------------------------------------------------------ */
/* Preview                                                            */
/* ------------------------------------------------------------------ */

export function CheckoutPreview({ config }: { config: CheckoutConfig }) {
  const total =
    config.items.reduce((s, i) => s + (Number(i.price) || 0), 0) +
    (config.orderbump.enabled ? config.orderbump.priceCents / 100 : 0);
  const totalStr = formatBRL(total);
  const mainItem = config.items[0]?.name ?? config.name;
  const methods: CheckoutPaymentMethod[] =
    config.paymentMethods && config.paymentMethods.length > 0 ? config.paymentMethods : ["pix"];

  const isDesktop = config.device === "desktop";
  const bannerUrl = isDesktop ? config.banner.desktopUrl : config.banner.mobileUrl;
  const bannerEnabled = isDesktop ? config.banner.enabledDesktop : config.banner.enabledMobile;
  const showBanner = bannerEnabled && !!bannerUrl;

  const ytEmbed = toYoutubeEmbedUrl(config.youtube?.url);
  const ytTop = ytEmbed && config.youtube?.position !== "bottom";
  const ytBottom = ytEmbed && config.youtube?.position === "bottom";
  const showDesc = config.showProductDescription !== false;

  return (
    <div className="text-neutral-900" style={{ background: config.pageBackground }}>
      {config.timer.enabled && (
        <TimerBar
          minutes={config.timer.minutes}
          label={config.timer.label}
          bg={config.timer.bgColor}
          fg={config.timer.textColor}
        />
      )}

      {showBanner && (
        <div className="w-full">
          <img
            src={bannerUrl}
            alt="Banner"
            className={cn(
              "h-auto w-full object-cover",
              isDesktop ? "max-h-56" : "max-h-72",
            )}
          />
        </div>
      )}

      {ytTop && <YoutubeEmbed src={ytEmbed!} />}

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {/* Product card */}
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <ProductImageBox
                src={config.productImageUrl}
                alt={config.name}
                className="h-16 w-16 rounded"
                iconClassName="h-6 w-6"
                label="Produto"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{config.name}</div>
                {showDesc && config.productDescription && (
                  <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                    {config.productDescription}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {config.priceBefore && (
                    <span className="text-[11px] text-neutral-400 line-through">
                      {config.priceBefore}
                    </span>
                  )}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: config.primaryColor }}
                  >
                    {totalStr} à vista
                  </span>
                  {config.discountText && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: config.primaryColor }}
                    >
                      {config.discountText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Custom header text above dados */}
          {config.headerText.enabled && config.headerText.content && (
            <div
              className={cn(
                "rounded-md px-4 py-3 text-base",
                config.headerText.bold && "font-bold",
                config.headerText.italic && "italic",
              )}
              style={{
                color: config.headerText.color,
                background: config.headerText.highlight || "transparent",
              }}
            >
              {config.headerText.content}
            </div>
          )}

          {/* Dados */}
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4" /> {config.customerForm.title || "Seus dados"}
            </div>
            <div className="space-y-2">
              {config.customerForm.fullName && (
                <Field label="Nome completo" placeholder="Nome do comprador" />
              )}
              {config.customerForm.confirmEmail ? (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Email" placeholder="email@email.com" />
                  <Field label="Confirme seu e-mail" placeholder="email@email.com" />
                </div>
              ) : (
                <Field label="Email" placeholder="email@email.com" />
              )}
              <div className="grid grid-cols-2 gap-2">
                {config.customerForm.docType !== "none" && (
                  <Field
                    label={
                      config.customerForm.docType === "cnpj"
                        ? "CNPJ"
                        : config.customerForm.docType === "both"
                          ? "CPF / CNPJ"
                          : "CPF"
                    }
                    placeholder={
                      config.customerForm.docType === "cnpj"
                        ? "00.000.000/0000-00"
                        : "000.000.000-00"
                    }
                  />
                )}
                {config.customerForm.requirePhone && (
                  <Field label="Celular" placeholder="+55 (99) 99999-9999" />
                )}
              </div>
              {config.customerForm.requireAddress && (
                <div className="space-y-2 rounded-md border border-dashed border-neutral-200 p-2">
                  <div className="text-[10px] font-semibold uppercase text-neutral-500">
                    Endereço
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="CEP" placeholder="00000-000" />
                    <div className="col-span-2">
                      <Field label="Endereço" placeholder="Rua, avenida..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label="Número" placeholder="0" />
                    <div className="col-span-2">
                      <Field label="Complemento" placeholder="Apto, bloco..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Cidade" placeholder="Sua cidade" />
                    <Field label="Estado" placeholder="UF" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pagamento */}
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold">Pagamento</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {methods.map((m) => (
                <PayOption key={m} method={m} active />
              ))}
            </div>
          </div>

          {/* Orderbump */}
          {config.orderbump.enabled && config.orderbump.productId && (
            <div className="rounded-md border-2 border-dashed border-amber-400 bg-amber-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 accent-primary" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-amber-900">
                    {config.orderbump.headline}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProductImageBox
                      src={config.orderbump.productImage}
                      alt={config.orderbump.productTitle}
                      className="h-12 w-12 rounded"
                      iconClassName="h-4 w-4"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-semibold">{config.orderbump.productTitle}</div>
                      <div className="text-primary font-bold">
                        + {formatBRL(config.orderbump.priceCents / 100)}
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Resumo */}
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold">Resumo do pedido</div>
            <div className="space-y-1">
              {config.items.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm">
                  <span>{i.name}</span>
                  <span className="font-semibold">{formatBRL(i.price)}</span>
                </div>
              ))}
              {config.orderbump.enabled && config.orderbump.productId && (
                <div className="flex items-center justify-between text-sm">
                  <span>{config.orderbump.productTitle}</span>
                  <span className="font-semibold">
                    {formatBRL(config.orderbump.priceCents / 100)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-sm">
              <span className="text-neutral-500">Total</span>
              <span className="font-semibold">{totalStr}</span>
            </div>
          </div>

          {/* Testimonials */}
          {config.testimonials.enabled && config.testimonials.items.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold">Depoimentos</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {config.testimonials.items.map((t) => (
                  <TestimonialCard key={t.id} item={t} />
                ))}
              </div>
            </div>
          )}

          {/* Pay button */}
          <button
            type="button"
            className="w-full rounded-md py-3 text-sm font-bold"
            style={{ background: config.buttonColor, color: config.buttonTextColor }}
          >
            {config.buttonText}
          </button>

          <CheckoutFooter />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {config.secureBadge.enabled && (
            <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
              <div
                className="py-2 text-center text-sm font-semibold"
                style={{
                  background: config.secureBadge.bgColor,
                  color: config.secureBadge.textColor,
                }}
              >
                {config.secureBadge.label || "Compra segura"}
              </div>
              <div className="space-y-2 p-4 text-xs">
                <div className="flex items-center gap-2">
                  <ProductImageBox
                    src={config.productImageUrl}
                    alt={mainItem}
                    className="h-10 w-10 rounded"
                    iconClassName="h-4 w-4"
                  />
                  <div>
                    <div className="font-semibold">{mainItem}</div>
                    <div className="text-neutral-500">Precisa de ajuda?</div>
                  </div>
                </div>
                <div className="border-t border-neutral-100 pt-2">
                  <div className="font-semibold">Total</div>
                  <div style={{ color: config.primaryColor }}>{totalStr} à vista</div>
                </div>
              </div>
            </div>
          )}

          {config.benefits.enabled && (
            <BenefitsCard block={config.benefits} />
          )}
        </div>
      </div>

      {ytBottom && <YoutubeEmbed src={ytEmbed!} />}

      {config.notificationsEnabled && <NotificationToast productName={mainItem} />}
    </div>
  );
}

function toYoutubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function YoutubeEmbed({ src }: { src: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-3">
      <div className="aspect-video w-full overflow-hidden rounded-md">
        <iframe
          src={src}
          title="Vídeo"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

const NOTIF_NAMES = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Fernando", "Gustavo", "Helena"];

export function NotificationToast({ productName }: { productName: string }) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % NOTIF_NAMES.length);
        setVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-40 flex max-w-xs items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-foreground">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div>
        <div className="font-semibold text-neutral-800">{NOTIF_NAMES[idx]}</div>
        <div className="text-neutral-500">acabou de comprar {productName}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

function BenefitsCard({ block }: { block: BenefitsBlock }) {
  const Icon = BENEFIT_ICONS[block.icon] ?? CheckCircle2;
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="mb-2 text-xs font-semibold text-neutral-700">Vantagens</div>
      <ul className="space-y-1.5">
        {block.items.filter(Boolean).map((it, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
            <Icon className="h-4 w-4 shrink-0 text-foreground" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimerBar({
  minutes,
  label,
  bg,
  fg,
}: {
  minutes: number;
  label: string;
  bg: string;
  fg: string;
}) {
  const total = Math.max(1, Math.floor(minutes * 60));
  const [left, setLeft] = useState(total);
  useEffect(() => {
    setLeft(total);
    const id = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [total]);
  const h = String(Math.floor(left / 3600)).padStart(2, "0");
  const m = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  return (
    <div
      className="flex items-center justify-center gap-3 py-3 text-sm font-bold"
      style={{ background: bg, color: fg }}
    >
      <span>⏰ {label}</span>
      <span className="rounded-md bg-black/25 px-3 py-1 font-mono tabular-nums">
        {h}:{m}:{s}
      </span>
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold text-neutral-500">{label}</label>
      <input
        placeholder={placeholder}
        readOnly
        className="h-9 w-full rounded-md border border-neutral-200 px-3 text-xs outline-none focus:border-neutral-400"
      />
    </div>
  );
}

function PayOption({ method, active }: { method: CheckoutPaymentMethod; active?: boolean }) {
  const label = PAYMENT_LABELS[method];
  if (method === "pix") {
    return (
      <div
        className={cn(
          "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 bg-white p-2",
          active ? "border-black" : "border-neutral-300",
        )}
      >
        <PixCircleIcon className="h-8 w-8" />
        <div className="text-[11px] font-bold tracking-wide text-black">PIX</div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid place-items-center rounded-md border p-2 text-[11px] font-semibold",
        active ? "border-black text-black" : "border-neutral-200 bg-white text-neutral-700",
      )}
    >
      {label}
    </div>
  );
}

/** Official PIX brand mark (uploaded asset). */
import pixIconAsset from "@/assets/pix-icon.png.asset.json";
export function PixCircleIcon({ className }: { className?: string }) {
  return (
    <img
      src={pixIconAsset.url}
      alt="PIX"
      className={className}
      draggable={false}
    />
  );
}

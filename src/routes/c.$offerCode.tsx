import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Loader2, QrCode, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveProductImageUrl } from "@/lib/product-image";
import { useServerFn } from "@tanstack/react-start";
import {
  createCheckoutPixCharge,
  getCheckoutChargeStatus,
} from "@/lib/public-checkout.functions";
import {
  normalizeConfig,
  PixCircleIcon,
  YoutubeEmbed,
  NotificationToast,
  formatBRL,
  type CheckoutConfig,
  type BenefitIcon,
} from "@/components/checkout-preview";
import { ProductImageBox } from "@/components/product-image-box";
import { CheckoutFooter } from "@/components/checkout-footer";
import { TestimonialCard } from "@/components/testimonial-card";
import {
  CheckCircle2,
  Star,
  Truck,
  Award,
  Zap,
} from "lucide-react";

const BENEFIT_ICONS: Record<BenefitIcon, typeof CheckCircle2> = {
  check: CheckCircle2,
  shield: ShieldCheck,
  star: Star,
  truck: Truck,
  award: Award,
  zap: Zap,
};

export const Route = createFileRoute("/c/$offerCode")({
  head: ({ loaderData }) => {
    const title =
      (loaderData as { product?: { title?: string } } | undefined)?.product?.title ?? "Checkout";
    return {
      meta: [
        { title: `${title} — Checkout` },
        { name: "description", content: `Página de checkout de ${title}.` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  loader: async ({ params }) => {
    const { data: offer, error } = await supabase
      .from("offers")
      .select(
        "id, name, price_cents, status, offer_code, sales_page_url, support_email, product_id",
      )
      .eq("offer_code", params.offerCode)
      .eq("status", "active")
      .maybeSingle();
    if (error || !offer) throw notFound();

    const [{ data: productRows }, { data: settings }] = await Promise.all([
      supabase.rpc("get_public_checkout_product", { _offer_code: params.offerCode }),
      supabase
        .from("checkout_settings")
        .select(
          "logo_url, primary_color, button_color, background_color, title, description, image_url, button_text, show_logo, show_description, show_guarantee, builder_config",
        )
        .eq("offer_id", offer.id)
        .maybeSingle(),
    ]);
    const product = Array.isArray(productRows) ? productRows[0] : null;
    if (!product) throw notFound();

    return { offer, product, settings };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-neutral-100 p-6 text-center">
      <div>
        <div className="text-lg font-semibold">Checkout indisponível</div>
        <p className="mt-1 text-sm text-neutral-500">
          Esta oferta não está mais ativa ou o link está incorreto.
        </p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center bg-neutral-100 p-6 text-center">
      <div className="text-sm text-neutral-500">Não foi possível carregar o checkout.</div>
    </div>
  ),
  component: PublicCheckoutPage,
});

type PixResult = {
  charge_id: string;
  pix_qrcode: string | null;
  pix_expiration_at: string | null;
  amount_cents: number;
};

type LoaderData = {
  offer: {
    id: string;
    name: string;
    price_cents: number;
    status: string;
    offer_code: string;
    sales_page_url: string | null;
    support_email: string | null;
    product_id: string;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    price_cents: number;
  };
  settings: {
    logo_url: string | null;
    primary_color: string | null;
    button_color: string | null;
    background_color: string | null;
    title: string | null;
    description: string | null;
    image_url: string | null;
    button_text: string | null;
    show_logo: boolean | null;
    show_description: boolean | null;
    show_guarantee: boolean | null;
    builder_config: unknown;
  } | null;
};

function PublicCheckoutPage() {
  const { offer, product, settings } = Route.useLoaderData() as LoaderData;
  const createCharge = useServerFn(createCheckoutPixCharge);
  const checkStatus = useServerFn(getCheckoutChargeStatus);

  const builder = useMemo<CheckoutConfig>(
    () => normalizeConfig(settings?.builder_config ?? {}),
    [settings?.builder_config],
  );

  const title = settings?.title || product.title;
  const description = settings?.description ?? product.description;
  const image = settings?.image_url ?? product.image_url;
  const primary = builder.primaryColor || settings?.primary_color || "#0a0a0a";
  const button = builder.buttonColor || settings?.button_color || primary;
  const buttonFg = builder.buttonTextColor || "#ffffff";
  const bg = builder.pageBackground || settings?.background_color || "#f5f5f5";
  const buttonText = builder.buttonText || settings?.button_text || "Pagar com PIX";
  const showBannerDesktop = builder.banner.enabledDesktop && !!builder.banner.desktopUrl;
  const showBannerMobile = builder.banner.enabledMobile && !!builder.banner.mobileUrl;
  const [resolvedBannerDesktop, setResolvedBannerDesktop] = useState<string | null>(null);
  const [resolvedBannerMobile, setResolvedBannerMobile] = useState<string | null>(null);
  const [resolvedImage, setResolvedImage] = useState<string | null>(
    image && /^https?:\/\//i.test(image) ? image : null,
  );
  useEffect(() => {
    let cancelled = false;
    if (!image) {
      setResolvedImage(null);
      return;
    }
    resolveProductImageUrl(image).then((u) => {
      if (!cancelled) setResolvedImage(u);
    });
    return () => {
      cancelled = true;
    };
  }, [image]);
  useEffect(() => {
    let cancelled = false;
    if (showBannerDesktop) {
      resolveProductImageUrl(builder.banner.desktopUrl).then((u) => {
        if (!cancelled) setResolvedBannerDesktop(u);
      });
    } else {
      setResolvedBannerDesktop(null);
    }
    if (showBannerMobile) {
      resolveProductImageUrl(builder.banner.mobileUrl).then((u) => {
        if (!cancelled) setResolvedBannerMobile(u);
      });
    } else {
      setResolvedBannerMobile(null);
    }
    return () => {
      cancelled = true;
    };
  }, [showBannerDesktop, showBannerMobile, builder.banner.desktopUrl, builder.banner.mobileUrl]);
  const price = useMemo(
    () =>
      (offer.price_cents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [offer.price_cents],
  );
  const totalCents =
    offer.price_cents + (builder.orderbump.enabled ? builder.orderbump.priceCents : 0);
  const totalStr = formatBRL(totalCents / 100);
  const BenefitIcon = BENEFIT_ICONS[builder.benefits.icon] ?? CheckCircle2;

  const [form, setForm] = useState({
    name: "",
    email: "",
    emailConfirm: "",
    cpf: "",
    phone: "",
    zip: "",
    address: "",
    number: "",
    complement: "",
    city: "",
    state: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<PixResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);

  const cf = builder.customerForm;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (cf.fullName && !form.name.trim()) {
      toast.error("Informe o nome completo");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Informe o e-mail");
      return;
    }
    if (cf.confirmEmail && form.email.trim() !== form.emailConfirm.trim()) {
      toast.error("Os e-mails não coincidem");
      return;
    }
    if (cf.docType !== "none") {
      const digits = form.cpf.replace(/\D/g, "");
      const okCpf = digits.length === 11;
      const okCnpj = digits.length === 14;
      const valid =
        (cf.docType === "cpf" && okCpf) ||
        (cf.docType === "cnpj" && okCnpj) ||
        (cf.docType === "both" && (okCpf || okCnpj));
      if (!valid) {
        toast.error("Documento inválido");
        return;
      }
    }
    if (cf.requirePhone && !form.phone.trim()) {
      toast.error("Informe o celular");
      return;
    }
    if (cf.requireAddress && (!form.zip.trim() || !form.address.trim())) {
      toast.error("Preencha o endereço");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createCharge({
        data: {
          offer_id: offer.id,
          customer: {
            name: form.name.trim() || form.email.trim(),
            email: form.email.trim(),
            cpf: form.cpf.trim() || "00000000000",
            phone: form.phone.trim() || undefined,
          },
        },
      });
      setPix({
        charge_id: res.charge_id,
        pix_qrcode: res.pix_qrcode,
        pix_expiration_at: res.pix_expiration_at,
        amount_cents: res.amount_cents,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar PIX");
    } finally {
      setSubmitting(false);
    }
  };

  // Poll payment status every 4s while pending.
  useEffect(() => {
    if (!pix || paid) return;
    const tick = async () => {
      try {
        const st = await checkStatus({ data: { charge_id: pix.charge_id } });
        if (st.status === "paid") {
          setPaid(true);
          toast.success("Pagamento confirmado!");
        }
      } catch {
        /* ignore poll errors */
      }
    };
    pollRef.current = window.setInterval(tick, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [pix, paid, checkStatus]);

  const copyPix = async () => {
    if (!pix?.pix_qrcode) return;
    try {
      await navigator.clipboard.writeText(pix.pix_qrcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const qrImageUrl = pix?.pix_qrcode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
        pix.pix_qrcode,
      )}`
    : null;

  const ytUrl = builder.youtube?.url;
  const ytEmbed = ytUrl ? toYtEmbed(ytUrl) : null;
  const ytTop = ytEmbed && builder.youtube?.position !== "bottom";
  const ytBottom = ytEmbed && builder.youtube?.position === "bottom";
  const showDesc =
    builder.showProductDescription !== false && settings?.show_description !== false;

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      {builder.timer.enabled && (
        <LiveTimer
          minutes={builder.timer.minutes}
          label={builder.timer.label}
          bg={builder.timer.bgColor}
          fg={builder.timer.textColor}
        />
      )}
      {showBannerDesktop && resolvedBannerDesktop && (
        <img
          src={resolvedBannerDesktop}
          alt="Banner"
          className="hidden h-auto max-h-56 w-full object-cover md:block"
        />
      )}
      {showBannerMobile && resolvedBannerMobile && (
        <img
          src={resolvedBannerMobile}
          alt="Banner"
          className="block h-auto max-h-72 w-full object-cover md:hidden"
        />
      )}
      {ytTop && <YoutubeEmbed src={ytEmbed!} />}
      <div className="mx-auto grid max-w-4xl gap-4 px-4 py-6 md:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {/* Product card */}
          <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <ProductImageBox
                src={resolvedImage}
                alt={title}
                className="h-16 w-16 rounded"
                iconClassName="h-6 w-6"
                label="Produto"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{title}</div>
                {showDesc && description && (
                  <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{description}</div>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {builder.priceBefore && (
                    <span className="text-[11px] text-neutral-400 line-through">
                      {builder.priceBefore}
                    </span>
                  )}
                  <span className="text-xs font-semibold" style={{ color: primary }}>
                    {totalStr} à vista
                  </span>
                  {builder.discountText && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: primary }}
                    >
                      {builder.discountText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {builder.headerText.enabled && builder.headerText.content && (
            <div
              className={
                "rounded-md px-4 py-3 text-base" +
                (builder.headerText.bold ? " font-bold" : "") +
                (builder.headerText.italic ? " italic" : "")
              }
              style={{
                color: builder.headerText.color,
                background: builder.headerText.highlight || "transparent",
              }}
            >
              {builder.headerText.content}
            </div>
          )}

          {!pix ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Dados */}
              <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4" /> {cf.title || "Seus dados"}
                </div>
                <div className="space-y-2">
                  {cf.fullName && (
                    <PublicField
                      label="Nome completo"
                      placeholder="Nome do comprador"
                      value={form.name}
                      onChange={set("name")}
                      required
                    />
                  )}
                  {cf.confirmEmail ? (
                    <div className="grid grid-cols-2 gap-2">
                      <PublicField
                        label="Email"
                        placeholder="email@email.com"
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        required
                      />
                      <PublicField
                        label="Confirme seu e-mail"
                        placeholder="email@email.com"
                        type="email"
                        value={form.emailConfirm}
                        onChange={set("emailConfirm")}
                        required
                      />
                    </div>
                  ) : (
                    <PublicField
                      label="Email"
                      placeholder="email@email.com"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      required
                    />
                  )}
                  {(cf.docType !== "none" || cf.requirePhone) && (
                    <div className="grid grid-cols-2 gap-2">
                      {cf.docType !== "none" && (
                        <PublicField
                          label={
                            cf.docType === "cnpj"
                              ? "CNPJ"
                              : cf.docType === "both"
                                ? "CPF / CNPJ"
                                : "CPF"
                          }
                          placeholder={
                            cf.docType === "cnpj"
                              ? "00.000.000/0000-00"
                              : "000.000.000-00"
                          }
                          value={form.cpf}
                          onChange={set("cpf")}
                          required
                        />
                      )}
                      {cf.requirePhone && (
                        <PublicField
                          label="Celular"
                          placeholder="+55 (99) 99999-9999"
                          value={form.phone}
                          onChange={set("phone")}
                          required
                        />
                      )}
                    </div>
                  )}
                  {cf.requireAddress && (
                    <div className="space-y-2 rounded-md border border-dashed border-neutral-200 p-2">
                      <div className="text-[10px] font-semibold uppercase text-neutral-500">
                        Endereço
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <PublicField
                          label="CEP"
                          placeholder="00000-000"
                          value={form.zip}
                          onChange={set("zip")}
                        />
                        <div className="col-span-2">
                          <PublicField
                            label="Endereço"
                            placeholder="Rua, avenida..."
                            value={form.address}
                            onChange={set("address")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <PublicField
                          label="Número"
                          placeholder="0"
                          value={form.number}
                          onChange={set("number")}
                        />
                        <div className="col-span-2">
                          <PublicField
                            label="Complemento"
                            placeholder="Apto, bloco..."
                            value={form.complement}
                            onChange={set("complement")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <PublicField
                          label="Cidade"
                          placeholder="Sua cidade"
                          value={form.city}
                          onChange={set("city")}
                        />
                        <PublicField
                          label="Estado"
                          placeholder="UF"
                          value={form.state}
                          onChange={set("state")}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagamento */}
              <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-semibold">Pagamento</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-black bg-white p-2">
                    <PixCircleIcon className="h-8 w-8" />
                    <div className="text-[11px] font-bold tracking-wide text-black">PIX</div>
                  </div>
                </div>
              </div>

              {builder.orderbump.enabled && builder.orderbump.productId && (
                <div className="rounded-md border-2 border-dashed border-amber-400 bg-amber-50 p-4">
                  <div className="text-sm font-bold text-amber-900">
                    {builder.orderbump.headline}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProductImageBox
                      src={builder.orderbump.productImage}
                      alt={builder.orderbump.productTitle}
                      className="h-12 w-12 rounded"
                      iconClassName="h-4 w-4"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-semibold">{builder.orderbump.productTitle}</div>
                      <div className="font-bold" style={{ color: primary }}>
                        + {formatBRL(builder.orderbump.priceCents / 100)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="mb-2 text-sm font-semibold">Resumo do pedido</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{title}</span>
                  <span className="font-semibold">{price}</span>
                </div>
                {builder.orderbump.enabled && builder.orderbump.productId && (
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="truncate text-neutral-600">{builder.orderbump.productTitle}</span>
                    <span className="font-semibold">
                      {formatBRL(builder.orderbump.priceCents / 100)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2 text-sm">
                  <span className="text-neutral-500">Total</span>
                  <span className="font-semibold">{totalStr}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-bold disabled:opacity-60"
                style={{ background: button, color: buttonFg }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Gerando PIX...
                  </>
                ) : (
                  buttonText
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
              {paid ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-foreground">
                    <Check className="h-7 w-7" />
                  </div>
                  <div className="text-lg font-bold text-foreground">Pagamento confirmado!</div>
                  <p className="text-sm text-neutral-500">
                    Você receberá um e-mail com os detalhes da compra em instantes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <QrCode className="h-4 w-4" /> Escaneie o QR Code para pagar
                  </div>
                  {qrImageUrl ? (
                    <div className="grid place-items-center">
                      <img
                        src={qrImageUrl}
                        alt="QR Code PIX"
                        className="rounded border border-neutral-200 bg-white p-2"
                      />
                    </div>
                  ) : (
                    <div className="grid h-40 place-items-center text-xs text-neutral-500">
                      QR Code indisponível
                    </div>
                  )}
                  {pix.pix_qrcode && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-neutral-600">
                        PIX copia e cola
                      </div>
                      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 font-mono text-[11px] break-all text-neutral-700">
                        {pix.pix_qrcode}
                      </div>
                      <button
                        type="button"
                        onClick={copyPix}
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 py-2 text-xs font-semibold hover:bg-neutral-50"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" /> Copiar código PIX
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <Loader2 className="h-3 w-3 animate-spin" /> Aguardando confirmação do
                    pagamento...
                  </div>
                </>
              )}
            </div>
          )}

          <CheckoutFooter />
        </div>

        <aside className="space-y-3">
          {builder.secureBadge.enabled && (
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
              <div
                className="py-2 text-center text-sm font-semibold"
                style={{ background: builder.secureBadge.bgColor, color: builder.secureBadge.textColor }}
              >
                {builder.secureBadge.label || "Compra segura"}
              </div>
              <div className="space-y-2 p-4 text-xs">
                <div className="flex items-center gap-2">
                  <ProductImageBox
                    src={resolvedImage}
                    alt={title}
                    className="h-10 w-10 rounded"
                    iconClassName="h-4 w-4"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{title}</div>
                    <div className="text-neutral-500">Precisa de ajuda?</div>
                  </div>
                </div>
                <div className="border-t border-neutral-100 pt-2">
                  <div className="font-semibold">Total</div>
                  <div style={{ color: primary }}>{totalStr} à vista</div>
                </div>
              </div>
            </div>
          )}

          {builder.benefits.enabled && builder.benefits.items.filter(Boolean).length > 0 && (
            <div className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-xs font-semibold text-neutral-700">Vantagens</div>
              <ul className="space-y-1.5">
                {builder.benefits.items.filter(Boolean).map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                    <BenefitIcon className="h-4 w-4 shrink-0 text-foreground" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {builder.testimonials.enabled && builder.testimonials.items.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-neutral-700">Depoimentos</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {builder.testimonials.items.map((t) => (
                  <TestimonialCard key={t.id} item={t} />
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
      {ytBottom && <YoutubeEmbed src={ytEmbed!} />}
      {builder.notificationsEnabled && <NotificationToast productName={title} />}
    </div>
  );
}

function toYtEmbed(url: string): string | null {
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

function LiveTimer({
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
  const [remaining, setRemaining] = useState(total);
  useEffect(() => {
    setRemaining(total);
    const id = window.setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [total]);
  const m = String(Math.floor(remaining / 60)).padStart(2, "0");
  const s = String(remaining % 60).padStart(2, "0");
  return (
    <div
      className="w-full py-2 text-center text-sm font-semibold"
      style={{ background: bg, color: fg }}
    >
      ⏰ {label} — {m}:{s}
    </div>
  );
}

function PublicField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold text-neutral-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="h-9 w-full rounded-md border border-neutral-200 px-3 text-xs outline-none focus:border-neutral-400"
      />
    </div>
  );
}

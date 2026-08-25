import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Monitor,
  Smartphone,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  Timer,
  MessageSquareQuote,
  ShoppingCart,
  LogOut,
  Rocket,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Bold,
  Italic,
  User,
  ShieldCheck,
  Tag,
  Palette,
  Bell,
  Play,
  ArrowRight,
  Upload,
  X,
} from "lucide-react";

import { toast } from "sonner";
import { resolveProductImageUrl } from "@/lib/product-image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  CheckoutPreview,
  CHECKOUT_STORAGE_KEY,
  DEFAULT_CONFIG,
  formatBRL,
  normalizeConfig,
  type CheckoutConfig,
  type CheckoutPaymentMethod,
  type TestimonialItem,
  type BenefitIcon,
} from "@/components/checkout-preview";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout Builder" },
      { name: "description", content: "Personalize seu checkout com componentes dinâmicos." },
    ],
  }),
  component: CheckoutBuilderPage,
});

type OfferOption = {
  id: string;
  name: string;
  price_cents: number;
  offer_code: string | null;
  product_title: string;
  product_image_url: string | null;
  product_description: string | null;
  payment_methods: CheckoutPaymentMethod[];
};

type ProductOption = {
  id: string;
  title: string;
  image_url: string | null;
  price_cents: number;
};

const uid = () => Math.random().toString(36).slice(2, 10);

type Section =
  | "price"
  | "form"
  | "appearance"
  | "timer"
  | "notifications"
  | "youtube"
  | "redirect";

const SECTIONS: { id: Section; label: string; icon: typeof Type }[] = [
  { id: "price", label: "Preço / Desconto", icon: Tag },
  { id: "form", label: "Campos do formulário", icon: User },
  { id: "appearance", label: "Aparência", icon: Palette },
  { id: "timer", label: "Cronômetro", icon: Timer },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "youtube", label: "Vídeo YouTube", icon: Play },
  { id: "redirect", label: "Redirecionamento", icon: ArrowRight },
];

const BENEFIT_ICON_CHOICES: { value: BenefitIcon; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "shield", label: "Escudo" },
  { value: "star", label: "Estrela" },
  { value: "truck", label: "Entrega" },
  { value: "award", label: "Medalha" },
  { value: "zap", label: "Raio" },
];


function CheckoutBuilderPage() {
  const [config, setConfig] = useState<CheckoutConfig>(DEFAULT_CONFIG);
  const [offers, setOffers] = useState<OfferOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("geral");

  

  const update = (patch: Partial<CheckoutConfig>) => setConfig((c) => ({ ...c, ...patch }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (!cancelled) setLoadingOffers(false);
        return;
      }
      const [{ data: offerData }, { data: productData }] = await Promise.all([
        supabase
          .from("offers")
          .select(
            "id, name, price_cents, offer_code, products!inner(title, description, image_url, user_id), offer_payment_methods(method, enabled)",
          )
          .eq("products.user_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, title, image_url, price_cents")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (offerData) {
        setOffers(
          offerData.map((o: any) => ({
            id: o.id,
            name: o.name,
            price_cents: o.price_cents ?? 0,
            offer_code: o.offer_code ?? null,
            product_title: o.products?.title ?? o.name,
            product_image_url: o.products?.image_url ?? null,
            product_description: o.products?.description ?? null,
            payment_methods: Array.isArray(o.offer_payment_methods)
              ? (o.offer_payment_methods
                  .filter((m: any) => m.enabled)
                  .map((m: any) => m.method) as CheckoutPaymentMethod[])
              : [],
          })),
        );
      }
      if (productData) setProducts(productData as ProductOption[]);
      setLoadingOffers(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectOffer = async (offerId: string) => {
    const o = offers.find((x) => x.id === offerId);
    if (!o) return;
    const methods = o.payment_methods.length > 0 ? o.payment_methods : (["pix"] as CheckoutPaymentMethod[]);

    // Try to load existing saved builder config for this offer
    const { data: existing } = await supabase
      .from("checkout_settings")
      .select("builder_config")
      .eq("offer_id", o.id)
      .maybeSingle();

    const resolvedImage = await resolveProductImageUrl(o.product_image_url);

    const baseFromOffer: Partial<CheckoutConfig> = {
      offerId: o.id,
      offerCode: o.offer_code,
      name: o.product_title,
      productImageUrl: resolvedImage,
      productDescription: o.product_description,
      paymentMethods: methods,
      items: [{ id: uid(), name: o.product_title, price: (o.price_cents ?? 0) / 100 }],
    };

    if (existing?.builder_config && Object.keys(existing.builder_config as object).length > 0) {
      setConfig(normalizeConfig({ ...(existing.builder_config as object), ...baseFromOffer }));
    } else {
      setConfig((c) => ({ ...c, ...baseFromOffer }));
    }
  };

  const checkoutPath = config.offerCode ? `/c/${config.offerCode}` : "/c/preview";
  const checkoutUrl =
    typeof window !== "undefined" ? `${window.location.origin}${checkoutPath}` : checkoutPath;

  const requireOffer = () => {
    if (!config.offerId) {
      toast.error("Selecione um produto/oferta para salvar o checkout.");
      return false;
    }
    return true;
  };

  const persistLocal = () => {
    try {
      localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  };

  const upsertSettings = async (published: boolean) => {
    if (!config.offerId) return false;
    const payload: Record<string, unknown> = {
      offer_id: config.offerId,
      builder_config: config as unknown as object,
      button_color: config.buttonColor,
      button_text: config.buttonText,
      updated_at: new Date().toISOString(),
    };
    if (published) {
      payload.published = true;
      payload.published_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("checkout_settings")
      .upsert(payload as never, { onConflict: "offer_id" });
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!requireOffer()) return;
    setSaving(true);
    persistLocal();
    const ok = await upsertSettings(false);
    setSaving(false);
    if (!ok) return;
    toast.success("Checkout salvo", {
      description: config.offerCode ? `Link: ${checkoutUrl}` : undefined,
    });
  };

  const handlePublish = async () => {
    if (!requireOffer()) return;
    setPublishing(true);
    persistLocal();
    const ok = await upsertSettings(true);
    setPublishing(false);
    if (!ok) return;
    toast.success("Checkout publicado", { description: "Disponível no link do produto." });
    window.open(checkoutPath, "_blank", "noopener,noreferrer");
  };

  const handleOpenFinal = () => {
    persistLocal();
    window.open(checkoutPath, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = () => {
    if (!requireOffer()) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(checkoutUrl).catch(() => undefined);
      toast.success("Link copiado");
    }
  };

  const total = useMemo(
    () => config.items.reduce((s, i) => s + (Number(i.price) || 0), 0),
    [config.items],
  );

  return (
    <div className="flex h-screen w-full flex-col bg-muted/40">
      <div className="flex h-14 flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={config.offerId ?? ""} onValueChange={selectOffer}>
            <SelectTrigger className="h-8 w-64 text-sm">
              <SelectValue
                placeholder={loadingOffers ? "Carregando ofertas..." : "Selecione um produto/oferta"}
              />
            </SelectTrigger>
            <SelectContent>
              {offers.length === 0 && !loadingOffers ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhuma oferta cadastrada.
                </div>
              ) : (
                offers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.product_title} — {formatBRL((o.price_cents ?? 0) / 100)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <div className="flex overflow-hidden rounded-md border border-border">
            <button
              type="button"
              onClick={() => update({ device: "desktop" })}
              className={cn(
                "grid h-8 w-9 place-items-center",
                config.device === "desktop"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground",
              )}
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => update({ device: "mobile" })}
              className={cn(
                "grid h-8 w-9 place-items-center border-l border-border",
                config.device === "mobile"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground",
              )}
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>



          <div className="text-xs text-muted-foreground">Total: {formatBRL(total)}</div>
          {config.offerCode && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-secondary/60 px-2 py-1 text-[11px]">
              <span className="text-muted-foreground">Link:</span>
              <a
                href={checkoutPath}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-foreground hover:underline"
              >
                {checkoutPath}
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                className="ml-1 grid h-5 w-5 place-items-center rounded hover:bg-background"
                title="Copiar link"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            size="sm"
            className="bg-[var(--primary)] text-black hover:bg-[#4fd422]"
            onClick={handlePublish}
            disabled={publishing}
          >
            <Rocket className="mr-1.5 h-4 w-4" /> {publishing ? "Publicando..." : "Publicar"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenFinal}>
            <ExternalLink className="mr-1.5 h-4 w-4" /> Testar checkout
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-neutral-200 bg-white text-neutral-900">
          <SidebarTabs activeTab={activeTab} onChange={setActiveTab} />
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === "geral" && (
              <Accordion type="multiple" defaultValue={["price"]} className="w-full space-y-2">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <AccordionItem
                    key={id}
                    value={id}
                    className="overflow-hidden rounded-md border border-neutral-200 bg-white"
                  >
                    <AccordionTrigger className="px-3 py-3 text-xs font-semibold text-neutral-800 hover:no-underline">
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        {label}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-neutral-200 px-3 pb-4 pt-3">
                      {id === "price" && <PriceDiscountEditor config={config} onUpdate={update} />}
                      {id === "form" && <FormFieldsEditor config={config} onUpdate={update} />}
                      {id === "appearance" && (
                        <AppearanceEditor config={config} onUpdate={update} />
                      )}
                      {id === "timer" && (
                        <SimpleToggleEditor
                          label="Ativar cronômetro"
                          checked={config.timer.enabled}
                          onChange={(v) => update({ timer: { ...config.timer, enabled: v } })}
                        />
                      )}
                      {id === "notifications" && (
                        <SimpleToggleEditor
                          label="Ativar notificações"
                          checked={!!config.notificationsEnabled}
                          onChange={(v) => update({ notificationsEnabled: v })}
                        />
                      )}
                      {id === "youtube" && <YoutubeEditor config={config} onUpdate={update} />}
                      {id === "redirect" && <RedirectEditor config={config} onUpdate={update} />}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
            {activeTab === "recursos" && <RecursosEditor config={config} onUpdate={update} />}
            {activeTab === "templates" && <TemplatesEditor />}
            {activeTab === "social" && <SocialEditor config={config} onUpdate={update} />}
          </div>
          <div className="border-t border-neutral-200 p-3">
            <Button
              className="w-full bg-[var(--primary)] text-white hover:bg-[#4fd422]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar checkout"}
            </Button>
          </div>
        </aside>


        <main className="flex-1 overflow-y-auto bg-neutral-100 p-6">
          <div
            className={cn(
              "mx-auto overflow-hidden rounded-lg bg-white shadow-sm transition-all",
              config.device === "mobile" ? "max-w-sm" : "max-w-4xl",
            )}
          >
            <CheckoutPreview config={config} />
          </div>
        </main>
      </div>
    </div>
  );
}

type SidebarTab = "geral" | "recursos" | "templates" | "social";

const SIDEBAR_TABS: { id: SidebarTab; label: string }[] = [
  { id: "geral", label: "Geral" },
  { id: "recursos", label: "Recursos" },
  { id: "templates", label: "Templates" },
  { id: "social", label: "Social" },
];

function SidebarTabs({
  activeTab,
  onChange,
}: {
  activeTab: SidebarTab;
  onChange: (t: SidebarTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-background px-3 pt-3">
      {SIDEBAR_TABS.map((t) => {
        const active = t.id === activeTab;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "relative px-3 pb-3 pt-1 text-xs font-semibold transition",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}




/* ------------------------------------------------------------ */
/* Editors                                                      */
/* ------------------------------------------------------------ */

type EditorProps = {
  config: CheckoutConfig;
  onUpdate: (patch: Partial<CheckoutConfig>) => void;
};

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
      <span className="text-xs font-semibold">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </label>
  );
}

function TextEditor({ config, onUpdate }: EditorProps) {
  const t = config.headerText;
  const patch = (p: Partial<typeof t>) => onUpdate({ headerText: { ...t, ...p } });
  return (
    <div className="space-y-3">
      <ToggleRow
        label="Título acima dos dados"
        checked={t.enabled}
        onChange={(v) => patch({ enabled: v })}
      />
      <div>
        <Label>Texto</Label>
        <Textarea value={t.content} onChange={(e) => patch({ content: e.target.value })} rows={2} />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => patch({ bold: !t.bold })}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border",
            t.bold ? "border-primary bg-primary/10 text-primary" : "border-border",
          )}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => patch({ italic: !t.italic })}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border",
            t.italic ? "border-primary bg-primary/10 text-primary" : "border-border",
          )}
        >
          <Italic className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Cor do texto</Label>
          <Input type="color" value={t.color} onChange={(e) => patch({ color: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label>Destaque (fundo)</Label>
          <Input
            type="color"
            value={t.highlight || "#ffffff"}
            onChange={(e) => patch({ highlight: e.target.value })}
            className="h-9"
          />
          <button
            type="button"
            className="mt-1 text-[10px] text-muted-foreground underline"
            onClick={() => patch({ highlight: "" })}
          >
            Remover destaque
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerEditor({ config, onUpdate }: EditorProps) {
  const b = config.banner;
  const patch = (p: Partial<typeof b>) => onUpdate({ banner: { ...b, ...p } });
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Envie um banner que aparecerá no topo do checkout. Você pode configurar imagens
        e visibilidade separadamente para desktop e mobile.
      </p>

      <BannerUploadSection
        title="Desktop"
        recommended="Recomendado: 1200 × 300 px (proporção 4:1)"
        aspect="aspect-[4/1]"
        enabled={b.enabledDesktop}
        value={b.desktopUrl}
        onEnabledChange={(v) => patch({ enabledDesktop: v })}
        onValueChange={(v) => patch({ desktopUrl: v })}
      />

      <BannerUploadSection
        title="Mobile"
        recommended="Recomendado: 800 × 400 px (proporção 2:1)"
        aspect="aspect-[2/1]"
        enabled={b.enabledMobile}
        value={b.mobileUrl}
        onEnabledChange={(v) => patch({ enabledMobile: v })}
        onValueChange={(v) => patch({ mobileUrl: v })}
      />
    </div>
  );
}

function BannerUploadSection({
  title,
  recommended,
  aspect,
  enabled,
  value,
  onEnabledChange,
  onValueChange,
}: {
  title: string;
  recommended: string;
  aspect: string;
  enabled: boolean;
  value: string;
  onEnabledChange: (v: boolean) => void;
  onValueChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreview(null);
      return;
    }
    resolveProductImageUrl(value).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? "anon";
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `banners/${userId}/${Date.now()}-${title.toLowerCase()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onValueChange(path);
      toast.success(`Banner ${title.toLowerCase()} enviado`);
    } catch (err) {
      toast.error(`Falha ao enviar banner: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{recommended}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-md border border-dashed border-border bg-muted/40",
          aspect,
        )}
      >
        {preview ? (
          <img src={preview} alt={`Banner ${title}`} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            Nenhum banner enviado
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.currentTarget.value = "";
            }}
          />
          <span
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
          </span>
        </label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onValueChange("")}
          >
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}

function BenefitsEditor({ config, onUpdate }: EditorProps) {
  const b = config.benefits;
  const patch = (p: Partial<typeof b>) => onUpdate({ benefits: { ...b, ...p } });
  const setItem = (i: number, v: string) => {
    const items = [...b.items] as [string, string, string];
    items[i] = v;
    patch({ items });
  };
  return (
    <div className="space-y-3">
      <ToggleRow label="Exibir vantagens" checked={b.enabled} onChange={(v) => patch({ enabled: v })} />
      <div>
        <Label>Ícone</Label>
        <Select value={b.icon} onValueChange={(v) => patch({ icon: v as BenefitIcon })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BENEFIT_ICON_CHOICES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Label>Vantagem {i + 1}</Label>
          <Input value={b.items[i]} onChange={(e) => setItem(i, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function TimerEditor({ config, onUpdate }: EditorProps) {
  const t = config.timer;
  const patch = (p: Partial<typeof t>) => onUpdate({ timer: { ...t, ...p } });
  return (
    <div className="space-y-3">
      <ToggleRow label="Exibir cronômetro" checked={t.enabled} onChange={(v) => patch({ enabled: v })} />
      <div>
        <Label>Texto</Label>
        <Input value={t.label} onChange={(e) => patch({ label: e.target.value })} />
      </div>
      <div>
        <Label>Duração (minutos)</Label>
        <Input
          type="number"
          min={1}
          value={t.minutes}
          onChange={(e) => patch({ minutes: Math.max(1, Number(e.target.value) || 1) })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Cor de fundo</Label>
          <Input type="color" value={t.bgColor} onChange={(e) => patch({ bgColor: e.target.value })} className="h-9" />
        </div>
        <div>
          <Label>Cor do texto</Label>
          <Input type="color" value={t.textColor} onChange={(e) => patch({ textColor: e.target.value })} className="h-9" />
        </div>
      </div>
    </div>
  );
}

function TestimonialsEditor({ config, onUpdate }: EditorProps) {
  const t = config.testimonials;
  const patch = (p: Partial<typeof t>) => onUpdate({ testimonials: { ...t, ...p } });
  const addItem = () =>
    patch({
      items: [
        ...t.items,
        {
          id: uid(),
          author: "Cliente",
          quote: "Adorei o produto!",
          rating: 5,
          avatarUrl: "",
        } as TestimonialItem,
      ],
    });
  const removeItem = (id: string) => patch({ items: t.items.filter((i) => i.id !== id) });
  const patchItem = (id: string, p: Partial<TestimonialItem>) =>
    patch({ items: t.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });

  return (
    <div className="space-y-3">
      <ToggleRow label="Exibir depoimentos" checked={t.enabled} onChange={(v) => patch({ enabled: v })} />
      {t.items.map((it) => (
        <div key={it.id} className="space-y-3 rounded-md border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Depoimento</span>
            <button type="button" onClick={() => removeItem(it.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
          <TestimonialAvatarUpload
            value={it.avatarUrl ?? ""}
            onChange={(v) => patchItem(it.id, { avatarUrl: v })}
          />
          <div>
            <Label>Nome</Label>
            <Input
              value={it.author}
              onChange={(e) => patchItem(it.id, { author: e.target.value })}
              placeholder="Ex.: Fernanda Borges"
            />
          </div>
          <div>
            <Label>Depoimento</Label>
            <Textarea
              value={it.quote}
              onChange={(e) => patchItem(it.id, { quote: e.target.value })}
              rows={3}
              placeholder="O que o cliente achou..."
            />
          </div>
          <div>
            <Label>Estrelas</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={it.rating}
              onChange={(e) =>
                patchItem(it.id, {
                  rating: Math.min(5, Math.max(1, Number(e.target.value) || 5)),
                })
              }
            />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar depoimento
      </Button>
    </div>
  );
}

function TestimonialAvatarUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreview(null);
      return;
    }
    resolveProductImageUrl(value).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? "anon";
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `testimonials/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onChange(path);
      toast.success("Foto enviada");
    } catch (err) {
      toast.error(`Falha ao enviar foto: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-muted-foreground">
        {preview ? (
          <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px]">Foto</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.currentTarget.value = "";
            }}
          />
          <span
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent",
              uploading && "pointer-events-none opacity-60",
            )}
          >
            {uploading ? "Enviando..." : value ? "Trocar foto" : "Enviar foto"}
          </span>
        </label>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onChange("")}
          >
            Remover
          </Button>
        )}
      </div>
    </div>
  );
}

function OrderbumpEditor({
  config,
  onUpdate,
  products,
}: EditorProps & { products: ProductOption[] }) {
  const o = config.orderbump;
  const patch = (p: Partial<typeof o>) => onUpdate({ orderbump: { ...o, ...p } });
  const chooseProduct = async (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const resolved = await resolveProductImageUrl(p.image_url);
    patch({
      productId: p.id,
      productTitle: p.title,
      productImage: resolved,
      priceCents: p.price_cents ?? 0,
    });
  };
  return (
    <div className="space-y-3">
      <ToggleRow label="Exibir orderbump" checked={o.enabled} onChange={(v) => patch({ enabled: v })} />
      <div>
        <Label>Produto</Label>
        <Select value={o.productId ?? ""} onValueChange={chooseProduct}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            {products.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum produto cadastrado.</div>
            ) : (
              products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title} — {formatBRL((p.price_cents ?? 0) / 100)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Chamada</Label>
        <Input value={o.headline} onChange={(e) => patch({ headline: e.target.value })} />
      </div>
    </div>
  );
}

function ColorsEditor({ config, onUpdate }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Texto do botão</Label>
        <Input value={config.buttonText} onChange={(e) => onUpdate({ buttonText: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Cor do botão</Label>
          <Input
            type="color"
            value={config.buttonColor}
            onChange={(e) => onUpdate({ buttonColor: e.target.value })}
            className="h-9"
          />
        </div>
        <div>
          <Label>Cor do texto</Label>
          <Input
            type="color"
            value={config.buttonTextColor}
            onChange={(e) => onUpdate({ buttonTextColor: e.target.value })}
            className="h-9"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Cor destaque (preço)</Label>
          <Input
            type="color"
            value={config.primaryColor}
            onChange={(e) => onUpdate({ primaryColor: e.target.value })}
            className="h-9"
          />
        </div>
        <div>
          <Label>Fundo da página</Label>
          <Input
            type="color"
            value={config.pageBackground}
            onChange={(e) => onUpdate({ pageBackground: e.target.value })}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

function CustomerFormEditor({ config, onUpdate }: EditorProps) {
  const f = config.customerForm;
  const patch = (p: Partial<typeof f>) => onUpdate({ customerForm: { ...f, ...p } });
  return (
    <div className="space-y-3">
      <div>
        <Label>Título da seção</Label>
        <Input value={f.title} onChange={(e) => patch({ title: e.target.value })} />
      </div>
      <ToggleRow
        label="Solicitar nome completo"
        checked={f.fullName}
        onChange={(v) => patch({ fullName: v })}
      />
      <ToggleRow
        label="Confirmar e-mail (2 campos)"
        checked={f.confirmEmail}
        onChange={(v) => patch({ confirmEmail: v })}
      />
      <ToggleRow
        label="Solicitar celular"
        checked={f.requirePhone}
        onChange={(v) => patch({ requirePhone: v })}
      />
      <ToggleRow
        label="Solicitar endereço"
        checked={f.requireAddress}
        onChange={(v) => patch({ requireAddress: v })}
      />
      <div>
        <Label>Documento</Label>
        <Select
          value={f.docType}
          onValueChange={(v) => patch({ docType: v as typeof f.docType })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cpf">Apenas CPF</SelectItem>
            <SelectItem value="cnpj">Apenas CNPJ</SelectItem>
            <SelectItem value="both">CPF ou CNPJ</SelectItem>
            <SelectItem value="none">Não solicitar</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SecureBadgeEditor({ config, onUpdate }: EditorProps) {
  const s = config.secureBadge;
  const patch = (p: Partial<typeof s>) => onUpdate({ secureBadge: { ...s, ...p } });
  return (
    <div className="space-y-3">
      <ToggleRow
        label="Exibir card 'Compra segura'"
        checked={s.enabled}
        onChange={(v) => patch({ enabled: v })}
      />
      <div>
        <Label>Texto</Label>
        <Input value={s.label} onChange={(e) => patch({ label: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Cor de fundo</Label>
          <Input
            type="color"
            value={s.bgColor}
            onChange={(e) => patch({ bgColor: e.target.value })}
            className="h-9"
          />
        </div>
        <div>
          <Label>Cor do texto</Label>
          <Input
            type="color"
            value={s.textColor}
            onChange={(e) => patch({ textColor: e.target.value })}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* New Geral-tab editors (match reference layout)               */
/* ------------------------------------------------------------ */

function DarkLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-medium text-neutral-700">{children}</label>
  );
}

function DarkHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-neutral-500">{children}</p>;
}

function DarkToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2">
      <span className="text-xs text-neutral-900">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorSwatchRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <DarkLabel>{label}</DarkLabel>
      <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border border-neutral-300 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-xs uppercase tracking-wide text-neutral-100 focus:outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-[10px] text-neutral-500">{hint}</p>}
    </div>
  );
}

function PriceDiscountEditor({ config, onUpdate }: EditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <DarkLabel>Preço anterior</DarkLabel>
        <Input
          value={config.priceBefore ?? ""}
          onChange={(e) => onUpdate({ priceBefore: e.target.value })}
          placeholder="R$ 0,00"
          className="border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400"
        />
      </div>
      <div>
        <DarkLabel>Texto de desconto (ex: 50% OFF)</DarkLabel>
        <Input
          value={config.discountText ?? ""}
          onChange={(e) => onUpdate({ discountText: e.target.value })}
          placeholder="50% OFF"
          className="border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400"
        />
      </div>
      <DarkToggleRow
        label="Exibir descrição do produto no checkout"
        checked={!!config.showProductDescription}
        onChange={(v) => onUpdate({ showProductDescription: v })}
      />
    </div>
  );
}

function FormFieldsEditor({ config, onUpdate }: EditorProps) {
  const f = config.customerForm;
  const patch = (p: Partial<typeof f>) => onUpdate({ customerForm: { ...f, ...p } });
  return (
    <div className="space-y-3">
      <DarkHint>
        Escolha quais campos exibir no checkout. E-mail é sempre obrigatório.
      </DarkHint>
      <DarkToggleRow label="Nome" checked={f.fullName} onChange={(v) => patch({ fullName: v })} />
      <DarkToggleRow
        label="CPF"
        checked={f.docType !== "none"}
        onChange={(v) => patch({ docType: v ? "cpf" : "none" })}
      />
      <DarkToggleRow
        label="Telefone (com código do país)"
        checked={f.requirePhone}
        onChange={(v) => patch({ requirePhone: v })}
      />
      <DarkToggleRow
        label="Cupom / desconto"
        checked={!!config.cupomEnabled}
        onChange={(v) => onUpdate({ cupomEnabled: v })}
      />
    </div>
  );
}

function AppearanceEditor({ config, onUpdate }: EditorProps) {
  return (
    <div className="space-y-4">
      <ColorSwatchRow
        label="Cor de fundo"
        value={config.pageBackground}
        onChange={(v) => onUpdate({ pageBackground: v })}
      />
      <ColorSwatchRow
        label="Cor primária"
        value={config.primaryColor}
        onChange={(v) => onUpdate({ primaryColor: v })}
      />
      <ColorSwatchRow
        label="Cor do order bump"
        value={config.orderBumpColor ?? "#158638"}
        onChange={(v) => onUpdate({ orderBumpColor: v })}
        hint='Cor de fundo do bloco "Oferta especial"'
      />
      <div className="space-y-2">
        <DarkLabel>Banner principal</DarkLabel>
        <BannerUploadSection
          title="Banner 1"
          recommended=""
          aspect="aspect-[4/1]"
          enabled={config.banner.enabledDesktop}
          value={config.banner.desktopUrl}
          onEnabledChange={(v) =>
            onUpdate({ banner: { ...config.banner, enabledDesktop: v } })
          }
          onValueChange={(v) =>
            onUpdate({ banner: { ...config.banner, desktopUrl: v } })
          }
        />
        <button
          type="button"
          onClick={() =>
            onUpdate({
              banner: { ...config.banner, enabledDesktop: false, desktopUrl: "" },
            })
          }
          className="text-[11px] text-neutral-400 underline"
        >
          Remover banner
        </button>
      </div>
      <div className="space-y-2">
        <DarkLabel>Banner lateral</DarkLabel>
        <BannerUploadSection
          title="Banner lateral"
          recommended=""
          aspect="aspect-[2/1]"
          enabled={config.banner.enabledMobile}
          value={config.banner.mobileUrl}
          onEnabledChange={(v) =>
            onUpdate({ banner: { ...config.banner, enabledMobile: v } })
          }
          onValueChange={(v) =>
            onUpdate({ banner: { ...config.banner, mobileUrl: v } })
          }
        />
      </div>
    </div>
  );
}

function SimpleToggleEditor({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return <DarkToggleRow label={label} checked={checked} onChange={onChange} />;
}

function YoutubeEditor({ config, onUpdate }: EditorProps) {
  const y = config.youtube ?? { url: "", position: "top" as const };
  const patch = (p: Partial<typeof y>) => onUpdate({ youtube: { ...y, ...p } });
  return (
    <div className="space-y-3">
      <div>
        <DarkLabel>URL do vídeo</DarkLabel>
        <Input
          value={y.url}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
          className="border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400"
        />
      </div>
      <div>
        <DarkLabel>Posição do vídeo</DarkLabel>
        <Select
          value={y.position}
          onValueChange={(v) => patch({ position: v as "top" | "bottom" })}
        >
          <SelectTrigger className="border-neutral-200 bg-white text-neutral-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">No topo da página</SelectItem>
            <SelectItem value="bottom">No final da página</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function RedirectEditor({ config, onUpdate }: EditorProps) {
  const r = config.redirect ?? { url: "", backRedirectEnabled: false };
  const patch = (p: Partial<typeof r>) => onUpdate({ redirect: { ...r, ...p } });
  return (
    <div className="space-y-3">
      <div>
        <DarkLabel>Redirecionar após compra (URL)</DarkLabel>
        <Input
          value={r.url}
          onChange={(e) => patch({ url: e.target.value })}
          placeholder="https://seusite.com/obrigado"
          className="border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400"
        />
      </div>
      <DarkToggleRow
        label="Ativar back redirect"
        checked={r.backRedirectEnabled}
        onChange={(v) => patch({ backRedirectEnabled: v })}
      />
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Recursos tab                                                 */
/* ------------------------------------------------------------ */

function RecursosEditor({ config, onUpdate }: EditorProps) {
  const seo = config.seo ?? { shareTitle: "", shareDescription: "", ogImageUrl: "", faviconUrl: "" };
  const patchSeo = (p: Partial<typeof seo>) => onUpdate({ seo: { ...seo, ...p } });

  return (
    <Accordion type="multiple" defaultValue={["seo"]} className="w-full space-y-2">
      <AccordionItem
        value="seo"
        className="overflow-hidden rounded-md border border-neutral-200 bg-white"
      >
        <AccordionTrigger className="px-3 py-3 text-xs font-semibold text-neutral-800 hover:no-underline">
          <span className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            SEO e Compartilhamento
          </span>
        </AccordionTrigger>
        <AccordionContent className="border-t border-neutral-200 px-3 pb-4 pt-3">
          <div className="space-y-4">
            <div>
              <Label>Título para compartilhamento</Label>
              <Input
                value={seo.shareTitle}
                onChange={(e) => patchSeo({ shareTitle: e.target.value })}
                placeholder="Ex: Nome do produto — Checkout"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Aparece na aba do navegador e ao compartilhar o link (redes sociais).
                Vazio = nome do produto.
              </p>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={seo.shareDescription}
                onChange={(e) => patchSeo({ shareDescription: e.target.value })}
                placeholder="Descrição para redes sociais"
              />
            </div>
            <RecursosUpload
              label="Imagem Open Graph (compartilhamento)"
              hint="Tamanho ideal: 1200 × 630 px"
              value={seo.ogImageUrl}
              onChange={(v) => patchSeo({ ogImageUrl: v })}
              folder="og"
            />
            <RecursosUpload
              label="Favicon"
              hint="Tamanho ideal: 32 × 32 px ou 48 × 48 px (quadrado). Vazio = favicon da plataforma."
              value={seo.faviconUrl}
              onChange={(v) => patchSeo({ faviconUrl: v })}
              folder="favicon"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <SimpleAccordion
        value="footer"
        title="Rodapé do checkout"
        toggleLabel="Ativar rodapé personalizado"
        checked={!!config.footerCustomEnabled}
        onChange={(v) => onUpdate({ footerCustomEnabled: v })}
      />
      <SimpleAccordion
        value="support"
        title="Botão de suporte"
        toggleLabel="Ativar botão de suporte"
        checked={!!config.supportButtonEnabled}
        onChange={(v) => onUpdate({ supportButtonEnabled: v })}
      />
      <SimpleAccordion
        value="exit"
        title="Exit popup"
        toggleLabel="Ativar exit popup"
        checked={!!config.exitPopupEnabled}
        onChange={(v) => onUpdate({ exitPopupEnabled: v })}
      />
    </Accordion>
  );
}

function SimpleAccordion({
  value,
  title,
  toggleLabel,
  checked,
  onChange,
}: {
  value: string;
  title: string;
  toggleLabel: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <AccordionItem
      value={value}
      className="overflow-hidden rounded-md border border-neutral-200 bg-white"
    >
      <AccordionTrigger className="px-3 py-3 text-xs font-semibold text-neutral-800 hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="border-t border-neutral-200 px-3 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-700">{toggleLabel}</span>
          <Switch checked={checked} onCheckedChange={onChange} />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function RecursosUpload({
  label,
  hint,
  value,
  onChange,
  folder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  folder: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreview(null);
      return;
    }
    resolveProductImageUrl(value).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? "anon";
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `checkout-${folder}/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onChange(path);
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error(`Falha no envio: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <p className="mb-2 text-[10px] text-muted-foreground">{hint}</p>
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center transition hover:border-primary/60 hover:bg-neutral-100",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {preview ? (
          <img src={preview} alt="preview" className="max-h-20 rounded object-contain" />
        ) : (
          <ImageIcon className="h-6 w-6 text-neutral-400" />
        )}
        <span className="text-xs font-semibold text-neutral-700">
          {uploading ? "Enviando..." : "Subir imagem"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </label>
      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="mt-1 text-[10px] text-muted-foreground underline"
        >
          Remover
        </button>
      )}
    </div>
  );
}



/* ------------------------------------------------------------ */
/* Templates tab                                                */
/* ------------------------------------------------------------ */

function TemplatesEditor() {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h4 className="text-xs font-semibold text-neutral-800">
          Escolha o template do checkout
        </h4>
        <button
          type="button"
          className="mt-3 w-full rounded-lg border-2 border-primary bg-primary/5 p-4 text-left transition hover:bg-primary/10"
        >
          <div className="text-sm font-semibold text-neutral-900">Original</div>
          <p className="mt-1 text-[11px] text-neutral-600">
            Layout padrão do checkout (resumo, formulário e sidebar).
          </p>
          <span className="mt-3 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
            Em uso
          </span>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ */
/* Social tab — Provas sociais                                  */
/* ------------------------------------------------------------ */

function SocialEditor({ config, onUpdate }: EditorProps) {
  const t = config.testimonials;
  const patch = (p: Partial<typeof t>) => onUpdate({ testimonials: { ...t, ...p } });
  const addItem = () =>
    patch({
      items: [
        ...t.items,
        {
          id: uid(),
          author: "",
          quote: "",
          rating: 5,
          avatarUrl: "",
          verified: false,
          feedbackImageUrl: "",
        } as TestimonialItem,
      ],
      enabled: true,
    });
  const removeItem = (id: string) =>
    patch({ items: t.items.filter((i) => i.id !== id) });
  const patchItem = (id: string, p: Partial<TestimonialItem>) =>
    patch({ items: t.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-neutral-900">
          Provas sociais (avaliações)
        </h4>
        <p className="mt-1 text-[11px] text-primary">
          Adicione depoimentos de clientes para exibir no checkout.
        </p>
      </div>

      {t.items.map((it, idx) => (
        <div
          key={it.id}
          className="space-y-3 rounded-md border border-neutral-800 bg-neutral-900 p-3 text-white"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Avaliação {idx + 1}</span>
            <button
              type="button"
              onClick={() => removeItem(it.id)}
              className="grid h-6 w-6 place-items-center rounded bg-neutral-800 text-white hover:bg-neutral-700"
              aria-label="Remover avaliação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <SocialSquareUpload
            label="Foto do cliente"
            hint="Tamanho ideal: 200x200 px (quadrado)"
            value={it.avatarUrl ?? ""}
            onChange={(v) => patchItem(it.id, { avatarUrl: v })}
            aspect="aspect-square"
          />

          <div className="space-y-1">
            <label className="text-xs font-medium">Autor</label>
            <Input
              value={it.author}
              onChange={(e) => patchItem(it.id, { author: e.target.value })}
              placeholder="Nome"
              className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Descrição</label>
            <Textarea
              rows={3}
              value={it.quote}
              onChange={(e) => patchItem(it.id, { quote: e.target.value })}
              placeholder="Depoimento"
              className="border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Estrelas (1-5)</label>
            <Select
              value={String(it.rating)}
              onValueChange={(v) => patchItem(it.id, { rating: Number(v) })}
            >
              <SelectTrigger className="border-neutral-700 bg-neutral-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Badge cliente verificado</span>
            <Switch
              checked={!!it.verified}
              onCheckedChange={(v) => patchItem(it.id, { verified: v })}
            />
          </div>

          <SocialSquareUpload
            label="Imagem do depoimento (print, feedback)"
            hint="Tamanho ideal: 800x600 px"
            value={it.feedbackImageUrl ?? ""}
            onChange={(v) => patchItem(it.id, { feedbackImageUrl: v })}
            aspect="aspect-[4/3]"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="text-xs font-semibold text-primary hover:underline"
      >
        + Adicionar avaliação
      </button>
    </div>
  );
}

function SocialSquareUpload({
  label,
  hint,
  value,
  onChange,
  aspect,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  aspect: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setPreview(null);
      return;
    }
    resolveProductImageUrl(value).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? "anon";
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `testimonials/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      onChange(path);
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error(`Falha ao enviar imagem: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium">{label}</div>
      <div className="text-[10px] text-neutral-400">{hint}</div>
      <label
        className={cn(
          "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-neutral-600 bg-neutral-800/40 text-neutral-300 transition hover:bg-neutral-800",
          aspect,
        )}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.currentTarget.value = "";
          }}
        />
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="absolute inset-0 h-full w-full rounded-md object-cover"
          />
        ) : (
          <div className="flex items-center gap-2 text-xs">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Enviando..." : "Subir Imagem"}
          </div>
        )}
      </label>
    </div>
  );
}

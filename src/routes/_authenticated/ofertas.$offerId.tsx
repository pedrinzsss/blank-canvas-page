import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Truck,
  ShoppingCart,
  Link2,
  ShoppingBag,
  Ticket,
  Users,
  Globe,
  Radio,
  AlertTriangle,
  Copy,
  ExternalLink,
  Loader2,
  Rocket,
  ImagePlus,
  Save,
  Sun,
  Moon,
  CreditCard,
  Timer,
  Image as ImageIcon,
  Zap,
  Bell,
  Star,
  Upload,
  Trash2,
  Plus,
  Check,
  Phone,
  Heart,
} from "lucide-react";

import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import {
  getCheckoutUrl,
  formatPriceCents,
  parsePriceInput,
} from "@/lib/checkout-url";
import {
  CheckoutView,
  type CheckoutViewData,
} from "@/components/checkout/CheckoutView";

export const Route = createFileRoute("/_authenticated/ofertas/$offerId")({
  component: OfferEditorPage,
});

type Tab =
  | "detalhes"
  | "entrega"
  | "confira"
  | "links"
  | "venda"
  | "cupons"
  | "afiliacao"
  | "dominios"
  | "pixels"
  | "perigo";

const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "detalhes", label: "Detalhes", icon: FileText },
  { key: "entrega", label: "Entrega", icon: Truck },
  { key: "confira", label: "Checkout", icon: ShoppingCart },
  { key: "links", label: "Links", icon: Link2 },
  { key: "venda", label: "Venda adicional", icon: ShoppingBag },
  { key: "cupons", label: "Cupons", icon: Ticket },
  { key: "afiliacao", label: "Afiliação", icon: Users },
  { key: "dominios", label: "Domínios", icon: Globe },
  { key: "pixels", label: "Pixels", icon: Radio },
  { key: "perigo", label: "Zona de Perigo", icon: AlertTriangle },
];


interface OfferRow {
  id: string;
  product_id: string;
  name: string;
  price_cents: number;
  billing_type: "one_time" | "recurring";
  max_installments: number;
  show_interest: boolean;
  status: "draft" | "active" | "inactive";
  checkout_token: string;
  published_at: string | null;
}

interface Settings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  button_color: string;
  background_color: string;
  layout: string;
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
}

interface Tracking {
  meta_pixel_id: string | null;
  meta_access_token: string | null;
  meta_test_event_code: string | null;
  google_ads_conversion_id: string | null;
  google_ads_conversion_label: string | null;
  ga_measurement_id: string | null;
}

interface OrderBump {
  id?: string;
  bump_offer_id: string | null;
  title: string;
  description: string | null;
  price_cents: number;
  enabled: boolean;
}

interface Upsell {
  id?: string;
  upsell_offer_id: string | null;
  enabled: boolean;
}

interface PaymentMethodRow {
  method: "pix" | "credit_card" | "debit_card" | "boleto";
  enabled: boolean;
}

const allMethods: PaymentMethodRow["method"][] = ["pix", "credit_card", "debit_card", "boleto"];
const methodLabels: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
};

function OfferEditorPage() {
  const { offerId } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("detalhes");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [offer, setOffer] = useState<OfferRow | null>(null);
  const [product, setProduct] = useState<{
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
  } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [methods, setMethods] = useState<PaymentMethodRow[]>([]);
  const [tracking, setTracking] = useState<Tracking>({
    meta_pixel_id: "",
    meta_access_token: "",
    meta_test_event_code: "",
    google_ads_conversion_id: "",
    google_ads_conversion_label: "",
    ga_measurement_id: "",
  });
  const [bump, setBump] = useState<OrderBump>({
    bump_offer_id: null,
    title: "",
    description: "",
    price_cents: 0,
    enabled: false,
  });
  const [upsell, setUpsell] = useState<Upsell>({ upsell_offer_id: null, enabled: false });
  const [otherOffers, setOtherOffers] = useState<{ id: string; name: string }[]>([]);
  const [productImgUrl, setProductImgUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: off, error: offErr } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .maybeSingle();
    if (offErr || !off) {
      toast.error(offErr?.message ?? "Oferta não encontrada");
      setLoading(false);
      return;
    }
    setOffer(off as OfferRow);

    const [{ data: prod }, { data: cs }, { data: pm }, { data: ts }, { data: ob }, { data: up }] =
      await Promise.all([
        supabase
          .from("products")
          .select("id, title, description, image_url")
          .eq("id", off.product_id)
          .maybeSingle(),
        supabase.from("checkout_settings").select("*").eq("offer_id", offerId).maybeSingle(),
        supabase.from("offer_payment_methods").select("method, enabled").eq("offer_id", offerId),
        supabase.from("tracking_settings").select("*").eq("offer_id", offerId).maybeSingle(),
        supabase.from("order_bumps").select("*").eq("offer_id", offerId).maybeSingle(),
        supabase.from("upsells").select("*").eq("offer_id", offerId).maybeSingle(),
      ]);

    setProduct(prod ?? null);
    if (prod?.image_url) {
      supabase.storage
        .from("products")
        .createSignedUrl(prod.image_url, 3600)
        .then(({ data }) => data?.signedUrl && setProductImgUrl(data.signedUrl));
    }
    if (cs) {
      setSettings(cs as Settings);
    } else {
      // Create default settings
      const defaults: Settings = {
        logo_url: null,
        primary_color: "#7c3aed",
        secondary_color: "#a855f7",
        button_color: "#7c3aed",
        background_color: "#0b0b12",
        layout: "default",
        title: null,
        description: null,
        image_url: null,
        button_text: "COMPRAR AGORA",
        show_logo: true,
        show_description: true,
        show_guarantee: true,
        show_testimonials: false,
        show_faq: false,
        show_timer: false,
      };
      await supabase.from("checkout_settings").insert({ offer_id: offerId, ...defaults });
      setSettings(defaults);
    }

    // Payment methods — ensure all rows exist
    const existing = new Map((pm ?? []).map((m) => [m.method, m.enabled]));
    const merged: PaymentMethodRow[] = allMethods.map((m) => ({
      method: m,
      enabled: existing.get(m) ?? (m === "pix" || m === "credit_card"),
    }));
    setMethods(merged);
    // Insert missing rows
    const missing = allMethods.filter((m) => !existing.has(m));
    if (missing.length) {
      await supabase.from("offer_payment_methods").insert(
        missing.map((m) => ({
          offer_id: offerId,
          method: m,
          enabled: m === "pix" || m === "credit_card",
        })),
      );
    }

    if (ts) setTracking(ts as Tracking);
    else await supabase.from("tracking_settings").insert({ offer_id: offerId });

    if (ob) setBump(ob as OrderBump);
    if (up) setUpsell(up as Upsell);

    // Other offers of same product for bump/upsell selection
    const { data: siblings } = await supabase
      .from("offers")
      .select("id, name")
      .eq("product_id", off.product_id)
      .neq("id", offerId);
    setOtherOffers(siblings ?? []);

    setLoading(false);
  }, [offerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("checkout_settings")
      .update(settings)
      .eq("offer_id", offerId);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit("checkout_update", { offer_id: offerId });
    toast.success("Personalização salva");
  }

  async function saveMethods(next: PaymentMethodRow[]) {
    setMethods(next);
    for (const m of next) {
      await supabase
        .from("offer_payment_methods")
        .update({ enabled: m.enabled })
        .eq("offer_id", offerId)
        .eq("method", m.method);
    }
    await logAudit("checkout_update", { offer_id: offerId, methods: true });
  }

  async function saveTracking() {
    setSaving(true);
    const { error } = await supabase
      .from("tracking_settings")
      .update(tracking)
      .eq("offer_id", offerId);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit("tracking_update", { offer_id: offerId });
    toast.success("Tracking salvo");
  }

  async function saveBump() {
    setSaving(true);
    const payload = {
      offer_id: offerId,
      bump_offer_id: bump.bump_offer_id,
      title: bump.title || "Oferta especial",
      description: bump.description,
      price_cents: bump.price_cents,
      enabled: bump.enabled,
    };
    if (bump.id) {
      await supabase.from("order_bumps").update(payload).eq("id", bump.id);
    } else {
      const { data } = await supabase.from("order_bumps").insert(payload).select().single();
      if (data) setBump(data as OrderBump);
    }
    setSaving(false);
    await logAudit("order_bump_update", { offer_id: offerId });
    toast.success("Order bump salvo");
  }

  async function saveUpsell() {
    setSaving(true);
    const payload = {
      offer_id: offerId,
      upsell_offer_id: upsell.upsell_offer_id,
      enabled: upsell.enabled,
    };
    if (upsell.id) {
      await supabase.from("upsells").update(payload).eq("id", upsell.id);
    } else {
      const { data } = await supabase.from("upsells").insert(payload).select().single();
      if (data) setUpsell(data as Upsell);
    }
    setSaving(false);
    await logAudit("upsell_update", { offer_id: offerId });
    toast.success("Upsell salvo");
  }

  async function publish() {
    const anyEnabled = methods.some((m) => m.enabled);
    if (!anyEnabled) {
      toast.error("Ative pelo menos um método de pagamento antes de publicar.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("offers")
      .update({ status: "active", published_at: new Date().toISOString() })
      .eq("id", offerId);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit("offer_publish", { offer_id: offerId, token: offer?.checkout_token });
    toast.success("Checkout publicado!");
    await load();
    if (offer?.checkout_token) {
      window.open(getCheckoutUrl(offer.checkout_token), "_blank", "noopener,noreferrer");
    }

  }

  async function deactivate() {
    setSaving(true);
    const { error } = await supabase
      .from("offers")
      .update({ status: "inactive" })
      .eq("id", offerId);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit("offer_deactivate", { offer_id: offerId });
    toast.success("Checkout desativado");
    load();
  }

  const preview: CheckoutViewData | null = useMemo(() => {
    if (!offer || !product || !settings) return null;
    return {
      offer: {
        name: offer.name,
        price_cents: offer.price_cents,
        billing_type: offer.billing_type,
        max_installments: offer.max_installments,
      },
      product: {
        title: product.title,
        description: product.description,
        image_url: productImgUrl,
      },
      settings,
      payment_methods: methods.filter((m) => m.enabled),
      order_bump: bump.enabled && bump.title ? {
        title: bump.title,
        description: bump.description,
        price_cents: bump.price_cents,
      } : null,
    };
  }, [offer, product, settings, methods, bump, productImgUrl]);

  if (loading || !offer || !settings) {
    return (
      <AppShell title="Editor de Checkout">
        <div className="grid place-items-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const checkoutUrl = getCheckoutUrl(offer.checkout_token);

  return (
    <AppShell
      title={offer.name}
      subtitle={product?.title ?? ""}
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() =>
              navigate({ to: "/produtos/$id", params: { id: offer.product_id } })
            }
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o produto
          </Button>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              offer.status === "active"
                ? "bg-foreground/10 text-foreground"
                : offer.status === "inactive"
                  ? "bg-red-500/15 text-red-500"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {offer.status.toUpperCase()}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="flex min-w-max">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold tracking-wide transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={isActive ? { boxShadow: "inset 0 -2px 0 0 hsl(var(--primary))" } : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6">
            {tab === "detalhes" && product && (
              <DetalhesTab
                product={product}
                offer={offer}
                settings={settings}
                setSettings={setSettings}
                onSave={saveSettings}
                saving={saving}
              />
            )}
            {tab === "entrega" && <EntregaTab />}

            {tab === "confira" && (
              <CheckoutTab
                settings={settings}
                setSettings={setSettings}
                methods={methods}
                onMethodsChange={saveMethods}
                bump={bump}
                setBump={setBump}
                otherOffers={otherOffers}
                preview={preview}
                onSave={async () => {
                  await saveSettings();
                  await saveBump();
                }}
                saving={saving}
              />
            )}
            {tab === "links" && (
              <PublishTab
                offer={offer}
                url={checkoutUrl}
                onPublish={publish}
                onDeactivate={deactivate}
                saving={saving}
              />
            )}
            {tab === "venda" && (
              <div className="space-y-8">
                <BumpTab bump={bump} setBump={setBump} otherOffers={otherOffers} onSave={saveBump} saving={saving} />
                <div className="border-t border-border pt-6">
                  <UpsellTab upsell={upsell} setUpsell={setUpsell} otherOffers={otherOffers} onSave={saveUpsell} saving={saving} />
                </div>
              </div>
            )}
            {tab === "cupons" && <PlaceholderTab title="Cupons" message="Crie cupons de desconto para esta oferta. Em breve." />}
            {tab === "afiliacao" && <PlaceholderTab title="Afiliação" message="Configure comissões e afiliados. Em breve." />}
            {tab === "dominios" && <PlaceholderTab title="Domínios" message="Conecte um domínio personalizado ao seu checkout. Em breve." />}
            {tab === "pixels" && (
              <TrackingTab tracking={tracking} setTracking={setTracking} onSave={saveTracking} saving={saving} />
            )}
            {tab === "perigo" && (
              <DangerZoneTab offer={offer} onDeactivate={deactivate} saving={saving} />
            )}
          </div>
        </div>
      </div>

    </AppShell>

  );
}

/* ============================================================
   Tabs
   ============================================================ */

function AparenciaTab({
  settings,
  setSettings,
  onSave,
  saving,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Aparência</h3>
      <div>
        <Label>URL do logo</Label>
        <Input
          value={settings.logo_url ?? ""}
          onChange={(e) => setSettings({ ...settings, logo_url: e.target.value || null })}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ColorInput
          label="Cor principal"
          value={settings.primary_color}
          onChange={(v) => setSettings({ ...settings, primary_color: v })}
        />
        <ColorInput
          label="Cor secundária"
          value={settings.secondary_color}
          onChange={(v) => setSettings({ ...settings, secondary_color: v })}
        />
        <ColorInput
          label="Cor do botão"
          value={settings.button_color}
          onChange={(v) => setSettings({ ...settings, button_color: v })}
        />
        <ColorInput
          label="Cor de fundo"
          value={settings.background_color}
          onChange={(v) => setSettings({ ...settings, background_color: v })}
        />
      </div>
      <div>
        <Label>Layout</Label>
        <Select
          value={settings.layout}
          onValueChange={(v) => setSettings({ ...settings, layout: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Padrão</SelectItem>
            <SelectItem value="minimal">Minimalista</SelectItem>
            <SelectItem value="wide">Amplo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onSave} disabled={saving} style={{ background: "var(--gradient-brand)" }} className="text-white">
        {saving ? "Salvando..." : "Salvar aparência"}
      </Button>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function ConteudoTab({
  settings,
  setSettings,
  onSave,
  saving,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Conteúdo</h3>
      <div>
        <Label>Título</Label>
        <Input
          value={settings.title ?? ""}
          onChange={(e) => setSettings({ ...settings, title: e.target.value || null })}
          placeholder="Título exibido no checkout"
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          rows={4}
          value={settings.description ?? ""}
          onChange={(e) => setSettings({ ...settings, description: e.target.value || null })}
        />
      </div>
      <div>
        <Label>URL da imagem do produto</Label>
        <Input
          value={settings.image_url ?? ""}
          onChange={(e) => setSettings({ ...settings, image_url: e.target.value || null })}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>Texto do botão</Label>
        <Input
          value={settings.button_text}
          onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
        />
      </div>
      <Button onClick={onSave} disabled={saving} style={{ background: "var(--gradient-brand)" }} className="text-white">
        {saving ? "Salvando..." : "Salvar conteúdo"}
      </Button>
    </div>
  );
}

function ElementosTab({
  settings,
  setSettings,
  onSave,
  saving,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const items: { key: keyof Settings; label: string }[] = [
    { key: "show_logo", label: "Logo" },
    { key: "show_description", label: "Descrição" },
    { key: "show_guarantee", label: "Garantia" },
    { key: "show_testimonials", label: "Depoimentos" },
    { key: "show_faq", label: "FAQ" },
    { key: "show_timer", label: "Contador" },
  ];
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-semibold">Elementos</h3>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={String(it.key)} className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>{it.label}</Label>
            <Switch
              checked={Boolean(settings[it.key])}
              onCheckedChange={(v) => setSettings({ ...settings, [it.key]: v })}
            />
          </div>
        ))}
      </div>
      <Button onClick={onSave} disabled={saving} style={{ background: "var(--gradient-brand)" }} className="text-white">
        {saving ? "Salvando..." : "Salvar elementos"}
      </Button>
    </div>
  );
}

function PagamentosTab({
  methods,
  onChange,
}: {
  methods: PaymentMethodRow[];
  onChange: (m: PaymentMethodRow[]) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Métodos de pagamento</h3>
      <p className="text-sm text-muted-foreground">
        Ative ou desative os métodos disponíveis para esta oferta.
      </p>
      <div className="space-y-3">
        {methods.map((m) => (
          <div key={m.method} className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="font-medium">{methodLabels[m.method]}</Label>
            <Switch
              checked={m.enabled}
              onCheckedChange={(v) =>
                onChange(methods.map((x) => (x.method === m.method ? { ...x, enabled: v } : x)))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TrackingTab({
  tracking,
  setTracking,
  onSave,
  saving,
}: {
  tracking: Tracking;
  setTracking: (t: Tracking) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Tracking</h3>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold">Meta Ads</p>
        <Input
          placeholder="Pixel ID"
          value={tracking.meta_pixel_id ?? ""}
          onChange={(e) => setTracking({ ...tracking, meta_pixel_id: e.target.value || null })}
        />
        <Input
          placeholder="Access Token"
          value={tracking.meta_access_token ?? ""}
          onChange={(e) => setTracking({ ...tracking, meta_access_token: e.target.value || null })}
        />
        <Input
          placeholder="Test Event Code"
          value={tracking.meta_test_event_code ?? ""}
          onChange={(e) => setTracking({ ...tracking, meta_test_event_code: e.target.value || null })}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold">Google Ads</p>
        <Input
          placeholder="Conversion ID"
          value={tracking.google_ads_conversion_id ?? ""}
          onChange={(e) => setTracking({ ...tracking, google_ads_conversion_id: e.target.value || null })}
        />
        <Input
          placeholder="Conversion Label"
          value={tracking.google_ads_conversion_label ?? ""}
          onChange={(e) => setTracking({ ...tracking, google_ads_conversion_label: e.target.value || null })}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm font-semibold">Google Analytics</p>
        <Input
          placeholder="Measurement ID"
          value={tracking.ga_measurement_id ?? ""}
          onChange={(e) => setTracking({ ...tracking, ga_measurement_id: e.target.value || null })}
        />
      </div>

      <Button onClick={onSave} disabled={saving} style={{ background: "var(--gradient-brand)" }} className="text-white">
        {saving ? "Salvando..." : "Salvar tracking"}
      </Button>
    </div>
  );
}

function BumpTab({
  bump,
  setBump,
  otherOffers,
  onSave,
  saving,
}: {
  bump: OrderBump;
  setBump: (b: OrderBump) => void;
  otherOffers: { id: string; name: string }[];
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Order Bump</h3>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Ativo</Label>
          <Switch checked={bump.enabled} onCheckedChange={(v) => setBump({ ...bump, enabled: v })} />
        </div>
      </div>
      <div>
        <Label>Oferta vinculada (opcional)</Label>
        <Select
          value={bump.bump_offer_id ?? "none"}
          onValueChange={(v) => setBump({ ...bump, bump_offer_id: v === "none" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar oferta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {otherOffers.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Título</Label>
        <Input value={bump.title} onChange={(e) => setBump({ ...bump, title: e.target.value })} />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea
          rows={3}
          value={bump.description ?? ""}
          onChange={(e) => setBump({ ...bump, description: e.target.value || null })}
        />
      </div>
      <div>
        <Label>Preço</Label>
        <Input
          type="text"
          value={(bump.price_cents / 100).toFixed(2).replace(".", ",")}
          onChange={(e) => setBump({ ...bump, price_cents: parsePriceInput(e.target.value) })}
        />
      </div>
      <Button onClick={onSave} disabled={saving} style={{ background: "var(--gradient-brand)" }} className="text-white">
        {saving ? "Salvando..." : "Salvar order bump"}
      </Button>
    </div>
  );
}

function UpsellTab({
  upsell,
  setUpsell,
  otherOffers,
  onSave,
  saving,
}: {
  upsell: Upsell;
  setUpsell: (u: Upsell) => void;
  otherOffers: { id: string; name: string }[];
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upsell (pós-pagamento)</h3>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Ativo</Label>
          <Switch checked={upsell.enabled} onCheckedChange={(v) => setUpsell({ ...upsell, enabled: v })} />
        </div>
      </div>
      <div>
        <Label>Oferta de upsell</Label>
        <Select
          value={upsell.upsell_offer_id ?? "none"}
          onValueChange={(v) => setUpsell({ ...upsell, upsell_offer_id: v === "none" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecionar oferta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {otherOffers.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        A oferta de upsell é apresentada opcionalmente após o pagamento aprovado.
      </p>
      <Button onClick={onSave} disabled={saving} style={{ background: "var(--gradient-brand)" }} className="text-white">
        {saving ? "Salvando..." : "Salvar upsell"}
      </Button>
    </div>
  );
}

function CheckoutTab({
  settings,
  setSettings,
  methods,
  onMethodsChange,
  bump,
  setBump,
  otherOffers,
  preview,
  onSave,
  saving,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  methods: PaymentMethodRow[];
  onMethodsChange: (m: PaymentMethodRow[]) => void;
  bump: OrderBump;
  setBump: (b: OrderBump) => void;
  otherOffers: { id: string; name: string }[];
  preview: CheckoutViewData | null;
  onSave: () => void;
  saving: boolean;
}) {
  const isDark = (settings.background_color ?? "").toLowerCase() !== "#ffffff" &&
    (settings.background_color ?? "").toLowerCase() !== "#fff" &&
    (settings.background_color ?? "").toLowerCase() < "#888888";

  // Local (presentation-only) state for fields not yet persisted
  const [reqFields, setReqFields] = useState<Record<string, boolean>>({
    name: true, email: true, address: false, phone: true, birthdate: false, cpf: true,
  });
  const [emailConfirm, setEmailConfirm] = useState(false);
  const [timerOn, setTimerOn] = useState(settings.show_timer);
  const [timerMinutes, setTimerMinutes] = useState("15");
  const [timerPhrase, setTimerPhrase] = useState("Oferta por tempo limitado!");
  const [timerExpiredPhrase, setTimerExpiredPhrase] = useState("Oferta encerrada.");
  const [bannerOn, setBannerOn] = useState(Boolean(settings.image_url));
  const [notifOn, setNotifOn] = useState(true);
  const [notifInterval, setNotifInterval] = useState("8");
  const [names, setNames] = useState<string[]>(["Cláudio", "Maria", "Julia", "Pedro", "Ana"]);
  const [newName, setNewName] = useState("");
  const [reviewsOn, setReviewsOn] = useState(settings.show_testimonials);
  const [reviews, setReviews] = useState<Array<{ name: string; rating: number; comment: string }>>([
    { name: "", rating: 5, comment: "" },
  ]);
  const [bumpDiscount, setBumpDiscount] = useState("10");
  const [waOn, setWaOn] = useState(true);
  const [waPhone, setWaPhone] = useState("");
  const [waMessage, setWaMessage] = useState("Olá! Preciso de ajuda com minha compra.");
  const [thankRedirect, setThankRedirect] = useState(false);
  const [thankUrl, setThankUrl] = useState("");

  function toggleField(key: string) {
    setReqFields((r) => ({ ...r, [key]: !r[key] }));
  }

  const fieldButtons: { key: string; label: string }[] = [
    { key: "name", label: "Nome completo" },
    { key: "email", label: "E-mail" },
    { key: "address", label: "Endereço" },
    { key: "phone", label: "Telefone" },
    { key: "birthdate", label: "Data de nascimento" },
    { key: "cpf", label: "CPF" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={saving}
          className="gap-2 bg-primary text-white hover:bg-primary"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar checkout"}
        </Button>
      </div>

      {/* Tema */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          <h3 className="text-base font-semibold">Tema do Checkout</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Escolha se o checkout será exibido no modo claro ou escuro
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSettings({ ...settings, background_color: "#f5f6fa" })}
            className={`rounded-xl border-2 p-4 text-center transition ${
              !isDark ? "border-primary bg-primary" : "border-border"
            }`}
          >
            <div className="mx-auto grid h-20 w-full max-w-[180px] place-items-center rounded-lg border border-border bg-white">
              <Sun className="h-8 w-8 text-amber-500" />
            </div>
            <p className="mt-3 text-sm font-medium">Claro</p>
          </button>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, background_color: "#0b0b12" })}
            className={`rounded-xl border-2 p-4 text-center transition ${
              isDark ? "border-primary bg-primary" : "border-border"
            }`}
          >
            <div className="mx-auto grid h-20 w-full max-w-[180px] place-items-center rounded-lg bg-neutral-900">
              <Moon className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-3 text-sm font-medium">Escuro</p>
          </button>
        </div>
      </section>

      {/* Métodos de Pagamento */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <h3 className="text-base font-semibold">Métodos de Pagamento</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione os meios de pagamento disponíveis no checkout
        </p>
        <div className="space-y-3">
          {[
            { method: "pix" as const, title: "PIX", desc: "Pagamento instantâneo" },
            { method: "credit_card" as const, title: "Cartão de Crédito", desc: "Até 12x" },
            { method: "boleto" as const, title: "Boleto Bancário", desc: "Vencimento em 3 dias" },
          ].map((m) => {
            const cur = methods.find((x) => x.method === m.method);
            const enabled = cur?.enabled ?? false;
            return (
              <label key={m.method} className="flex cursor-pointer items-start gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onMethodsChange(
                      methods.map((x) =>
                        x.method === m.method ? { ...x, enabled: !enabled } : x,
                      ),
                    )
                  }
                  className={`mt-0.5 grid h-6 w-6 place-items-center rounded-md border-2 transition ${
                    enabled ? "border-primary bg-primary text-white" : "border-primary bg-transparent"
                  }`}
                >
                  {enabled && <Check className="h-4 w-4" />}
                </button>
                <div>
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* Campos Obrigatórios */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Campos Obrigatórios</h3>
          <p className="text-xs text-muted-foreground">Dados coletados do comprador</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {fieldButtons.map((f) => {
            const active = reqFields[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleField(f.key)}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-sm font-semibold">Confirmação de e-mail</p>
            <p className="text-xs text-muted-foreground">
              Exige que o comprador digite o e-mail duas vezes
            </p>
          </div>
          <Switch checked={emailConfirm} onCheckedChange={setEmailConfirm} />
        </div>
      </section>

      {/* Contagem Regressiva */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          <h3 className="text-base font-semibold">Contagem Regressiva</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Barra de urgência no topo do checkout
        </p>
        <div className="flex items-center justify-between">
          <Label>Ativar contagem</Label>
          <Switch
            checked={timerOn}
            onCheckedChange={(v) => {
              setTimerOn(v);
              setSettings({ ...settings, show_timer: v });
            }}
          />
        </div>
        {timerOn && (
          <>
            <div>
              <Label>Tempo (minutos)</Label>
              <Input
                type="number"
                min={1}
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
              />
            </div>
            <div>
              <Label>Frase durante a contagem</Label>
              <Input value={timerPhrase} onChange={(e) => setTimerPhrase(e.target.value)} />
            </div>
            <div>
              <Label>Frase após expirar</Label>
              <Input
                value={timerExpiredPhrase}
                onChange={(e) => setTimerExpiredPhrase(e.target.value)}
              />
            </div>
          </>
        )}
      </section>

      {/* Banner do Topo */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          <h3 className="text-base font-semibold">Banner do Topo</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Imagem exibida no topo da página de checkout
        </p>
        <div className="flex items-center justify-between">
          <Label>Ativar banner</Label>
          <Switch checked={bannerOn} onCheckedChange={setBannerOn} />
        </div>
        {bannerOn && (
          <label className="grid cursor-pointer place-items-center gap-3 rounded-lg border-2 border-dashed border-border bg-background/40 py-10 text-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Arraste arquivos aqui ou{" "}
              <span className="font-semibold text-primary">clique para selecionar</span>
            </p>
            <p className="text-xs text-muted-foreground">Máx. 10MB por arquivo</p>
            <input type="file" accept="image/*" className="hidden" />
          </label>
        )}
      </section>

      {/* Customização Visual */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Customização Visual</h3>
          <p className="text-xs text-muted-foreground">
            Configure a aparência do checkout e veja o resultado em tempo real
          </p>
        </div>
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <h4 className="text-sm font-semibold">Cores</h4>
            <p className="text-xs text-muted-foreground">Cores primária e secundária do checkout</p>
          </div>
          <ColorInput
            label="Cor primária"
            value={settings.primary_color}
            onChange={(v) => setSettings({ ...settings, primary_color: v })}
          />
          <ColorInput
            label="Cor secundária"
            value={settings.secondary_color}
            onChange={(v) => setSettings({ ...settings, secondary_color: v })}
          />
        </div>
      </section>

      {/* Botão de Compra */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <div>
            <h3 className="text-base font-semibold">Botão de Compra</h3>
            <p className="text-xs text-muted-foreground">Texto e cores do botão principal</p>
          </div>
        </div>
        <div>
          <Label>Texto do botão</Label>
          <Input
            value={settings.button_text}
            onChange={(e) => setSettings({ ...settings, button_text: e.target.value })}
          />
        </div>
        <ColorInput
          label="Cor de fundo"
          value={settings.button_color}
          onChange={(v) => setSettings({ ...settings, button_color: v })}
        />
      </section>

      {/* Order Bump */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <div>
            <h3 className="text-base font-semibold">Order Bump</h3>
            <p className="text-xs text-muted-foreground">
              Produto adicional sugerido na hora da compra
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Ativar order bump</Label>
          <Switch
            checked={bump.enabled}
            onCheckedChange={(v) => setBump({ ...bump, enabled: v })}
          />
        </div>
        {bump.enabled && (
          <>
            <div>
              <Label>Produto</Label>
              <Select
                value={bump.bump_offer_id ?? "none"}
                onValueChange={(v) =>
                  setBump({ ...bump, bump_offer_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione um produto</SelectItem>
                  {otherOffers.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={bumpDiscount}
                onChange={(e) => setBumpDiscount(e.target.value)}
              />
            </div>
          </>
        )}
      </section>

      {/* Notificações Sociais */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <div>
            <h3 className="text-base font-semibold">Notificações Sociais</h3>
            <p className="text-xs text-muted-foreground">
              Pop-ups como 'Fulano acabou de comprar'
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Ativar notificações</Label>
          <Switch checked={notifOn} onCheckedChange={setNotifOn} />
        </div>
        {notifOn && (
          <>
            <div>
              <Label>Intervalo entre notificações (segundos)</Label>
              <Input
                type="number"
                min={1}
                value={notifInterval}
                onChange={(e) => setNotifInterval(e.target.value)}
              />
            </div>
            <div>
              <Label>Nomes fictícios</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {names.map((n, i) => (
                  <span
                    key={`${n}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm"
                  >
                    {n}
                    <button
                      type="button"
                      onClick={() => setNames(names.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Novo nome"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newName.trim()) {
                      setNames([...names, newName.trim()]);
                      setNewName("");
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Reviews */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          <div>
            <h3 className="text-base font-semibold">Reviews</h3>
            <p className="text-xs text-muted-foreground">
              Depoimentos exibidos na página de checkout
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Ativar reviews</Label>
          <Switch
            checked={reviewsOn}
            onCheckedChange={(v) => {
              setReviewsOn(v);
              setSettings({ ...settings, show_testimonials: v });
            }}
          />
        </div>
        {reviewsOn && (
          <>
            {reviews.map((r, i) => (
              <div key={i} className="relative space-y-3 rounded-lg border border-border p-4">
                <button
                  type="button"
                  onClick={() => setReviews(reviews.filter((_, idx) => idx !== i))}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={r.name}
                    onChange={(e) =>
                      setReviews(
                        reviews.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div>
                  <Label>Nota</Label>
                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setReviews(
                            reviews.map((x, idx) => (idx === i ? { ...x, rating: n } : x)),
                          )
                        }
                      >
                        <Star
                          className={`h-6 w-6 ${
                            n <= r.rating ? "fill-blue-600 text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Comentário</Label>
                  <Textarea
                    rows={3}
                    value={r.comment}
                    onChange={(e) =>
                      setReviews(
                        reviews.map((x, idx) =>
                          idx === i ? { ...x, comment: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() =>
                setReviews([...reviews, { name: "", rating: 5, comment: "" }])
              }
            >
              <Plus className="h-4 w-4" />
              Adicionar review
            </Button>
          </>
        )}
      </section>

      {/* WhatsApp Flutuante */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          <div>
            <h3 className="text-base font-semibold">WhatsApp Flutuante</h3>
            <p className="text-xs text-muted-foreground">
              Ícone do WhatsApp no canto inferior do checkout
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label>Ativar WhatsApp</Label>
          <Switch checked={waOn} onCheckedChange={setWaOn} />
        </div>
        {waOn && (
          <>
            <div>
              <Label>Número (com DDD)</Label>
              <Input
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <Label>Mensagem padrão</Label>
              <Input
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                maxLength={200}
              />
            </div>
          </>
        )}
      </section>

      {/* Página de Obrigado */}
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          <div>
            <h3 className="text-base font-semibold">Página de Obrigado</h3>
            <p className="text-xs text-muted-foreground">
              Personalize a página exibida após a compra
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Redirecionar para URL externa</p>
            <p className="text-xs text-muted-foreground">
              Se desativado, será exibida a página de obrigado padrão da plataforma
            </p>
          </div>
          <Switch checked={thankRedirect} onCheckedChange={setThankRedirect} />
        </div>
        {thankRedirect && (
          <div>
            <Label>URL de redirecionamento</Label>
            <Input
              type="url"
              value={thankUrl}
              onChange={(e) => setThankUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Após a compra ser aprovada, o comprador será redirecionado automaticamente para esta URL.
            </p>
          </div>
        )}
      </section>

      {/* Preview */}
      {preview && (
        <section className="space-y-3 rounded-xl border border-border p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Preview
          </h3>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="max-h-[720px] overflow-y-auto">
              <CheckoutView
                data={{
                  ...preview,
                  extras: {
                    timer: {
                      enabled: timerOn,
                      minutes: Math.max(1, Number(timerMinutes) || 15),
                      phrase: timerPhrase,
                      expiredPhrase: timerExpiredPhrase,
                    },
                    banner: { enabled: bannerOn, image_url: settings.image_url },
                    reqFields: {
                      name: !!reqFields.name,
                      email: !!reqFields.email,
                      address: !!reqFields.address,
                      phone: !!reqFields.phone,
                      birthdate: !!reqFields.birthdate,
                      cpf: !!reqFields.cpf,
                    },
                    reviews: { enabled: reviewsOn, items: reviews },
                    notifications: {
                      enabled: notifOn,
                      names,
                      intervalSec: Math.max(2, Number(notifInterval) || 8),
                    },
                    whatsapp: { enabled: waOn, phone: waPhone, message: waMessage },
                    bumpDiscountPercent: Math.max(0, Number(bumpDiscount) || 0),
                  },
                }}
              />
            </div>
          </div>
        </section>
      )}


      <div className="flex justify-end">
        <Button
          onClick={onSave}
          disabled={saving}
          className="gap-2 bg-primary text-white hover:bg-primary"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar checkout"}
        </Button>
      </div>
    </div>
  );
}

function PublishTab({
  offer,
  url,
  onPublish,
  onDeactivate,
  saving,
}: {
  offer: OfferRow;
  url: string;
  onPublish: () => void;
  onDeactivate: () => void;
  saving: boolean;
}) {
  const published = offer.status === "active";

  function copy() {
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Publicar checkout</h3>

      {published ? (
        <div className="space-y-4 rounded-lg border border-border bg-foreground/10 p-5">
          <p className="text-sm font-semibold text-foreground">CHECKOUT PUBLICADO COM SUCESSO</p>
          <div className="rounded-md bg-background px-3 py-2 font-mono text-sm break-all">{url}</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={copy}>
              <Copy className="h-4 w-4" /> Copiar link
            </Button>
            <Button size="sm" variant="outline" className="gap-2" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Abrir checkout
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={onDeactivate}
              disabled={saving}
            >
              Desativar checkout
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ao publicar, o checkout ficará disponível publicamente em <br />
            <code className="break-all text-foreground">{url}</code>.
          </p>
          <ul className="ml-4 list-disc text-sm text-muted-foreground">
            <li>Pelo menos um método de pagamento ativo</li>
            <li>Configurações de aparência e conteúdo salvas</li>
          </ul>
          <Button
            onClick={onPublish}
            disabled={saving}
            className="gap-2 text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Rocket className="h-4 w-4" />
            {saving ? "Publicando..." : "Publicar checkout"}
          </Button>
        </div>
      )}

      <div>
        <Link
          to="/produtos/$id"
          params={{ id: offer.product_id }}
          className="text-sm text-primary hover:underline"
        >
          ← Voltar ao produto
        </Link>
      </div>
    </div>
  );
}

function DetalhesTab({
  product,
  offer,
  settings,
  setSettings,
  onSave,
  saving,
}: {
  product: { id: string; title: string; description: string | null; image_url: string | null };
  offer: OfferRow;
  settings: Settings;
  setSettings: (s: Settings) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(product.title);
  const [shortDesc, setShortDesc] = useState(product.description ?? "");
  const [fullDesc, setFullDesc] = useState(settings.description ?? "");
  const [price, setPrice] = useState((offer.price_cents / 100).toFixed(2).replace(".", ","));
  const [warranty, setWarranty] = useState<string>("30");
  const [status, setStatus] = useState<string>(offer.status);
  const [savingBasics, setSavingBasics] = useState(false);

  async function saveBasics() {
    setSavingBasics(true);
    try {
      const { error: pErr } = await supabase
        .from("products")
        .update({ title: name.trim(), description: shortDesc.trim() || null })
        .eq("id", product.id);
      if (pErr) throw pErr;

      const priceCents = parsePriceInput(price);
      const { error: oErr } = await supabase
        .from("offers")
        .update({ price_cents: priceCents, status: status as OfferRow["status"] })
        .eq("id", offer.id);
      if (oErr) throw oErr;

      setSettings({ ...settings, description: fullDesc || null });
      onSave();
      toast.success("Detalhes salvos");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingBasics(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Informações Básicas</h3>
          <p className="text-xs text-muted-foreground">Nome, descrição e tipo do produto</p>
        </div>
        <div>
          <Label>Nome do produto</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Descrição</Label>
          <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} />
        </div>
        <div>
          <Label>Descrição completa</Label>
          <Textarea rows={4} value={fullDesc} onChange={(e) => setFullDesc(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <Input value="Produto" disabled />
            <p className="mt-1 text-xs text-muted-foreground">
              O tipo de produto não pode ser alterado após a criação.
            </p>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Imagem do Produto</h3>
          <p className="text-xs text-muted-foreground">Miniatura exibida na vitrine e checkout</p>
        </div>
        <label className="grid cursor-pointer place-items-center gap-3 rounded-lg border border-dashed border-border bg-background/40 py-10 text-center">
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arraste uma imagem ou clique para fazer upload
          </p>
          <span className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground">
            imagem
          </span>
          <input type="file" accept="image/*" className="hidden" />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Preço e Garantia</h3>
          <p className="text-xs text-muted-foreground">Configurações de valor e garantia</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Preço</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="R$ 0,00" />
          </div>
          <div>
            <Label>Garantia (dias)</Label>
            <Input
              type="number"
              min={0}
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          onClick={saveBasics}
          disabled={savingBasics || saving}
          className="text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          {savingBasics ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

function PlaceholderTab({ title, message }: { title: string; message: string }) {
  return (
    <div className="grid min-h-[280px] place-items-center text-center">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function DangerZoneTab({
  offer,
  onDeactivate,
  saving,
}: {
  offer: OfferRow;
  onDeactivate: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="text-lg font-semibold text-destructive">Zona de Perigo</h3>
      </div>
      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm font-semibold">Desativar oferta</p>
        <p className="text-xs text-muted-foreground">
          A oferta ficará indisponível para novos compradores. Você pode reativá-la depois.
        </p>
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={onDeactivate}
          disabled={saving || offer.status !== "active"}
        >
          Desativar oferta
        </Button>
      </div>
    </div>
  );
}

function EntregaTab() {
  const [method, setMethod] = useState("correios");
  const [prepDays, setPrepDays] = useState("2");
  const [sendTracking, setSendTracking] = useState(true);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  function save() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Configurações de entrega salvas");
    }, 400);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Configurações de envio</h3>
          <p className="text-xs text-muted-foreground">Configure como o produto físico será enviado</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Método de envio</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="correios">Correios</SelectItem>
                <SelectItem value="transportadora">Transportadora</SelectItem>
                <SelectItem value="retirada">Retirada no local</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prazo de preparo (dias)</Label>
            <Input
              type="number"
              min={0}
              value={prepDays}
              onChange={(e) => setPrepDays(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label>Código de rastreio</Label>
            <p className="text-xs text-muted-foreground">
              Enviar código de rastreamento por e-mail ao cliente.
            </p>
          </div>
          <Switch checked={sendTracking} onCheckedChange={setSendTracking} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-border p-5">
        <div>
          <h3 className="text-base font-semibold">Dados do produto</h3>
          <p className="text-xs text-muted-foreground">Informações para cálculo de frete</p>
        </div>

        <div>
          <Label>Peso (kg)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0,00"
          />
        </div>

        <div>
          <Label>Dimensões (cm)</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="Comprimento"
            />
            <Input
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="Largura"
            />
            <Input
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Altura"
            />
          </div>
        </div>

        <div>
          <Label>Instruções de envio</Label>
          <Textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Observações para a expedição (ex.: embalar com plástico bolha)"
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          className="text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          {saving ? "Salvando..." : "Salvar entrega"}
        </Button>
      </div>
    </div>
  );
}



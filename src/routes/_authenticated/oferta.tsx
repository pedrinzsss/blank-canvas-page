import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  Barcode,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  GitBranch,
  Home,
  ImagePlus,
  Info,
  Layout,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Plus,
  QrCode,
  Send,
  Share2,
  Smartphone,
  Tag,
  Trash2,
  UploadCloud,
  Users,
  Zap,
} from "lucide-react";


import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { resolveProductImageUrl } from "@/lib/product-image";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  productId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/oferta")({
  validateSearch: searchSchema,
  component: CriarOfertaPage,
});

type TabKey =
  | "geral"
  | "configuracoes"
  | "order-bump"
  | "upsell"
  | "checkout"
  | "coproducao"
  | "cupons"
  | "afiliados"
  | "links"
  | "arquivos"
  | "area-membros"
  | "funil-vendas"
  | "pixels";

type NavItem = {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  alert?: boolean;
};

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Geral",
    items: [
      { key: "geral", label: "Informações", icon: Home },
      { key: "configuracoes", label: "Ofertas", icon: Tag, alert: true },
    ],
  },
];


const CATEGORIES = [
  "Apps & Software",
  "Cursos e Ebooks",
  "Serviços",
  "Físico",
  "Outros",
];

const GUARANTEES = ["7 dias", "15 dias", "30 dias", "60 dias"];

function parsePriceToCents(v: string): number | null {
  const cleaned = v.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function CriarOfertaPage() {
  const navigate = useNavigate();
  const { productId } = Route.useSearch();

  const [tab, setTab] = useState<TabKey>("geral");
  const [productDbId, setProductDbId] = useState<string | null>(productId ?? null);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Geral fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentType, setPaymentType] = useState<"unico" | "recorrente">("unico");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [guarantee, setGuarantee] = useState(GUARANTEES[0]);
  const [price, setPrice] = useState("");
  const [salesUrl, setSalesUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [producerName, setProducerName] = useState("");


  // Load existing product when editing
  const loadProduct = useCallback(async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        "title, description, category, image_url, payment_type, refund_deadline_days, price_cents, sales_page_url, support_email, invoice_name",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      setTitle(data.title ?? "");
      setDescription(data.description ?? "");
      setCategory(data.category ?? CATEGORIES[0]);
      setImagePath(data.image_url);
      setImageUrl(await resolveProductImageUrl(data.image_url));
      setPaymentType((data.payment_type as "unico" | "recorrente") ?? "unico");
      setGuarantee(`${data.refund_deadline_days ?? 7} dias`);
      if (data.price_cents)
        setPrice((data.price_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
      setSalesUrl(data.sales_page_url ?? "");
      setSupportEmail(data.support_email ?? "");
      setProducerName(data.invoice_name ?? "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (productId) loadProduct(productId);
  }, [productId, loadProduct]);

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem máxima de 10MB");
      return;
    }
    setUploadingImage(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      toast.error("Sessão expirada");
      setUploadingImage(false);
      return;
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userRes.user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast.error(upErr.message);
      setUploadingImage(false);
      return;
    }
    setImagePath(path);
    setImageUrl(await resolveProductImageUrl(path));
    setUploadingImage(false);
  }

  async function handleSave() {
    if (!title.trim()) return toast.error("Informe o nome do produto");
    const priceCents = parsePriceToCents(price);
    if (!priceCents) return toast.error("Informe um preço válido");

    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      toast.error("Sessão expirada");
      setSaving(false);
      return;
    }
    const refundDays = Number(guarantee.replace(/\D/g, "")) || 7;
    const payload = {
      user_id: userRes.user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      image_url: imagePath,
      product_type: "outro",
      payment_type: paymentType,
      delivery_type: "area_membros",
      refund_deadline_days: refundDays,
      price_cents: priceCents,
      first_charge_price_cents: priceCents,
      recurrence_price_cents: paymentType === "recorrente" ? priceCents : 0,
      sales_page_url: salesUrl.trim() || null,
      support_email: supportEmail.trim() || null,
      invoice_name: producerName.trim() || null,
    };

    if (productDbId) {
      const { error } = await supabase.from("products").update(payload).eq("id", productDbId);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      await logAudit("product_update", { product_id: productDbId, title: payload.title });
      toast.success("Produto atualizado");
      setListRefreshKey((k) => k + 1);
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Erro ao criar produto");
        setSaving(false);
        return;
      }
      const offerCode = Array.from({ length: 8 }, () =>
        "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 33)),
      ).join("");
      await supabase.from("offers").insert({
        product_id: data.id,
        name: payload.title,
        price_cents: priceCents,
        currency: "BRL",
        checkout_language: "pt-BR",
        offer_type: "nacional",
        status: "active",
        offer_code: offerCode,
      });
      await logAudit("product_create", { product_id: data.id, title: payload.title });
      setProductDbId(data.id);
      toast.success("Produto criado — continue a configuração");
      setListRefreshKey((k) => k + 1);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!productDbId) return;
    if (!confirm("Excluir este produto?")) return;
    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", productDbId);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Produto excluído");
    navigate({ to: "/produtos" });
  }

  const disabledForNew = !productDbId;

  return (
    <AppShell title="Criar Produto" subtitle="Cadastre seu produto em etapas">
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/produtos" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <div className="space-y-5">


          {/* Main content */}
          <div className="space-y-5">

            {/* Product header card */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-foreground">
                      Ativo
                    </span>
                    <h2 className="truncate text-base font-semibold">
                      {title || "Nome Do Produto"}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Tipo: Outro
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  * As atualizações podem levar até 1 minuto para serem aplicadas no checkout
                </p>
              </div>
            </div>

            {/* Tab content card */}
            <div className="rounded-2xl border border-border bg-card">
              <div className="p-6">
                {loading ? (
                  <div className="grid place-items-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    <GeralTab
                      title={title}
                      setTitle={setTitle}
                      description={description}
                      setDescription={setDescription}
                      category={category}
                      setCategory={setCategory}
                      paymentType={paymentType}
                      setPaymentType={setPaymentType}
                      imageUrl={imageUrl}
                      uploadingImage={uploadingImage}
                      onPickImage={() => fileRef.current?.click()}
                      guarantee={guarantee}
                      setGuarantee={setGuarantee}
                      price={price}
                      setPrice={setPrice}
                      salesUrl={salesUrl}
                      setSalesUrl={setSalesUrl}
                      supportEmail={supportEmail}
                      setSupportEmail={setSupportEmail}
                      supportWhatsapp={supportWhatsapp}
                      setSupportWhatsapp={setSupportWhatsapp}
                      producerName={producerName}
                      setProducerName={setProducerName}
                    />
                    {productDbId && (
                      <div className="border-t border-border pt-8">
                        <OfertasTab productId={productDbId} />
                      </div>
                    )}
                  </div>
                )}


                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Footer actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/60 px-6 py-4">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={!productDbId || deleting}
                >
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Excluir Produto
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </div>
            </div>

            <ProductsListCard
              refreshKey={listRefreshKey}
              currentProductId={productDbId}
              onEdit={(id) => {
                navigate({ to: "/oferta", search: { productId: id } });
              }}
              onChanged={() => setListRefreshKey((k) => k + 1)}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}


/* ---------- Geral tab ---------- */

interface GeralProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  paymentType: "unico" | "recorrente";
  setPaymentType: (v: "unico" | "recorrente") => void;
  imageUrl: string | null;
  uploadingImage: boolean;
  onPickImage: () => void;
  guarantee: string;
  setGuarantee: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
  salesUrl: string;
  setSalesUrl: (v: string) => void;
  supportEmail: string;
  setSupportEmail: (v: string) => void;
  supportWhatsapp: string;
  setSupportWhatsapp: (v: string) => void;
  producerName: string;
  setProducerName: (v: string) => void;
}

function GeralTab(props: GeralProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      {/* Upload dropzone */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={props.onPickImage}
          className="group flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border-2 border-dashed border-border bg-background/40 p-6 text-center transition-colors hover:border-primary"
        >
          {props.uploadingImage ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : props.imageUrl ? (
            <img
              src={props.imageUrl}
              alt=""
              className="max-h-full max-w-full rounded-md object-contain"
            />
          ) : (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-primary">Clique para enviar</span> ou arraste até aqui
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Apenas arquivos png, jpeg, jpg, webp e gif são aceitos
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  O tamanho máximo é 30MB
                </p>
              </div>
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground">
          A imagem escolhida deve estar no formato JPG ou PNG e ter no máximo 10 MB de tamanho. Dimensões ideais: 600x600 pixels.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <Field label="Nome do produto *">
          <Input
            value={props.title}
            onChange={(e) => props.setTitle(e.target.value)}
            placeholder="Nome Do Produto"
            maxLength={120}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Esse nome será exibido na empresa para os clientes
          </p>
        </Field>

        <Field label="Descrição do produto">
          <Textarea
            value={props.description}
            onChange={(e) => props.setDescription(e.target.value)}
            rows={3}
            placeholder="Fale sobre o que se trata seu produto, o que ele faz e como ele pode ajudar o cliente."
            maxLength={500}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Fale sobre o que se trata seu produto, o que ele faz e como ele pode ajudar o cliente.
          </p>
        </Field>

        <Field label="Nome da fatura">
          <Input
            value={props.producerName}
            onChange={(e) => props.setProducerName(e.target.value)}
            placeholder="Nome exibido na fatura"
            maxLength={10}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Informe o nome que aparecerá na fatura do cliente. (Máximo 10 caracteres). Não utilize caracteres especiais.
          </p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria do produto *">
            <Select value={props.category} onValueChange={props.setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Prazo de reembolso (garantia) *">
            <Select value={props.guarantee} onValueChange={props.setGuarantee}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GUARANTEES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g} {g === GUARANTEES[0] ? "(prazo mínimo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Página de vendas ou rede social">
          <Input
            value={props.salesUrl}
            onChange={(e) => props.setSalesUrl(e.target.value)}
            placeholder="https://"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Informe o endereço completo da página de vendas desse produto.
          </p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-mail de suporte">
            <Input
              type="email"
              value={props.supportEmail}
              onChange={(e) => props.setSupportEmail(e.target.value)}
              placeholder="suporte@dominio.com"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Este e-mail será exibido na página de checkout.
            </p>
          </Field>

          <Field label="Whatsapp de suporte">
            <Input
              value={props.supportWhatsapp}
              onChange={(e) => props.setSupportWhatsapp(e.target.value)}
              placeholder="(00) 00000-0000"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Este número será exibido na sessão de pedido confirmado
            </p>
          </Field>
        </div>

        <Field label="Preço (R$)">
          <Input
            inputMode="decimal"
            value={props.price}
            onChange={(e) => props.setPrice(e.target.value)}
            placeholder="29,90"
          />
        </Field>

        <Field label="Tipo de pagamento">
          <Select
            value={props.paymentType}
            onValueChange={(v) => props.setPaymentType(v as "unico" | "recorrente")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unico">Único</SelectItem>
              <SelectItem value="recorrente">Recorrente</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}


function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 border-b border-border pb-8 last:border-b-0 last:pb-0 md:grid-cols-[220px_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-background/60 py-16 text-center">
      <div>
        <div className="text-base font-semibold">{label}</div>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Esta etapa será liberada após salvar o produto. Preencha a aba Geral e clique em
          Salvar Produto para continuar.
        </p>
      </div>
    </div>
  );
}

/* ----------------- Order Bump ----------------- */

type OrderBumpRow = {
  id: string;
  offer_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  enabled: boolean;
  image_url: string | null;
  display_rule: "always" | "min_total" | "payment_method";
  min_total_cents: number | null;
  payment_methods: string[];
  position: number;
};

const PAYMENT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "boleto", label: "Boleto" },
];

function OrderBumpTab({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(true);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [bumps, setBumps] = useState<OrderBumpRow[]>([]);
  const [editing, setEditing] = useState<OrderBumpRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: offer } = await supabase
      .from("offers")
      .select("id")
      .eq("product_id", productId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!offer) {
      setLoading(false);
      return;
    }
    setOfferId(offer.id);
    const { data, error } = await supabase
      .from("order_bumps")
      .select(
        "id, offer_id, title, description, price_cents, enabled, image_url, display_rule, min_total_cents, payment_methods, position",
      )
      .eq("offer_id", offer.id)
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setBumps((data ?? []) as OrderBumpRow[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const newBump = (): OrderBumpRow => ({
    id: "",
    offer_id: offerId ?? "",
    title: "",
    description: "",
    price_cents: 0,
    enabled: true,
    image_url: null,
    display_rule: "always",
    min_total_cents: null,
    payment_methods: [],
    position: bumps.length,
  });

  async function toggleEnabled(row: OrderBumpRow) {
    const { error } = await supabase
      .from("order_bumps")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setBumps((prev) => prev.map((b) => (b.id === row.id ? { ...b, enabled: !b.enabled } : b)));
  }

  async function remove(row: OrderBumpRow) {
    if (!confirm(`Excluir order bump "${row.title}"?`)) return;
    const { error } = await supabase.from("order_bumps").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Order bump removido");
    setBumps((prev) => prev.filter((b) => b.id !== row.id));
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!offerId) {
    return <PlaceholderTab label="Order Bump" />;
  }

  if (editing) {
    return (
      <OrderBumpForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">Order Bumps</div>
          <p className="text-sm text-muted-foreground">
            Itens adicionais oferecidos na tela de checkout. Configure preço e regras de exibição.
          </p>
        </div>
        <Button onClick={() => setEditing(newBump())} className="gap-2">
          <Plus className="h-4 w-4" /> Novo order bump
        </Button>
      </div>

      {bumps.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border bg-background/60 py-16 text-center">
          <div>
            <div className="text-sm font-semibold">Nenhum order bump configurado</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Crie um item adicional que aparecerá no checkout deste produto.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {bumps.map((b) => (
            <div key={b.id} className="flex items-center gap-4 p-4">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {b.image_url ? (
                  <img src={b.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[10px] text-muted-foreground">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{b.title}</div>
                <div className="text-xs text-muted-foreground">
                  R$ {(b.price_cents / 100).toFixed(2).replace(".", ",")} · {ruleLabel(b)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleEnabled(b)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition",
                  b.enabled ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700",
                )}
                aria-pressed={b.enabled}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                    b.enabled ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </button>
              <Button variant="outline" size="sm" onClick={() => setEditing(b)}>
                Editar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(b)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ruleLabel(b: OrderBumpRow) {
  if (b.display_rule === "min_total") {
    const v = (b.min_total_cents ?? 0) / 100;
    return `Exibir se total ≥ R$ ${v.toFixed(2).replace(".", ",")}`;
  }
  if (b.display_rule === "payment_method") {
    const labels = b.payment_methods
      .map((m) => PAYMENT_METHOD_OPTIONS.find((o) => o.value === m)?.label ?? m)
      .join(", ");
    return `Somente em: ${labels || "—"}`;
  }
  return "Sempre exibir";
}

function OrderBumpForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: OrderBumpRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [price, setPrice] = useState(
    initial.price_cents ? (initial.price_cents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [imageUrl, setImageUrl] = useState<string | null>(initial.image_url);
  const [uploading, setUploading] = useState(false);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [displayRule, setDisplayRule] = useState(initial.display_rule);
  const [minTotal, setMinTotal] = useState(
    initial.min_total_cents ? (initial.min_total_cents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [paymentMethods, setPaymentMethods] = useState<string[]>(initial.payment_methods);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setUploading(false);
      return toast.error("Sessão expirada");
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userRes.user.id}/bumps/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  function togglePM(v: string) {
    setPaymentMethods((prev) =>
      prev.includes(v) ? prev.filter((p) => p !== v) : [...prev, v],
    );
  }

  async function save() {
    if (!title.trim()) return toast.error("Informe o título do order bump");
    const priceCents = parsePriceToCents(price);
    if (!priceCents) return toast.error("Informe um preço válido");
    if (displayRule === "min_total" && !parsePriceToCents(minTotal))
      return toast.error("Informe o valor mínimo do total");
    if (displayRule === "payment_method" && paymentMethods.length === 0)
      return toast.error("Selecione ao menos um método de pagamento");

    setSaving(true);
    const payload = {
      offer_id: initial.offer_id,
      title: title.trim(),
      description: description.trim() || null,
      price_cents: priceCents,
      enabled,
      image_url: imageUrl,
      display_rule: displayRule,
      min_total_cents: displayRule === "min_total" ? parsePriceToCents(minTotal) : null,
      payment_methods: displayRule === "payment_method" ? paymentMethods : [],
      position: initial.position,
    };
    const q = initial.id
      ? supabase.from("order_bumps").update(payload).eq("id", initial.id)
      : supabase.from("order_bumps").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial.id ? "Order bump atualizado" : "Order bump criado");
    onSaved();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">
            {initial.id ? "Editar order bump" : "Novo order bump"}
          </div>
          <p className="text-sm text-muted-foreground">
            Configure o item adicional, preço e quando ele deve aparecer no checkout.
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Imagem</Label>
          <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="text-xs text-muted-foreground">Sem imagem</div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            hidden
            onChange={handleImage}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Enviar imagem
          </Button>
        </div>

        <div className="space-y-4">
          <Field label="Título do item adicional">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Kit bônus" />
          </Field>
          <Field label="Descrição">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva o que o cliente recebe ao adicionar este item."
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Preço (R$)">
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="19,90" />
            </Field>
            <Field label="Status">
              <div className="flex h-10 items-center gap-3 rounded-md border border-input bg-background px-3">
                <button
                  type="button"
                  onClick={() => setEnabled((v) => !v)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition",
                    enabled ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
                      enabled ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </button>
                <span className="text-sm">{enabled ? "Ativo" : "Inativo"}</span>
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">Regras de exibição</div>
        </div>
        <Field label="Quando exibir este order bump">
          <Select value={displayRule} onValueChange={(v) => setDisplayRule(v as typeof displayRule)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Sempre exibir</SelectItem>
              <SelectItem value="min_total">Exibir se total do pedido for maior ou igual a…</SelectItem>
              <SelectItem value="payment_method">Exibir somente para métodos de pagamento…</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {displayRule === "min_total" && (
          <div className="mt-4">
            <Field label="Total mínimo do pedido (R$)">
              <Input value={minTotal} onChange={(e) => setMinTotal(e.target.value)} placeholder="50,00" />
            </Field>
          </div>
        )}

        {displayRule === "payment_method" && (
          <div className="mt-4">
            <Label className="text-xs text-muted-foreground">Métodos de pagamento</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAYMENT_METHOD_OPTIONS.map((o) => {
                const active = paymentMethods.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => togglePM(o.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar order bump
        </Button>
      </div>
    </div>
  );
}

/* ----------------- Upsell / Downsell ----------------- */

type UpsellRow = {
  id: string;
  offer_id: string;
  upsell_offer_id: string | null;
  enabled: boolean;
  kind: "upsell" | "downsell";
  trigger: "always" | "on_accept" | "on_decline";
  priority: number;
  custom_price_cents: number | null;
  title: string | null;
  description: string | null;
};

type OfferOption = {
  id: string;
  name: string;
  price_cents: number;
  product_title: string;
};

const TRIGGER_LABEL: Record<UpsellRow["trigger"], string> = {
  always: "Sempre exibir",
  on_accept: "Quando cliente aceitar a oferta anterior",
  on_decline: "Quando cliente recusar a oferta anterior",
};

function UpsellTab({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(true);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [rows, setRows] = useState<UpsellRow[]>([]);
  const [options, setOptions] = useState<OfferOption[]>([]);
  const [editing, setEditing] = useState<UpsellRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: offer } = await supabase
      .from("offers")
      .select("id")
      .eq("product_id", productId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!offer) {
      setLoading(false);
      return;
    }
    setOfferId(offer.id);

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;

    const [rowsRes, optsRes] = await Promise.all([
      supabase
        .from("upsells")
        .select(
          "id, offer_id, upsell_offer_id, enabled, kind, trigger, priority, custom_price_cents, title, description",
        )
        .eq("offer_id", offer.id)
        .order("priority", { ascending: true }),
      uid
        ? supabase
            .from("offers")
            .select("id, name, price_cents, products!inner(title, user_id)")
            .eq("products.user_id", uid)
            .neq("id", offer.id)
        : Promise.resolve({ data: [], error: null } as const),
    ]);

    if (rowsRes.error) toast.error(rowsRes.error.message);
    setRows((rowsRes.data ?? []) as UpsellRow[]);
    setOptions(
      ((optsRes.data ?? []) as Array<{
        id: string;
        name: string;
        price_cents: number;
        products: { title: string };
      }>).map((o) => ({
        id: o.id,
        name: o.name,
        price_cents: o.price_cents,
        product_title: o.products.title,
      })),
    );
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const newRow = (): UpsellRow => ({
    id: "",
    offer_id: offerId ?? "",
    upsell_offer_id: null,
    enabled: true,
    kind: "upsell",
    trigger: "always",
    priority: rows.length,
    custom_price_cents: null,
    title: "",
    description: "",
  });

  async function toggleEnabled(row: UpsellRow) {
    const { error } = await supabase
      .from("upsells")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, enabled: !r.enabled } : r)));
  }

  async function remove(row: UpsellRow) {
    if (!confirm("Excluir esta oferta relacionada?")) return;
    const { error } = await supabase.from("upsells").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  async function move(row: UpsellRow, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= rows.length) return;
    const a = rows[idx];
    const b = rows[next];
    const { error } = await supabase.from("upsells").upsert([
      { id: a.id, priority: b.priority, offer_id: a.offer_id },
      { id: b.id, priority: a.priority, offer_id: b.offer_id },
    ]);
    if (error) return toast.error(error.message);
    load();
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!offerId) return <PlaceholderTab label="Upsell / Downsell" />;

  if (editing) {
    return (
      <UpsellForm
        initial={editing}
        options={options}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">Upsell e Downsell</div>
          <p className="text-sm text-muted-foreground">
            Selecione ofertas relacionadas, defina gatilhos e a ordem de prioridade de exibição.
          </p>
        </div>
        <Button
          onClick={() => {
            if (options.length === 0) return toast.error("Crie outra oferta antes de configurar upsells");
            setEditing(newRow());
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Nova oferta
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-lg border border-dashed border-border bg-background/60 py-16 text-center">
          <div>
            <div className="text-sm font-semibold">Nenhum upsell/downsell configurado</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Adicione uma oferta relacionada que será apresentada após o checkout deste produto.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {rows.map((r, idx) => {
            const opt = options.find((o) => o.id === r.upsell_offer_id);
            const priceCents = r.custom_price_cents ?? opt?.price_cents ?? 0;
            return (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <div className="flex w-8 flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(r, -1)}
                    disabled={idx === 0}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <span className="text-xs font-semibold">{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => move(r, 1)}
                    disabled={idx === rows.length - 1}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        r.kind === "upsell"
                          ? "bg-foreground/10 text-foreground"
                          : "bg-orange-500/10 text-orange-600",
                      )}
                    >
                      {r.kind}
                    </span>
                    <span className="truncate text-sm font-semibold">
                      {r.title || opt?.name || "Oferta relacionada"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {opt ? `${opt.product_title} · ` : ""}
                    R$ {(priceCents / 100).toFixed(2).replace(".", ",")} ·{" "}
                    {TRIGGER_LABEL[r.trigger]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleEnabled(r)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition",
                    r.enabled ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700",
                  )}
                  aria-pressed={r.enabled}
                >
                  <span
                    className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                      r.enabled ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
                <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                  Editar
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UpsellForm({
  initial,
  options,
  onCancel,
  onSaved,
}: {
  initial: UpsellRow;
  options: OfferOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<UpsellRow["kind"]>(initial.kind);
  const [trigger, setTrigger] = useState<UpsellRow["trigger"]>(initial.trigger);
  const [upsellOfferId, setUpsellOfferId] = useState<string>(initial.upsell_offer_id ?? "");
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [priority, setPriority] = useState<number>(initial.priority);
  const [useCustomPrice, setUseCustomPrice] = useState<boolean>(initial.custom_price_cents != null);
  const [customPrice, setCustomPrice] = useState<string>(
    initial.custom_price_cents ? (initial.custom_price_cents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [enabled, setEnabled] = useState(initial.enabled);
  const [saving, setSaving] = useState(false);

  const selected = options.find((o) => o.id === upsellOfferId);

  async function save() {
    if (!upsellOfferId) return toast.error("Selecione uma oferta relacionada");
    let priceOverride: number | null = null;
    if (useCustomPrice) {
      const p = parsePriceToCents(customPrice);
      if (!p) return toast.error("Informe um preço válido");
      priceOverride = p;
    }
    setSaving(true);
    const payload = {
      offer_id: initial.offer_id,
      upsell_offer_id: upsellOfferId,
      enabled,
      kind,
      trigger,
      priority,
      custom_price_cents: priceOverride,
      title: title.trim() || null,
      description: description.trim() || null,
    };
    const q = initial.id
      ? supabase.from("upsells").update(payload).eq("id", initial.id)
      : supabase.from("upsells").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial.id ? "Atualizado" : "Criado");
    onSaved();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">
            {initial.id ? "Editar oferta relacionada" : "Nova oferta relacionada"}
          </div>
          <p className="text-sm text-muted-foreground">
            Escolha uma oferta, defina o tipo, o gatilho e a prioridade de exibição.
          </p>
        </div>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tipo">
          <Select value={kind} onValueChange={(v) => setKind(v as UpsellRow["kind"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upsell">Upsell (oferta superior)</SelectItem>
              <SelectItem value="downsell">Downsell (oferta alternativa)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <div className="flex h-10 items-center gap-3 rounded-md border border-input bg-background px-3">
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition",
                enabled ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
                  enabled ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </button>
            <span className="text-sm">{enabled ? "Ativo" : "Inativo"}</span>
          </div>
        </Field>
      </div>

      <Field label="Oferta relacionada">
        <Select value={upsellOfferId} onValueChange={setUpsellOfferId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma oferta" />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                Nenhuma outra oferta disponível.
              </div>
            ) : (
              options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.product_title} — {o.name} · R$ {(o.price_cents / 100).toFixed(2).replace(".", ",")}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Título exibido (opcional)">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Aproveite a oferta especial"
          />
        </Field>
        <Field label="Prioridade de exibição">
          <Input
            type="number"
            min={0}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) || 0)}
          />
        </Field>
      </div>

      <Field label="Descrição (opcional)">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Texto persuasivo mostrado ao cliente antes da decisão."
        />
      </Field>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold">Gatilho de exibição</div>
        </div>
        <Field label="Quando exibir esta oferta">
          <Select value={trigger} onValueChange={(v) => setTrigger(v as UpsellRow["trigger"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Sempre exibir após a compra principal</SelectItem>
              <SelectItem value="on_accept">Somente se o cliente aceitou a oferta anterior</SelectItem>
              <SelectItem value="on_decline">Somente se o cliente recusou a oferta anterior</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Preço personalizado</div>
            <p className="text-xs text-muted-foreground">
              Sobrescreve o preço padrão da oferta apenas neste funil.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUseCustomPrice((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition",
              useCustomPrice ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
                useCustomPrice ? "translate-x-4" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
        {useCustomPrice && (
          <div className="mt-4">
            <Field label="Preço nesta oferta (R$)">
              <Input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={
                  selected
                    ? (selected.price_cents / 100).toFixed(2).replace(".", ",")
                    : "0,00"
                }
              />
            </Field>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar oferta
        </Button>
      </div>
    </div>
  );
}

/* ----------------- Checkout ----------------- */

type CheckoutSettingsRow = {
  logo_url: string | null;
  primary_color: string;
  button_color: string;
  background_color: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  button_text: string;
  show_logo: boolean;
  show_description: boolean;
  show_guarantee: boolean;
};

const DEFAULT_SETTINGS: CheckoutSettingsRow = {
  logo_url: null,
  primary_color: "#0f172a",
  button_color: "#10b981",
  background_color: "#f5f5f5",
  title: null,
  description: null,
  image_url: null,
  button_text: "Comprar agora",
  show_logo: true,
  show_description: true,
  show_guarantee: true,
};

function CheckoutTab({
  productId,
  salesUrl,
  setSalesUrl,
  supportEmail,
  setSupportEmail,
  productTitle,
  productDescription,
  productImageUrl,
}: {
  productId: string;
  salesUrl: string;
  setSalesUrl: (v: string) => void;
  supportEmail: string;
  setSupportEmail: (v: string) => void;
  productTitle: string;
  productDescription: string;
  productImageUrl: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerCode, setOfferCode] = useState<string | null>(null);
  const [offerPriceCents, setOfferPriceCents] = useState<number>(0);
  const [settings, setSettings] = useState<CheckoutSettingsRow>(DEFAULT_SETTINGS);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: offer } = await supabase
      .from("offers")
      .select("id, offer_code, price_cents")
      .eq("product_id", productId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!offer) {
      setLoading(false);
      return;
    }
    setOfferId(offer.id);
    setOfferCode(offer.offer_code);
    setOfferPriceCents(offer.price_cents ?? 0);

    const { data } = await supabase
      .from("checkout_settings")
      .select(
        "logo_url, primary_color, button_color, background_color, title, description, image_url, button_text, show_logo, show_description, show_guarantee",
      )
      .eq("offer_id", offer.id)
      .maybeSingle();
    if (data) setSettings({ ...DEFAULT_SETTINGS, ...data });
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = <K extends keyof CheckoutSettingsRow>(k: K, v: CheckoutSettingsRow[K]) =>
    setSettings((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!offerId) return;
    setSaving(true);
    const [csRes, productRes] = await Promise.all([
      supabase.from("checkout_settings").upsert(
        {
          offer_id: offerId,
          logo_url: settings.logo_url,
          primary_color: settings.primary_color,
          secondary_color: settings.primary_color,
          button_color: settings.button_color,
          background_color: settings.background_color,
          layout: "default",
          title: settings.title,
          description: settings.description,
          image_url: settings.image_url,
          button_text: settings.button_text || "Comprar agora",
          show_logo: settings.show_logo,
          show_description: settings.show_description,
          show_guarantee: settings.show_guarantee,
          show_testimonials: false,
          show_faq: false,
          show_timer: false,
        },
        { onConflict: "offer_id" },
      ),
      supabase
        .from("products")
        .update({
          sales_page_url: salesUrl.trim() || null,
          support_email: supportEmail.trim() || null,
        })
        .eq("id", productId),
    ]);
    setSaving(false);
    if (csRes.error) return toast.error(csRes.error.message);
    if (productRes.error) return toast.error(productRes.error.message);
    toast.success("Checkout salvo");
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!offerId) return <PlaceholderTab label="Checkout" />;

  const publicUrl = offerCode ? `${window.location.origin}/c/${offerCode}` : "";
  const displayTitle = settings.title || productTitle || "Meu produto";
  const displayDescription = settings.description || productDescription || "";
  const displayImage = settings.image_url || productImageUrl;
  const priceStr = (offerPriceCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold">Checkout do produto</div>
          <p className="text-sm text-muted-foreground">
            Conecte página de vendas, e-mail de suporte e personalize a página final do comprador.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar checkout
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 text-sm font-semibold">Link do checkout</div>
        {publicUrl ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 truncate rounded-md border border-input bg-muted px-3 py-2 text-xs">
              {publicUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                toast.success("Link copiado");
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copiar
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(publicUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" /> Abrir
            </Button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            Publique a oferta para gerar o link do checkout.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Página de vendas e suporte">
            <Field label="URL da página de vendas">
              <Input
                value={salesUrl}
                onChange={(e) => setSalesUrl(e.target.value)}
                placeholder="https://sualanding.com/produto"
              />
            </Field>
            <Field label="E-mail de suporte ao comprador">
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="suporte@sua-marca.com"
              />
            </Field>
          </Section>

          <Section title="Conteúdo exibido no checkout">
            <Field label="Título (deixe vazio para usar o nome do produto)">
              <Input
                value={settings.title ?? ""}
                onChange={(e) => patch("title", e.target.value || null)}
                placeholder={productTitle}
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                rows={3}
                value={settings.description ?? ""}
                onChange={(e) => patch("description", e.target.value || null)}
                placeholder="Texto persuasivo mostrado ao comprador."
              />
            </Field>
            <Field label="Texto do botão">
              <Input
                value={settings.button_text}
                onChange={(e) => patch("button_text", e.target.value)}
                placeholder="Comprar agora"
              />
            </Field>
          </Section>

          <Section title="Aparência">
            <div className="grid grid-cols-3 gap-3">
              <ColorField
                label="Primária"
                value={settings.primary_color}
                onChange={(v) => patch("primary_color", v)}
              />
              <ColorField
                label="Botão"
                value={settings.button_color}
                onChange={(v) => patch("button_color", v)}
              />
              <ColorField
                label="Fundo"
                value={settings.background_color}
                onChange={(v) => patch("background_color", v)}
              />
            </div>
            <Field label="URL do logo (opcional)">
              <Input
                value={settings.logo_url ?? ""}
                onChange={(e) => patch("logo_url", e.target.value || null)}
                placeholder="https://.../logo.png"
              />
            </Field>
            <div className="space-y-2 pt-1">
              <Toggle
                label="Mostrar logo"
                value={settings.show_logo}
                onChange={(v) => patch("show_logo", v)}
              />
              <Toggle
                label="Mostrar descrição"
                value={settings.show_description}
                onChange={(v) => patch("show_description", v)}
              />
              <Toggle
                label="Mostrar selo de garantia"
                value={settings.show_guarantee}
                onChange={(v) => patch("show_guarantee", v)}
              />
            </div>
          </Section>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Pré-visualização do comprador
          </div>
          <BuyerPreview
            title={displayTitle}
            description={displayDescription}
            imageUrl={displayImage}
            price={priceStr}
            buttonText={settings.button_text || "Comprar agora"}
            primary={settings.primary_color}
            button={settings.button_color}
            background={settings.background_color}
            logoUrl={settings.show_logo ? settings.logo_url : null}
            showDescription={settings.show_description}
            showGuarantee={settings.show_guarantee}
            supportEmail={supportEmail}
          />
        </div>
      </div>
    </div>
  );
}

function BuyerPreview({
  title,
  description,
  imageUrl,
  price,
  buttonText,
  primary,
  button,
  background,
  logoUrl,
  showDescription,
  showGuarantee,
  supportEmail,
}: {
  title: string;
  description: string;
  imageUrl: string | null;
  price: string;
  buttonText: string;
  primary: string;
  button: string;
  background: string;
  logoUrl: string | null;
  showDescription: boolean;
  showGuarantee: boolean;
  supportEmail: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border" style={{ background }}>
      <div className="space-y-3 p-4">
        <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded bg-neutral-100 text-[9px] font-bold text-neutral-500">
                LOGO
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-neutral-900">{title}</div>
              <div className="text-xs font-semibold" style={{ color: primary }}>
                {price}
              </div>
            </div>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="" className="mt-3 h-28 w-full rounded object-cover" />
          )}
          {showDescription && description && (
            <p className="mt-3 whitespace-pre-wrap text-xs text-neutral-600">{description}</p>
          )}
        </div>

        <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-neutral-900">Seus dados</div>
          <div className="h-8 rounded border border-neutral-200 bg-neutral-50" />
          <div className="h-8 rounded border border-neutral-200 bg-neutral-50" />
          <div className="h-8 rounded border border-neutral-200 bg-neutral-50" />
          <button
            type="button"
            className="mt-1 w-full rounded-md py-2.5 text-xs font-bold text-white"
            style={{ background: button }}
          >
            {buttonText} · {price}
          </button>
        </div>

        {showGuarantee && (
          <div className="rounded-md border border-neutral-200 bg-white p-3 text-[11px] text-neutral-600 shadow-sm">
            ✓ Garantia incondicional · Compra 100% segura
          </div>
        )}
        {supportEmail && (
          <div className="truncate rounded-md border border-neutral-200 bg-white p-3 text-[11px] text-neutral-600 shadow-sm">
            Suporte: {supportEmail}
          </div>
        )}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded-md border border-input bg-background"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 flex-1" />
      </div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition",
          value ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700",
        )}
        aria-pressed={value}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
            value ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

// ---------- Configurações Tab ----------

type PaymentMethodKey = "apple_pay" | "google_pay" | "picpay" | "pix" | "boleto" | "cartao";

const PAYMENT_METHODS: {
  key: PaymentMethodKey;
  label: string;
  fee: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
}[] = [
  { key: "apple_pay", label: "Apple Pay", fee: "taxa base R$ 0,49", icon: Smartphone },
  { key: "google_pay", label: "Google Pay", fee: "taxa base R$ 0,49", icon: Smartphone },
  { key: "picpay", label: "PicPay", fee: "taxa base R$ 0,49", icon: Smartphone },
  { key: "pix", label: "PIX", fee: "taxa base R$ 0,49", icon: QrCode, iconClass: "text-teal-500" },
  { key: "boleto", label: "Boleto", fee: "taxa base R$ 0,49", icon: Barcode },
  { key: "cartao", label: "Cartão de Crédito", fee: "taxa base R$ 0,49", icon: CreditCard },
];

type DeliveryKey =
  | "membros_externa"
  | "cakto_members"
  | "cakto_v1"
  | "telegram"
  | "discord"
  | "email"
  | "link_pagamento";

const DELIVERIES: {
  key: DeliveryKey;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  badge?: { label: string; className: string };
}[] = [
  {
    key: "membros_externa",
    label: "Área de membros Externa",
    desc: "Cursos em uma comunidade externa.",
    icon: Users,
    iconClass: "text-teal-500",
  },
  {
    key: "cakto_members",
    label: "Cakto Members",
    desc: "Nova Área de Membros Premium da Cakto.",
    icon: Users,
    iconClass: "text-foreground",
    badge: { label: "Recomendado", className: "bg-primary text-primary-foreground" },
  },
  {
    key: "cakto_v1",
    label: "Área de membros Cakto V1",
    desc: "Plataforma de cursos e comunidade da Cakto.",
    icon: Users,
    iconClass: "text-teal-500",
    badge: { label: "Legado", className: "bg-amber-500 text-white" },
  },
  {
    key: "telegram",
    label: "Telegram",
    desc: "Grupo ou canal privado.",
    icon: Send,
    iconClass: "text-sky-500",
  },
  {
    key: "discord",
    label: "Discord",
    desc: "Gerencia a entrada de novos usuários em um canal do Discord e monetize sem servidor.",
    icon: MessageCircle,
    iconClass: "text-primary",
  },
  {
    key: "email",
    label: "Acesso por e-mail",
    desc: "Envie um acesso personalizado com nome, link, etc., para seu cliente diretamente pelo e-mail.",
    icon: Mail,
    iconClass: "text-amber-500",
  },
  {
    key: "link_pagamento",
    label: "Link de pagamento",
    desc: "Utilize essa entrega como link de pagamento para receber os valores.",
    icon: Link2,
    iconClass: "text-foreground",
  },
];

type PixelTabKey = "facebook" | "google_ads" | "google_analytics" | "tiktok";

const PIXEL_TABS: { key: PixelTabKey; label: string }[] = [
  { key: "facebook", label: "Facebook" },
  { key: "google_ads", label: "Google Ads" },
  { key: "google_analytics", label: "Google Analytics" },
  { key: "tiktok", label: "TikTok" },
];

function ConfiguracoesTab() {
  const [methods, setMethods] = useState<Record<PaymentMethodKey, boolean>>({
    apple_pay: true,
    google_pay: true,
    picpay: true,
    pix: true,
    boleto: false,
    cartao: false,
  });
  const [defaultMethod, setDefaultMethod] = useState<PaymentMethodKey>("pix");
  const [confirmEmail, setConfirmEmail] = useState(true);
  const [showCoupon, setShowCoupon] = useState(false);
  const [askAddress, setAskAddress] = useState(false);

  const [deliveries, setDeliveries] = useState<Record<DeliveryKey, boolean>>({
    membros_externa: false,
    cakto_members: false,
    cakto_v1: false,
    telegram: false,
    discord: false,
    email: true,
    link_pagamento: false,
  });

  const [pixelTab, setPixelTab] = useState<PixelTabKey>("facebook");
  const [pixelId, setPixelId] = useState("1535005044989804");
  const [domain, setDomain] = useState("");
  const [firePurchase, setFirePurchase] = useState(true);
  const [purchaseValuePct, setPurchaseValuePct] = useState("100");
  const [fireBoletoPurchase, setFireBoletoPurchase] = useState(false);
  const [disableOrderBumpEvents, setDisableOrderBumpEvents] = useState(true);

  const allMethodsChecked = Object.values(methods).every(Boolean);
  const allDeliveriesChecked = Object.values(deliveries).every(Boolean);

  const toggleAllMethods = (v: boolean) =>
    setMethods((m) => Object.fromEntries(Object.keys(m).map((k) => [k, v])) as typeof m);
  const toggleAllDeliveries = (v: boolean) =>
    setDeliveries((d) => Object.fromEntries(Object.keys(d).map((k) => [k, v])) as typeof d);

  return (
    <div className="space-y-8">
      {/* Pagamento */}
      <ConfigSection
        title="Pagamento"
        subtitle="Aprenda sobre as configurações de pagamento no checkout."
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={allMethodsChecked}
              onChange={(e) => toggleAllMethods(e.target.checked)}
            />
            <span>Selecione todos os métodos de pagamento</span>
          </label>

          <p className="text-xs text-muted-foreground">
            Acesse os elementos abaixo para definir a ordem que aparecerá no checkout e clique em
            "Método padrão" para definir como pagamento padrão do checkout ou o método de pagamento
            estará selecionado.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PAYMENT_METHODS.map((m) => {
              const active = methods[m.key];
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethods((s) => ({ ...s, [m.key]: !s[m.key] }))}
                  className={cn(
                    "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition",
                    active
                      ? "border-foreground bg-foreground/10"
                      : "border-input bg-background hover:border-muted-foreground/40",
                  )}
                >
                  {active && (
                    <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <Icon className={cn("h-6 w-6 text-foreground", m.iconClass)} />
                  <div>
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-[10px] text-muted-foreground">{m.fee}</div>
                  </div>
                  <span className="mt-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Método padrão
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <Label className="mb-1 block text-xs font-medium">
              Método de pagamento padrão do Checkout
            </Label>
            <Select value={defaultMethod} onValueChange={(v) => setDefaultMethod(v as PaymentMethodKey)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <ToggleRow
              label="Pedir para o comprador repetir o e-mail"
              value={confirmEmail}
              onChange={setConfirmEmail}
            />
            <ToggleRow
              label="Exibir campo de cupom de desconto"
              value={showCoupon}
              onChange={setShowCoupon}
            />
            <ToggleRow
              label="Solicitar endereço do comprador"
              value={askAddress}
              onChange={setAskAddress}
            />
          </div>
        </div>
      </ConfigSection>

      {/* Entrega de conteúdo */}
      <ConfigSection
        title="Entrega de conteúdo"
        subtitle="Selecione os tipos de entrega de conteúdo."
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={allDeliveriesChecked}
              onChange={(e) => toggleAllDeliveries(e.target.checked)}
            />
            <span>Selecione todos os tipos de entrega de conteúdo</span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DELIVERIES.map((d) => {
              const active = deliveries[d.key];
              const Icon = d.icon;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDeliveries((s) => ({ ...s, [d.key]: !s[d.key] }))}
                  className={cn(
                    "relative flex items-start gap-3 rounded-lg border p-3 text-left transition",
                    active
                      ? "border-foreground bg-foreground/10"
                      : "border-input bg-background hover:border-muted-foreground/40",
                  )}
                >
                  {d.badge && (
                    <span
                      className={cn(
                        "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        d.badge.className,
                      )}
                    >
                      {d.badge.label}
                    </span>
                  )}
                  <Icon className={cn("mt-0.5 h-6 w-6 shrink-0", d.iconClass)} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{d.label}</div>
                    <div className="text-[11px] text-muted-foreground">{d.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </ConfigSection>

      {/* Pixels de conversão */}
      <ConfigSection
        title="Pixels de conversão"
        subtitle="Aprenda mais sobre os pixels de conversão."
      >
        <div className="space-y-4">
          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {PIXEL_TABS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPixelTab(p.key)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition",
                  pixelTab === p.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs font-medium">Pixel ID</Label>
              <Input value={pixelId} onChange={(e) => setPixelId(e.target.value)} className="h-10" />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium">Domínio (Opcional)</Label>
              <div className="flex gap-2">
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="h-10 flex-1"
                />
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-md border border-input text-muted-foreground hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded-md border border-input text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-foreground text-white hover:bg-foreground">
              Adicionar
            </Button>
            <span className="text-xs text-muted-foreground">1 / 30</span>
          </div>

          <div className="space-y-3 rounded-md border border-input bg-background p-3">
            <ToggleRow
              label='Disparar evento "Purchase" ao gerar um pix?'
              value={firePurchase}
              onChange={setFirePurchase}
            />
            {firePurchase && (
              <div>
                <Label className="mb-1 block text-[11px] text-muted-foreground">
                  Valor de conversão personalizado para o pix
                </Label>
                <div className="relative w-40">
                  <Input
                    value={purchaseValuePct}
                    onChange={(e) => setPurchaseValuePct(e.target.value)}
                    className="h-9 pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            )}
            <ToggleRow
              label='Disparar evento "Purchase" ao gerar um boleto?'
              value={fireBoletoPurchase}
              onChange={setFireBoletoPurchase}
            />
            <ToggleRow
              label="Desativar eventos de order bump?"
              value={disableOrderBumpEvents}
              onChange={setDisableOrderBumpEvents}
            />
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="bg-foreground text-white hover:bg-foreground">
              Salvar
            </Button>
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}

function ConfigSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="rounded-lg border border-border bg-card p-4">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition",
          value ? "bg-foreground" : "bg-neutral-300 dark:bg-neutral-700",
        )}
        aria-pressed={value}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition",
            value ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* ---------- Products list card (below tabs) ---------- */

interface ListedProduct {
  id: string;
  title: string;
  image_url: string | null;
  payment_type: string;
  price_cents: number | null;
  recurrence_price_cents: number | null;
  is_active: boolean;
  created_at: string;
}

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  unico: "Único",
  recorrente: "Recorrente",
};

function ProductsListCard({
  refreshKey,
  currentProductId,
  onEdit,
  onChanged,
}: {
  refreshKey: number;
  currentProductId: string | null;
  onEdit: (id: string) => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ListedProduct[]>([]);
  const [imgs, setImgs] = useState<Record<string, string>>({});
  const [publishedLinks, setPublishedLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, title, image_url, payment_type, price_cents, recurrence_price_cents, is_active, created_at",
      )
      .eq("user_id", userRes.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as ListedProduct[];
    setItems(rows);
    setLoading(false);
    const entries = await Promise.all(
      rows
        .filter((r) => r.image_url)
        .map(async (r) => [r.id, await resolveProductImageUrl(r.image_url)] as const),
    );
    setImgs(Object.fromEntries(entries.filter(([, u]) => !!u) as Array<[string, string]>));

    const productIds = rows.map((r) => r.id);
    if (productIds.length === 0) {
      setPublishedLinks({});
      return;
    }
    const { data: offers } = await supabase
      .from("offers")
      .select("id, product_id, offer_code")
      .in("product_id", productIds)
      .eq("status", "active");
    const offerRows = (offers ?? []) as Array<{ id: string; product_id: string; offer_code: string }>;
    if (offerRows.length === 0) {
      setPublishedLinks({});
      return;
    }
    const { data: cs } = await supabase
      .from("checkout_settings")
      .select("offer_id, published")
      .in(
        "offer_id",
        offerRows.map((o) => o.id),
      );
    const publishedByOffer = new Map<string, boolean>();
    (cs ?? []).forEach((r: { offer_id: string; published: boolean | null }) => {
      publishedByOffer.set(r.offer_id, !!r.published);
    });
    const map: Record<string, string> = {};
    for (const o of offerRows) {
      if (publishedByOffer.get(o.id)) map[o.product_id] = `/c/${o.offer_code}`;
    }
    setPublishedLinks(map);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function handleDeleteRow(id: string, title: string) {
    if (!confirm(`Excluir o produto "${title}"?`)) return;
    setDeletingId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    setDeletingId(null);
    if (error) return toast.error(error.message);
    await logAudit("product_delete", { product_id: id, title });
    toast.success("Produto excluído");
    onChanged();
  }

  function handleView(id: string) {
    if (typeof window !== "undefined") {
      window.open(`/produtos/${id}`, "_blank", "noopener,noreferrer");
    }
  }

  function priceFor(p: ListedProduct): string {
    const cents = p.payment_type === "recorrente" ? p.recurrence_price_cents : p.price_cents;
    if (cents == null) return "—";
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold">Produtos cadastrados</h2>
          <p className="text-xs text-muted-foreground">
            Gerencie os produtos que você já criou.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? "produto" : "produtos"}
        </span>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((p) => {
            const isCurrent = p.id === currentProductId;
            return (
              <li
                key={p.id}
                className={cn(
                  "flex flex-wrap items-center gap-4 px-6 py-4",
                  isCurrent && "bg-primary/5",
                )}
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                  {imgs[p.id] ? (
                    <img src={imgs[p.id]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-foreground">{p.title}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Editando
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        p.is_active
                          ? "bg-foreground/10 text-foreground"
                          : "bg-slate-500/15 text-slate-400",
                      )}
                    >
                      {p.is_active ? "Ativo" : "Oculto"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Pagamento:{" "}
                      <span className="text-foreground">
                        {PAYMENT_TYPE_LABEL[p.payment_type] ?? p.payment_type}
                      </span>
                    </span>
                    <span>·</span>
                    <span>
                      Preço: <span className="text-foreground">{priceFor(p)}</span>
                    </span>
                  </div>
                  {publishedLinks[p.id] && (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                        Checkout publicado
                      </span>
                      <a
                        href={publishedLinks[p.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        {publishedLinks[p.id]}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(p.id)}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Visualizar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(p.id)}
                    disabled={isCurrent}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRow(p.id, p.title)}
                    disabled={deletingId === p.id || isCurrent}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    {deletingId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Excluir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type OfferRow = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  checkout_language: string;
  offer_type: string;
};

const CURRENCY_LABELS: Record<string, string> = {
  BRL: "Real",
  USD: "Dólar",
  EUR: "Euro",
};

const LANG_LABELS: Record<string, string> = {
  "pt-BR": "Português (BR)",
  "en-US": "Inglês (US)",
  "es-ES": "Espanhol (ES)",
};

function formatCents(cents: number, currency: string) {
  const code = currency === "BRL" ? "BRL" : currency === "USD" ? "USD" : "EUR";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: code }).format(cents / 100);
}

function OfertasTab({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OfferRow | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [name, setName] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [language, setLanguage] = useState("pt-BR");
  const [offerType, setOfferType] = useState("nacional");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("offers")
      .select("id, name, price_cents, currency, checkout_language, offer_type")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setOffers((data ?? []) as OfferRow[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setName("");
    setPriceStr("");
    setCurrency("BRL");
    setLanguage("pt-BR");
    setOfferType("nacional");
    setOpen(true);
  }

  function openEdit(o: OfferRow) {
    setEditing(o);
    setName(o.name);
    setPriceStr((o.price_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setCurrency(o.currency);
    setLanguage(o.checkout_language);
    setOfferType(o.offer_type);
    setOpen(true);
  }

  async function handleSubmit() {
    if (!name.trim()) return toast.error("Informe o nome da oferta");
    const cents = parsePriceToCents(priceStr);
    if (!cents) return toast.error("Informe um preço válido");
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("offers")
        .update({
          name: name.trim(),
          price_cents: cents,
          currency,
          checkout_language: language,
          offer_type: offerType,
        })
        .eq("id", editing.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Oferta atualizada");
    } else {
      const offerCode = Array.from({ length: 8 }, () =>
        "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 33)),
      ).join("");
      const { error } = await supabase.from("offers").insert({
        product_id: productId,
        name: name.trim(),
        price_cents: cents,
        currency,
        checkout_language: language,
        offer_type: offerType,
        status: "active",
        offer_code: offerCode,
      });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      toast.success("Oferta adicionada");
    }
    setSaving(false);
    setOpen(false);
    await load();
  }

  async function handleDuplicate(o: OfferRow) {
    const offerCode = Array.from({ length: 8 }, () =>
      "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 33)),
    ).join("");
    const { error } = await supabase.from("offers").insert({
      product_id: productId,
      name: `${o.name} (cópia)`,
      price_cents: o.price_cents,
      currency: o.currency,
      checkout_language: o.checkout_language,
      offer_type: o.offer_type,
      status: "active",
      offer_code: offerCode,
    });
    if (error) return toast.error(error.message);
    toast.success("Oferta duplicada");
    await load();
  }

  async function handleDelete(o: OfferRow) {
    if (!confirm(`Excluir a oferta "${o.name}"?`)) return;
    const { error } = await supabase.from("offers").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success("Oferta excluída");
    await load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Ofertas</h3>
        <p className="text-sm text-muted-foreground">
          Crie suas ofertas de preços para o seu produto. Adicione quantas quiser, e configure-as
          conforme a necessidade.
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-xl border border-border bg-background/40 py-10 text-center">
          <p className="text-sm font-medium">Você deve adicionar ao menos 1 oferta</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Adicione e configure as ofertas de preços para o seu produto.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {offers.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  Oferta {o.name} — Idioma {LANG_LABELS[o.checkout_language] ?? o.checkout_language}
                </p>
                <p className="mt-0.5 text-sm">
                  <span className="font-semibold text-foreground">
                    {formatCents(o.price_cents, o.currency)}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Apenas {CURRENCY_LABELS[o.currency] ?? o.currency})
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  onClick={() => openEdit(o)}
                  className="bg-amber-500 text-white hover:bg-amber-600"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => handleDuplicate(o)}
                  aria-label="Duplicar"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={() => handleDelete(o)}
                  className="bg-red-500 text-white hover:bg-red-600"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={openNew}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        size="lg"
      >
        Adicionar oferta
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Oferta" : "Adicionar Oferta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1 block text-xs font-medium">Nome da oferta *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da oferta"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Nome da oferta apenas para identificação
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-medium">Preço *</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    R$
                  </span>
                  <Input
                    value={priceStr}
                    onChange={(e) => setPriceStr(e.target.value)}
                    placeholder="0"
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium">Moeda *</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">Real</SelectItem>
                    <SelectItem value="USD">Dólar</SelectItem>
                    <SelectItem value="EUR">Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block text-xs font-medium">Idioma do checkout *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (BR)</SelectItem>
                    <SelectItem value="en-US">Inglês (US)</SelectItem>
                    <SelectItem value="es-ES">Espanhol (ES)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium">
                  Qual o tipo desta oferta? *
                </Label>
                <Select value={offerType} onValueChange={setOfferType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


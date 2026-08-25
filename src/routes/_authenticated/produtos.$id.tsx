import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Info,
  Tag,
  Upload,
  Copy,
  Pencil,
  Trash2,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

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
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { parsePriceInput } from "@/lib/checkout-url";

export const Route = createFileRoute("/_authenticated/produtos/$id")({
  component: ProductManagePage,
});

type SectionKey = "informacoes" | "ofertas";

const sections: {
  key: SectionKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "informacoes", label: "INFORMAÇÕES", icon: Info },
  { key: "ofertas", label: "OFERTAS", icon: Tag },
];

const CATEGORIES = [
  "Animais",
  "Apps e Software",
  "Artesanato",
  "Beleza",
  "Design",
  "Educação",
  "Entretenimento",
  "Espiritualidade",
  "Finanças",
  "Fitness",
  "Gastronomia",
  "Hobbies",
  "Idiomas",
  "Marketing Digital",
  "Moda",
  "Música",
  "Negócios e Carreira",
  "Relacionamentos",
  "Saúde",
  "Sexualidade",
];

const REFUND_OPTIONS = [
  { value: 7, label: "7 dias (prazo mínimo)" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
];

interface ProductData {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  invoice_name: string | null;
  category: string | null;
  refund_deadline_days: number | null;
  sales_page_url: string | null;
  support_email: string | null;
  support_whatsapp: string | null;
  status: string;
  product_type: string;
}

function ProductManagePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [active, setActive] = useState<SectionKey>("informacoes");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select(
        "id, title, description, image_url, invoice_name, category, refund_deadline_days, sales_page_url, support_email, support_whatsapp, status, product_type",
      )
      .eq("id", id)
      .maybeSingle();
    setProduct((data as ProductData) ?? null);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell
      title={product?.title || "Produto"}
      subtitle="Configure informações e ofertas do produto"
    >
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate({ to: "/produtos" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para produtos
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="flex min-w-max">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setActive(s.key)}
                  className={`flex items-center gap-2 px-5 py-4 text-xs font-semibold tracking-wide transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={
                    isActive
                      ? { boxShadow: "inset 0 -2px 0 0 hsl(var(--primary))" }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          {active === "informacoes" && product && (
            <InformacoesSection product={product} onSaved={load} />
          )}
          {active === "ofertas" && <OfertasSection productId={id} />}
        </div>
      </div>
    </AppShell>
  );
}

function InformacoesSection({
  product,
  onSaved,
}: {
  product: ProductData;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [invoiceName, setInvoiceName] = useState(product.invoice_name ?? "");
  const [category, setCategory] = useState(product.category ?? "");
  const [refundDays, setRefundDays] = useState<number>(product.refund_deadline_days ?? 7);
  const [salesPageUrl, setSalesPageUrl] = useState(product.sales_page_url ?? "");
  const [supportEmail, setSupportEmail] = useState(product.support_email ?? "");
  const [supportWhatsapp, setSupportWhatsapp] = useState(product.support_whatsapp ?? "");
  const [imageUrl, setImageUrl] = useState(product.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(file.type)) {
      return toast.error("Formato inválido. Use PNG, JPG, JPEG, WEBP ou GIF.");
    }
    if (file.size > 30 * 1024 * 1024) {
      return toast.error("Tamanho máximo é 30MB.");
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${product.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true,
      });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !data) throw signErr ?? new Error("Erro ao gerar URL da imagem");
      setImageUrl(data.signedUrl);
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) return toast.error("Informe o nome do produto");
    if (invoiceName && invoiceName.length > 10) {
      return toast.error("Nome da fatura deve ter no máximo 10 caracteres");
    }
    if (invoiceName && !/^[A-Za-z0-9 ]+$/.test(invoiceName)) {
      return toast.error("Nome da fatura não pode conter caracteres especiais");
    }
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        invoice_name: invoiceName.trim() || null,
        category: category || null,
        refund_deadline_days: refundDays,
        sales_page_url: salesPageUrl.trim() || null,
        support_email: supportEmail.trim() || null,
        support_whatsapp: supportWhatsapp.trim() || null,
        image_url: imageUrl || null,
      })
      .eq("id", product.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logAudit("product_update", { product_id: product.id });
    toast.success("Alterações salvas");
    onSaved();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left: banner + image upload */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-muted">
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <Tag className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <span className="inline-block rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-foreground">
                {product.status === "active" ? "Ativo" : product.status}
              </span>
              <div className="mt-1 truncate text-sm font-semibold">{product.title}</div>
              <div className="text-xs text-muted-foreground">
                Tipo: {product.product_type}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            * As atualizações podem levar até 1 minuto para serem aplicadas no checkout
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="text-sm font-semibold">
            Clique para enviar <span className="text-muted-foreground">ou</span>
            <br />
            arraste até aqui
          </div>
          <p className="text-xs text-muted-foreground">
            Apenas arquivos png, jpeg, jpg,
            <br />
            webp e gif são aceitos
            <br />O tamanho máximo é 30MB
          </p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hidden"
          onChange={handleUpload}
        />
        <p className="text-xs text-muted-foreground">
          A imagem escolhida deve estar no formato JPG ou PNG e ter no máximo 10 MB de tamanho.
          Dimensões ideais: 600x600 pixels.
        </p>
      </div>

      {/* Right: form */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="space-y-5">
          <div>
            <Label>
              Nome do produto <span className="text-destructive">*</span>
            </Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              Esse nome será exibido na empresa para os clientes
            </p>
          </div>

          <div>
            <Label>Descrição do produto</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Fale sobre o que se trata seu produto, o que ele faz e como ele pode ajudar o cliente.
            </p>
          </div>

          <div>
            <Label>Nome da fatura</Label>
            <Input
              value={invoiceName}
              maxLength={10}
              onChange={(e) => setInvoiceName(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Informe o nome que aparecerá na fatura do cliente. (Máximo 10 caracteres). Não utilize
              caracteres especiais.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>
                Categoria do produto <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Prazo de reembolso (garantia) <span className="text-destructive">*</span>
              </Label>
              <Select
                value={String(refundDays)}
                onValueChange={(v) => setRefundDays(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>
              Página de vendas ou rede social <span className="text-destructive">*</span>
            </Label>
            <Input
              value={salesPageUrl}
              onChange={(e) => setSalesPageUrl(e.target.value)}
              placeholder="www.exemplo.com.br"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Informe o endereço completo da página de vendas desse produto.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>
                E-mail de suporte <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Este e-mail será exibido na página de checkout.
              </p>
            </div>
            <div>
              <Label>
                Whatsapp de suporte <span className="text-destructive">*</span>
              </Label>
              <Input
                value={supportWhatsapp}
                onChange={(e) => setSupportWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Este número será exibido na sessão de pedido confirmado
              </p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2 text-white shadow"
            style={{ background: "var(--gradient-brand)" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OfferRow {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  checkout_language: string;
  offer_type: string;
  offer_code: string;
  status: string;
}

const CURRENCIES = [
  { value: "BRL", label: "Real" },
  { value: "USD", label: "Dólar" },
  { value: "EUR", label: "Euro" },
];

const LANGUAGES = [
  { value: "pt-BR", label: "Português (BR)" },
  { value: "pt-PT", label: "Português (PT)" },
  { value: "en", label: "Inglês" },
  { value: "ar", label: "Árabe" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
];

const OFFER_TYPES = [
  { value: "nacional", label: "Nacional" },
  { value: "internacional", label: "Internacional" },
];

function currencySymbol(c: string) {
  return c === "USD" ? "$" : c === "EUR" ? "€" : "R$";
}

function currencyLabel(c: string) {
  return CURRENCIES.find((x) => x.value === c)?.label ?? c;
}

function languageLabel(l: string) {
  return LANGUAGES.find((x) => x.value === l)?.label ?? l;
}

function formatOfferPrice(cents: number, currency: string) {
  return `${currencySymbol(currency)} ${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function OfertasSection({ productId }: { productId: string }) {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfferRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("offers")
      .select("id, name, price_cents, currency, checkout_language, offer_type, offer_code, status")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setOffers((data ?? []) as OfferRow[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function removeOffer(o: OfferRow) {
    if (!confirm(`Excluir oferta "${o.name}"?`)) return;
    const { error } = await supabase.from("offers").delete().eq("id", o.id);
    if (error) return toast.error(error.message);
    await logAudit("offer_delete", { offer_id: o.id });
    toast.success("Oferta excluída");
    load();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Ofertas</h2>
        <p className="text-sm text-muted-foreground">
          Crie suas ofertas de preços para o seu produto. Adicione quantas quiser, e configure-as
          conforme a necessidade.
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-lg border border-border bg-background/40 p-10 text-center">
          <p className="text-base font-semibold">Você deve adicionar ao menos 1 oferta</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicione e configure as ofertas de preços para o seu produto.
          </p>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="mt-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Adicionar oferta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="text-sm font-semibold">
                  {o.name}{" "}
                  <span className="font-normal text-muted-foreground">
                    - Idioma {languageLabel(o.checkout_language)}
                  </span>
                </div>
                <div className="mt-1 text-lg font-bold text-primary">
                  {formatOfferPrice(o.price_cents, o.currency)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (Apenas {currencyLabel(o.currency)})
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Código:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                    {o.offer_code}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-500"
                  onClick={() => {
                    setEditing(o);
                    setDialogOpen(true);
                  }}
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  onClick={() => copyCode(o.offer_code)}
                  title="Copiar código da oferta"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => removeOffer(o)}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Adicionar oferta
          </Button>
        </div>
      )}

      <OfferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productId={productId}
        offer={editing}
        onSaved={load}
      />
    </div>
  );
}

function OfferDialog({
  open,
  onOpenChange,
  productId,
  offer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  productId: string;
  offer: OfferRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [language, setLanguage] = useState("pt-BR");
  const [offerType, setOfferType] = useState("nacional");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(offer?.name ?? "");
      setPrice(
        offer ? (offer.price_cents / 100).toFixed(2).replace(".", ",") : "",
      );
      setCurrency(offer?.currency ?? "BRL");
      setLanguage(offer?.checkout_language ?? "pt-BR");
      setOfferType(offer?.offer_type ?? "nacional");
    }
  }, [open, offer]);

  async function handleSave() {
    if (!name.trim()) return toast.error("Informe o nome da oferta");
    const priceCents = parsePriceInput(price);
    setSaving(true);
    if (offer) {
      const { error } = await supabase
        .from("offers")
        .update({
          name: name.trim(),
          price_cents: priceCents,
          currency,
          checkout_language: language,
          offer_type: offerType,
        })
        .eq("id", offer.id);
      setSaving(false);
      if (error) return toast.error(error.message);
      await logAudit("offer_update", { offer_id: offer.id });
      toast.success("Oferta atualizada");
    } else {
      const { data, error } = await supabase
        .from("offers")
        .insert({
          product_id: productId,
          name: name.trim(),
          price_cents: priceCents,
          currency,
          checkout_language: language,
          offer_type: offerType,
        })
        .select()
        .single();
      if (error || !data) {
        setSaving(false);
        return toast.error(error?.message ?? "Erro ao criar oferta");
      }
      await supabase.from("offer_payment_methods").insert([
        { offer_id: data.id, method: "pix", enabled: true },
        { offer_id: data.id, method: "credit_card", enabled: true },
        { offer_id: data.id, method: "debit_card", enabled: false },
        { offer_id: data.id, method: "boleto", enabled: false },
      ]);
      await supabase.from("checkout_settings").insert({ offer_id: data.id });
      await supabase.from("tracking_settings").insert({ offer_id: data.id });
      await logAudit("offer_create", { offer_id: data.id, product_id: productId });
      setSaving(false);
      toast.success(`Oferta criada — código ${data.offer_code}`);
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{offer ? "Editar Oferta" : "Adicionar Oferta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>
              Nome da oferta <span className="text-destructive">*</span>
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              Nome da oferta apenas para identificação
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>
                Preço <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {currencySymbol(currency)}
                </span>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>
                Moeda <span className="text-destructive">*</span>
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>
                Idioma do checkout <span className="text-destructive">*</span>
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                Qual o tipo desta oferta? <span className="text-destructive">*</span>
              </Label>
              <Select value={offerType} onValueChange={setOfferType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? "Salvando..." : offer ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

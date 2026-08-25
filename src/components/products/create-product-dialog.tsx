import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, FileText, Loader2, Package, Upload } from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type PaymentType = "unico" | "recorrente";
type Frequency = "mensal" | "trimestral" | "semestral" | "anual";
type DeliveryType = "area_membros" | "arquivo";
type ProductType = "ebook" | "curso" | "fisico";

const PRODUCT_TYPES: { value: ProductType; title: string; description: string; icon: typeof FileText }[] = [
  { value: "ebook", title: "E-book", description: "Produto digital entregue por e-mail ou download", icon: FileText },
  { value: "curso", title: "Curso", description: "Conteúdo em vídeo com área de membros", icon: BookOpen },
  { value: "fisico", title: "Produto Físico", description: "Produto com entrega física via correios", icon: Package },
];


export interface EditableProduct {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  product_type?: string | null;
  show_in_showcase: boolean;
  payment_type: string;
  recurrence_frequency: string | null;
  delivery_type: string;
  delivery_file_url: string | null;
  category: string | null;
  sales_page_url: string | null;
  different_first_charge: boolean;
  first_charge_price_cents: number | null;
  recurrence_price_cents: number | null;
  price_cents: number | null;
  sac_display_name: string | null;
  sac_email: string | null;
}

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  product?: EditableProduct | null;
}

function toCents(value: string): number | null {
  const cleaned = value.replace(/\./g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function centsToStr(v: number | null | undefined): string {
  if (v == null) return "";
  return (v / 100).toFixed(2).replace(".", ",");
}

export function CreateProductDialog({ open, onOpenChange, onSaved, product }: CreateProductDialogProps) {
  const isEdit = !!product;
  const [saving, setSaving] = useState(false);

  const [productType, setProductType] = useState<ProductType>("ebook");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showcase, setShowcase] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>("unico");
  const [frequency, setFrequency] = useState<Frequency>("mensal");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("area_membros");
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [salesPageUrl, setSalesPageUrl] = useState("");
  const [differentFirst, setDifferentFirst] = useState(false);
  const [firstChargePrice, setFirstChargePrice] = useState("");
  const [recurrencePrice, setRecurrencePrice] = useState("");
  const [price, setPrice] = useState("");
  const [sacName, setSacName] = useState("");
  const [sacEmail, setSacEmail] = useState("");

  function reset() {
    setProductType("ebook");
    setTitle("");
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    setShowcase(false);
    setPaymentType("unico");
    setFrequency("mensal");
    setDeliveryType("area_membros");
    setDeliveryFile(null);
    setCategory("");
    setSalesPageUrl("");
    setDifferentFirst(false);
    setFirstChargePrice("");
    setRecurrencePrice("");
    setPrice("");
    setSacName("");
    setSacEmail("");
  }

  // Prefill on open (edit) / reset on open (create)
  useEffect(() => {
    if (!open) return;
    if (product) {
      setProductType((product.product_type as ProductType) ?? "ebook");
      setTitle(product.title ?? "");
      setDescription(product.description ?? "");
      setImageFile(null);
      setImagePreview(null);
      setShowcase(!!product.show_in_showcase);
      setPaymentType((product.payment_type as PaymentType) ?? "unico");
      setFrequency((product.recurrence_frequency as Frequency) ?? "mensal");
      setDeliveryType((product.delivery_type as DeliveryType) ?? "area_membros");
      setDeliveryFile(null);
      setCategory(product.category ?? "");
      setSalesPageUrl(product.sales_page_url ?? "");
      setDifferentFirst(!!product.different_first_charge);
      setFirstChargePrice(centsToStr(product.first_charge_price_cents));
      setRecurrencePrice(centsToStr(product.recurrence_price_cents));
      setPrice(centsToStr(product.price_cents));
      setSacName(product.sac_display_name ?? "");
      setSacEmail(product.sac_email ?? "");
    } else {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  function handleImageChange(file: File | null) {
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  async function uploadToStorage(userId: string, file: File, prefix: string): Promise<string> {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("products").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (upErr) throw upErr;
    return path;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título do produto");
      return;
    }
    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Sessão expirada");
      const userId = userData.user.id;

      let imagePath: string | null = null;
      if (imageFile) imagePath = await uploadToStorage(userId, imageFile, "img");

      let deliveryPath: string | null = null;
      if (deliveryType === "arquivo" && deliveryFile) {
        deliveryPath = await uploadToStorage(userId, deliveryFile, "file");
      }

      const isRecurring = paymentType === "recorrente";
      const priceCents = toCents(price);
      const recurrencePriceCents = toCents(recurrencePrice);
      const firstChargeCents = toCents(firstChargePrice);

      const payload = {
        title: title.trim(),
        product_type: productType,
        description: description.trim() || null,
        show_in_showcase: showcase,
        payment_type: paymentType,
        recurrence_frequency: isRecurring ? frequency : null,
        delivery_type: deliveryType,
        category: category.trim() || null,
        sales_page_url: salesPageUrl.trim() || null,
        different_first_charge: isRecurring && differentFirst,
        first_charge_price_cents: isRecurring && differentFirst ? firstChargeCents : null,
        recurrence_price_cents: isRecurring ? recurrencePriceCents : null,
        price_cents: isRecurring ? null : priceCents,
        sac_display_name: sacName.trim() || null,
        sac_email: sacEmail.trim() || null,
      };

      if (isEdit && product) {
        const updateData = {
          ...payload,
          ...(imagePath ? { image_url: imagePath } : {}),
          delivery_file_url:
            deliveryType === "arquivo" ? (deliveryPath ?? product.delivery_file_url) : null,
        };
        const { error: updErr } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", product.id);
        if (updErr) throw updErr;
        await logAudit("product_update", { product_id: product.id, title: payload.title });
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("products")
          .insert({
            ...payload,
            user_id: userId,
            image_url: imagePath,
            delivery_file_url: deliveryPath,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        if (inserted?.id) {
          await supabase.from("offers").insert({
            product_id: inserted.id,
            name: payload.title ?? "Oferta principal",
            price_cents: typeof payload.price_cents === "number" ? payload.price_cents : 0,
            billing_type: isRecurring ? "recurring" : "one_time",
          });
        }
        await logAudit("product_create", { product_id: inserted?.id, title: payload.title });
        toast.success("Produto criado com sucesso!");

      }
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar produto";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const isRecurring = paymentType === "recorrente";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Atualizar produto" : "Criar produto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Edite as informações do seu produto."
              : "Preencha as informações abaixo para cadastrar seu produto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Tipo de produto</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {PRODUCT_TYPES.map((pt) => {
                const Icon = pt.icon;
                const selected = productType === pt.value;
                return (
                  <button
                    type="button"
                    key={pt.value}
                    onClick={() => setProductType(pt.value)}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-lg ${
                        selected ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold">{pt.title}</span>
                    <span className="text-xs text-muted-foreground">{pt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">

            <Label htmlFor="title">Título do produto</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Curso de Marketing Digital"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição do produto</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva seu produto"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem do produto (proporção 300x500)</Label>
            <div className="flex items-start gap-4">
              <label
                htmlFor="image"
                className="grid h-40 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-border bg-secondary/50 hover:bg-secondary"
                style={{ aspectRatio: "300 / 500" }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground" />
                )}
              </label>
              <div className="flex-1 text-sm text-muted-foreground">
                Clique na área ao lado para enviar a imagem. Recomendado 300x500 pixels.
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  className="mt-2"
                  onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label>Disponibilizar na vitrine pública</Label>
              <p className="text-xs text-muted-foreground">
                Seu produto poderá ser visto por qualquer pessoa.
              </p>
            </div>
            <Switch checked={showcase} onCheckedChange={setShowcase} />
          </div>

          <div className="space-y-2">
            <Label>Tipo de pagamento</Label>
            <RadioGroup
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentType)}
              className="flex gap-6"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="unico" id="pt-unico" />
                Único
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="recorrente" id="pt-rec" />
                Recorrente
              </label>
            </RadioGroup>
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Frequência de recorrência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Entrega do produto</Label>
            <RadioGroup
              value={deliveryType}
              onValueChange={(v) => setDeliveryType(v as DeliveryType)}
              className="flex flex-col gap-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="area_membros" id="dt-am" />
                Área de membros da plataforma
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="arquivo" id="dt-file" />
                Anexar um arquivo ao produto
              </label>
            </RadioGroup>
            {deliveryType === "arquivo" && (
              <Input
                type="file"
                onChange={(e) => setDeliveryFile(e.target.files?.[0] ?? null)}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria do produto</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Cursos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesPage">URL da página de vendas</Label>
              <Input
                id="salesPage"
                type="url"
                value={salesPageUrl}
                onChange={(e) => setSalesPageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {!isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
          )}

          {isRecurring && (
            <>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label>Preço diferente na primeira cobrança</Label>
                  <p className="text-xs text-muted-foreground">
                    Cobrar um valor diferente apenas na primeira parcela.
                  </p>
                </div>
                <Switch checked={differentFirst} onCheckedChange={setDifferentFirst} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {differentFirst && (
                  <div className="space-y-2">
                    <Label htmlFor="firstPrice">Preço da 1ª cobrança (R$)</Label>
                    <Input
                      id="firstPrice"
                      value={firstChargePrice}
                      onChange={(e) => setFirstChargePrice(e.target.value)}
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="recPrice">Preço da recorrência (R$)</Label>
                  <Input
                    id="recPrice"
                    value={recurrencePrice}
                    onChange={(e) => setRecurrencePrice(e.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sacName">Nome de exibição do SAC</Label>
              <Input
                id="sacName"
                value={sacName}
                onChange={(e) => setSacName(e.target.value)}
                placeholder="Ex: Suporte Paglink"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sacEmail">E-mail do SAC</Label>
              <Input
                id="sacEmail"
                type="email"
                value={sacEmail}
                onChange={(e) => setSacEmail(e.target.value)}
                placeholder="suporte@exemplo.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 text-white shadow"
              style={{ background: "var(--gradient-brand)" }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Criar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

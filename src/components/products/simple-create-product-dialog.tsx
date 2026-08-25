import { useRef, useState, type FormEvent } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const DESC_MIN = 250;
const DESC_MAX = 1000;

const PRODUCT_TYPES = [
  { value: "outro", label: "Outro" },
  { value: "ebook", label: "E-book" },
  { value: "curso", label: "Curso" },
  { value: "assinatura", label: "Assinatura" },
  { value: "servico", label: "Serviço" },
  { value: "fisico", label: "Produto Físico" },
  { value: "software", label: "Software" },
  { value: "mentoria", label: "Mentoria" },
];

const CATEGORIES = [
  "Animais",
  "Apps e Software",
  "Beleza",
  "Culinária",
  "Design",
  "Direito",
  "Educação",
  "Entretenimento",
  "Espiritualidade",
  "Finanças",
  "Fitness",
  "Games",
  "Hobbies",
  "Idiomas",
  "Marketing Digital",
  "Moda",
  "Música",
  "Negócios e Carreira",
  "Relacionamentos",
  "Saúde",
  "Sexualidade",
  "Viagens",
  "Outros",
];

function parsePriceToCents(v: string): number | null {
  const cleaned = v.replace(/\s/g, "").replace(/R\$/gi, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function formatBRL(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const n = Number(digits) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SimpleCreateProductDialog({ open, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [productType, setProductType] = useState("outro");
  const [category, setCategory] = useState("Animais");
  const [salesUrl, setSalesUrl] = useState("");
  const [noSalesPage, setNoSalesPage] = useState(false);
  const [price, setPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [productCode, setProductCode] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setTitle("");
    setProductType("outro");
    setCategory("Animais");
    setSalesUrl("");
    setNoSalesPage(false);
    setPrice("");
    setStockQuantity("");
    setProductCode("");
    setSupportEmail("");
    setWhatsapp("");
    setDescription("");
  }

  function handleImage(file: File | null) {
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage(userId: string, file: File): Promise<string> {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("products").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Informe o nome do produto");
    const priceCents = parsePriceToCents(price);
    if (priceCents === null) return toast.error("Informe um valor válido para o produto");
    if (!supportEmail.trim()) return toast.error("Informe o e-mail de suporte");
    if (!whatsapp.trim()) return toast.error("Informe o WhatsApp de suporte");
    if (description.trim().length < DESC_MIN)
      return toast.error(`Descrição precisa ter pelo menos ${DESC_MIN} caracteres`);
    if (!noSalesPage && !salesUrl.trim())
      return toast.error("Informe a URL da página de vendas ou marque a opção");

    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Sessão expirada");
      const userId = userRes.user.id;

      let imagePath: string | null = null;
      if (imageFile) imagePath = await uploadImage(userId, imageFile);

      const { data, error } = await supabase
        .from("products")
        .insert({
          user_id: userId,
          title: title.trim(),
          description: `${description.trim()}\n\nWhatsApp: ${whatsapp.trim()}`,
          sales_page_url: noSalesPage ? null : salesUrl.trim() || null,
          image_url: imagePath,
          product_type: productType,
          category,
          stock_quantity: parseInt(stockQuantity) || 0,
          sku: productCode.trim() || null,
          refund_deadline_days: 7,
          payment_type: "unico",
          delivery_type: "area_membros",
          price_cents: priceCents,
          first_charge_price_cents: priceCents,
          recurrence_price_cents: 0,
          support_email: supportEmail.trim(),
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      const offerCode = Array.from({ length: 8 }, () =>
        "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 33)),
      ).join("");
      await supabase.from("offers").insert({
        product_id: data.id,
        name: title.trim(),
        price_cents: priceCents,
        currency: "BRL",
        checkout_language: "pt-BR",
        offer_type: "nacional",
        status: "active",
        offer_code: offerCode,
      });
      await logAudit("product_create", { product_id: data.id, title: title.trim() });
      toast.success("Produto criado com sucesso");
      reset();
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar produto";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const descLen = description.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Produto</DialogTitle>
          <DialogDescription>
            Preencha as informações para criar um novo produto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Image uploader */}
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleImage(f);
              }}
              className={`relative grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed transition-colors ${
                dragOver ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary"
              }`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      if (imagePreview) URL.revokeObjectURL(imagePreview);
                      setImagePreview(null);
                    }}
                    className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-background/80 text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </>
              ) : (
                <Upload className="h-5 w-5 text-primary" />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
              />
            </button>
            <div className="text-sm">
              <p className="font-semibold">Imagem do produto</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Arraste a imagem para a área ou clique no botão para enviar. JPG ou PNG acima de 600x600px.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-title">
              Nome do produto <span className="text-primary">*</span>
            </Label>
            <Input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o nome do produto"
              maxLength={120}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Tipo de produto <span className="text-primary">*</span>
              </Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Categoria <span className="text-primary">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
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
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-sales">URL da página de vendas</Label>
            <Input
              id="p-sales"
              type="url"
              value={salesUrl}
              onChange={(e) => setSalesUrl(e.target.value)}
              placeholder="https:// seusite.com/vendas"
              disabled={noSalesPage}
            />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={noSalesPage}
                onCheckedChange={(v) => setNoSalesPage(!!v)}
                id="no-sales"
              />
              <span>Não possuo página de vendas</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="p-price">
                Preço <span className="text-primary">*</span>
              </Label>
              <Input
                id="p-price"
                value={price ? `R$ ${price}` : ""}
                onChange={(e) => setPrice(formatBRL(e.target.value))}
                placeholder="R$ 0,00"
                inputMode="decimal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">Estoque</Label>
              <Input
                id="p-stock"
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-code">Código (SKU)</Label>
              <Input
                id="p-code"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="Ex: PROD-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-email">
                E-mail de suporte <span className="text-primary">*</span>
              </Label>
              <Input
                id="p-email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="suporte@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-wa">
                WhatsApp de suporte <span className="text-primary">*</span>
              </Label>
              <Input
                id="p-wa"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">
              Descrição <span className="text-primary">*</span>
            </Label>
            <div className="relative">
              <Textarea
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, DESC_MAX))}
                placeholder="Descreva seu produto com pelo menos 250 caracteres..."
                rows={5}
                required
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">
                {descLen}/{DESC_MAX}
              </span>
            </div>
            <p className={`text-xs ${descLen >= DESC_MIN ? "text-muted-foreground" : "text-primary/90"}`}>
              Mínimo de {DESC_MIN} caracteres para uma descrição detalhada
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="rounded-full"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-full"
              style={{ background: "var(--gradient-brand)" }}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar produto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

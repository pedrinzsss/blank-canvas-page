import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface ConfigureOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string | null;
  onSaved?: () => void;
}

interface ProductLite {
  id: string;
  title: string;
  category: string | null;
  refund_deadline_days: number | null;
  image_url: string | null;
}

export function ConfigureOfferDialog({
  open,
  onOpenChange,
  offerId,
  onSaved,
}: ConfigureOfferDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [invoiceName, setInvoiceName] = useState("");
  const [salesPageUrl, setSalesPageUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!offerId) return;
    setLoading(true);
    const [offerRes, productsRes] = await Promise.all([
      supabase
        .from("offers")
        .select(
          "id, product_id, description, invoice_name, sales_page_url, support_email, support_whatsapp",
        )
        .eq("id", offerId)
        .maybeSingle(),
      supabase
        .from("products")
        .select("id, title, category, refund_deadline_days, image_url")
        .order("created_at", { ascending: false }),
    ]);
    if (offerRes.error) toast.error(offerRes.error.message);
    if (productsRes.error) toast.error(productsRes.error.message);
    const offer = offerRes.data;
    const prods = (productsRes.data ?? []) as ProductLite[];
    setProducts(prods);
    if (offer) {
      setProductId(offer.product_id);
      setDescription(offer.description ?? "");
      setInvoiceName(offer.invoice_name ?? "");
      setSalesPageUrl(offer.sales_page_url ?? "");
      setSupportEmail(offer.support_email ?? "");
      setSupportWhatsapp(offer.support_whatsapp ?? "");
    }
    setLoading(false);
  }, [offerId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;

  async function handleSave() {
    if (!offerId) return;
    if (!productId) {
      toast.error("Selecione um produto");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("offers")
      .update({
        product_id: productId,
        description: description.trim() || null,
        invoice_name: invoiceName.trim() || null,
        sales_page_url: salesPageUrl.trim() || null,
        support_email: supportEmail.trim() || null,
        support_whatsapp: supportWhatsapp.trim() || null,
      })
      .eq("id", offerId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Oferta atualizada");
    onOpenChange(false);
    onSaved?.();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!productId) {
      toast.error("Selecione um produto primeiro");
      return;
    }
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG ou WEBP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Tamanho máximo é 10MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${productId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data, error: signErr } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !data) throw signErr ?? new Error("Erro ao gerar URL");
      const url = data.signedUrl;
      const { error: updErr } = await supabase
        .from("products")
        .update({ image_url: url })
        .eq("id", productId);
      if (updErr) throw updErr;
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, image_url: url } : p)),
      );
      toast.success("Imagem enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 border-border bg-card p-0">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold">Configurar Oferta</h3>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Produto <span className="text-destructive">*</span>
                </label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Imagem do Produto
                </label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
                    {selectedProduct?.image_url ? (
                      <img
                        src={selectedProduct.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !productId}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <ImagePlus className="mr-2 h-4 w-4" />
                          {selectedProduct?.image_url ? "Trocar imagem" : "Enviar imagem"}
                        </>
                      )}
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PNG, JPG ou WEBP. Máx. 10MB. 600x600 recomendado.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição da oferta"
                  rows={3}
                  className="mt-1 bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome na Fatura</label>
                <Input
                  value={invoiceName}
                  onChange={(e) => setInvoiceName(e.target.value)}
                  placeholder="Nome exibido na fatura"
                  className="mt-1 bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Categoria do Produto
                  </label>
                  <Input
                    value={selectedProduct?.category ?? ""}
                    readOnly
                    disabled
                    placeholder="—"
                    className="mt-1 bg-muted"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Puxado do produto selecionado
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Prazo de Reembolso
                  </label>
                  <Input
                    value={
                      selectedProduct?.refund_deadline_days != null
                        ? `${selectedProduct.refund_deadline_days} dias`
                        : ""
                    }
                    readOnly
                    disabled
                    placeholder="—"
                    className="mt-1 bg-muted"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Puxado do produto selecionado
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  URL da Página de Vendas
                </label>
                <Input
                  value={salesPageUrl}
                  onChange={(e) => setSalesPageUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    E-mail de Suporte
                  </label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="suporte@empresa.com"
                    className="mt-1 bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    WhatsApp de Suporte
                  </label>
                  <Input
                    value={supportWhatsapp}
                    onChange={(e) => setSupportWhatsapp(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="mt-1 bg-background"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

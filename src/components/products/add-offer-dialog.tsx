import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AddOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onSaved?: () => void;
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

export function AddOfferDialog({ open, onOpenChange, productId, onSaved }: AddOfferDialogProps) {
  const [name, setName] = useState("");
  const [priceText, setPriceText] = useState("0,00");
  const [currency, setCurrency] = useState("BRL");
  const [language, setLanguage] = useState("pt-BR");
  const [offerType, setOfferType] = useState("nacional");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setPriceText("0,00");
      setCurrency("BRL");
      setLanguage("pt-BR");
      setOfferType("nacional");
    }
  }, [open]);

  function parseCents(v: string): number {
    const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }

  async function handleSubmit() {
    if (!productId) return;
    if (!name.trim()) {
      toast.error("Informe o nome da oferta");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("offers").insert({
      product_id: productId,
      name: name.trim(),
      price_cents: parseCents(priceText),
      currency,
      checkout_language: language,
      offer_type: offerType,
      status: "active",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Oferta criada");
    onOpenChange(false);
    onSaved?.();
  }

  const currencySymbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 border-border bg-card p-0">
        <div className="px-6 pt-6">
          <h3 className="text-lg font-semibold">Adicionar Oferta</h3>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Nome da oferta <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da oferta"
              className="mt-1 bg-background"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Nome da oferta apenas para identificação
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Preço <span className="text-destructive">*</span>
              </label>
              <div className="mt-1 flex items-center rounded-md border border-input bg-background">
                <span className="pl-3 text-sm text-muted-foreground">{currencySymbol}</span>
                <Input
                  value={priceText}
                  onChange={(e) => setPriceText(e.target.value)}
                  className="border-0 bg-transparent"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Moeda <span className="text-destructive">*</span>
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1 bg-background">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Idioma do checkout <span className="text-destructive">*</span>
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1 bg-background">
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
              <label className="text-xs font-medium text-muted-foreground">
                Qual o tipo desta oferta? <span className="text-destructive">*</span>
              </label>
              <Select value={offerType} onValueChange={setOfferType}>
                <SelectTrigger className="mt-1 bg-background">
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

          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-medium text-destructive hover:underline"
            >
              Cancelar
            </button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="text-white"
              style={{ background: "var(--gradient-brand)" }}
            >
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface AffiliationDialogProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AffiliateRow {
  id: string;
  status: string;
  affiliate_user_id: string;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

export function AffiliationDialog({ productId, open, onOpenChange }: AffiliationDialogProps) {
  const [tab, setTab] = useState<"config" | "afiliados">("config");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<string>("approve");
  const [commission, setCommission] = useState<string>("0");
  const [description, setDescription] = useState<string>("");
  const [showInShowcase, setShowInShowcase] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);

  useEffect(() => {
    if (!open || !productId) return;
    setTab("config");
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("affiliation_mode, affiliate_commission_percent, affiliate_description, show_in_showcase")
        .eq("id", productId)
        .maybeSingle();
      if (error) {
        toast.error("Erro ao carregar configurações");
      } else if (data) {
        setMode((data as any).affiliation_mode ?? "approve");
        setCommission(String((data as any).affiliate_commission_percent ?? 0));
        setDescription((data as any).affiliate_description ?? "");
        setShowInShowcase(Boolean((data as any).show_in_showcase));
      }
      setLoading(false);
    })();
  }, [open, productId]);

  useEffect(() => {
    if (!open || !productId || tab !== "afiliados") return;
    (async () => {
      const { data, error } = await supabase
        .from("affiliations")
        .select("id, status, affiliate_user_id")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar afiliados");
        return;
      }
      const rows = (data ?? []) as { id: string; status: string; affiliate_user_id: string }[];
      if (rows.length === 0) {
        setAffiliates([]);
        return;
      }
      const ids = rows.map((r) => r.affiliate_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", ids);
      const map = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => map.set(p.id, p));
      setAffiliates(
        rows.map((r) => ({
          ...r,
          profile: map.get(r.affiliate_user_id) ?? null,
        })),
      );
    })();
  }, [open, productId, tab]);

  async function handleSave() {
    if (!productId) return;
    setSaving(true);
    const pct = Math.max(0, Math.min(100, Number(commission) || 0));
    const { error } = await supabase
      .from("products")
      .update({
        affiliation_mode: mode,
        affiliate_commission_percent: pct,
        affiliate_description: description,
        show_in_showcase: showInShowcase,
      } as any)
      .eq("id", productId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success("Configurações salvas");
    onOpenChange(false);
  }

  const filtered = affiliates.filter((a) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (a.profile?.full_name ?? "").toLowerCase().includes(s) ||
      (a.profile?.email ?? "").toLowerCase().includes(s) ||
      (a.profile?.phone ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Programa de Afiliados</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab("config")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "config"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Configurações
          </button>
          <button
            type="button"
            onClick={() => setTab("afiliados")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "afiliados"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Afiliados
          </button>
        </div>

        {tab === "config" ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Opções de afiliação <span className="text-destructive">*</span>
                </Label>
                <Select value={mode} onValueChange={setMode} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Permitir que qualquer pessoa seja afiliada</SelectItem>
                    <SelectItem value="approve">Novos afiliados devem ser aprovados</SelectItem>
                    <SelectItem value="disabled">Não permitir afiliados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>
                  Comissão do afiliado <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comissão padrão aplicada para novos afiliados.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Descrição para afiliados <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={showInShowcase} onCheckedChange={setShowInShowcase} />
              <span className="text-sm">Exibir produto na vitrine</span>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="flex gap-2">
              <Input
                placeholder="Digite o nome, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="outline" size="icon" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 py-10 text-center text-sm font-medium text-destructive">
                Nenhum afiliado encontrado para este produto
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
                  >
                    <div className="space-y-0.5 text-sm">
                      <div className="font-medium">{a.profile?.full_name ?? "—"}</div>
                      <div className="text-muted-foreground">{a.profile?.email ?? "—"}</div>
                      <div className="text-muted-foreground">{a.profile?.phone ?? "—"}</div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {a.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

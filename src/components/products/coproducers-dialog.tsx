import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface CoproducersDialogProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CoproducerRow {
  id: string;
  user_id: string;
  commission_percent: number;
  profile: { full_name: string | null; email: string | null } | null;
}

export function CoproducersDialog({ productId, open, onOpenChange }: CoproducersDialogProps) {
  const [rows, setRows] = useState<CoproducerRow[]>([]);
  const [email, setEmail] = useState("");
  const [percent, setPercent] = useState("0");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const used = rows.reduce((acc, r) => acc + Number(r.commission_percent || 0), 0);
  const remaining = Math.max(0, 100 - used);

  async function load() {
    if (!productId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_coproducers" as any)
      .select("id, user_id, commission_percent")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar co-produtores");
      setLoading(false);
      return;
    }
    const list = (data ?? []) as unknown as { id: string; user_id: string; commission_percent: number }[];
    if (list.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", list.map((r) => r.user_id));
    const map = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => map.set(p.id, p));
    setRows(list.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null })));
    setLoading(false);
  }

  useEffect(() => {
    if (open && productId) {
      setEmail("");
      setPercent("0");
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  async function handleAdd() {
    if (!productId) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      toast.error("Informe um email válido");
      return;
    }
    const pct = Number(String(percent).replace(",", "."));
    if (!Number.isFinite(pct) || pct <= 0 || pct > remaining) {
      toast.error(`Comissão deve ser entre 0 e ${remaining.toFixed(2)}%`);
      return;
    }
    setSaving(true);
    const { data: userId, error: lookupErr } = await supabase.rpc("find_user_id_by_email" as any, {
      _email: cleanEmail,
    });
    if (lookupErr) {
      setSaving(false);
      toast.error("Erro ao localizar usuário");
      return;
    }
    if (!userId) {
      setSaving(false);
      toast.error("Este email não está cadastrado na plataforma");
      return;
    }
    const { error } = await supabase.from("product_coproducers" as any).insert({
      product_id: productId,
      user_id: userId,
      commission_percent: pct,
    });
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "Este usuário já é co-produtor deste produto"
          : error.message,
      );
      return;
    }
    toast.success("Co-produtor adicionado");
    setEmail("");
    setPercent("0");
    load();
  }

  async function handleRemove(id: string) {
    const { error } = await supabase.from("product_coproducers" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    toast.success("Co-produtor removido");
    load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 border-border bg-card p-0">
        <div className="px-6 pt-6">
          <h3 className="text-lg font-semibold">Adicionando co-produtor</h3>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Email do co-produtor <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="mt-1 bg-background"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Porcentagem de comissão <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min={0}
              max={remaining}
              step="0.01"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="mt-1 bg-background"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Máximo para o co-produtor {remaining.toFixed(1)}%
            </p>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : rows.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Co-produtores atuais
              </div>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {r.profile?.full_name || r.profile?.email || r.user_id}
                    </div>
                    {r.profile?.email && (
                      <div className="truncate text-xs text-muted-foreground">
                        {r.profile.email}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{Number(r.commission_percent).toFixed(1)}%</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(r.id)}
                      className="text-destructive hover:text-destructive/80"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-sm font-medium text-destructive hover:underline"
            >
              Cancelar
            </button>
            <Button
              onClick={handleAdd}
              disabled={saving}
              className="bg-primary text-white hover:bg-primary"
            >
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

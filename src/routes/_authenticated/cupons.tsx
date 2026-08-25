import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TicketPercent, Plus, Search, Trash2, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cupons")({
  head: () => ({
    meta: [
      { title: "Cupons — Paglink" },
      { name: "description", content: "Crie e gerencie cupons de desconto para suas vendas." },
      { property: "og:title", content: "Cupons — Paglink" },
      { property: "og:description", content: "Crie e gerencie cupons de desconto para suas vendas." },
    ],
  }),
  component: CuponsPage,
});

type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
};

type FormState = {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: string;
  expires_at: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  discount_type: "percent",
  discount_value: 10,
  max_uses: "",
  expires_at: "",
  active: true,
};

function CuponsPage() {
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("id, code, discount_type, discount_value, max_uses, uses_count, expires_at, active")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as CouponRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((c) => c.code.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: CouponRow) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      max_uses: c.max_uses?.toString() ?? "",
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      active: c.active,
    });
    setOpen(true);
  };

  const save = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) return toast.error("Informe o código");
    if (!/^[A-Z0-9_-]{3,32}$/.test(code))
      return toast.error("Código deve ter 3-32 caracteres (A-Z, 0-9, _ ou -)");
    if (form.discount_value <= 0) return toast.error("Desconto deve ser maior que zero");
    if (form.discount_type === "percent" && form.discount_value > 100)
      return toast.error("Desconto percentual não pode passar de 100%");
    if (form.max_uses && Number(form.max_uses) <= 0)
      return toast.error("Limite de usos deve ser maior que zero");
    if (form.expires_at) {
      const exp = new Date(form.expires_at);
      exp.setHours(23, 59, 59, 999);
      if (exp.getTime() < Date.now())
        return toast.error("Validade não pode estar no passado");
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSaving(false);
      return toast.error("Sessão expirada");
    }
    const payload = {
      code,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      active: form.active,
    };
    const { error } = editingId
      ? await supabase.from("coupons").update(payload).eq("id", editingId)
      : await supabase.from("coupons").insert({ ...payload, user_id: userData.user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Cupom atualizado" : "Cupom criado");
    setOpen(false);
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, active } : x)));
    const { error } = await supabase.from("coupons").update({ active }).eq("id", id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cupom excluído");
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <AppShell title="Cupons" subtitle="Crie e gerencie cupons de desconto">
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar cupom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-lg border-border bg-card/60 pl-9"
            />
          </div>
          <Button className="h-10 rounded-lg gap-2 font-semibold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Criar cupom
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground">
                {["Código", "Tipo", "Desconto", "Usos", "Validade", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                      <TicketPercent className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mt-3 font-medium text-foreground">Nenhum cupom cadastrado</p>
                    <p className="mt-1 text-sm">Crie seu primeiro cupom para oferecer descontos.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                  const exhausted = c.max_uses != null && c.uses_count >= c.max_uses;
                  return (
                    <tr key={c.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                      <td className="px-4 py-3">{c.discount_type === "percent" ? "Percentual" : "Fixo"}</td>
                      <td className="px-4 py-3">
                        {c.discount_type === "percent"
                          ? `${Number(c.discount_value)}%`
                          : `R$ ${(Number(c.discount_value) / 100).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.uses_count}
                        {c.max_uses != null ? ` / ${c.max_uses}` : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={c.active} onCheckedChange={(v) => toggle(c.id, v)} />
                          {(expired || exhausted) && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {expired ? "Expirado" : "Esgotado"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar cupom" : "Criar cupom"}</DialogTitle>
            <DialogDescription>Configure código, tipo de desconto, validade e limite</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código</label>
              <Input
                placeholder="EX: BEMVINDO10"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="h-11 rounded-lg border-border bg-muted/30 uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de desconto</label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v: "percent" | "fixed") => setForm({ ...form, discount_type: v })}
                >
                  <SelectTrigger className="h-11 rounded-lg border-border bg-muted/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Desconto</label>
                <Input
                  type="number"
                  step="0.01"
                  value={
                    form.discount_type === "percent"
                      ? form.discount_value
                      : (form.discount_value / 100).toFixed(2)
                  }
                  onChange={(e) => {
                    const n = Number(e.target.value) || 0;
                    setForm({
                      ...form,
                      discount_value: form.discount_type === "percent" ? n : Math.round(n * 100),
                    });
                  }}
                  className="h-11 rounded-lg border-border bg-muted/30"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Limite de usos</label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Ilimitado"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  className="h-11 rounded-lg border-border bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Validade</label>
                <Input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="h-11 rounded-lg border-border bg-muted/30"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Status ativo</p>
                <p className="text-xs text-muted-foreground">Cupons inativos não podem ser aplicados</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button className="rounded-full px-6 font-semibold" onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Salvar cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

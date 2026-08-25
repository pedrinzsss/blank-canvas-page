import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Truck, Percent, Plus, Pencil, Trash2 } from "lucide-react";
import { useCheckoutConfig, type FeeMethod, type ShippingRule } from "@/lib/checkout-config-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/taxas-e-fretes")({
  head: () => ({
    meta: [
      { title: "Taxas e Fretes — Paglink" },
      { name: "description", content: "Configure taxas e opções de frete das suas vendas." },
      { property: "og:title", content: "Taxas e Fretes — Paglink" },
      { property: "og:description", content: "Configure taxas e opções de frete das suas vendas." },
    ],
  }),
  component: TaxasFretesPage,
});

const METHODS: Array<{ id: FeeMethod; label: string }> = [
  { id: "pix", label: "PIX" },
  { id: "credit_card", label: "Cartão de Crédito" },
  { id: "boleto", label: "Boleto" },
];

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type FormState = {
  id: string | null;
  name: string;
  region: string;
  price: string;
  deadline: string;
  min: string;
  max: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  region: "Brasil",
  price: "0",
  deadline: "5 dias úteis",
  min: "0",
  max: "",
  active: true,
};

function TaxasFretesPage() {
  const { config, update } = useCheckoutConfig();

  const setFee = (m: FeeMethod, patch: Partial<typeof config.fees.pix>) => {
    update((c) => ({ ...c, fees: { ...c.fees, [m]: { ...c.fees[m], ...patch } } }));
  };

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };
  const openEdit = (r: ShippingRule) => {
    setForm({
      id: r.id,
      name: r.name,
      region: r.region,
      price: (r.price_cents / 100).toFixed(2),
      deadline: r.deadline,
      min: (r.min_cents / 100).toFixed(2),
      max: r.max_cents == null ? "" : (r.max_cents / 100).toFixed(2),
      active: r.active,
    });
    setOpen(true);
  };

  const save = () => {
    const name = form.name.trim();
    if (!name) return toast.error("Informe o nome da regra");
    const price_cents = Math.round((Number(form.price) || 0) * 100);
    const min_cents = Math.max(0, Math.round((Number(form.min) || 0) * 100));
    const max_cents = form.max.trim() === "" ? null : Math.round((Number(form.max) || 0) * 100);
    if (max_cents != null && max_cents < min_cents)
      return toast.error("Faixa máxima deve ser maior que a mínima");

    if (form.id) {
      update((c) => ({
        ...c,
        shipping: c.shipping.map((r) =>
          r.id === form.id
            ? { ...r, name, region: form.region, price_cents, deadline: form.deadline, min_cents, max_cents, active: form.active }
            : r,
        ),
      }));
      toast.success("Regra atualizada");
    } else {
      const rule: ShippingRule = {
        id: crypto.randomUUID(),
        name,
        region: form.region || "Brasil",
        price_cents,
        deadline: form.deadline || "-",
        min_cents,
        max_cents,
        active: form.active,
      };
      update((c) => ({ ...c, shipping: [...c.shipping, rule] }));
      toast.success("Regra criada");
    }
    setOpen(false);
  };

  const toggleActive = (id: string, v: boolean) =>
    update((c) => ({ ...c, shipping: c.shipping.map((r) => (r.id === id ? { ...r, active: v } : r)) }));

  const remove = (id: string) => {
    if (!confirm("Remover esta regra de frete?")) return;
    update((c) => ({ ...c, shipping: c.shipping.filter((r) => r.id !== id) }));
    toast.success("Regra removida");
  };

  const rangeLabel = useMemo(
    () => (r: ShippingRule) =>
      r.max_cents == null
        ? `Acima de ${brl(r.min_cents)}`
        : `${brl(r.min_cents)} — ${brl(r.max_cents)}`,
    [],
  );

  return (
    <AppShell title="Taxas e Fretes" subtitle="Gerencie as taxas e opções de frete aplicadas nas vendas">
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <Percent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Taxas</h2>
                <p className="text-sm text-muted-foreground">
                  Percentual + valor fixo por método. Ative "repasse" para somar ao total do cliente.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {METHODS.map(({ id, label }) => {
                const f = config.fees[id];
                return (
                  <div key={id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        Repassar ao cliente
                        <Switch
                          checked={f.pass_to_customer}
                          onCheckedChange={(v) => setFee(id, { pass_to_customer: v })}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] text-muted-foreground">%</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={f.percent}
                          onChange={(e) => setFee(id, { percent: Number(e.target.value) || 0 })}
                          className="h-9 rounded-lg border-border bg-card/60"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] text-muted-foreground">R$ fixo</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(f.fixed_cents / 100).toFixed(2)}
                          onChange={(e) =>
                            setFee(id, { fixed_cents: Math.round((Number(e.target.value) || 0) * 100) })
                          }
                          className="h-9 rounded-lg border-border bg-card/60"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button className="w-full rounded-lg font-semibold" onClick={() => toast.success("Taxas salvas")}>
                Salvar taxas
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/40 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-display text-lg font-semibold">Fretes</h2>
                <p className="text-sm text-muted-foreground">
                  Regras aplicadas por faixa de valor do pedido (somente produtos físicos).
                </p>
              </div>
              <Button size="sm" className="rounded-lg gap-2" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Nova regra
              </Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Nome</th>
                    <th className="px-3 py-2 text-left font-medium">Região</th>
                    <th className="px-3 py-2 text-left font-medium">Faixa</th>
                    <th className="px-3 py-2 text-left font-medium">Valor</th>
                    <th className="px-3 py-2 text-left font-medium">Prazo</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {config.shipping.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                        Nenhuma regra de frete cadastrada.
                      </td>
                    </tr>
                  ) : (
                    config.shipping.map((r) => (
                      <tr key={r.id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.region}</td>
                        <td className="px-3 py-2 text-muted-foreground">{rangeLabel(r)}</td>
                        <td className="px-3 py-2">{brl(r.price_cents)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.deadline}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Switch checked={r.active} onCheckedChange={(v) => toggleActive(r.id, v)} />
                            <Badge variant={r.active ? "default" : "secondary"} className="text-[10px]">
                              {r.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar regra de frete" : "Nova regra de frete"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Sudeste padrão" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Região</label>
              <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valor do frete (R$)</label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Prazo</label>
              <Input value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Faixa mín. do pedido (R$)</label>
              <Input type="number" step="0.01" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Faixa máx. do pedido (R$)</label>
              <Input type="number" step="0.01" placeholder="sem limite" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} />
            </div>
            <label className="col-span-2 mt-1 flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
              <span className="text-sm">Regra ativa</span>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{form.id ? "Salvar" : "Criar regra"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

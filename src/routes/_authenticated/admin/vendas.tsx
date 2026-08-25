import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileDown,
  Filter,
  Search,
  DollarSign,
  Clock,
  XCircle,
  RotateCcw,
  Eye,
  ChevronDown,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/vendas")({
  component: VendasPage,
});

type ChargeRow = {
  id: string;
  client_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_method: string;
  created_at: string;
  paid_at: string | null;
  description: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_document: string | null;
  producer_name: string | null;
  producer_email: string | null;
};

type DateRange = "hoje" | "7d" | "semana" | "mes" | "todos";
const RANGE_LABEL: Record<DateRange, string> = {
  hoje: "Hoje",
  "7d": "Últimos 7 dias",
  semana: "Última semana",
  mes: "Este mês",
  todos: "Todos os períodos",
};

function VendasPage() {
  const [rows, setRows] = useState<ChargeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [orderId, setOrderId] = useState("");
  const [e2e, setE2e] = useState("");
  const [customer, setCustomer] = useState("");
  const [cpf, setCpf] = useState("");
  const [producer, setProducer] = useState("");
  const [acquirer, setAcquirer] = useState("Todas");
  const [method, setMethod] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [releaseStatus, setReleaseStatus] = useState("Todos");
  const [range, setRange] = useState<DateRange>("semana");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [viewRow, setViewRow] = useState<ChargeRow | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [chargeRes, clientRes, custRes, profRes] = await Promise.all([
      supabase
        .from("charges")
        .select("id, client_id, amount_cents, currency, status, payment_method, created_at, paid_at, description, customer_id")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("api_clients").select("id, user_id"),
      supabase.from("customers").select("id, name, email, document"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

    const clientToUser = new Map<string, string>();
    (clientRes.data ?? []).forEach((c: { id: string; user_id: string }) => clientToUser.set(c.id, c.user_id));
    const custMap = new Map<string, { name: string; email: string | null; document: string | null }>();
    (custRes.data ?? []).forEach((c) => custMap.set(c.id, { name: c.name, email: c.email, document: c.document }));
    const profMap = new Map<string, { full_name: string | null; email: string | null }>();
    (profRes.data ?? []).forEach((p) => profMap.set(p.id, { full_name: p.full_name, email: p.email }));

    const list: ChargeRow[] = (chargeRes.data ?? []).map((c) => {
      const uid = clientToUser.get(c.client_id);
      const prof = uid ? profMap.get(uid) : null;
      const cust = c.customer_id ? custMap.get(c.customer_id) : null;
      return {
        id: c.id,
        client_id: c.client_id,
        amount_cents: c.amount_cents,
        currency: c.currency,
        status: c.status,
        payment_method: c.payment_method,
        created_at: c.created_at,
        paid_at: c.paid_at,
        description: c.description,
        customer_id: c.customer_id,
        customer_name: cust?.name ?? null,
        customer_email: cust?.email ?? null,
        customer_document: cust?.document ?? null,
        producer_name: prof?.full_name ?? null,
        producer_email: prof?.email ?? null,
      };
    });

    setRows(list);
    setLoading(false);
  }

  const rangeStart = useMemo(() => {
    const now = new Date();
    switch (range) {
      case "hoje":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case "7d":
        return new Date(now.getTime() - 7 * 86400000).toISOString();
      case "semana":
        return new Date(now.getTime() - 7 * 86400000).toISOString();
      case "mes":
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case "todos":
        return null;
    }
  }, [range]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (rangeStart && r.created_at < rangeStart) return false;
      if (orderId && !r.id.toLowerCase().includes(orderId.toLowerCase())) return false;
      if (e2e && !r.id.toLowerCase().includes(e2e.toLowerCase())) return false;
      if (customer) {
        const q = customer.toLowerCase();
        if (!(r.customer_name ?? "").toLowerCase().includes(q) && !(r.customer_email ?? "").toLowerCase().includes(q)) return false;
      }
      if (cpf) {
        if (!(r.customer_document ?? "").replace(/\D/g, "").includes(cpf.replace(/\D/g, ""))) return false;
      }
      if (producer) {
        const q = producer.toLowerCase();
        if (!(r.producer_name ?? "").toLowerCase().includes(q) && !(r.producer_email ?? "").toLowerCase().includes(q)) return false;
      }
      if (method !== "Todos" && r.payment_method !== method) return false;
      if (status !== "Todos" && r.status !== status) return false;
      // acquirer/releaseStatus are placeholders — not stored yet
      return true;
    });
  }, [rows, rangeStart, orderId, e2e, customer, cpf, producer, method, status]);

  const totals = useMemo(() => {
    const sum = (s: string) => filtered.filter((r) => r.status === s).reduce((a, b) => a + b.amount_cents, 0);
    const count = (s: string) => filtered.filter((r) => r.status === s).length;
    return {
      pago: { value: sum("paid"), count: count("paid") },
      pendente: { value: sum("pending"), count: count("pending") },
      falha: { value: sum("failed") + sum("canceled"), count: count("failed") + count("canceled") },
      chargeback: { value: sum("chargeback"), count: count("chargeback") },
      reembolsado: { value: sum("refunded"), count: count("refunded") },
      total: filtered.length,
    };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [orderId, e2e, customer, cpf, producer, method, status, releaseStatus, acquirer, range, pageSize]);

  function exportCsv() {
    const header = ["ID", "Produtor", "Email produtor", "Cliente", "Email cliente", "CPF", "Método", "Status", "Valor", "Criado em", "Pago em"];
    const lines = filtered.map((r) =>
      [
        r.id,
        r.producer_name ?? "",
        r.producer_email ?? "",
        r.customer_name ?? "",
        r.customer_email ?? "",
        r.customer_document ?? "",
        r.payment_method,
        r.status,
        (r.amount_cents / 100).toFixed(2),
        r.created_at,
        r.paid_at ?? "",
      ]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação gerada");
  }

  return (
    <AdminShell title="Vendas" subtitle="Busque pelas vendas realizadas no seu gateway">
      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filtros</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar vendas
              </button>
              <div className="relative">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value as DateRange)}
                  className="appearance-none rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-xs text-foreground outline-none"
                >
                  {Object.entries(RANGE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <button
                onClick={() => void load()}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                title="Recarregar"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <TextInput label="ID do pedido / transação" value={orderId} onChange={setOrderId} />
            <TextInput label="ID da adquirente/End2End/Copia e cola" value={e2e} onChange={setE2e} />
            <TextInput label="Email/Nome do cliente" value={customer} onChange={setCustomer} />
            <TextInput label="CPF do cliente" value={cpf} onChange={setCpf} />
            <TextInput label="Email/Nome do produtor" value={producer} onChange={setProducer} />
            <SelectInput label="Adquirente" value={acquirer} onChange={setAcquirer} options={[{ value: "Todas", label: "Todas" }]} />
            <SelectInput
              label="Método de pagamento"
              value={method}
              onChange={setMethod}
              options={[
                { value: "Todos", label: "Todos" },
                { value: "pix", label: "Pix" },
                { value: "boleto", label: "Boleto" },
                { value: "credit_card", label: "Cartão de Crédito" },
              ]}
            />
            <SelectInput
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "Todos", label: "Todos" },
                { value: "paid", label: "Pago" },
                { value: "pending", label: "Pendente" },
                { value: "failed", label: "Falha" },
                { value: "chargeback", label: "Chargeback" },
                { value: "refunded", label: "Reembolso" },
              ]}
            />
            <SelectInput
              label="Status de liberação"
              value={releaseStatus}
              onChange={setReleaseStatus}
              options={[
                { value: "Todos", label: "Todos" },
                { value: "Regular", label: "Regular" },
                { value: "Bloqueado", label: "Bloqueado (Em Análise)" },
              ]}
            />

          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold">Filtrar por tags:</p>
            <p className="text-xs text-muted-foreground">
              Nenhuma tag encontrada. Crie tags primeiro na aba "Gerenciar Tags".
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard color="emerald" icon={<DollarSign className="h-5 w-5" />} label="Pago" value={totals.pago.value} count={totals.pago.count} total={totals.total} highlight />
          <StatCard color="amber" icon={<Clock className="h-5 w-5" />} label="Pendente" value={totals.pendente.value} count={totals.pendente.count} total={totals.total} />
          <StatCard color="red" icon={<XCircle className="h-5 w-5" />} label="Falhas" value={totals.falha.value} count={totals.falha.count} total={totals.total} />
          <StatCard color="red" icon={<XCircle className="h-5 w-5" />} label="Chargeback" value={totals.chargeback.value} count={totals.chargeback.count} total={totals.total} />
          <StatCard color="sky" icon={<RotateCcw className="h-5 w-5" />} label="Reembolsado" value={totals.reembolsado.value} count={totals.reembolsado.count} total={totals.total} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-6 py-4 font-medium">Produtor</th>
                <th className="px-4 py-4 font-medium">Cliente</th>
                <th className="px-4 py-4 font-medium">Pagamento</th>
                <th className="px-4 py-4 font-medium">Datas</th>
                <th className="px-4 py-4 font-medium">Valores</th>
                <th className="px-4 py-4 font-medium">Comissões e Taxas</th>
                <th className="px-4 py-4 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Sem resultados
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{r.producer_name ?? "—"}</p>
                      <p className="text-xs text-primary">{r.producer_email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{r.customer_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.customer_email ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.customer_document ?? ""}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs uppercase">{r.payment_method}</p>
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <p>Criado: {formatDate(r.created_at)}</p>
                      <p className="text-muted-foreground">Pago: {r.paid_at ? formatDate(r.paid_at) : "—"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{formatBrl(r.amount_cents)}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">—</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setViewRow(r)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
                          title="Visualizar"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-border px-6 py-4 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              Por página
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-foreground"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Página {page} de {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-border bg-background px-3 py-1 text-foreground disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="rounded-lg border border-border bg-background px-3 py-1 text-foreground disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da venda</DialogTitle>
            <DialogDescription>{viewRow?.id}</DialogDescription>
          </DialogHeader>
          {viewRow && (
            <div className="space-y-2 text-sm">
              <Field label="Produtor" value={`${viewRow.producer_name ?? "—"} — ${viewRow.producer_email ?? ""}`} />
              <Field label="Cliente" value={`${viewRow.customer_name ?? "—"} — ${viewRow.customer_email ?? ""}`} />
              <Field label="CPF cliente" value={viewRow.customer_document} />
              <Field label="Método" value={viewRow.payment_method} />
              <Field label="Status" value={viewRow.status} />
              <Field label="Valor" value={formatBrl(viewRow.amount_cents)} />
              <Field label="Criado em" value={formatDate(viewRow.created_at)} />
              <Field label="Pago em" value={viewRow.paid_at ? formatDate(viewRow.paid_at) : "—"} />
              <Field label="Descrição" value={viewRow.description} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-foreground outline-none"
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
      <div className="w-full">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground outline-none"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  count,
  total,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  count: number;
  total: number;
  color: "emerald" | "amber" | "red" | "sky";
  highlight?: boolean;
}) {
  const bg: Record<typeof color, string> = {
    emerald: "text-foreground bg-foreground/10",
    amber: "text-amber-400 bg-amber-500/15",
    red: "text-red-400 bg-red-500/15",
    sky: "text-sky-400 bg-sky-500/15",
  };
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border bg-card p-5 ${
        highlight ? "border-border" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-full ${bg[color]}`}>{icon}</span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{formatBrl(value)}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {count}/{total}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-foreground/10 text-foreground",
    pending: "bg-amber-500/15 text-amber-400",
    failed: "bg-red-500/15 text-red-400",
    canceled: "bg-red-500/15 text-red-400",
    refunded: "bg-sky-500/15 text-sky-400",
    chargeback: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

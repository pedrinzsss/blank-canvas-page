import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  DollarSign,
  Clock,
  XCircle,
  ChevronDown,
  Check,
  X,
  Eye,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/saques")({
  component: SaquesPage,
});

type PayoutRow = {
  id: string;
  client_id: string;
  amount_cents: number;
  status: string;
  bank_account: Record<string, unknown>;
  created_at: string;
  producer_name: string;
  producer_email: string;
};

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function SaquesPage() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("Última semana");
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<PayoutRow | null>(null);

  async function load() {
    setLoading(true);
    const { data: payouts, error } = await supabase
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar saques");
      setLoading(false);
      return;
    }
    const clientIds = Array.from(new Set((payouts ?? []).map((p) => p.client_id)));
    const { data: clients } = clientIds.length
      ? await supabase.from("api_clients").select("id,name,user_id").in("id", clientIds)
      : { data: [] as { id: string; name: string; user_id: string }[] };
    const userIds = Array.from(new Set((clients ?? []).map((c) => c.user_id)));
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id,full_name,email").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

    const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    setRows(
      (payouts ?? []).map((p) => {
        const c = clientMap.get(p.client_id);
        const prof = c ? profileMap.get(c.user_id) : undefined;
        return {
          id: p.id,
          client_id: p.client_id,
          amount_cents: p.amount_cents,
          status: p.status,
          bank_account: (p.bank_account as Record<string, unknown>) ?? {},
          created_at: p.created_at,
          producer_name: prof?.full_name ?? c?.name ?? "—",
          producer_email: prof?.email ?? "—",
        } as PayoutRow;
      }),
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const acc = {
      paid: { count: 0, total: 0 },
      processing: { count: 0, total: 0 },
      requested: { count: 0, total: 0 },
      failed: { count: 0, total: 0 },
    };
    for (const r of rows) {
      const key = (r.status as keyof typeof acc) in acc ? (r.status as keyof typeof acc) : null;
      if (key) {
        acc[key].count += 1;
        acc[key].total += r.amount_cents;
      }
    }
    return acc;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.producer_name.toLowerCase().includes(q) ||
        r.producer_email.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  async function updateStatus(id: string, status: "paid" | "failed" | "processing") {
    const { error } = await supabase.from("payouts").update({ status }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar solicitação");
      return;
    }
    toast.success(
      status === "paid" ? "Saque aprovado" : status === "failed" ? "Saque rejeitado" : "Marcado como processando",
    );
    load();
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    setSelected((s) => {
      if (s.size === paginated.length) return new Set();
      return new Set(paginated.map((r) => r.id));
    });
  }

  return (
    <AdminShell title="Financeiro" subtitle="Gestão financeira">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Transferências</h2>
            <p className="text-sm text-muted-foreground">Lista de transferências realizadas</p>
          </div>
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-card px-4 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option>Hoje</option>
              <option>Últimos 7 dias</option>
              <option>Última semana</option>
              <option>Últimos 30 dias</option>
              <option>Este mês</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email do produtor..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary">
            <Filter className="h-4 w-4" />
            Filtros Avançados
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            iconClass="text-foreground"
            label="Concluído"
            value={formatBRL(stats.paid.total)}
            count={`${stats.paid.count}/${rows.length}`}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            iconClass="text-amber-400"
            label="Transferindo"
            value={formatBRL(stats.processing.total)}
            count={`${stats.processing.count}/${rows.length}`}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            iconClass="text-amber-400"
            label="Processando"
            value={formatBRL(0)}
            count={`0/${rows.length}`}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            iconClass="text-amber-500"
            label="Pendente"
            value={formatBRL(stats.requested.total)}
            count={`${stats.requested.count}/${rows.length}`}
          />
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            iconClass="text-red-500"
            label="Falhou/Cancelado"
            value={formatBRL(stats.failed.total)}
            count={`${stats.failed.count}/${rows.length}`}
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={paginated.length > 0 && selected.size === paginated.length}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-border bg-background"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Produtor</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Conta</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Risco</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data de solicitação</th>
                  <th className="px-4 py-3 text-right font-medium text-primary">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                      Sem resultados
                    </td>
                  </tr>
                ) : (
                  paginated.map((r) => {
                    const ba = r.bank_account as Record<string, string | undefined>;
                    const conta = ba.pix_key ?? ba.account ?? ba.bank ?? "—";
                    const tipo = ba.type ?? (ba.pix_key ? "PIX" : "TED");
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                            className="h-4 w-4 rounded border-border bg-background"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{r.producer_name}</div>
                          <div className="text-xs text-muted-foreground">{r.producer_email}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">{formatBRL(r.amount_cents)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{String(conta)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{String(tipo)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground">
                            Baixo
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Visualizar"
                              onClick={() => setViewing(r)}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {r.status === "requested" && (
                              <>
                                <button
                                  title="Aprovar"
                                  onClick={() => updateStatus(r.id, "paid")}
                                  className="rounded-md p-1.5 text-foreground hover:bg-foreground/10"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  title="Rejeitar"
                                  onClick={() => updateStatus(r.id, "failed")}
                                  className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
            <div />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Por página</span>
              <div className="relative">
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="appearance-none rounded-md border border-border bg-card px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => (p * perPage < filtered.length ? p + 1 : p))}
                disabled={page * perPage >= filtered.length}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do saque</DialogTitle>
            <DialogDescription>Informações da solicitação de transferência.</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <Info label="Produtor" value={viewing.producer_name} />
              <Info label="Email" value={viewing.producer_email} />
              <Info label="Valor" value={formatBRL(viewing.amount_cents)} />
              <Info label="Status" value={statusLabel(viewing.status)} />
              <Info label="Data" value={formatDate(viewing.created_at)} />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Dados bancários</p>
                <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
                  {JSON.stringify(viewing.bank_account, null, 2)}
                </pre>
              </div>
              {viewing.status === "requested" && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      updateStatus(viewing.id, "failed");
                      setViewing(null);
                    }}
                    className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10"
                  >
                    Rejeitar
                  </button>
                  <button
                    onClick={() => {
                      updateStatus(viewing.id, "paid");
                      setViewing(null);
                    }}
                    className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    Aprovar
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  count,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  count: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={iconClass}>{icon}</div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "paid":
      return "Concluído";
    case "processing":
      return "Transferindo";
    case "requested":
      return "Pendente";
    case "failed":
      return "Falhou/Cancelado";
    default:
      return s;
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: "bg-foreground/10 text-foreground",
    processing: "bg-amber-500/15 text-amber-400",
    requested: "bg-amber-500/15 text-amber-400",
    failed: "bg-red-500/15 text-red-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${map[status] ?? "bg-secondary text-muted-foreground"}`}>
      {statusLabel(status)}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

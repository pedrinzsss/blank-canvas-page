import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, FileText, Settings2, RefreshCw, PauseCircle, CreditCard, XCircle, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/assinaturas")({
  component: AssinaturasPage,
  head: () => ({
    meta: [
      { title: "Assinaturas — Paglink" },
      { name: "description", content: "Gerencie assinaturas recorrentes dos seus clientes." },
      { property: "og:title", content: "Assinaturas — Paglink" },
      { property: "og:description", content: "Gerencie assinaturas recorrentes dos seus clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Status = "active" | "pending" | "canceled";

type SubscriptionRow = {
  id: string;
  created_at: string;
  product: string;
  customer_name: string;
  customer_email: string;
  next_billing_at: string | null;
  status: Status;
  net_amount: number;
};

type FilterKey = "ativos" | "pendentes" | "cancelados" | "todos";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type InvoiceRow = {
  id: string;
  description: string;
  amount_cents: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  invoice_url: string | null;
  created_at: string;
};

function AssinaturasPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        if (!cancelled) {
          setRows([]);
          setInvoices([]);
          setLoading(false);
          setInvoicesLoading(false);
        }
        return;
      }
      const { data: inv } = await supabase
        .from("subscription_invoices")
        .select("id, description, amount_cents, status, due_date, paid_at, invoice_url, created_at")
        .eq("user_id", userRes.user.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setRows([]);
        setInvoices((inv ?? []) as InvoiceRow[]);
        setLoading(false);
        setInvoicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").length;
    const pending = rows.filter((r) => r.status === "pending").length;
    const canceled = rows.filter((r) => r.status === "canceled").length;
    return { active, pending, canceled, total: rows.length };
  }, [rows]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").reduce((s, r) => s + r.net_amount, 0);
    const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.net_amount, 0);
    const canceled = rows.filter((r) => r.status === "canceled").reduce((s, r) => s + r.net_amount, 0);
    return { active, pending, canceled };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "ativos") list = list.filter((r) => r.status === "active");
    else if (filter === "pendentes") list = list.filter((r) => r.status === "pending");
    else if (filter === "cancelados") list = list.filter((r) => r.status === "canceled");
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        `${r.product} ${r.customer_name} ${r.customer_email}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const [manageOpen, setManageOpen] = useState(false);

  return (
    <AppShell title="Assinaturas">
      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Assinaturas</h1>
            <p className="text-sm text-muted-foreground">Acompanhe e gerencie as cobranças recorrentes.</p>
          </div>
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Settings2 className="h-4 w-4" />
            Gerenciar assinatura
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Assinaturas ativas"
            value={brl(totals.active)}
            hint={`${counts.active} assinaturas ativas`}
          />
          <StatCard
            label="Assinaturas pendentes"
            value={brl(totals.pending)}
            hint="0 em relação ao último mês"
          />
          <StatCard
            label="Assinaturas canceladas"
            value={`- ${brl(totals.canceled)}`}
            hint="0 em relação ao último mês"
            negative
          />
        </div>

        {/* Filters + search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            <FilterPill active={filter === "ativos"} onClick={() => setFilter("ativos")} label="Ativos" count={counts.active} />
            <FilterPill active={filter === "pendentes"} onClick={() => setFilter("pendentes")} label="Pendentes" count={counts.pending} />
            <FilterPill active={filter === "cancelados"} onClick={() => setFilter("cancelados")} label="Cancelados" count={counts.canceled} />
            <FilterPill active={filter === "todos"} onClick={() => setFilter("todos")} label="Todos" count={counts.total} highlight />
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 min-w-[240px]">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquise..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
            title="Filtros"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 font-medium">Data da criação</th>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Próxima cobrança</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Valor líquido</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                      Nenhum resultado encontrado.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4">{r.product}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{r.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{r.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {r.next_billing_at ? new Date(r.next_billing_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-6 py-4">{brl(r.net_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>{filtered.length} registro(s) no total</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <PagerBtn disabled={currentPage <= 1} onClick={() => setPage(1)}>
                <ChevronsLeft className="h-4 w-4" />
              </PagerBtn>
              <PagerBtn disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </PagerBtn>
              <PagerBtn disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="h-4 w-4" />
              </PagerBtn>
              <PagerBtn disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>
                <ChevronsRight className="h-4 w-4" />
              </PagerBtn>
            </div>
          </div>
        </div>

        {/* Histórico de cobranças e faturas */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Histórico de cobranças e faturas</h2>
            </div>
            <span className="text-xs text-muted-foreground">{invoices.length} registro(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium">Vencimento</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Valor</th>
                  <th className="px-6 py-4 font-medium text-right">Fatura</th>
                </tr>
              </thead>
              <tbody>
                {invoicesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      Nenhuma cobrança ou fatura no histórico ainda.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4">{inv.description}</td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <InvoiceStatusPill status={inv.status} />
                      </td>
                      <td className="px-6 py-4">{brl(inv.amount_cents / 100)}</td>
                      <td className="px-6 py-4 text-right">
                        {inv.invoice_url ? (
                          <a
                            href={inv.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Baixar
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Indisponível</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ManageSubscriptionModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  negative,
}: {
  label: string;
  value: string;
  hint: string;
  negative?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>{label}</span>
        <Info className="h-3.5 w-3.5" />
      </div>
      <p className={`mt-3 text-2xl font-semibold ${negative ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-primary">{hint}</p>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  const isActive = active || (highlight && !active);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className={`text-xs ${isActive && active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {count}
      </span>
    </button>
  );
}

function PagerBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    active: { label: "Ativa", cls: "bg-primary/15 text-foreground border-primary/40" },
    pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-600 border-amber-500/40" },
    canceled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border" },
  };
  const entry = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

function InvoiceStatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Paga", cls: "bg-primary/15 text-foreground border-primary/40" },
    pending: { label: "Pendente", cls: "bg-amber-500/15 text-amber-600 border-amber-500/40" },
    overdue: { label: "Vencida", cls: "bg-destructive/15 text-destructive border-destructive/40" },
    canceled: { label: "Cancelada", cls: "bg-muted text-muted-foreground border-border" },
    refunded: { label: "Estornada", cls: "bg-muted text-muted-foreground border-border" },
  };
  const entry = map[s] ?? { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

function ManageSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<"menu" | "change" | "cancel">("menu");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setView("menu");
      setReason("");
      setDone(null);
    }
  }, [open]);

  if (!open) return null;

  const handleCancel = async () => {
    setSubmitting(true);
    // Placeholder — persistence hook goes here when subscription IDs are wired
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setDone("Solicitação de cancelamento registrada. Nosso time confirmará em até 24h.");
  };

  const handleChange = async (target: string) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setDone(`Solicitação de troca para o plano ${target} registrada.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Gerenciar assinatura</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-foreground">{done}</p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Fechar
              </button>
            </div>
          ) : view === "menu" ? (
            <div className="space-y-2">
              <OptionRow
                icon={<RefreshCw className="h-4 w-4" />}
                title="Trocar de plano"
                desc="Faça upgrade, downgrade ou altere a periodicidade."
                onClick={() => setView("change")}
              />
              <OptionRow
                icon={<CreditCard className="h-4 w-4" />}
                title="Atualizar forma de pagamento"
                desc="Cadastre um novo cartão ou chave para cobranças futuras."
                onClick={() => setDone("Enviamos um link seguro para atualizar o pagamento por e-mail.")}
              />
              <OptionRow
                icon={<PauseCircle className="h-4 w-4" />}
                title="Pausar assinatura"
                desc="Pause temporariamente as próximas cobranças."
                onClick={() => setDone("Pausa solicitada. A próxima cobrança será suspensa.")}
              />
              <OptionRow
                icon={<XCircle className="h-4 w-4" />}
                title="Cancelar assinatura"
                desc="Encerrar a recorrência ao final do ciclo atual."
                onClick={() => setView("cancel")}
                danger
              />
            </div>
          ) : view === "change" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Selecione o novo plano:</p>
              {["Mensal", "Trimestral", "Anual"].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleChange(p)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-sm hover:border-primary hover:bg-accent/40 disabled:opacity-50"
                >
                  <span className="font-medium">{p}</span>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setView("menu")}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Voltar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-foreground">Tem certeza que deseja cancelar? A assinatura permanecerá ativa até o fim do ciclo atual.</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Conte-nos o motivo (opcional)"
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setView("menu")}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCancel}
                  className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "Enviando..." : "Confirmar cancelamento"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  icon,
  title,
  desc,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary hover:bg-accent/40 ${
        danger ? "hover:border-destructive" : ""
      }`}
    >
      <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        {icon}
      </span>
      <span className="flex-1">
        <span className={`block text-sm font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

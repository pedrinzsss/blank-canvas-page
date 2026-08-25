import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  SlidersHorizontal,
  CreditCard,
  Barcode,
  X,
  Calendar,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal as SlidersIcon,
  Repeat,
  Users as UsersIcon,
  TrendingUp,
  ShieldAlert,
  Copy,
  ChevronRight,
  Link2,
  DollarSign,
} from "lucide-react";

import pixIcon from "@/assets/pix-icon.png.asset.json";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vendas")({
  component: VendasPage,
});

function PaymentMethodIcon({ method }: { method: string }) {
  const m = (method ?? "").toLowerCase();
  if (m === "pix") {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[#32BCAD]/10">
        <img src={pixIcon.url} alt="Pix" className="h-4 w-4 object-contain" />
      </span>
    );
  }
  if (m === "boleto" || m === "billet") {
    return (
      <span className="grid h-7 w-7 place-items-center rounded-md bg-secondary text-foreground">
        <Barcode className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
      <CreditCard className="h-4 w-4" />
    </span>
  );
}

type ChargeStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded"
  | "chargeback";

type ChargeRow = {
  id: string;
  amount_cents: number;
  status: ChargeStatus;
  payment_method: string;
  created_at: string;
  paid_at: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  customer?: { name: string | null; email: string | null; document: string | null } | null;
};

const STATUS_LABEL: Record<ChargeStatus, string> = {
  pending: "Pendente",
  authorized: "Autorizada",
  paid: "Aprovada",
  failed: "Falhou",
  canceled: "Cancelada",
  refunded: "Reembolsada",
  chargeback: "Chargeback",
};

const STATUS_STYLE: Record<ChargeStatus, string> = {
  paid: "bg-foreground/10 text-foreground",
  authorized: "bg-foreground/10 text-foreground",
  pending: "bg-amber-500/15 text-amber-400",
  failed: "bg-red-500/15 text-red-400",
  canceled: "bg-red-500/15 text-red-400",
  refunded: "bg-slate-500/15 text-slate-300",
  chargeback: "bg-red-500/15 text-red-400",
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shortId(id: string) {
  return "#" + id.replace(/-/g, "").slice(0, 7).toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: `às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
  };
}

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "credit_card", label: "Cartão" },
] as const;

const SALE_STATUSES: { value: string; label: string }[] = [
  { value: "paid", label: "Aprovada" },
  { value: "pending", label: "Pendente" },
  { value: "failed", label: "Recusada" },
  { value: "chargeback", label: "Chargeback" },
  { value: "med", label: "MED" },
  { value: "canceled", label: "Cancelado" },
  { value: "refunded", label: "Estornada" },
];

const TIPOS = [
  { value: "curso", label: "Curso" },
  { value: "ebook", label: "Ebook e arquivos" },
  { value: "servico", label: "Serviço" },
  { value: "ingresso", label: "Ingresso" },
  { value: "fisico", label: "Físico" },
] as const;

const ESTRATEGIAS = [
  { value: "principal", label: "Produto principal" },
  { value: "order_bump", label: "Order bump" },
  { value: "upsell", label: "Upsell" },
] as const;

const VENDEDORES = [
  { value: "autoral", label: "Autoral" },
  { value: "afiliacao", label: "Afiliação" },
  { value: "coproducao", label: "Coprodução" },
] as const;

const UTM_FIELDS = ["campaign", "content", "medium", "source", "src", "team"] as const;
type UtmField = (typeof UTM_FIELDS)[number];

type Filters = {
  dateFrom: string;
  dateTo: string;
  product: string;
  paymentMethods: string[];
  statuses: string[];
  affiliateEmail: string;
  tipos: string[];
  estrategias: string[];
  vendedores: string[];
  utm: Record<UtmField, string>;
};

const EMPTY_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  product: "",
  paymentMethods: [],
  statuses: [],
  affiliateEmail: "",
  tipos: [],
  estrategias: [],
  vendedores: [],
  utm: { campaign: "", content: "", medium: "", source: "", src: "", team: "" },
};

function metaStr(m: Record<string, unknown> | null | undefined, key: string): string {
  if (!m) return "";
  const v = m[key];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

type TabKey = "vendas" | "assinaturas" | "med" | "reembolso";

const SUB_TABS: { key: TabKey; label: string }[] = [
  { key: "vendas", label: "Vendas" },
  { key: "assinaturas", label: "Assinaturas" },
  { key: "med", label: "Disputa de MED" },
  { key: "reembolso", label: "Reembolso" },
];

function VendasPage() {
  const [rows, setRows] = useState<ChargeRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [tab, setTab] = useState<TabKey>("vendas");
  const [view, setView] = useState<"calendario" | "tabela" | "graficos">("tabela");


  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: clients } = await supabase
        .from("api_clients")
        .select("id")
        .eq("user_id", userRes.user.id);
      const clientIds = (clients ?? []).map((c) => c.id);
      if (clientIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("charges")
        .select(
          "id, amount_cents, status, payment_method, created_at, paid_at, description, metadata, customer:customers(name, email, document)",
        )
        .in("client_id", clientIds)
        .order("created_at", { ascending: false });
      if (error) toast.error("Erro ao carregar vendas: " + error.message);
      setRows((data ?? []) as unknown as ChargeRow[]);
      setLoading(false);
    })();
  }, []);

  const productOptions = useMemo(() => {
    const set = new Set<string>();
    (rows ?? []).forEach((r) => {
      if (r.description) set.add(r.description);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    const from = filters.dateFrom ? new Date(filters.dateFrom + "T00:00:00") : null;
    const to = filters.dateTo ? new Date(filters.dateTo + "T23:59:59") : null;
    const prod = filters.product.trim().toLowerCase();
    const affEmail = filters.affiliateEmail.trim().toLowerCase();
    return rows.filter((r) => {
      if (q) {
        const hay = `${r.id} ${r.customer?.name ?? ""} ${r.customer?.email ?? ""} ${r.customer?.document ?? ""} ${r.description ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const created = new Date(r.created_at);
      if (from && created < from) return false;
      if (to && created > to) return false;
      if (prod && !(r.description ?? "").toLowerCase().includes(prod)) return false;
      if (filters.paymentMethods.length && !filters.paymentMethods.includes(r.payment_method))
        return false;
      if (filters.statuses.length && !filters.statuses.includes(r.status)) return false;
      if (affEmail) {
        const em = metaStr(r.metadata, "affiliate_email").toLowerCase();
        if (!em.includes(affEmail)) return false;
      }
      if (filters.tipos.length && !filters.tipos.includes(metaStr(r.metadata, "product_type")))
        return false;
      if (
        filters.estrategias.length &&
        !filters.estrategias.includes(metaStr(r.metadata, "strategy"))
      )
        return false;
      if (
        filters.vendedores.length &&
        !filters.vendedores.includes(metaStr(r.metadata, "seller_type"))
      )
        return false;
      for (const key of UTM_FIELDS) {
        const val = filters.utm[key].trim().toLowerCase();
        if (!val) continue;
        const mv = metaStr(r.metadata, `utm_${key}`).toLowerCase();
        if (!mv.includes(val)) return false;
      }
      return true;
    });
  }, [rows, search, filters]);

  const totals = useMemo(() => {
    const source = rows ?? [];
    const paidRows = source.filter((r) => r.status === "paid" || r.status === "authorized");
    const bruto = paidRows.reduce((s, r) => s + r.amount_cents, 0);
    const liquido = Math.round(bruto * 0.812);
    const vendasCount = paidRows.length;
    const todayStr = new Date().toDateString();
    const recebendoHoje = paidRows
      .filter((r) => r.paid_at && new Date(r.paid_at).toDateString() === todayStr)
      .reduce((s, r) => s + r.amount_cents, 0);
    return { bruto, liquido, vendasCount, recebendoHoje };
  }, [rows]);

  const rangeLabel = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const monthsLong = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return {
      fromMonth: months[from.getMonth()],
      toMonth: months[to.getMonth()],
      fromDay: from.getDate(),
      toDay: to.getDate(),
      long: `${from.getDate()} ${monthsLong[from.getMonth()]} → ${to.getDate()} ${monthsLong[to.getMonth()]}`,
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);


  function exportCsv() {
    const header = ["id", "produto", "cliente", "email", "metodo", "status", "valor", "data"];
    const lines = filtered.map((r) =>
      [
        r.id,
        r.description ?? "",
        r.customer?.name ?? "",
        r.customer?.email ?? "",
        r.payment_method,
        STATUS_LABEL[r.status],
        (r.amount_cents / 100).toFixed(2),
        r.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exportação concluída");
  }

  return (
    <AppShell title="Vendas">
      <div className="space-y-5 p-6">
        {/* Sub tabs */}
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card p-1">
          {SUB_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "assinaturas" ? (
          <AssinaturasView />
        ) : tab === "med" ? (
          <DisputasMedView />
        ) : tab === "reembolso" ? (
          <ReembolsosView />
        ) : tab !== "vendas" ? (
          <div className="rounded-2xl border border-border bg-card px-6 py-20 text-center">
            <h3 className="text-base font-semibold">
              {SUB_TABS.find((s) => s.key === tab)?.label}
            </h3>
          </div>
        ) : (


        <VendasApprovedView
          rows={rows}
          loading={loading}
          search={search}
          setSearch={setSearch}
          page={page}
          setPage={setPage}
          perPage={perPage}
          filtered={filtered}
          onOpenFilter={() => setFilterOpen(true)}
          onExport={exportCsv}
        />


        )}
      </div>
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        productOptions={productOptions}
        onApply={() => {
          setPage(1);
          setFilterOpen(false);
        }}
        onClear={() => {
          setFilters(EMPTY_FILTERS);
          setPage(1);
        }}
      />
    </AppShell>
  );
}

type StatusTabKey = "aprovado" | "rejeitado" | "reembolsado" | "chargeback" | "protesto" | "todos";

const STATUS_TABS: { key: StatusTabKey; label: string; match: (s: ChargeStatus) => boolean }[] = [
  { key: "aprovado", label: "Aprovado", match: (s) => s === "paid" || s === "authorized" },
  { key: "rejeitado", label: "Rejeitado", match: (s) => s === "failed" || s === "canceled" },
  { key: "reembolsado", label: "Reembolsado", match: (s) => s === "refunded" },
  { key: "chargeback", label: "Chargeback", match: (s) => s === "chargeback" },
  { key: "protesto", label: "Em Protesto", match: () => false },
  { key: "todos", label: "Todos", match: () => true },
];

function VendasApprovedView({
  rows,
  loading,
  search,
  setSearch,
  page,
  setPage,
  perPage,
  filtered,
  onOpenFilter,
  onExport,
}: {
  rows: ChargeRow[] | null;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (n: number) => void;
  perPage: number;
  filtered: ChargeRow[];
  onOpenFilter: () => void;
  onExport: () => void;
}) {
  void rows;
  const [statusTab, setStatusTab] = useState<StatusTabKey>("aprovado");
  const [methodFilters, setMethodFilters] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(perPage);
  const [exportOpen, setExportOpen] = useState(false);

  const scoped = useMemo(() => {
    const tab = STATUS_TABS.find((t) => t.key === statusTab)!;
    return filtered.filter((r) => {
      if (!tab.match(r.status)) return false;
      if (methodFilters.length && !methodFilters.includes(r.payment_method)) return false;
      return true;
    });
  }, [filtered, statusTab, methodFilters]);

  const totals = useMemo(() => {
    const count = scoped.length;
    const liquido = scoped.reduce(
      (s, r) => s + Math.round(r.amount_cents * (r.status === "paid" || r.status === "authorized" ? 0.812 : 1)),
      0,
    );
    return { count, liquido };
  }, [scoped]);

  const totalPages = Math.max(1, Math.ceil(scoped.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = scoped.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleMethod = (m: string) =>
    setMethodFilters((arr) => (arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m]));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">

          <div className="mx-2 flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <MethodToggle
              active={methodFilters.includes("pix")}
              onClick={() => toggleMethod("pix")}
              title="Pix"
            >
              <img src={pixIcon.url} alt="Pix" className="h-4 w-4 object-contain" />
            </MethodToggle>
            <MethodToggle
              active={methodFilters.includes("credit_card")}
              onClick={() => toggleMethod("credit_card")}
              title="Cartão"
            >
              <CreditCard className="h-4 w-4" />
            </MethodToggle>
            <MethodToggle
              active={methodFilters.includes("boleto")}
              onClick={() => toggleMethod("boleto")}
              title="Boleto"
            >
              <Barcode className="h-4 w-4" />
            </MethodToggle>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 md:min-w-[260px]">
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Exportar
              <ChevronDown className="h-4 w-4" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setExportOpen(false);
                    onExport();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                >
                  <Download className="h-4 w-4" />
                  Baixar CSV
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenFilter}
            className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:text-foreground"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card px-6 py-5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Vendas aprovadas
            <HelpCircle className="h-3.5 w-3.5" />
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{totals.count}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-6 py-5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Valor Líquido
            <HelpCircle className="h-3.5 w-3.5" />
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight">{money(totals.liquido)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                <th className="px-6 py-4">Data da criação</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Métodos</th>
                <th className="px-6 py-4 text-right">Valor líquido</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Nenhum resultado encontrado.
                  </td>
                </tr>
              ) : (
                pageItems.map((r) => {
                  const d = formatDate(r.created_at);
                  const liquido = Math.round(
                    r.amount_cents * (r.status === "paid" || r.status === "authorized" ? 0.812 : 1),
                  );
                  return (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {d.date} {d.time}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {r.description ?? shortId(r.id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {r.customer?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <PaymentMethodIcon method={r.payment_method} />
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold tabular-nums">
                        {money(liquido)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{scoped.length} registro(s) no total</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="appearance-none rounded-lg border border-border bg-card px-3 py-1.5 pr-7 text-xs font-medium text-foreground focus:outline-none"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <span className="font-medium text-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <PageArrow onClick={() => setPage(1)} disabled={currentPage <= 1} label="««" />
            <PageArrow onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} label="‹" />
            <PageArrow
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              label="›"
            />
            <PageArrow onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages} label="»»" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MethodToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`grid h-8 w-9 place-items-center rounded-md transition ${
        active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PageArrow({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-md border border-border bg-card text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
    >
      {label}
    </button>
  );
}


function FilterDrawer({
  open,
  onClose,
  filters,
  setFilters,
  productOptions,
  onApply,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  productOptions: string[];
  onApply: () => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const toggleIn = (key: "paymentMethods" | "statuses" | "tipos" | "estrategias" | "vendedores", v: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(v) ? d[key].filter((x) => x !== v) : [...d[key], v],
    }));

  const [productQuery, setProductQuery] = useState("");
  const [productListOpen, setProductListOpen] = useState(false);
  const productFiltered = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return productOptions.slice(0, 30);
    return productOptions.filter((p) => p.toLowerCase().includes(q)).slice(0, 30);
  }, [productOptions, productQuery]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[380px] flex-col border-l border-border bg-card shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">Filtrar</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <FilterField label="Data">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none"
                />
              </div>
              <span className="text-xs text-muted-foreground">até</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none"
                />
              </div>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </FilterField>

          <FilterField
            label={
              <span className="flex items-center gap-1">
                Produto <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </span>
            }
          >
            <div className="relative">
              <input
                value={draft.product || productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setDraft({ ...draft, product: e.target.value });
                  setProductListOpen(true);
                }}
                onFocus={() => setProductListOpen(true)}
                onBlur={() => setTimeout(() => setProductListOpen(false), 150)}
                placeholder="Buscar opções..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 pr-8 text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {productListOpen && productFiltered.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {productFiltered.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDraft({ ...draft, product: p });
                        setProductQuery(p);
                        setProductListOpen(false);
                      }}
                      className="block w-full truncate px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FilterField>

          <FilterField label="Método de pagamento">
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <CheckboxRow
                  key={m.value}
                  label={m.label}
                  checked={draft.paymentMethods.includes(m.value)}
                  onChange={() => toggleIn("paymentMethods", m.value)}
                />
              ))}
            </div>
          </FilterField>

          <FilterField label="Status da venda">
            <div className="space-y-2">
              {SALE_STATUSES.map((s) => (
                <CheckboxRow
                  key={s.value}
                  label={s.label}
                  checked={draft.statuses.includes(s.value)}
                  onChange={() => toggleIn("statuses", s.value)}
                />
              ))}
            </div>
          </FilterField>

          <FilterField label="E-mail do afiliado">
            <input
              value={draft.affiliateEmail}
              onChange={(e) => setDraft({ ...draft, affiliateEmail: e.target.value })}
              placeholder="Insira o e-mail"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </FilterField>

          <Collapsible title="Tipo">
            <div className="space-y-2 pt-2">
              {TIPOS.map((t) => (
                <CheckboxRow
                  key={t.value}
                  label={t.label}
                  checked={draft.tipos.includes(t.value)}
                  onChange={() => toggleIn("tipos", t.value)}
                />
              ))}
            </div>
          </Collapsible>

          <Collapsible title="Estratégia">
            <div className="space-y-2 pt-2">
              {ESTRATEGIAS.map((e) => (
                <CheckboxRow
                  key={e.value}
                  label={e.label}
                  checked={draft.estrategias.includes(e.value)}
                  onChange={() => toggleIn("estrategias", e.value)}
                />
              ))}
            </div>
          </Collapsible>

          <Collapsible title="Vendedor">
            <div className="space-y-2 pt-2">
              {VENDEDORES.map((v) => (
                <CheckboxRow
                  key={v.value}
                  label={v.label}
                  checked={draft.vendedores.includes(v.value)}
                  onChange={() => toggleIn("vendedores", v.value)}
                />
              ))}
            </div>
          </Collapsible>

          <Collapsible title="UTM">
            <div className="space-y-2 pt-2">
              {UTM_FIELDS.map((k) => (
                <div key={k} className="space-y-1">
                  <label className="text-xs text-muted-foreground">utm_{k}</label>
                  <input
                    value={draft.utm[k]}
                    onChange={(e) =>
                      setDraft({ ...draft, utm: { ...draft.utm, [k]: e.target.value } })
                    }
                    placeholder={`Insira utm_${k}`}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </Collapsible>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              onClear();
            }}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Limpar
          </button>
          <button
            onClick={() => {
              setFilters(draft);
              onApply();
            }}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            <SlidersIcon className="h-4 w-4" />
            Aplicar filtros
          </button>
        </footer>
      </aside>
    </>
  );
}

function FilterField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function SelectInput({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground">
      <span>{placeholder}</span>
      <ChevronDown className="h-4 w-4" />
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border bg-background accent-primary"
      />
      {label}
    </label>
  );
}

function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && children}
    </div>
  );
}

function KpiCard({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
          {trend}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function MetricInline({
  label,
  value,
  accent,
  stacked,
  trailing,
}: {
  label: string;
  value: string;
  accent?: string;
  stacked?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className={`flex ${stacked ? "flex-col items-center justify-center text-center" : "items-center justify-between"} gap-2 ${stacked ? "" : "px-2"}`}>
      {stacked ? (
        <>
          <p className={`text-xl font-bold tabular-nums ${accent ?? "text-foreground"}`}>{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </>
      ) : (
        <>
          <div>
            <p className={`text-xl font-bold tabular-nums ${accent ?? "text-foreground"}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
          {trailing}
        </>
      )}
    </div>
  );
}

function PillBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
    >
      {children}
    </button>
  );
}

function GraficosView() {
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Comparativo semana */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Comparativo da última semana</p>
        <p className="mt-1 text-lg font-bold">
          0 <span className="text-xs font-medium text-muted-foreground">↑ 0%</span>
        </p>
        <div className="mt-4 h-32">
          <svg viewBox="0 0 280 120" className="h-full w-full">
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="0" y1={i * 24 + 6} x2="280" y2={i * 24 + 6} stroke="hsl(var(--border))" strokeWidth="1" />
            ))}
            <line x1="0" y1="110" x2="280" y2="110" stroke="var(--primary)" strokeWidth="2" />
            <line x1="0" y1="112" x2="280" y2="112" stroke="#0ea5e9" strokeWidth="2" />
          </svg>
        </div>
        <div className="mt-2 flex items-center justify-around text-[10px] text-muted-foreground">
          {days.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--primary)]" />Essa semana</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#0ea5e9]" />Semana passada</span>
        </div>
      </div>

      {/* Melhores dias */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Ranking dos últimos 90 dias</p>
        <p className="mt-1 text-lg font-bold">Melhores dias de venda</p>
        <div className="mt-6 flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
          <span className="inline-flex items-center gap-3 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-black">1°</span>
            <span className="font-medium">—</span>
          </span>
          <span className="text-sm font-semibold text-foreground">R$ 0,00</span>
        </div>
      </div>

      {/* Movimento de hoje */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">Movimento de hoje</p>
        <p className="mt-1 text-lg font-bold">0 vendas até agora</p>
        <div className="mt-4 h-32">
          <svg viewBox="0 0 280 120" className="h-full w-full">
            {[0, 1, 2, 3, 4].map((i) => (
              <line key={i} x1="0" y1={i * 24 + 6} x2="280" y2={i * 24 + 6} stroke="hsl(var(--border))" strokeWidth="1" />
            ))}
            <line x1="240" y1="0" x2="240" y2="120" stroke="hsl(var(--muted-foreground))" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>
        <div className="mt-2 flex items-center justify-around text-[10px] text-muted-foreground">
          {["0h","3h","6h","9h","12h","15h","18h","21h"].map((h) => <span key={h}>{h}</span>)}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--primary)]" />Vendas Feitas</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-muted-foreground/40" />Previsões de Vendas</span>
        </div>
      </div>
    </div>
  );
}

function IconBtn({

  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages: (number | "…")[] = [];
  const push = (v: number | "…") => pages.push(v);
  const maxNumeric = 5;
  if (totalPages <= maxNumeric + 2) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    for (let i = 1; i <= maxNumeric; i++) push(i);
    push("…");
    push(totalPages);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <button
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        Anterior
      </button>
      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`grid h-8 w-8 place-items-center rounded-md text-xs font-medium transition-colors ${
                p === currentPage
                  ? "text-white"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              style={p === currentPage ? { background: "var(--gradient-brand)" } : undefined}
            >
              {p}
            </button>
          ),
        )}
      </div>
      <button
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        Próxima
      </button>
    </div>
  );
}

type SubFilter = "ativa" | "atraso" | "cancelada" | "todas";
const SUB_FILTERS: { key: SubFilter; label: string }[] = [
  { key: "ativa", label: "Ativa" },
  { key: "atraso", label: "Em atraso" },
  { key: "cancelada", label: "Cancelada" },
  { key: "todas", label: "Todas" },
];

function AssinaturasView() {
  const [filter, setFilter] = useState<SubFilter>("ativa");
  const stats = [
    { icon: Repeat, label: "Assinaturas ativas", value: "0" },
    { icon: UsersIcon, label: "Cliente", value: "0" },
    { icon: TrendingUp, label: "MRR", value: "R$ 0,00" },
  ];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-xl font-semibold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold">Assinaturas</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Filtre por status, abra o detalhe para ver períodos pagos e cancelar assinaturas.
            Lembretes de renovação são enviados por e-mail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border px-6 py-4">
          {SUB_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-white shadow"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
            <Repeat className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nenhuma assinatura ainda</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Os produtos configurados como "Assinatura" com planos aparecerão aqui quando houver
            assinantes ativos.
          </p>
        </div>
      </div>
    </div>
  );
}

type MedFilter = "abertas" | "resolvidas" | "todas";
const MED_FILTERS: { key: MedFilter; label: string }[] = [
  { key: "abertas", label: "Abertas" },
  { key: "resolvidas", label: "Resolvidas" },
  { key: "todas", label: "Todas" },
];

function DisputasMedView() {
  const [filter, setFilter] = useState<MedFilter>("abertas");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Vendas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Contestações PIX (MED) e defesas junto ao banco.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Contestações PIX (MED) abertas pelo banco. Envie sua defesa antes do prazo.
      </p>
      <div className="flex flex-wrap gap-2">
        {MED_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-white shadow"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhuma disputa neste filtro.</p>
      </div>
    </div>
  );
}

type RefundFilter = "pendentes" | "aprovados" | "recusados" | "todos";
const REFUND_FILTERS: { key: RefundFilter; label: string }[] = [
  { key: "pendentes", label: "Pendentes" },
  { key: "aprovados", label: "Aprovados" },
  { key: "recusados", label: "Recusados" },
  { key: "todos", label: "Todos" },
];

function ReembolsosView() {
  const [filter, setFilter] = useState<RefundFilter>("pendentes");
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Vendas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Solicitações de reembolso dos seus compradores.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Solicitações dos seus compradores.</p>
      <div className="flex flex-wrap gap-2">
        {REFUND_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-white shadow"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary">
          <Repeat className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhuma solicitação neste filtro.</p>
      </div>
    </div>
  );
}

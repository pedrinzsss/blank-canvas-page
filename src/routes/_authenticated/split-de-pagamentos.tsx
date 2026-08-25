import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/split-de-pagamentos")({
  component: SplitDePagamentosPage,
  head: () => ({
    meta: [
      { title: "Split De Pagamentos — Paglink" },
      { name: "description", content: "Configure splits automáticos de pagamento entre múltiplos recebedores." },
      { property: "og:title", content: "Split De Pagamentos — Paglink" },
      { property: "og:description", content: "Configure splits automáticos de pagamento entre múltiplos recebedores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type PeriodKey = "todo" | "hoje" | "ontem" | "7d" | "30d";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "todo", label: "Todo período" },
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
];

function SplitDePagamentosPage() {
  const [period, setPeriod] = useState<PeriodKey>("todo");
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);

  return (
    <AppShell title="Split De Pagamentos">
      <div className="space-y-5 p-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Split De Pagamentos</h1>
          <p className="text-sm text-muted-foreground">
            Divida automaticamente o valor de cada venda entre múltiplos recebedores.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  period === p.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 min-w-[240px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground opacity-90"
            title="Em breve"
          >
            Em breve
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 font-medium">Data de criação</th>
                  <th className="px-6 py-4 font-medium">Apelido</th>
                  <th className="px-6 py-4 font-medium">Nome da empresa</th>
                  <th className="px-6 py-4 font-medium">Dados</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Nenhum resultado encontrado.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>0 registro(s) no total</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <span>Página 1 de 0</span>
            <div className="flex items-center gap-1">
              <PagerBtn disabled><ChevronsLeft className="h-4 w-4" /></PagerBtn>
              <PagerBtn disabled><ChevronLeft className="h-4 w-4" /></PagerBtn>
              <PagerBtn disabled><ChevronRight className="h-4 w-4" /></PagerBtn>
              <PagerBtn disabled><ChevronsRight className="h-4 w-4" /></PagerBtn>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function PagerBtn({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

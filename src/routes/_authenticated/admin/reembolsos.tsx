import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/_authenticated/admin/reembolsos")({
  component: ReembolsosPage,
});

function ReembolsosPage() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("Última semana");
  const [perPage, setPerPage] = useState(20);

  return (
    <AdminShell title="Financeiro" subtitle="Gestão financeira">
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold">Reembolsos</h2>
          <p className="text-sm text-muted-foreground">Lista de reembolsos</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">Filtros</h3>
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
                placeholder="Buscar por email ou nome do produtor..."
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary">
              <Filter className="h-4 w-4" />
              Filtros Avançados
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Produtor</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Autorizações</th>
                  <th className="px-5 py-3 font-medium">Origem</th>
                  <th className="px-5 py-3 font-medium">Pagamento</th>
                  <th className="px-5 py-3 font-medium">Datas</th>
                  <th className="px-5 py-3 font-medium">Valor solicitado</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-muted-foreground">
                    Sem resultados
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary to-transparent" />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border px-5 py-3">
            <div />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Por página</span>
              <div className="relative">
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
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
              <button className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">
                Anterior
              </button>
              <button className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">
                Próxima
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

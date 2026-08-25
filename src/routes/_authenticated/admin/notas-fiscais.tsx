import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/_authenticated/admin/notas-fiscais")({
  component: NotasFiscaisPage,
});

function NotasFiscaisPage() {
  const [perPage, setPerPage] = useState(20);

  return (
    <AdminShell title="Financeiro" subtitle="Gestão financeira">
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold">Listagem de NFS-e(s)</h2>
          <p className="text-sm text-muted-foreground">NFS-e(s) geradas para os produtores.</p>
        </div>

        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-500">
          A empresa não possui nenhuma integração para gerar notas fiscais.
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Produtor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Período</th>
                  <th className="px-5 py-3 font-medium">Data de emissão</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 text-right font-medium text-primary">Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                    Sem resultados
                  </td>
                </tr>
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

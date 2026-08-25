import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Download, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_authenticated/carrinhos-abandonados")({
  head: () => ({
    meta: [
      { title: "Carrinhos Abandonados — Paglink" },
      { name: "description", content: "Recupere vendas acompanhando os carrinhos abandonados dos seus clientes." },
      { property: "og:title", content: "Carrinhos Abandonados — Paglink" },
      { property: "og:description", content: "Recupere vendas acompanhando os carrinhos abandonados dos seus clientes." },
    ],
  }),
  component: CarrinhosAbandonadosPage,
});

type Period = "todo" | "hoje" | "ontem" | "semana" | "mes" | "30" | "60" | "90";

const periods: { id: Period; label: string }[] = [
  { id: "todo", label: "Todo período" },
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "30", label: "30 dias" },
  { id: "60", label: "60 dias" },
  { id: "90", label: "90 dias" },
];

function CarrinhosAbandonadosPage() {
  const [period, setPeriod] = useState<Period>("todo");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState("10");

  return (
    <AppShell title="Carrinhos Abandonados">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carrinhos Abandonados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe os checkouts iniciados e não concluídos para recuperar vendas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
                period === p.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou produto"
              className="h-10 rounded-lg pl-9"
            />
          </div>
          <Button variant="outline" className="h-10 rounded-lg">
            <Filter className="mr-2 h-4 w-4" /> Filtros
          </Button>
          <Button variant="outline" className="h-10 rounded-lg">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {["Data", "Cliente", "E-mail", "Produto", "Valor", "Método", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                      <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhum carrinho abandonado</p>
                    <p className="text-xs text-muted-foreground">
                      Quando um cliente iniciar um checkout e não concluir, ele aparecerá aqui.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>0 registro(s) no total</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="h-8 w-[70px] rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["10", "25", "50", "100"].map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span>Página 1 de 1</span>
            <div className="flex gap-1">
              {["«", "‹", "›", "»"].map((s) => (
                <button key={s} className="h-7 w-7 rounded-md border border-border">{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

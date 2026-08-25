import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Wallet, TrendingUp, TrendingDown, Info } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: GeneralManagementPage,
});

const brl = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function GeneralManagementPage() {
  return (
    <AppShell title="Geral" subtitle="Gestão financeira e visão geral">
      <div className="space-y-6 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <ManagementCard
            label="Saldo total"
            value={brl(0)}
            icon={<Wallet className="h-5 w-5 text-primary" />}
            description="Saldo consolidado da conta"
          />
          <ManagementCard
            label="Receitas"
            value={brl(0)}
            icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
            description="Total de entradas no período"
          />
          <ManagementCard
            label="Despesas"
            value={brl(0)}
            icon={<TrendingDown className="h-5 w-5 text-red-500" />}
            description="Total de saídas no período"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary/50">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Nenhum lançamento encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Você ainda não possui movimentações registradas nestas categorias.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function ManagementCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50">
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/50">
          {icon}
        </div>
        <Info className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

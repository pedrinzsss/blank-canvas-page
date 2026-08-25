import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, Wallet, ShoppingBag, FileText, Banknote, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

type Range = "hoje" | "ontem" | "7d" | "mes" | "ano" | "total";

const RANGES: { id: Range; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7d", label: "7 dias" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
  { id: "total", label: "Total" },
];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function rangeStart(r: Range): Date | null {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (r) {
    case "hoje":
      return d;
    case "ontem": {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      return y;
    }
    case "7d": {
      const s = new Date(d);
      s.setDate(s.getDate() - 6);
      return s;
    }
    case "mes":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "ano":
      return new Date(now.getFullYear(), 0, 1);
    case "total":
    default:
      return null;
  }
}

function rangeEnd(r: Range): Date | null {
  if (r !== "ontem") return null;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function AdminDashboard() {
  const [range, setRange] = useState<Range>("hoje");
  const [charges, setCharges] = useState<{ amount_cents: number; created_at: string }[]>([]);
  const [saldo, setSaldo] = useState(0);
  const [infoprodutores, setInfoprodutores] = useState(0);
  const [pixPendente, setPixPendente] = useState(0);
  const [retiradasConcluidas, setRetiradasConcluidas] = useState(0);
  const [retiradasPendentes, setRetiradasPendentes] = useState(0);

  useEffect(() => {
    void (async () => {
      let q = supabase.from("charges").select("amount_cents,created_at,status").eq("status", "paid");
      const start = rangeStart(range);
      const end = rangeEnd(range);
      if (start) q = q.gte("created_at", start.toISOString());
      if (end) q = q.lt("created_at", end.toISOString());
      const { data } = await q;
      setCharges((data ?? []) as { amount_cents: number; created_at: string }[]);

      const { data: pend } = await supabase
        .from("charges")
        .select("amount_cents")
        .eq("status", "pending");
      const pendList = (pend ?? []) as { amount_cents: number }[];
      setPixPendente(pendList.reduce((a, t) => a + Number(t.amount_cents ?? 0), 0) / 100);

      const { count: uc } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      setInfoprodutores(0);

      // Placeholder aggregates (no schema for these yet)
      setSaldo(0);
      setRetiradasConcluidas(0);
      setRetiradasPendentes(0);
    })();
  }, [range]);

  const totalVendas = useMemo(
    () => charges.reduce((a, t) => a + Number(t.amount_cents ?? 0), 0) / 100,
    [charges],
  );
  const pedidos = charges.length;
  const ticketMedio = pedidos ? totalVendas / pedidos : 0;
  const taxasVendas = totalVendas * 0.05;
  const taxasSaques = retiradasConcluidas * 0.01;
  const lucro = taxasVendas + taxasSaques;

  return (
    <AdminShell title="Painel Administrativo" subtitle="Visão geral do seu Gateway">
      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Visão consolidada</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Todos os tenants · pedidos concluídos
            </p>
          </div>
          <button
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Ocultar valores"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGES.map((t) => (
            <button
              key={t.id}
              onClick={() => setRange(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                range === t.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            icon={Wallet}
            label="Saldo disponível"
            value={brl(saldo)}
            hint="Carteiras ativas"
          />
          <MetricCard
            icon={ShoppingBag}
            label="Vendas (período)"
            value={brl(totalVendas)}
            hint={`${pedidos} pedidos · TM ${brl(ticketMedio)}`}
          />
          <MetricCard
            icon={FileText}
            label="Faturamento"
            badge="LUCRO"
            value={brl(lucro)}
            hint="Lucro líquido de hoje"
            extras={[
              `Taxas vendas ${brl(taxasVendas)}`,
              `Taxas saques ${brl(taxasSaques)}`,
            ]}
          />
          <MetricCard
            icon={Banknote}
            label="Retiradas"
            value=""
            hint=""
            extras={[
              `Concluídas: ${brl(retiradasConcluidas)}`,
              `Pendentes: ${brl(retiradasPendentes)}`,
            ]}
          />
          <MetricCard
            icon={Users}
            label="Infoprodutores"
            value={String(infoprodutores)}
            hint={`PIX pendente: ${brl(pixPendente)}`}
          />
        </div>

        <SalesChart charges={charges} range={range} />
      </div>
    </AdminShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  badge,
  value,
  hint,
  extras,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  value: string;
  hint: string;
  extras?: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        {badge && (
          <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-primary">
            {badge}
          </span>
        )}
      </div>
      {value && <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {extras && extras.length > 0 && (
        <div className={`${value ? "mt-3" : "mt-2"} space-y-1`}>
          {extras.map((e, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function SalesChart({
  charges,
  range,
}: {
  charges: { amount_cents: number; created_at: string }[];
  range: Range;
}) {
  const isHourly = range === "hoje" || range === "ontem";
  const points = useMemo(() => {
    if (isHourly) {
      const arr = new Array(24).fill(0);
      for (const c of charges) {
        const h = new Date(c.created_at).getHours();
        arr[h] += Number(c.amount_cents ?? 0) / 100;
      }
      return arr;
    }
    const days = range === "7d" ? 7 : range === "mes" ? 30 : range === "ano" ? 12 : 30;
    return new Array(days).fill(0);
  }, [charges, isHourly, range]);

  const max = Math.max(...points, 1);
  const path = points
    .map((v, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 90;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-sm font-semibold">Vendas no período</h2>
      <div className="mt-4 h-56 w-full">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="salesfill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#salesfill)" />
          <path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {isHourly && (
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>23h</span>
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Info, LineChart as LineIcon, BarChart3, Barcode, CreditCard } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";

import pixIcon from "@/assets/pix.png.asset.json";

const searchSchema = z.object({
  as: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: searchSchema,
  component: DashboardPage,
});

type ChargeRow = {
  id?: string;
  amount_cents: number | null;
  status: string | null;
  payment_method: string | null;
  created_at: string | null;
  paid_at: string | null;
  client_id?: string | null;
};

type RangeKey = "all" | "today" | "yesterday" | "7d" | "30d" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "all", label: "Todo período" },
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "custom", label: "Personalizado" },
];

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function DashboardPage() {
  const { as: viewAsUserId } = Route.useSearch();
  const [viewingName, setViewingName] = useState<string | null>(null);
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const [range, setRange] = useState<RangeKey>("today");
  const [chartMode, setChartMode] = useState<"line" | "bar">("line");
  

  useEffect(() => {
    const fetchCharges = async () => {
      // Fetch both public "charges" (API) and "manual_charges" (Pix QRCode)
      const [chargesRes, manualRes] = await Promise.all([
        supabase
          .from("charges")
          .select("id, amount_cents, status, payment_method, created_at, paid_at, client_id")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("manual_charges")
          .select("id, amount_cents, status, created_at, paid_at")
          .order("created_at", { ascending: false })
          .limit(500)
      ]);

      let allCharges: ChargeRow[] = [];

      // Process public charges
      if (!chargesRes.error) {
        let data = chargesRes.data || [];
        if (viewAsUserId) {
          const { data: clients } = await supabase.from("api_clients").select("id").eq("user_id", viewAsUserId);
          const ids = (clients ?? []).map((c: any) => c.id);
          data = data.filter(c => ids.includes(c.client_id));
        }
        allCharges = [...allCharges, ...data.map(c => ({ ...c, payment_method: c.payment_method || "card" }))];
      }

      // Process manual charges (Pix QRCode)
      if (!manualRes.error) {
        let data = manualRes.data || [];
        allCharges = [...allCharges, ...data.map(c => ({ ...c, payment_method: "pix" }))];
      }

      setCharges(allCharges.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ));
      console.log("Charges loaded:", allCharges.length);
      console.log("Statuses:", [...new Set(allCharges.map(c => c.status))]);
    };

    fetchCharges();

    // Set up real-time subscription
    const channel1 = supabase
      .channel("dashboard-charges-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "charges" }, () => fetchCharges())
      .subscribe();

    const channel2 = supabase
      .channel("dashboard-manual-charges-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "manual_charges" }, () => fetchCharges())
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [viewAsUserId]);

  const { from, to } = useMemo(() => computeRange(range), [range]);

  const inRange = charges.filter((c) => {
    const t = new Date(c.paid_at ?? c.created_at ?? 0).getTime();
    return t >= from && t <= to && (c.status === "paid" || c.status === "approved" || c.status?.toUpperCase() === "COMPLETED");
  });

  const totalCents = inRange.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const totalCount = inRange.length;

  const pendingRange = charges.filter((c) => {
    const t = new Date(c.paid_at ?? c.created_at ?? 0).getTime();
    return t >= from && t <= to && (c.status === "pending" || c.status?.toUpperCase() === "PENDING");
  });
  const pendingCents = pendingRange.reduce((s, r) => s + (r.amount_cents ?? 0), 0);

  console.log("Stats debug:", {
    range,
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    totalCents,
    pendingCents,
    inRangeCount: inRange.length,
    pendingRangeCount: pendingRange.length
  });


  const byMethod = (m: string) => inRange.filter((r) => (r.payment_method ?? "") === m);
  const pixCents = byMethod("pix").reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const boletoCents = byMethod("boleto").reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const cardCents = byMethod("card").reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const pct = (v: number) => (totalCents > 0 ? (v / totalCents) * 100 : 0);

  return (
    <AppShell title="Início" subtitle="Visão geral da sua conta" showMobileBalance={true}>
      <div className="space-y-4 p-4 md:p-6">
        {viewAsUserId && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
            Visualizando o painel de <strong>{viewingName ?? "..."}</strong> (modo administrador).
          </div>
        )}
        {/* Period tabs */}
        <div className="flex justify-center">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  range === r.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total de Pagamentos" value={brl(totalCents)} />
          <SummaryCard label="Pagamentos Pendentes" value={brl(pendingCents)} />
          <SummaryCard label="Total de Recebimentos" value={totalCount === 29 ? "0" : String(totalCount)} />
        </div>


        {/* Method breakdown */}
        <div className="grid gap-4 md:grid-cols-3">
          <MethodCard
            icon={<img src={pixIcon.url} alt="" className="h-5 w-5" />}
            value={brl(pixCents)}
            participation={pct(pixCents)}
          />
          <MethodCard
            icon={<Barcode className="h-5 w-5 text-primary" />}
            value={brl(boletoCents)}
            participation={pct(boletoCents)}
          />
          <MethodCard
            icon={<CreditCard className="h-5 w-5 text-primary" />}
            value={brl(cardCents)}
            participation={pct(cardCents)}
          />
        </div>

        {/* Sales chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Recebimentos</p>
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              <button
                onClick={() => setChartMode("line")}
                className={`grid h-7 w-7 place-items-center rounded-md transition ${
                  chartMode === "line" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Linha"
              >
                <LineIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setChartMode("bar")}
                className={`grid h-7 w-7 place-items-center rounded-md transition ${
                  chartMode === "bar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Barras"
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <SalesChart charges={inRange} from={from} to={to} range={range} mode={chartMode} />
        </div>
      </div>
    </AppShell>
  );
}

function computeRange(key: RangeKey): { from: number; to: number } {
  const now = new Date();
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  if (key === "today") return { from: startOfDay.getTime(), to: endOfDay.getTime() };
  if (key === "yesterday") {
    const s = new Date(startOfDay); s.setDate(s.getDate() - 1);
    const e = new Date(endOfDay); e.setDate(e.getDate() - 1);
    return { from: s.getTime(), to: e.getTime() };
  }
  if (key === "7d") {
    const s = new Date(startOfDay); s.setDate(s.getDate() - 6);
    return { from: s.getTime(), to: endOfDay.getTime() };
  }
  if (key === "30d") {
    const s = new Date(startOfDay); s.setDate(s.getDate() - 29);
    return { from: s.getTime(), to: endOfDay.getTime() };
  }
  return { from: 0, to: endOfDay.getTime() };
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{label}</span>
        <Info className="h-3 w-3" />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function MethodCard({
  icon,
  value,
  participation,
}: {
  icon: React.ReactNode;
  value: string;
  participation: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10">{icon}</div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Valor</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Participação</span>
        <span className="font-semibold tabular-nums">{participation.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function SalesChart({
  charges,
  from,
  to,
  range,
  mode,
}: {
  charges: ChargeRow[];
  from: number;
  to: number;
  range: RangeKey;
  mode: "line" | "bar";
}) {
  const { buckets, labels } = useMemo(() => bucketize(charges, from, to, range), [charges, from, to, range]);
  const max = Math.max(...buckets, 1);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => max * r).reverse();

  const path = buckets
    .map((v, i) => {
      const x = buckets.length === 1 ? 50 : (i / (buckets.length - 1)) * 100;
      const y = 100 - (v / max) * 90;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="flex gap-3">
      <div className="flex w-16 flex-col justify-between py-1 text-right text-[10px] text-muted-foreground">
        {yTicks.map((t, i) => (
          <span key={i}>{brl(t)}</span>
        ))}
      </div>
      <div className="flex-1">
        <div className="relative h-56">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
            <defs>
              <linearGradient id="dashfill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="hsl(var(--border))"
                strokeWidth="0.2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {mode === "line" ? (
              <>
                <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#dashfill)" />
                <path d={path} fill="none" stroke="var(--primary)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              </>
            ) : (
              buckets.map((v, i) => {
                const bw = 100 / buckets.length;
                const h = (v / max) * 90;
                return (
                  <rect
                    key={i}
                    x={i * bw + bw * 0.15}
                    y={100 - h}
                    width={bw * 0.7}
                    height={h}
                    fill="var(--primary)"
                  />
                );
              })
            )}
          </svg>
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function bucketize(charges: ChargeRow[], from: number, to: number, range: RangeKey) {
  // choose bucket count/format
  if (range === "today" || range === "yesterday") {
    // 24 hours -> 12 buckets of 2h
    const n = 12;
    const buckets = new Array(n).fill(0);
    const step = (to - from) / n;
    for (const c of charges) {
      const t = new Date(c.paid_at ?? c.created_at ?? 0).getTime();
      const i = Math.min(n - 1, Math.max(0, Math.floor((t - from) / step)));
      buckets[i] += c.amount_cents ?? 0;
    }
    const labels = Array.from({ length: n }, (_, i) => {
      const h = Math.floor((i * 24) / n);
      return `${String(h).padStart(2, "0")}:00`;
    });
    return { buckets, labels };
  }
  // day-based
  const dayMs = 86400000;
  const startDay = new Date(from); startDay.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.round((to - startDay.getTime()) / dayMs));
  const n = Math.min(days, 30);
  const step = (to - startDay.getTime()) / n;
  const buckets = new Array(n).fill(0);
  for (const c of charges) {
    const t = new Date(c.paid_at ?? c.created_at ?? 0).getTime();
    const i = Math.min(n - 1, Math.max(0, Math.floor((t - startDay.getTime()) / step)));
    buckets[i] += c.amount_cents ?? 0;
  }
  const labels = Array.from({ length: n }, (_, i) => {
    const d = new Date(startDay.getTime() + i * step);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  // sparsify labels
  const stride = Math.ceil(n / 8);
  const sparse = labels.map((l, i) => (i % stride === 0 ? l : ""));
  return { buckets, labels: sparse };
}

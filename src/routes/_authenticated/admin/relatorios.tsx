import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  UserSquare2,
  Activity,
  Users,
  Wallet,
  TrendingUp,
  Percent,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Banknote,
  HandCoins,
  CreditCard,
  Clock,
  DollarSign,
  Landmark,
  LineChart,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  component: RelatoriosPage,
});

type TabId =
  | "produtores"
  | "faturamento"
  | "clientes"
  | "saldo"
  | "receitas"
  | "taxas";

const TABS: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  { id: "produtores", label: "Relatório Produtores", icon: UserSquare2, description: "Ranking e informações sobre os produtores cadastrados no seu gateway" },
  { id: "faturamento", label: "Atividade De Faturamento", icon: Activity, description: "Atividade de faturamento por período." },
  { id: "clientes", label: "Clientes", icon: Users, description: "Análise da base de clientes dos produtores." },
  { id: "saldo", label: "Saldo De Usuários", icon: Wallet, description: "Saldos disponíveis e a liberar por usuário." },
  { id: "receitas", label: "Receitas", icon: TrendingUp, description: "Receitas totais e por categoria." },
  { id: "taxas", label: "Taxas", icon: Percent, description: "Taxas aplicadas e arrecadação." },
];

function RelatoriosPage() {
  const [active, setActive] = useState<TabId>("produtores");
  const current = TABS.find((t) => t.id === active)!;

  return (
    <AdminShell title="Relatórios" subtitle="Relatórios financeiros consolidados">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {active === "produtores" ? (
          <ProdutoresReport />
        ) : active === "faturamento" ? (
          <FaturamentoReport />
        ) : active === "receitas" ? (
          <ReceitasReport />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">{current.label}</h2>
              <p className="text-sm text-muted-foreground">{current.description}</p>
            </div>
            <div className="grid place-items-center py-20 text-center">
              <current.icon className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum dado disponível para o período selecionado.</p>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

type ProducerRow = {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  created_at: string;
  avatar_url: string | null;
  liquid_total: number;
  liquid_count: number;
  affiliate_total: number;
  affiliate_count: number;
  risk_total: number;
  risk_count: number;
  taxes_total: number;
  acquirer_cost: number;
  meta_percent: number;
  meta_target: number;
  meta_label: string;
};

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function ProdutoresReport() {
  const [rows, setRows] = useState<ProducerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("Última semana");

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Approved KYCs => active producers
      const { data: kycs } = await supabase
        .from("kyc_submissions")
        .select("user_id, document, phone, full_name, email, reviewed_at")
        .eq("status", "approved");

      const userIds = Array.from(new Set((kycs ?? []).map((k) => k.user_id)));
      if (userIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, created_at")
        .in("id", userIds);

      const { data: clients } = await supabase
        .from("api_clients")
        .select("id, user_id")
        .in("user_id", userIds);

      const clientIds = (clients ?? []).map((c) => c.id);
      const { data: charges } = clientIds.length
        ? await supabase
            .from("charges")
            .select("client_id, amount_cents, status")
            .in("client_id", clientIds)
        : { data: [] as { client_id: string; amount_cents: number; status: string }[] };

      const clientToUser = new Map((clients ?? []).map((c) => [c.id, c.user_id]));
      const kycByUser = new Map((kycs ?? []).map((k) => [k.user_id, k]));
      const profByUser = new Map((profiles ?? []).map((p) => [p.id, p]));

      const stats = new Map<
        string,
        { liquid: number; liquidCount: number; risk: number; riskCount: number; taxes: number }
      >();
      for (const c of charges ?? []) {
        const uid = clientToUser.get(c.client_id);
        if (!uid) continue;
        const s = stats.get(uid) ?? { liquid: 0, liquidCount: 0, risk: 0, riskCount: 0, taxes: 0 };
        if (c.status === "paid") {
          s.liquid += c.amount_cents - (0);
          s.liquidCount += 1;
          s.taxes += 0;
        } else if (c.status === "chargeback" || c.status === "refunded") {
          s.risk += c.amount_cents;
          s.riskCount += 1;
        }
        stats.set(uid, s);
      }

      const list: ProducerRow[] = userIds.map((uid) => {
        const k = kycByUser.get(uid);
        const p = profByUser.get(uid);
        const s = stats.get(uid) ?? { liquid: 0, liquidCount: 0, risk: 0, riskCount: 0, taxes: 0 };
        const target = 10_000_000; // R$ 100.000,00 in cents
        const percent = Math.min(100, (s.liquid / target) * 100);
        return {
          user_id: uid,
          name: p?.full_name ?? k?.full_name ?? "—",
          email: p?.email ?? k?.email ?? "—",
          phone: p?.phone ?? k?.phone ?? "—",
          document: k?.document ?? "—",
          created_at: p?.created_at ?? k?.reviewed_at ?? new Date().toISOString(),
          avatar_url: p?.avatar_url ?? null,
          liquid_total: s.liquid,
          liquid_count: s.liquidCount,
          affiliate_total: 0,
          affiliate_count: 0,
          risk_total: s.risk,
          risk_count: s.riskCount,
          taxes_total: s.taxes,
          acquirer_cost: 0,
          meta_percent: percent,
          meta_target: target,
          meta_label: "Profecia Confirmada",
        };
      });
      setRows(list);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Relatório de produtores</h2>
          <p className="text-sm text-muted-foreground">
            Ranking e informações sobre os produtores cadastrados no seu gateway
          </p>
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
            placeholder="Buscar por nome do produtor..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary">
          <Filter className="h-4 w-4" />
          Filtros Avançados
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InfoTip
          title="Faturamento líquido"
          text="é o saldo líquido do produtor calculado pelo relatório de saldo"
        />
        <InfoTip
          title="Faturamento como afiliado"
          text="é o total de comissões recebidas por vendas de produtos de terceiros"
        />
        <InfoTip
          title="Faturamento de risco"
          text="é o total de vendas com chargeback ou reembolso"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Faturamento líquido</th>
                <th className="px-4 py-3 font-medium">Faturamento como afiliado</th>
                <th className="px-4 py-3 font-medium">Meta atual</th>
                <th className="px-4 py-3 font-medium">Faturamento de risco</th>
                <th className="px-4 py-3 font-medium">Taxas pagas</th>
                <th className="px-4 py-3 font-medium">Custo por adquirente</th>
                <th className="px-4 py-3 text-right font-medium text-primary">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    Nenhum produtor ativo
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.user_id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt={r.name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-semibold">
                            {r.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                          {r.phone !== "—" && (
                            <p className="text-xs text-muted-foreground">{r.phone}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{formatBRL(r.liquid_total)}</div>
                      <div className="text-xs text-muted-foreground">{r.liquid_count} transações</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{formatBRL(r.affiliate_total)}</div>
                      <div className="text-xs text-muted-foreground">{r.affiliate_count} transações</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-medium text-foreground">
                        {r.meta_label}
                      </span>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.meta_percent.toFixed(1)}% de {formatBRL(r.meta_target)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{formatBRL(r.risk_total)}</div>
                      <div className="text-xs text-muted-foreground">{r.risk_count} transações</div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatBRL(r.taxes_total)}</td>
                    <td className="px-4 py-3 font-semibold">{formatBRL(r.acquirer_cost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          title="Visualizar"
                          className="rounded-md border border-border bg-background p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoTip({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-primary">
      <span className="font-medium">{title}</span>{" "}
      <span className="text-primary/80">{text}</span>
    </div>
  );
}

type FaturamentoRow = {
  user_id: string;
  name: string;
  email: string;
  tags: string[];
  last_billed_at: string | null;
  days_without: number | null;
  last_day_sales: number;
};

function FaturamentoReport() {
  const [rows, setRows] = useState<FaturamentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: kycs } = await supabase
        .from("kyc_submissions")
        .select("user_id, full_name, email")
        .eq("status", "approved");
      const userIds = Array.from(new Set((kycs ?? []).map((k) => k.user_id)));
      if (userIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const { data: clients } = await supabase
        .from("api_clients")
        .select("id, user_id")
        .in("user_id", userIds);
      const clientIds = (clients ?? []).map((c) => c.id);
      const { data: charges } = clientIds.length
        ? await supabase
            .from("charges")
            .select("client_id, amount_cents, paid_at, status")
            .eq("status", "paid")
            .in("client_id", clientIds)
        : { data: [] as { client_id: string; amount_cents: number; paid_at: string | null; status: string }[] };

      const clientToUser = new Map((clients ?? []).map((c) => [c.id, c.user_id]));
      const kycByUser = new Map((kycs ?? []).map((k) => [k.user_id, k]));
      const profByUser = new Map((profiles ?? []).map((p) => [p.id, p]));

      const perUser = new Map<string, { last: string | null; lastDayTotal: number }>();
      for (const c of charges ?? []) {
        const uid = clientToUser.get(c.client_id);
        if (!uid || !c.paid_at) continue;
        const cur = perUser.get(uid) ?? { last: null, lastDayTotal: 0 };
        if (!cur.last || c.paid_at > cur.last) cur.last = c.paid_at;
        perUser.set(uid, cur);
      }
      // compute last day sales after we know last date per user
      for (const c of charges ?? []) {
        const uid = clientToUser.get(c.client_id);
        if (!uid || !c.paid_at) continue;
        const cur = perUser.get(uid)!;
        if (cur.last && sameDay(c.paid_at, cur.last)) {
          cur.lastDayTotal += c.amount_cents;
        }
      }

      const now = Date.now();
      const list: FaturamentoRow[] = userIds.map((uid) => {
        const k = kycByUser.get(uid);
        const p = profByUser.get(uid);
        const stat = perUser.get(uid);
        const daysWithout = stat?.last
          ? Math.floor((now - new Date(stat.last).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          user_id: uid,
          name: p?.full_name ?? k?.full_name ?? "—",
          email: p?.email ?? k?.email ?? "—",
          tags: [],
          last_billed_at: stat?.last ?? null,
          days_without: daysWithout,
          last_day_sales: stat?.lastDayTotal ?? 0,
        };
      });
      setRows(list);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Atividade de faturamento</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe há quanto tempo cada produtor está sem faturar. Os dados consideram apenas dias já consolidados.
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nome ou email"
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary">
          <Filter className="h-4 w-4" />
          Filtros Avançados
        </button>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary">
          <ChevronDown className="h-4 w-4" />
          Configuração da tabela
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Produtor</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Último dia faturado</th>
                <th className="px-4 py-3 font-medium">Sem faturar</th>
                <th className="px-4 py-3 text-right font-medium">Vendas no último dia</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted-foreground">
                    Nenhum produtor ativo
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.user_id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {r.tags.length === 0 ? (
                        <span className="italic text-muted-foreground">Sem tags</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.tags.map((t) => (
                            <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.last_billed_at ? (
                        formatDate(r.last_billed_at)
                      ) : (
                        <span className="italic text-muted-foreground">Nunca faturou</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.days_without === null ? (
                        <span className="italic text-muted-foreground">Nunca faturou</span>
                      ) : r.days_without === 0 ? (
                        <span className="text-foreground">Faturou hoje</span>
                      ) : (
                        <span>{r.days_without} dia{r.days_without === 1 ? "" : "s"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.last_day_sales > 0 ? formatBRL(r.last_day_sales) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

type ReceitasKpis = {
  faturamentoBruto: number;
  totalSaques: number;
  taxasOperacao: number;
  taxasParcelamento: number;
  taxasAntecipacao: number;
  taxasSaque: number;
  custoAdquirente: number;
  lucroEmpresa: number;
};

const PERIOD_OPTIONS = [
  { key: "hoje", label: "Hoje", days: 1 },
  { key: "7d", label: "Últimos 7 dias", days: 7 },
  { key: "semana", label: "Última semana", days: 7 },
  { key: "30d", label: "Últimos 30 dias", days: 30 },
  { key: "mes", label: "Este mês", days: 30 },
  { key: "tudo", label: "Todo o período", days: 0 },
] as const;

type PeriodKey = (typeof PERIOD_OPTIONS)[number]["key"];

type ReceitasByAcquirer = {
  acquirer: string;
  vendas: number;
  taxaGateway: number;
  taxaParcelamento: number;
  taxaAntecipacao: number;
  custoAdquirente: number;
  lucroEmpresa: number;
};

function ReceitasReport() {
  const [period, setPeriod] = useState<PeriodKey>("semana");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<ReceitasKpis>({
    faturamentoBruto: 0,
    totalSaques: 0,
    taxasOperacao: 0,
    taxasParcelamento: 0,
    taxasAntecipacao: 0,
    taxasSaque: 0,
    custoAdquirente: 0,
    lucroEmpresa: 0,
  });
  const [rows, setRows] = useState<ReceitasByAcquirer[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const opt = PERIOD_OPTIONS.find((p) => p.key === period)!;
      const since =
        opt.days > 0 ? new Date(Date.now() - opt.days * 24 * 60 * 60 * 1000).toISOString() : null;

      let chargesQ = supabase.from("charges").select("amount_cents, status, acquirer, paid_at, created_at");
      if (since) chargesQ = chargesQ.gte("created_at", since);
      const { data: charges } = await chargesQ;

      let payoutsQ = supabase.from("payouts").select("amount_cents, status, created_at");
      if (since) payoutsQ = payoutsQ.gte("created_at", since);
      const { data: payouts } = await payoutsQ;

      const { data: taxasRow } = await supabase
        .from("platform_settings")
        .select("data")
        .eq("section", "taxas")
        .maybeSingle();
      const taxas = (taxasRow?.data ?? {}) as {
        pix?: { taxa_fixa?: number; taxa_variavel?: number };
        boleto?: { taxa_fixa?: number; taxa_variavel?: number };
        cartao?: { avista?: { taxa_fixa?: number; taxa_variavel?: number } };
        saque?: { taxa_fixa?: number; taxa_variavel?: number };
      };

      const paid = (charges ?? []).filter((c) => c.status === "paid");
      const faturamentoBruto = paid.reduce((s, c) => s + (c.amount_cents ?? 0), 0);

      // Approximate operation fees using platform defaults (fixed in R$ -> cents, variable in %)
      const opFee = (fixed: number, variable: number, amount: number) =>
        Math.round(fixed * 100) + Math.round((amount * variable) / 100);
      let taxasOperacao = 0;
      for (const c of paid) {
        const amt = c.amount_cents ?? 0;
        const ac = (c.acquirer ?? "").toLowerCase();
        if (ac === "pix") {
          taxasOperacao += opFee(taxas.pix?.taxa_fixa ?? 0, taxas.pix?.taxa_variavel ?? 0, amt);
        } else if (ac === "boleto") {
          taxasOperacao += opFee(taxas.boleto?.taxa_fixa ?? 0, taxas.boleto?.taxa_variavel ?? 0, amt);
        } else {
          taxasOperacao += opFee(
            taxas.cartao?.avista?.taxa_fixa ?? 0,
            taxas.cartao?.avista?.taxa_variavel ?? 0,
            amt,
          );
        }
      }

      const payoutsCompleted = (payouts ?? []).filter((p) => p.status === "paid");
      const totalSaques = payoutsCompleted.reduce((s, p) => s + (p.amount_cents ?? 0), 0);
      const taxasSaque = payoutsCompleted.reduce(
        (s) => s + opFee(taxas.saque?.taxa_fixa ?? 0, taxas.saque?.taxa_variavel ?? 0, 0),
        0,
      );

      const lucroEmpresa = taxasOperacao + taxasSaque;

      setKpis({
        faturamentoBruto,
        totalSaques,
        taxasOperacao,
        taxasParcelamento: 0,
        taxasAntecipacao: 0,
        taxasSaque,
        custoAdquirente: 0,
        lucroEmpresa,
      });

      const byAcq = new Map<string, ReceitasByAcquirer>();
      for (const c of paid) {
        const key = (c.acquirer ?? "—") || "—";
        const cur =
          byAcq.get(key) ??
          {
            acquirer: key,
            vendas: 0,
            taxaGateway: 0,
            taxaParcelamento: 0,
            taxaAntecipacao: 0,
            custoAdquirente: 0,
            lucroEmpresa: 0,
          };
        cur.vendas += c.amount_cents ?? 0;
        byAcq.set(key, cur);
      }
      setRows(Array.from(byAcq.values()));

      setLoading(false);
    }
    void load();
  }, [period]);

  const KPI_CARDS: {
    label: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    { label: "Faturamento Bruto", value: kpis.faturamentoBruto, icon: Banknote, color: "text-foreground" },
    { label: "Total em saques", value: kpis.totalSaques, icon: HandCoins, color: "text-foreground" },
    { label: "Taxas de operação", value: kpis.taxasOperacao, icon: Percent, color: "text-foreground" },
    { label: "Taxas de parcelamento", value: kpis.taxasParcelamento, icon: CreditCard, color: "text-foreground" },
    { label: "Taxas de antecipação", value: kpis.taxasAntecipacao, icon: Clock, color: "text-foreground" },
    { label: "Taxas de saque", value: kpis.taxasSaque, icon: DollarSign, color: "text-foreground" },
    { label: "Custos de adquirente", value: kpis.custoAdquirente, icon: Landmark, color: "text-foreground" },
    { label: "Lucro da empresa", value: kpis.lucroEmpresa, icon: LineChart, color: "text-foreground" },
  ];

  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period)!.label;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Receitas e taxas</h2>
        <p className="text-sm text-muted-foreground">Exibição das informações das taxas.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className={`h-4 w-4 ${k.color}`} />
                <span>{k.label}</span>
              </div>
              <p className="mt-2 text-lg font-semibold">{loading ? "…" : formatBRL(k.value)}</p>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className="w-full appearance-none rounded-lg border border-border bg-card px-4 py-3 pr-10 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>
              ▼ {p.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-[calc(50%+90px)] -translate-y-1/2 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
        </span>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {periodLabel}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Adquirente</th>
                <th className="px-4 py-3 font-medium">Vendas</th>
                <th className="px-4 py-3 font-medium">Taxa da gateway</th>
                <th className="px-4 py-3 font-medium">Taxa de parcelamento</th>
                <th className="px-4 py-3 font-medium">Taxa de antecipação</th>
                <th className="px-4 py-3 font-medium">Custo da adquirente</th>
                <th className="px-4 py-3 font-medium">Lucro da empresa</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    Sem resultados
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.acquirer} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium capitalize">{r.acquirer}</td>
                    <td className="px-4 py-3">{formatBRL(r.vendas)}</td>
                    <td className="px-4 py-3">{formatBRL(r.taxaGateway)}</td>
                    <td className="px-4 py-3">{formatBRL(r.taxaParcelamento)}</td>
                    <td className="px-4 py-3">{formatBRL(r.taxaAntecipacao)}</td>
                    <td className="px-4 py-3">{formatBRL(r.custoAdquirente)}</td>
                    <td className="px-4 py-3">{formatBRL(r.lucroEmpresa)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

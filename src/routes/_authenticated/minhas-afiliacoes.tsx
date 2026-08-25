import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Search, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/minhas-afiliacoes")({ component: MinhasAfiliacoesPage });

type Profile = { id: string; full_name: string | null; display_name: string | null; email: string | null };
type CompanyRow = { id: string; client_user_id: string; percentage: number; status: string; created_at: string; profile: Profile | null };
type SplitRow = { id: string; client_user_id: string; gross_amount_cents: number; amount_cents: number; percentage: number; status: string; created_at: string; profile: Profile | null };

function MinhasAfiliacoesPage() {
  const db = supabase as any;
  const [tab, setTab] = useState<"companies" | "statement">("companies");
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return setLoading(false);
    const [companyResult, splitResult] = await Promise.all([
      db.from("account_affiliates").select("id, client_user_id, percentage, status, created_at").eq("affiliate_user_id", userId).order("created_at", { ascending: false }),
      db.from("split_entries").select("id, client_user_id, gross_amount_cents, amount_cents, percentage, status, created_at").eq("affiliate_user_id", userId).order("created_at", { ascending: false }),
    ]);
    const ids = Array.from(new Set([
      ...(companyResult.data ?? []).map((row: any) => row.client_user_id),
      ...(splitResult.data ?? []).map((row: any) => row.client_user_id),
    ])) as string[];
    const profiles = new Map<string, Profile>();
    if (ids.length) {
      const { data } = await db.from("profiles").select("id, full_name, display_name, email").in("id", ids);
      (data ?? []).forEach((profile: Profile) => profiles.set(profile.id, profile));
    }
    setCompanies((companyResult.data ?? []).map((row: any) => ({ ...row, percentage: Number(row.percentage), profile: profiles.get(row.client_user_id) ?? null })));
    setSplits((splitResult.data ?? []).map((row: any) => ({ ...row, percentage: Number(row.percentage), profile: profiles.get(row.client_user_id) ?? null })));
    setLoading(false);
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  const filteredCompanies = useMemo(() => companies.filter((row) => matches(row.profile, search)), [companies, search]);
  const filteredSplits = useMemo(() => splits.filter((row) => {
    const date = row.created_at.slice(0, 10);
    return matches(row.profile, search) && (!from || date >= from) && (!to || date <= to);
  }), [splits, search, from, to]);
  const available = filteredSplits.filter((row) => row.status === "available").reduce((sum, row) => sum + row.amount_cents, 0);

  return (
    <AppShell title="Minha conta de afiliado" subtitle="Empresas vinculadas, percentuais e valores recebidos">
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Empresas ativas" value={String(companies.filter((row) => row.status === "active").length)} />
          <Metric label="Splits recebidos" value={String(splits.filter((row) => row.status !== "reversed").length)} />
          <Metric label="Saldo de comissão" value={formatBRL(available)} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl border border-border bg-card p-1">
            <TabButton active={tab === "companies"} onClick={() => setTab("companies")}>Empresas</TabButton>
            <TabButton active={tab === "statement"} onClick={() => setTab("statement")}>Extrato de splits</TabButton>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filtrar por empresa" /></div>
          {tab === "statement" && <><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-auto" aria-label="Data inicial" /><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-auto" aria-label="Data final" /></>}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {tab === "companies" ? (
            <table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><Th>Empresa/cliente</Th><Th>Data de cadastro</Th><Th>Porcentagem</Th><Th>Status</Th></tr></thead><tbody>
              {loading ? <Loading cols={4} /> : filteredCompanies.length === 0 ? <Empty cols={4} icon={<Building2 className="h-7 w-7" />} /> : filteredCompanies.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0"><Td className="font-medium">{name(row.profile)}<span className="block text-xs font-normal text-muted-foreground">{row.profile?.email ?? "—"}</span></Td><Td>{date(row.created_at)}</Td><Td className="font-semibold">{percent(row.percentage)}</Td><Td><Status value={row.status} /></Td></tr>)}
            </tbody></table>
          ) : (
            <table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><Th>Data e hora</Th><Th>Empresa</Th><Th>Percentual</Th><Th>Valor da venda</Th><Th>Valor recebido</Th><Th>Status</Th></tr></thead><tbody>
              {loading ? <Loading cols={6} /> : filteredSplits.length === 0 ? <Empty cols={6} icon={<WalletCards className="h-7 w-7" />} /> : filteredSplits.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0"><Td>{date(row.created_at)}</Td><Td className="font-medium">{name(row.profile)}</Td><Td>{percent(row.percentage)}</Td><Td>{formatBRL(row.gross_amount_cents)}</Td><Td className="font-semibold text-emerald-500">{formatBRL(row.amount_cents)}</Td><Td><Status value={row.status} /></Td></tr>)}
            </tbody></table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{tab === "companies" ? `${filteredCompanies.length} empresa(s)` : `${filteredSplits.length} lançamento(s)`}</p>
      </div>
    </AppShell>
  );
}

function matches(profile: Profile | null, search: string) { return `${profile?.full_name ?? ""} ${profile?.display_name ?? ""} ${profile?.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()); }
function name(profile: Profile | null) { return profile?.display_name || profile?.full_name || "Empresa não identificada"; }
function date(value: string) { return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
function percent(value: number) { return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`; }
function formatBRL(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{children}</button>; }
function Th({ children }: { children: React.ReactNode }) { return <th className="px-5 py-4 font-medium">{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-5 py-4 ${className}`}>{children}</td>; }
function Loading({ cols }: { cols: number }) { return <tr><td colSpan={cols} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>; }
function Empty({ cols, icon }: { cols: number; icon: React.ReactNode }) { return <tr><td colSpan={cols} className="py-14 text-center text-muted-foreground"><div className="mx-auto mb-2 w-fit opacity-50">{icon}</div>Nenhum registro encontrado</td></tr>; }
function Status({ value }: { value: string }) { const ok = value === "active" || value === "available" || value === "paid"; const label = value === "active" ? "Ativo" : value === "blocked" ? "Bloqueado" : value === "available" ? "Crédito" : value === "paid" ? "Pago" : value === "reversed" ? "Estornado" : value; return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>{label}</span>; }

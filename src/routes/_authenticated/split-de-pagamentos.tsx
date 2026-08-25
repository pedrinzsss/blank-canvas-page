import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, Search, ShieldBan, Trash2, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/split-de-pagamentos")({
  component: SplitDePagamentosPage,
  head: () => ({ meta: [{ title: "Afiliados e Split — Paglink" }] }),
});

type Profile = { id: string; full_name: string | null; display_name: string | null; email: string | null };
type AffiliateRow = {
  id: string;
  affiliate_user_id: string;
  percentage: number;
  status: "active" | "blocked";
  created_at: string;
  profile: Profile | null;
};
type SplitRow = {
  id: string;
  affiliate_user_id: string;
  gross_amount_cents: number;
  amount_cents: number;
  percentage: number;
  status: string;
  created_at: string;
  profile: Profile | null;
};

function SplitDePagamentosPage() {
  const db = supabase as any;
  const [tab, setTab] = useState<"affiliates" | "history">("affiliates");
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [splits, setSplits] = useState<SplitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AffiliateRow | null>(null);
  const [email, setEmail] = useState("");
  const [percentage, setPercentage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return setLoading(false);

    const [affResult, splitResult] = await Promise.all([
      db.from("account_affiliates").select("id, affiliate_user_id, percentage, status, created_at").eq("client_user_id", userId).order("created_at", { ascending: false }),
      db.from("split_entries").select("id, affiliate_user_id, gross_amount_cents, amount_cents, percentage, status, created_at").eq("client_user_id", userId).order("created_at", { ascending: false }),
    ]);
    const ids = Array.from(new Set([
      ...(affResult.data ?? []).map((row: any) => row.affiliate_user_id),
      ...(splitResult.data ?? []).map((row: any) => row.affiliate_user_id),
    ])) as string[];
    const profileMap = new Map<string, Profile>();
    if (ids.length) {
      const { data } = await db.from("profiles").select("id, full_name, display_name, email").in("id", ids);
      (data ?? []).forEach((profile: Profile) => profileMap.set(profile.id, profile));
    }
    setAffiliates((affResult.data ?? []).map((row: any) => ({ ...row, percentage: Number(row.percentage), profile: profileMap.get(row.affiliate_user_id) ?? null })));
    setSplits((splitResult.data ?? []).map((row: any) => ({ ...row, percentage: Number(row.percentage), profile: profileMap.get(row.affiliate_user_id) ?? null })));
    if (affResult.error) toast.error(affResult.error.message);
    if (splitResult.error) toast.error(splitResult.error.message);
    setLoading(false);
  }, [db]);

  useEffect(() => { void load(); }, [load]);

  const filteredAffiliates = useMemo(() => affiliates.filter((row) => {
    const value = `${row.profile?.full_name ?? ""} ${row.profile?.display_name ?? ""} ${row.profile?.email ?? ""}`.toLowerCase();
    return value.includes(search.trim().toLowerCase());
  }), [affiliates, search]);

  const filteredSplits = useMemo(() => splits.filter((row) => {
    const value = `${row.profile?.full_name ?? ""} ${row.profile?.email ?? ""}`.toLowerCase();
    if (!value.includes(search.trim().toLowerCase())) return false;
    const date = row.created_at.slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  }), [splits, search, from, to]);

  function openNew() {
    setEditing(null); setEmail(""); setPercentage(""); setDialogOpen(true);
  }
  function openEdit(row: AffiliateRow) {
    setEditing(row); setEmail(row.profile?.email ?? ""); setPercentage(String(row.percentage)); setDialogOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const pct = Number(percentage.replace(",", "."));
    if (!email.trim() || !Number.isFinite(pct) || pct <= 0 || pct > 100) {
      toast.error("Informe um e-mail e uma porcentagem entre 0,01% e 100%"); return;
    }
    setSaving(true);
    const { error } = await db.rpc("upsert_my_account_affiliate", { _affiliate_email: email.trim(), _percentage: pct });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Afiliado atualizado" : "Afiliado adicionado");
    setDialogOpen(false); await load();
  }
  async function setStatus(row: AffiliateRow) {
    const status = row.status === "active" ? "blocked" : "active";
    const { error } = await db.from("account_affiliates").update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Afiliado reativado" : "Afiliado bloqueado"); await load();
  }
  async function remove(row: AffiliateRow) {
    if (!confirm(`Remover ${displayName(row.profile)} da divisão de pagamentos?`)) return;
    const { error } = await db.from("account_affiliates").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Afiliado removido"); await load();
  }

  return (
    <AppShell title="Afiliados e Split" subtitle="Gerencie os recebedores vinculados à sua conta">
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl border border-border bg-card p-1">
            <TabButton active={tab === "affiliates"} onClick={() => setTab("affiliates")}>Afiliados</TabButton>
            <TabButton active={tab === "history"} onClick={() => setTab("history")}>Histórico de splits</TabButton>
          </div>
          {tab === "affiliates" && <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Adicionar afiliado</Button>}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-9" />
          </div>
          {tab === "history" && <>
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="w-auto" aria-label="Data inicial" />
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="w-auto" aria-label="Data final" />
          </>}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {tab === "affiliates" ? (
            <table className="w-full min-w-[760px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><Th>Data de cadastro</Th><Th>Titular recebedor</Th><Th>E-mail</Th><Th>Porcentagem</Th><Th>Status</Th><Th className="text-right">Ações</Th></tr></thead>
              <tbody>{loading ? <LoadingRow cols={6} /> : filteredAffiliates.length === 0 ? <EmptyRow cols={6} /> : filteredAffiliates.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0">
                  <Td>{formatDate(row.created_at)}</Td><Td className="font-medium">{displayName(row.profile)}</Td><Td>{row.profile?.email ?? "—"}</Td><Td className="font-semibold">{formatPercent(row.percentage)}</Td>
                  <Td><Status status={row.status} /></Td>
                  <Td><div className="flex justify-end gap-1"><IconButton title="Editar porcentagem" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></IconButton><IconButton title={row.status === "active" ? "Bloquear" : "Reativar"} onClick={() => void setStatus(row)}><ShieldBan className="h-4 w-4" /></IconButton><IconButton title="Remover" danger onClick={() => void remove(row)}><Trash2 className="h-4 w-4" /></IconButton></div></Td>
                </tr>
              ))}</tbody>
            </table>
          ) : (
            <table className="w-full min-w-[820px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><Th>Data e hora</Th><Th>Afiliado</Th><Th>Venda</Th><Th>Porcentagem</Th><Th>Valor do split</Th><Th>Status</Th></tr></thead>
              <tbody>{loading ? <LoadingRow cols={6} /> : filteredSplits.length === 0 ? <EmptyRow cols={6} /> : filteredSplits.map((row) => (
                <tr key={row.id} className="border-b border-border/60 last:border-0"><Td>{formatDate(row.created_at)}</Td><Td className="font-medium">{displayName(row.profile)}</Td><Td>{formatBRL(row.gross_amount_cents)}</Td><Td>{formatPercent(row.percentage)}</Td><Td className="font-semibold text-emerald-500">{formatBRL(row.amount_cents)}</Td><Td><Status status={row.status} /></Td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{tab === "affiliates" ? `${filteredAffiliates.length} afiliado(s)` : `${filteredSplits.length} split(s)`}</p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar afiliado" : "Adicionar afiliado"}</DialogTitle><DialogDescription>O afiliado precisa possuir uma conta cadastrada na plataforma.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="affiliate-email">E-mail do titular</Label><Input id="affiliate-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={!!editing} required /></div>
            <div className="space-y-2"><Label htmlFor="affiliate-percentage">Porcentagem sobre cada venda</Label><Input id="affiliate-percentage" inputMode="decimal" value={percentage} onChange={(event) => setPercentage(event.target.value)} placeholder="Ex.: 1,5" required /></div>
            <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function displayName(profile: Profile | null) { return profile?.display_name || profile?.full_name || "Titular não identificado"; }
function formatDate(value: string) { return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
function formatBRL(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function formatPercent(value: number) { return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value)}%`; }
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-medium ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{children}</button>; }
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <th className={`px-5 py-4 font-medium ${className}`}>{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-5 py-4 ${className}`}>{children}</td>; }
function LoadingRow({ cols }: { cols: number }) { return <tr><td colSpan={cols} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>; }
function EmptyRow({ cols }: { cols: number }) { return <tr><td colSpan={cols} className="py-14 text-center text-muted-foreground"><UserRoundCheck className="mx-auto mb-2 h-7 w-7 opacity-50" />Nenhum registro encontrado</td></tr>; }
function Status({ status }: { status: string }) { const active = status === "active" || status === "available" || status === "paid"; return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>{status === "active" ? "Ativo" : status === "blocked" ? "Bloqueado" : status === "available" ? "Disponível" : status === "paid" ? "Pago" : status === "reversed" ? "Estornado" : status}</span>; }
function IconButton({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) { return <Button type="button" variant="ghost" size="icon" title={title} onClick={onClick} className={danger ? "text-destructive" : ""}>{children}</Button>; }

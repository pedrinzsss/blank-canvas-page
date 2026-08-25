import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Search, ShieldBan, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/afiliados")({ component: AdminAffiliatesPage });

type Profile = { id: string; full_name: string | null; display_name: string | null; email: string | null };
type Row = { id: string; client_user_id: string; affiliate_user_id: string; percentage: number; status: "active" | "blocked"; created_at: string; client: Profile | null; affiliate: Profile | null };

function AdminAffiliatesPage() {
  const db = supabase as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [affiliateEmail, setAffiliateEmail] = useState("");
  const [percentage, setPercentage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from("account_affiliates").select("id, client_user_id, affiliate_user_id, percentage, status, created_at").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const raw = (data ?? []) as any[];
    const ids = Array.from(new Set(raw.flatMap((row) => [row.client_user_id, row.affiliate_user_id]))) as string[];
    const profiles = new Map<string, Profile>();
    if (ids.length) {
      const { data: profileData } = await db.from("profiles").select("id, full_name, display_name, email").in("id", ids);
      (profileData ?? []).forEach((profile: Profile) => profiles.set(profile.id, profile));
    }
    setRows(raw.map((row) => ({ ...row, percentage: Number(row.percentage), client: profiles.get(row.client_user_id) ?? null, affiliate: profiles.get(row.affiliate_user_id) ?? null })));
    setLoading(false);
  }, [db]);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => rows.filter((row) => `${name(row.client)} ${row.client?.email ?? ""} ${name(row.affiliate)} ${row.affiliate?.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())), [rows, search]);

  async function add(event: FormEvent) {
    event.preventDefault();
    const pct = Number(percentage.replace(",", "."));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return toast.error("Porcentagem inválida");
    setSaving(true);
    const { error } = await db.rpc("admin_upsert_account_affiliate", { _client_email: clientEmail.trim(), _affiliate_email: affiliateEmail.trim(), _percentage: pct });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Afiliado vinculado ao cliente");
    setOpen(false); setClientEmail(""); setAffiliateEmail(""); setPercentage(""); await load();
  }
  async function toggle(row: Row) {
    const status = row.status === "active" ? "blocked" : "active";
    const { error } = await db.from("account_affiliates").update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Vínculo reativado" : "Vínculo bloqueado"); await load();
  }
  async function remove(row: Row) {
    if (!confirm(`Remover ${name(row.affiliate)} da conta de ${name(row.client)}?`)) return;
    const { error } = await db.from("account_affiliates").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Vínculo removido"); await load();
  }

  return (
    <AdminShell title="Afiliados e splits" subtitle="Gerencie os recebedores de todas as contas clientes">
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3"><Metric label="Vínculos" value={rows.length} /><Metric label="Ativos" value={rows.filter((row) => row.status === "active").length} /><Metric label="Bloqueados" value={rows.filter((row) => row.status === "blocked").length} /></div>
        <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente ou afiliado" /></div><Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Adicionar afiliado</Button></div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground"><Th>Cliente/rifeiro</Th><Th>Afiliado recebedor</Th><Th>Cadastro</Th><Th>Porcentagem</Th><Th>Status</Th><Th className="text-right">Ações</Th></tr></thead><tbody>
            {loading ? <tr><td colSpan={6} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="py-14 text-center text-muted-foreground">Nenhum vínculo encontrado</td></tr> : filtered.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0"><Td className="font-medium">{name(row.client)}<small className="block font-normal text-muted-foreground">{row.client?.email ?? "—"}</small></Td><Td className="font-medium">{name(row.affiliate)}<small className="block font-normal text-muted-foreground">{row.affiliate?.email ?? "—"}</small></Td><Td>{new Date(row.created_at).toLocaleString("pt-BR")}</Td><Td className="font-semibold">{row.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</Td><Td><Status value={row.status} /></Td><Td><div className="flex justify-end gap-1"><Button variant="outline" size="sm" onClick={() => void toggle(row)}><ShieldBan className="mr-2 h-4 w-4" />{row.status === "active" ? "Bloquear" : "Reativar"}</Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => void remove(row)}><Trash2 className="h-4 w-4" /></Button></div></Td></tr>)}
          </tbody></table>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Adicionar afiliado à conta</DialogTitle><DialogDescription>Use os e-mails cadastrados do cliente e do titular que receberá o split.</DialogDescription></DialogHeader><form onSubmit={add} className="space-y-4"><Field id="client-email" label="E-mail do cliente/rifeiro" type="email" value={clientEmail} onChange={setClientEmail} /><Field id="affiliate-email" label="E-mail do afiliado" type="email" value={affiliateEmail} onChange={setAffiliateEmail} /><Field id="split-percentage" label="Porcentagem do split" value={percentage} onChange={setPercentage} placeholder="Ex.: 1,5" /><DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar vínculo</Button></DialogFooter></form></DialogContent></Dialog>
    </AdminShell>
  );
}

function name(profile: Profile | null) { return profile?.display_name || profile?.full_name || "Não identificado"; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <th className={`px-5 py-4 font-medium ${className}`}>{children}</th>; }
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <td className={`px-5 py-4 ${className}`}>{children}</td>; }
function Status({ value }: { value: string }) { return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${value === "active" ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>{value === "active" ? "Ativo" : "Bloqueado"}</span>; }
function Field({ id, label, value, onChange, type = "text", placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required /></div>; }

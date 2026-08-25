import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, Fragment } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ScrollText,
  Search,
  RefreshCw,
  LogIn,
  LogOut,
  Settings,
  KeyRound,
  KeySquare,
  CreditCard,
  Undo2,
  ArrowDownToLine,
  Percent,
  ChevronDown,
  ChevronRight,
  Package,
  PackagePlus,
  PackageMinus,
  Tag,
  TagsIcon,
  ShoppingCart,
  Truck,
  Layers,
  Landmark,
  Wallet,
  Activity,
} from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { AuditAction } from "@/lib/audit";

type AuditLog = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  ip: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
};

type ActionMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
};

const TONE = {
  green: "text-foreground bg-foreground/10 border-border",
  slate: "text-slate-300 bg-slate-500/10 border-slate-500/20",
  sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  violet: "text-primary bg-primary border-primary",
  rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  indigo: "text-primary bg-primary border-primary",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  fuchsia: "text-primary bg-primary border-primary",
} as const;

const ACTION_META: Record<AuditAction, ActionMeta> = {
  login: { label: "Login", icon: LogIn, tone: TONE.green },
  logout: { label: "Logout", icon: LogOut, tone: TONE.slate },
  login_failed: { label: "Falha no login", icon: LogIn, tone: TONE.rose },
  signup: { label: "Cadastro criado", icon: LogIn, tone: TONE.green },
  signup_failed: { label: "Falha no cadastro", icon: LogIn, tone: TONE.rose },
  password_reset_request: { label: "Redefinição de senha", icon: KeyRound, tone: TONE.amber },
  page_view: { label: "Página acessada", icon: Activity, tone: TONE.slate },
  config_update: { label: "Alteração de configuração", icon: Settings, tone: TONE.sky },
  api_key_create: { label: "Criação de API Key", icon: KeyRound, tone: TONE.violet },
  api_key_revoke: { label: "Revogação de API Key", icon: KeySquare, tone: TONE.rose },
  charge_create: { label: "Criação de cobrança", icon: CreditCard, tone: TONE.indigo },
  refund: { label: "Estorno", icon: Undo2, tone: TONE.amber },
  withdrawal: { label: "Saque", icon: ArrowDownToLine, tone: TONE.cyan },
  fee_update: { label: "Alteração de taxas", icon: Percent, tone: TONE.fuchsia },
  product_create: { label: "Produto criado", icon: PackagePlus, tone: TONE.green },
  product_update: { label: "Produto atualizado", icon: Package, tone: TONE.sky },
  product_delete: { label: "Produto excluído", icon: PackageMinus, tone: TONE.rose },
  offer_create: { label: "Oferta criada", icon: Tag, tone: TONE.green },
  offer_update: { label: "Oferta atualizada", icon: TagsIcon, tone: TONE.sky },
  offer_publish: { label: "Oferta publicada", icon: TagsIcon, tone: TONE.violet },
  offer_deactivate: { label: "Oferta desativada", icon: TagsIcon, tone: TONE.amber },
  offer_delete: { label: "Oferta excluída", icon: TagsIcon, tone: TONE.rose },
  checkout_update: { label: "Checkout atualizado", icon: ShoppingCart, tone: TONE.sky },
  tracking_update: { label: "Rastreamento atualizado", icon: Truck, tone: TONE.sky },
  order_bump_update: { label: "Order bump atualizado", icon: Layers, tone: TONE.violet },
  upsell_update: { label: "Upsell atualizado", icon: Layers, tone: TONE.violet },
  bank_account_create: { label: "Conta bancária criada", icon: Landmark, tone: TONE.green },
  bank_account_delete: { label: "Conta bancária excluída", icon: Landmark, tone: TONE.rose },
  bank_account_update: { label: "Conta bancária atualizada", icon: Landmark, tone: TONE.sky },
  withdrawal_request: { label: "Solicitação de saque", icon: Wallet, tone: TONE.cyan },
};

function getMeta(action: string): ActionMeta {
  return (
    (ACTION_META as Record<string, ActionMeta>)[action] ?? {
      label: action.replace(/_/g, " "),
      icon: Activity,
      tone: TONE.slate,
    }
  );
}

export const Route = createFileRoute("/_authenticated/admin/logs")({
  component: LogsPage,
});

function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(`Não foi possível carregar os logs: ${error.message}`);
      setLogs([]);
    } else {
      setLogs((data ?? []) as AuditLog[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const availableActions = useMemo(() => {
    const set = new Set<string>(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (action !== "all" && l.action !== action) return false;
      if (!q) return true;
      return (
        (l.user_email ?? "").toLowerCase().includes(q) ||
        (l.ip ?? "").toLowerCase().includes(q) ||
        getMeta(l.action).label.toLowerCase().includes(q) ||
        JSON.stringify(l.data ?? {}).toLowerCase().includes(q)
      );
    });
  }, [logs, search, action]);

  return (
    <AdminShell title="Logs e Auditoria" subtitle="Configurações">
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por usuário, IP ou dados"
              className="pl-9 bg-background/50 border-border"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[260px] bg-background/50 border-border">
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {availableActions.map((a) => (
                <SelectItem key={a} value={a}>
                  {getMeta(a).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => void load()}
            className="gap-2 border-border bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Registros ({filtered.length})</h2>
            </div>
            <span className="text-xs text-muted-foreground">Últimos 500 eventos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium w-8"></th>
                  <th className="px-5 py-3 font-medium">Ação</th>
                  <th className="px-5 py-3 font-medium">Usuário</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                      Carregando registros…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map((l) => {
                    const meta = getMeta(l.action);
                    const Icon = meta.icon;
                    const isOpen = !!expanded[l.id];
                    const hasData = l.data && Object.keys(l.data).length > 0;
                    return (
                      <Fragment key={l.id}>
                        <tr className="border-b border-border/60 transition-colors hover:bg-secondary/30">
                          <td className="px-5 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded((prev) => ({ ...prev, [l.id]: !prev[l.id] }))
                              }
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={isOpen ? "Recolher" : "Expandir"}
                            >
                              {isOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${meta.tone}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-foreground/90">
                            {l.user_email ?? "—"}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                            {l.ip ?? "—"}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                            {format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss", {
                              locale: ptBR,
                            })}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b border-border/60 bg-background/40">
                            <td></td>
                            <td colSpan={4} className="px-5 py-3">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Dados
                              </p>
                              <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-background/60 p-3 text-xs text-foreground/90">
                                {hasData ? JSON.stringify(l.data, null, 2) : "—"}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

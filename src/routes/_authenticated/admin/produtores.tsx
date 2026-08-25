import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Tag,
  FileDown,
  Search,
  Check,
  AlertCircle,
  X,
  ChevronDown,
  MessageCircle,
  LogIn,
  Eye,
} from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/produtores")({
  component: ProdutoresPage,
});

type Row = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  created_at: string;
  kyc_status: "approved" | "pending" | "rejected" | "none";
  submission: Record<string, unknown> | null;
  transactions: number;
  customers: number;
  tags: string[];
  has_documents: boolean;
};

type Filter =
  | "Todos"
  | "Ativos"
  | "Pendentes"
  | "Pendentes com documentos"
  | "Banidos"
  | "Filtros avançados";

function ProdutoresPage() {
  const [filter, setFilter] = useState<Filter>("Ativos");
  const [search, setSearch] = useState("");
  const [doc, setDoc] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [tagRow, setTagRow] = useState<Row | null>(null);
  const [accessRow, setAccessRow] = useState<Row | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const [profRes, subRes, clientRes, custRes, txRes, docRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, created_at"),
      supabase.from("kyc_submissions").select("*"),
      supabase.from("api_clients").select("id, user_id"),
      supabase.from("customers").select("id, client_id"),
      supabase.from("transactions").select("id, client_id"),
      supabase.from("kyc_documents").select("user_id"),
    ]);

    const subsByUser = new Map<string, Record<string, unknown>>();
    (subRes.data ?? []).forEach((s) => subsByUser.set((s as { user_id: string }).user_id, s as Record<string, unknown>));

    const clientToUser = new Map<string, string>();
    (clientRes.data ?? []).forEach((c: { id: string; user_id: string }) => clientToUser.set(c.id, c.user_id));

    const custCount = new Map<string, Set<string>>();
    (custRes.data ?? []).forEach((c: { id: string; client_id: string }) => {
      const uid = clientToUser.get(c.client_id);
      if (!uid) return;
      if (!custCount.has(uid)) custCount.set(uid, new Set());
      custCount.get(uid)!.add(c.id);
    });

    const txCount = new Map<string, number>();
    (txRes.data ?? []).forEach((t: { client_id: string }) => {
      const uid = clientToUser.get(t.client_id);
      if (!uid) return;
      txCount.set(uid, (txCount.get(uid) ?? 0) + 1);
    });

    const hasDocs = new Set<string>();
    (docRes.data ?? []).forEach((d: { user_id: string }) => hasDocs.add(d.user_id));

    const list: Row[] = (profRes.data ?? []).map((p) => {
      const sub = subsByUser.get(p.id) ?? null;
      const status = (sub?.status as Row["kyc_status"] | undefined) ?? "none";
      return {
        user_id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        document: (sub?.document as string | null) ?? null,
        created_at: p.created_at,
        kyc_status: status,
        submission: sub,
        transactions: txCount.get(p.id) ?? 0,
        customers: custCount.get(p.id)?.size ?? 0,
        tags: [],
        has_documents: hasDocs.has(p.id),
      };
    });

    setRows(list);
    setLoading(false);
  }

  const totals = useMemo(() => {
    const ativos = rows.filter((r) => r.kyc_status === "approved").length;
    const pendentes = rows.filter((r) => r.kyc_status === "pending" || r.kyc_status === "none").length;
    const pendentesComDocs = rows.filter(
      (r) => (r.kyc_status === "pending" || r.kyc_status === "none") && r.has_documents,
    ).length;
    const banidos = rows.filter((r) => r.kyc_status === "rejected").length;
    return { ativos, pendentes, pendentesComDocs, banidos, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const isPend = r.kyc_status === "pending" || r.kyc_status === "none";
      if (filter === "Ativos" && r.kyc_status !== "approved") return false;
      if (filter === "Pendentes" && !isPend) return false;
      if (filter === "Pendentes com documentos" && !(isPend && r.has_documents)) return false;
      if (filter === "Banidos" && r.kyc_status !== "rejected") return false;
      // "Todos" and "Filtros avançados" don't restrict by status here
      if (search) {
        const s = search.toLowerCase();
        const hit = (r.full_name ?? "").toLowerCase().includes(s) || (r.email ?? "").toLowerCase().includes(s);
        if (!hit) return false;
      }
      if (doc) {
        if (!(r.document ?? "").replace(/\D/g, "").includes(doc.replace(/\D/g, ""))) return false;
      }
      return true;
    });
  }, [rows, filter, search, doc]);


  return (
    <AdminShell title="Produtores" subtitle="Lista de produtores cadastrados no sistema">
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-end">
          <button
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Tag className="h-4 w-4" />
            Gerenciar Tags
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Filtros</h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                <FileDown className="h-3.5 w-3.5" />
                Exportar produtores
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Nome ou email
              </p>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                CPF ou CNPJ
              </p>
              <input
                type="text"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Filtrar por
                </p>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as Filter)}
                  className="bg-transparent text-sm text-foreground outline-none"
                >
                  <option>Todos</option>
                  <option>Ativos</option>
                  <option>Pendentes</option>
                  <option>Pendentes com documentos</option>
                  <option>Banidos</option>
                  <option>Filtros avançados</option>
                </select>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            icon={<Check className="h-5 w-5 text-foreground" />}
            label="Ativos"
            value={totals.ativos}
            total={totals.total}
          />
          <StatusCard
            icon={<AlertCircle className="h-5 w-5 text-amber-400" />}
            label="Pendentes"
            value={totals.pendentes}
            total={totals.total}
          />
          <StatusCard
            icon={<AlertCircle className="h-5 w-5 text-sky-400" />}
            label="Pendentes com documentos"
            value={totals.pendentesComDocs}
            total={totals.total}
          />
          <StatusCard
            icon={<X className="h-5 w-5 text-red-400" />}
            label="Banidos"
            value={totals.banidos}
            total={totals.total}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Financeiro</th>
                <th className="px-4 py-4 font-medium">Data de cadastro</th>
                <th className="px-4 py-4 font-medium">Tags</th>
                <th className="px-4 py-4 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                    Nenhum produtor encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.user_id} className="border-b border-border/60 last:border-0">
                    <td className="px-6 py-5">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">{p.full_name ?? "—"}</p>
                        <p className="text-xs text-primary">{p.email ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.document ?? "—"}</p>
                        {p.phone && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-foreground/10 text-foreground">
                              <MessageCircle className="h-3 w-3" />
                            </span>
                            <span className="text-xs font-medium">{p.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <StatusPill status={p.kyc_status} />
                    </td>
                    <td className="px-4 py-5">
                      <p className="font-medium">{p.transactions} transações</p>
                      <p className="text-xs text-muted-foreground">{p.customers} clientes</p>
                    </td>
                    <td className="px-4 py-5 text-xs">
                      <p className="font-medium">{timeAgo(p.created_at)}</p>
                      <p className="text-muted-foreground">{formatDate(p.created_at)}</p>
                    </td>
                    <td className="px-4 py-5 text-xs text-muted-foreground">
                      {p.tags.length === 0 ? "Sem tags" : p.tags.join(", ")}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <IconAction title="Acessar painel do usuário" onClick={() => navigate({ to: "/dashboard", search: { as: p.user_id } })} icon={<LogIn className="h-3.5 w-3.5" />} />
                        <IconAction title="Adicionar tag" onClick={() => setTagRow(p)} icon={<Tag className="h-3.5 w-3.5" />} />
                        <IconAction title="Visualizar dados" onClick={() => setViewRow(p)} icon={<Eye className="h-3.5 w-3.5" />} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!viewRow} onOpenChange={(o) => !o && setViewRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dados da conta</DialogTitle>
            <DialogDescription>{viewRow?.full_name ?? "—"}</DialogDescription>
          </DialogHeader>
          {viewRow && (
            <div className="grid gap-3 text-sm">
              <Field label="Usuário (login)" value={viewRow.email} />
              <Field label="Senha" value="••••••••  (armazenada com criptografia irreversível)" />
              <Field label="Email" value={viewRow.email} />

              <Field label="Telefone" value={viewRow.phone} />
              <Field label="CPF/CNPJ" value={viewRow.document} />
              <Field label="Status KYC" value={STATUS_LABEL[viewRow.kyc_status]} />
              <Field label="Transações" value={String(viewRow.transactions)} />
              <Field label="Clientes" value={String(viewRow.customers)} />
              <Field label="Cadastrado em" value={formatDate(viewRow.created_at)} />
              {viewRow.submission && (
                <>
                  <Field label="Nome fantasia" value={viewRow.submission.trade_name as string | null} />
                  <Field label="Razão social" value={viewRow.submission.company_name as string | null} />
                  <Field
                    label="Endereço"
                    value={[
                      viewRow.submission.address_street,
                      viewRow.submission.address_number,
                      viewRow.submission.address_city,
                      viewRow.submission.address_state,
                    ]
                      .filter(Boolean)
                      .join(", ") || null}
                  />
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tagRow} onOpenChange={(o) => !o && setTagRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Tags</DialogTitle>
            <DialogDescription>
              Nome: {tagRow?.full_name ?? "—"}
              <br />
              Email: {tagRow?.email ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold">Tags Aplicadas (0)</p>
              <p className="text-xs text-muted-foreground">Nenhuma tag aplicada a este produtor</p>
            </div>
            <div>
              <p className="font-semibold">Tags Disponíveis (0)</p>
              <p className="text-xs text-muted-foreground">Todas as tags já foram aplicadas a este produtor</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accessRow} onOpenChange={(o) => !o && setAccessRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de acesso - {accessRow?.full_name ?? ""}</DialogTitle>
            <DialogDescription>
              Você pode acessar o painel do produtor através do botão abaixo.
              Você deve copiar o link e acessar em uma <strong>nova guia anônima</strong> no seu navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Dica: Use o comando <code>Ctrl + Shift + N</code> para abrir uma nova guia anônima.
            </p>
            <button
              onClick={() => {
                const url = `${window.location.origin}/dashboard?impersonate=${accessRow?.user_id ?? ""}`;
                void navigator.clipboard.writeText(url);
                toast.success("Link copiado");
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-primary hover:bg-muted"
            >
              <LogIn className="h-4 w-4" />
              Copiar link de acesso
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

const STATUS_LABEL: Record<Row["kyc_status"], string> = {
  approved: "Ativo",
  pending: "Pendente",
  none: "Pendente",
  rejected: "Banido",
};

function StatusCard({
  icon,
  label,
  value,
  total,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">
        {value}/{total}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: Row["kyc_status"] }) {
  const map = {
    approved: "bg-foreground/10 text-foreground dark:text-foreground border-border",
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    none: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
    rejected: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
  } as const;
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function IconAction({
  icon,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground"
    >
      {icon}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} - ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "hoje";
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months > 1 ? "meses" : "mês"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ano${years > 1 ? "s" : ""}`;
}

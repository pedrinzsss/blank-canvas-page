import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Eye, Ban, BadgeCheck, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserAccount } from "@/lib/admin-users.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Submission = {
  id: string;
  user_id: string;
  status: string;
  submitted_at: string | null;
  person_type: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  birth_date: string | null;
  mother_name: string | null;
  occupation: string | null;
  company_name: string | null;
  trade_name: string | null;
  website: string | null;
  monthly_income_cents: number | null;
  avg_ticket_cents: number | null;
  products_description: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
};

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  status: string;
  submitted_at: string | null;
  submission: Submission | null;
};

type DocRow = {
  id: string;
  user_id: string;
  doc_type: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
};

type UserDocsRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  docs: DocRow[];
};

const STATUS_LABEL: Record<string, string> = {
  none: "Pendente",
  pending: "Pendente",
  submitted: "Em análise",
  approved: "Aprovado",
  rejected: "Rejeitado",
  changes_requested: "Alteração solicitada",
};

const STATUS_STYLES: Record<string, string> = {
  none: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  submitted: "bg-primary/15 text-primary border-primary/30",
  approved: "bg-foreground/10 text-foreground border-border",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  changes_requested: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

const DOC_TYPE_LABEL: Record<string, string> = {
  cpf_front: "CPF - Frente",
  cpf_back: "CPF - Verso",
  rg_front: "RG - Frente",
  rg_back: "RG - Verso",
  cnh_front: "CNH - Frente",
  cnh_back: "CNH - Verso",
  selfie: "Selfie",
  address_proof: "Comprovante de Residência",
  cnpj_card: "Cartão CNPJ",
  social_contract: "Contrato Social",
};

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  component: KycPage,
});

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCents(n: number | null) {
  if (!n) return "—";
  return (n / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function KycPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [userDocs, setUserDocs] = useState<UserDocsRow[] | null>(null);
  const [viewingKyc, setViewingKyc] = useState<Row | null>(null);
  const [viewingDocs, setViewingDocs] = useState<UserDocsRow | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const deleteUser = useServerFn(deleteUserAccount);

  async function load() {
    const [{ data: profiles }, { data: subs }, { data: documents }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("kyc_submissions").select("*"),
      supabase
        .from("kyc_documents")
        .select("id, user_id, doc_type, file_name, mime_type, size_bytes, storage_path, created_at")
        .order("created_at", { ascending: false }),
    ]);
    const subMap = new Map((subs ?? []).map((s) => [s.user_id, s as Submission]));

    const merged: Row[] = (profiles ?? []).map((p) => {
      const s = subMap.get(p.id) ?? null;
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone,
        created_at: p.created_at,
        status: s?.status ?? "none",
        submitted_at: s?.submitted_at ?? null,
        submission: s,
      };
    });
    setRows(merged);

    const docsByUser = new Map<string, DocRow[]>();
    for (const d of documents ?? []) {
      const list = docsByUser.get(d.user_id) ?? [];
      list.push(d);
      docsByUser.set(d.user_id, list);
    }
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p] as const));
    const grouped: UserDocsRow[] = Array.from(docsByUser.entries()).map(([user_id, docs]) => {
      const p = profileMap.get(user_id);
      const s = subMap.get(user_id);
      return {
        user_id,
        full_name: p?.full_name ?? s?.full_name ?? null,
        email: p?.email ?? s?.email ?? null,
        status: s?.status ?? "none",
        docs,
      };
    });
    setUserDocs(grouped);
  }

  useEffect(() => {
    void load();
  }, []);

  async function openDocument(path: string) {
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else if (error) toast.error(error.message);
  }

  async function updateStatus(row: Row, status: "approved" | "rejected") {
    if (!row.submission) {
      toast.error("Cadastro ainda não foi enviado pelo usuário.");
      return;
    }
    const { error } = await supabase
      .from("kyc_submissions")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", row.submission.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Cadastro aprovado" : "Cadastro rejeitado");
    void load();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteUser({ data: { userId: deleting.id } });
      toast.success("Usuário excluído");
      setDeleting(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir usuário");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <AdminShell title="KYC" subtitle="Cadastro">
      <div className="p-6">
        <Tabs defaultValue="kyc" className="w-full">
          <TabsList>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Usuário</th>
                    <th className="px-4 py-4 font-medium">Contato</th>
                    <th className="px-4 py-4 font-medium">Status KYC</th>
                    <th className="px-4 py-4 font-medium">Cadastro</th>
                    <th className="px-4 py-4 font-medium">Enviado em</th>
                    <th className="px-4 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows === null ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                        Carregando...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-sm text-muted-foreground">
                        Nenhuma conta cadastrada ainda.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="px-6 py-5">
                          <p className="font-semibold">{r.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{r.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-4 py-5 text-xs">
                          <p>{r.email ?? "—"}</p>
                          <p className="text-muted-foreground">{r.phone ?? "—"}</p>
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[r.status] ?? STATUS_STYLES.none}`}
                          >
                            {STATUS_LABEL[r.status] ?? "Pendente"}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-5 text-xs text-muted-foreground">
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleString("pt-BR") : "—"}
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingKyc(r)}
                              title="Visualizar informações"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(r, "rejected")}
                              title="Rejeitar"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(r, "approved")}
                              title="Aprovar"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-foreground/10 text-foreground hover:bg-foreground/10"
                            >
                              <BadgeCheck className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(r)}
                              title="Excluir usuário"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="documentos" className="mt-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-6 py-4 font-medium">Usuário</th>
                    <th className="px-4 py-4 font-medium">Email</th>
                    <th className="px-4 py-4 font-medium">Documentos</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-4 py-4 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {userDocs === null ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-sm text-muted-foreground">
                        Carregando...
                      </td>
                    </tr>
                  ) : userDocs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-sm text-muted-foreground">
                        Nenhum documento enviado ainda.
                      </td>
                    </tr>
                  ) : (
                    userDocs.map((u) => (
                      <tr key={u.user_id} className="border-b border-border/60 last:border-0">
                        <td className="px-6 py-5">
                          <p className="font-semibold">{u.full_name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}</p>
                        </td>
                        <td className="px-4 py-5 text-xs text-muted-foreground">
                          {u.email ?? "—"}
                        </td>
                        <td className="px-4 py-5 text-xs text-muted-foreground">
                          {u.docs.length} {u.docs.length === 1 ? "arquivo" : "arquivos"}
                        </td>
                        <td className="px-4 py-5">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[u.status] ?? STATUS_STYLES.none}`}
                          >
                            {STATUS_LABEL[u.status] ?? "Pendente"}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => setViewingDocs(u)}
                              title="Visualizar documentos"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
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
          </TabsContent>
        </Tabs>
      </div>

      {/* KYC full-info dialog */}
      <Dialog open={!!viewingKyc} onOpenChange={(o) => !o && setViewingKyc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingKyc?.full_name || "Usuário"}</DialogTitle>
            <DialogDescription>{viewingKyc?.email ?? "—"}</DialogDescription>
          </DialogHeader>
          {viewingKyc?.submission ? (
            <div className="space-y-6 text-sm">
              <Section title="Identificação">
                <Field label="Tipo" value={viewingKyc.submission.person_type === "pj" ? "Pessoa Jurídica" : "Pessoa Física"} />
                <Field label="Nome" value={viewingKyc.submission.full_name} />
                <Field label="Documento" value={viewingKyc.submission.document} />
                <Field label="Nascimento" value={viewingKyc.submission.birth_date} />
                <Field label="Nome da mãe" value={viewingKyc.submission.mother_name} />
                <Field label="Ocupação" value={viewingKyc.submission.occupation} />
                {viewingKyc.submission.person_type === "pj" && (
                  <>
                    <Field label="Razão Social" value={viewingKyc.submission.company_name} />
                    <Field label="Nome fantasia" value={viewingKyc.submission.trade_name} />
                  </>
                )}
              </Section>

              <Section title="Contato">
                <Field label="Email" value={viewingKyc.submission.email} />
                <Field label="Telefone" value={viewingKyc.submission.phone} />
                <Field label="Website" value={viewingKyc.submission.website} />
              </Section>

              <Section title="Endereço">
                <Field label="Rua" value={viewingKyc.submission.address_street} />
                <Field label="Número" value={viewingKyc.submission.address_number} />
                <Field label="Complemento" value={viewingKyc.submission.address_complement} />
                <Field label="Bairro" value={viewingKyc.submission.address_neighborhood} />
                <Field label="Cidade" value={viewingKyc.submission.address_city} />
                <Field label="Estado" value={viewingKyc.submission.address_state} />
                <Field label="CEP" value={viewingKyc.submission.address_zip} />
              </Section>

              <Section title="Negócio">
                <Field label="Faturamento mensal" value={formatCents(viewingKyc.submission.monthly_income_cents)} />
                <Field label="Ticket médio" value={formatCents(viewingKyc.submission.avg_ticket_cents)} />
                <Field label="Produtos" value={viewingKyc.submission.products_description} full />
              </Section>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    await updateStatus(viewingKyc, "rejected");
                    setViewingKyc(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await updateStatus(viewingKyc, "approved");
                    setViewingKyc(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/10"
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Aprovar
                </button>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este usuário ainda não enviou o cadastro KYC.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Documents dialog (view-only) */}
      <Dialog open={!!viewingDocs} onOpenChange={(o) => !o && setViewingDocs(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Documentos de {viewingDocs?.full_name || "usuário"}</DialogTitle>
            <DialogDescription>
              {viewingDocs?.email ?? "—"} ·{" "}
              <span
                className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[viewingDocs?.status ?? "none"] ?? STATUS_STYLES.none}`}
              >
                {STATUS_LABEL[viewingDocs?.status ?? "none"] ?? "Pendente"}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {viewingDocs?.docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{DOC_TYPE_LABEL[d.doc_type] ?? d.doc_type}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.file_name ?? "—"} · {formatBytes(d.size_bytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openDocument(d.storage_path)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Abrir
                </button>
              </div>
            ))}
            {viewingDocs && viewingDocs.docs.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum documento enviado.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. A conta de {deleting?.full_name || deleting?.email || "usuário"} e
              todos os seus dados vinculados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deletingBusy}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deletingBusy ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string | null | undefined; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className="mt-0.5 break-words">{value || "—"}</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, Clock, AlertCircle, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  tab: z.enum(["info", "documentos", "banco", "verificacao"]).optional(),
});

export const Route = createFileRoute("/_authenticated/documentacao")({
  validateSearch: searchSchema,
  component: DocumentacaoPage,
});


type PersonType = "pf" | "pj";
type TabKey = "info" | "documentos" | "banco" | "verificacao";

type Submission = {
  id: string;
  status: string;
  person_type: PersonType;
  document: string | null;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  birth_date: string | null;
  mother_name: string | null;
  company_name: string | null;
  trade_name: string | null;
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
};

type DocRow = {
  id: string;
  doc_type: string;
  storage_path: string;
  file_name: string | null;
  created_at: string;
};

type BankRow = {
  bank_name: string;
  account_type: "corrente" | "poupanca";
  holder_name: string;
  holder_document: string;
  agency: string;
  account_number: string;
  pix_key: string | null;
};

const DOC_LABELS: Record<string, string> = {
  id_front: "Documento (frente)",
  id_back: "Documento (verso)",
  selfie: "Selfie com documento",
  address_proof: "Comprovante de residência",
  social_contract: "Contrato social",
  partner_id_front: "Documento do sócio (frente)",
  partner_id_back: "Documento do sócio (verso)",
  partner_selfie: "Selfie do sócio",
};

const PF_DOCS = ["id_front", "id_back", "selfie", "address_proof"];
const PJ_DOCS = ["social_contract", "partner_id_front", "partner_id_back", "partner_selfie"];

function DocumentacaoPage() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<TabKey>(search.tab ?? "info");

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sub, setSub] = useState<Submission | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [bank, setBank] = useState<BankRow>({
    bank_name: "",
    account_type: "corrente",
    holder_name: "",
    holder_document: "",
    agency: "",
    account_number: "",
    pix_key: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const isApproved = sub?.status === "approved";
  const isSubmitted = sub?.status === "submitted";
  const isLocked = isApproved || isSubmitted;

  async function reload() {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    setUserId(userRes.user.id);

    const { data: s } = await supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", userRes.user.id)
      .maybeSingle();

    if (s) {
      setSub(s as Submission);
      const [{ data: d }, { data: b }] = await Promise.all([
        supabase
          .from("kyc_documents")
          .select("id, doc_type, storage_path, file_name, created_at")
          .eq("submission_id", s.id),
        supabase.from("kyc_bank_accounts").select("*").eq("submission_id", s.id).limit(1),
      ]);
      setDocs((d ?? []) as DocRow[]);
      if (b && b[0]) {
        const bk = b[0];
        setBank({
          bank_name: bk.bank_name,
          account_type: (bk.account_type as "corrente" | "poupanca") ?? "corrente",
          holder_name: bk.holder_name,
          holder_document: bk.holder_document,
          agency: bk.agency,
          account_number: bk.account_number,
          pix_key: bk.pix_key ?? "",
        });
      }
    } else {
      setSub({
        id: "",
        status: "none",
        person_type: "pf",
        document: null,
        email: userRes.user.email ?? null,
        phone: null,
        full_name: null,
        birth_date: null,
        mother_name: null,
        company_name: null,
        trade_name: null,
        address_zip: null,
        address_street: null,
        address_number: null,
        address_complement: null,
        address_neighborhood: null,
        address_city: null,
        address_state: null,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function ensureSubmission(): Promise<string | null> {
    if (!userId || !sub) return null;
    if (sub.id) return sub.id;
    const { data, error } = await supabase
      .from("kyc_submissions")
      .insert({
        user_id: userId,
        person_type: sub.person_type,
        status: "pending",
        email: sub.email,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setSub({ ...sub, id: data.id, status: "pending" });
    return data.id;
  }

  async function saveInfo() {
    if (!sub) return;
    setSaving(true);
    const id = await ensureSubmission();
    if (!id) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("kyc_submissions")
      .update({
        person_type: sub.person_type,
        document: sub.document,
        email: sub.email,
        phone: sub.phone,
        full_name: sub.full_name,
        birth_date: sub.birth_date || null,
        mother_name: sub.mother_name,
        company_name: sub.company_name,
        trade_name: sub.trade_name,
        address_zip: sub.address_zip,
        address_street: sub.address_street,
        address_number: sub.address_number,
        address_complement: sub.address_complement,
        address_neighborhood: sub.address_neighborhood,
        address_city: sub.address_city,
        address_state: sub.address_state,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Informações salvas");
    reload();
  }

  async function saveBank() {
    if (!userId) return;
    setSaving(true);
    const id = await ensureSubmission();
    if (!id) {
      setSaving(false);
      return;
    }
    await supabase.from("kyc_bank_accounts").delete().eq("submission_id", id);
    const { error } = await supabase.from("kyc_bank_accounts").insert({
      submission_id: id,
      user_id: userId,
      bank_name: bank.bank_name,
      account_type: bank.account_type,
      holder_name: bank.holder_name,
      holder_document: bank.holder_document,
      agency: bank.agency,
      account_number: bank.account_number,
      pix_key: bank.pix_key || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta bancária salva");
  }

  async function handleUpload(docType: string, file: File) {
    if (!userId) return;
    const id = await ensureSubmission();
    if (!id) return;
    setUploading(docType);
    try {
      const existing = docs.find((d) => d.doc_type === docType);
      if (existing) {
        await supabase.storage.from("kyc-documents").remove([existing.storage_path]);
        await supabase.from("kyc_documents").delete().eq("id", existing.id);
      }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/${id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("kyc_documents").insert({
        submission_id: id,
        user_id: userId,
        doc_type: docType,
        storage_path: path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (insErr) throw insErr;
      toast.success("Documento enviado");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(null);
    }
  }

  async function removeDoc(row: DocRow) {
    await supabase.storage.from("kyc-documents").remove([row.storage_path]);
    await supabase.from("kyc_documents").delete().eq("id", row.id);
    toast.success("Documento removido");
    reload();
  }

  async function submitForReview() {
    if (!sub) return;
    const id = await ensureSubmission();
    if (!id) return;
    const required = sub.person_type === "pf" ? PF_DOCS : PJ_DOCS;
    const missing = required.filter((t) => !docs.some((d) => d.doc_type === t));
    if (missing.length > 0) {
      toast.error(`Faltam documentos: ${missing.map((m) => DOC_LABELS[m]).join(", ")}`);
      setTab("documentos");
      return;
    }
    if (!bank.bank_name) {
      toast.error("Preencha os dados bancários");
      setTab("banco");
      return;
    }
    const { error } = await supabase
      .from("kyc_submissions")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviado para verificação");
    reload();
  }

  if (loading || !sub) {
    return (
      <AppShell title="Documentação">
        <div className="grid place-items-center p-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  const tabs: { id: TabKey; label: string }[] = [
    { id: "info", label: "Informações" },
    { id: "documentos", label: "Documentos" },
    { id: "banco", label: "Contas bancárias" },
    { id: "verificacao", label: "Verificação de identidade" },
  ];

  return (
    <AppShell title="Documentação" subtitle="Complete seu cadastro para operar">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                style={active ? { background: "var(--gradient-brand)" } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <StatusBanner status={sub.status} />

        {tab === "info" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Dados principais</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure as principais informações sobre seu negócio.
            </p>

            <fieldset disabled={isLocked} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tipo de cadastro *">
                  <select
                    value={sub.person_type}
                    onChange={(e) => setSub({ ...sub, person_type: e.target.value as PersonType })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="pf">Pessoa física</option>
                    <option value="pj">Pessoa jurídica</option>
                  </select>
                </Field>
                <Field label={sub.person_type === "pf" ? "CPF *" : "CNPJ *"}>
                  <Input
                    value={sub.document ?? ""}
                    onChange={(e) => setSub({ ...sub, document: e.target.value })}
                  />
                </Field>
              </div>

              {sub.person_type === "pj" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Razão social">
                    <Input
                      value={sub.company_name ?? ""}
                      onChange={(e) => setSub({ ...sub, company_name: e.target.value })}
                    />
                  </Field>
                  <Field label="Nome fantasia">
                    <Input
                      value={sub.trade_name ?? ""}
                      onChange={(e) => setSub({ ...sub, trade_name: e.target.value })}
                    />
                  </Field>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-primary">Informações do empresário</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <Field label="Nome *">
                    <Input
                      value={sub.full_name ?? ""}
                      onChange={(e) => setSub({ ...sub, full_name: e.target.value })}
                    />
                  </Field>
                  <Field label="Nome da mãe *">
                    <Input
                      value={sub.mother_name ?? ""}
                      onChange={(e) => setSub({ ...sub, mother_name: e.target.value })}
                    />
                  </Field>
                  <Field label="Data de nascimento *">
                    <Input
                      type="date"
                      value={sub.birth_date ?? ""}
                      onChange={(e) => setSub({ ...sub, birth_date: e.target.value })}
                    />
                  </Field>
                  <Field label="Telefone">
                    <Input
                      value={sub.phone ?? ""}
                      onChange={(e) => setSub({ ...sub, phone: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary">Endereço</h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <Field label="CEP *">
                    <Input
                      value={sub.address_zip ?? ""}
                      onChange={(e) => setSub({ ...sub, address_zip: e.target.value })}
                    />
                  </Field>
                  <Field label="Estado *">
                    <Input
                      value={sub.address_state ?? ""}
                      onChange={(e) => setSub({ ...sub, address_state: e.target.value })}
                    />
                  </Field>
                  <Field label="Cidade *">
                    <Input
                      value={sub.address_city ?? ""}
                      onChange={(e) => setSub({ ...sub, address_city: e.target.value })}
                    />
                  </Field>
                  <Field label="Bairro *">
                    <Input
                      value={sub.address_neighborhood ?? ""}
                      onChange={(e) => setSub({ ...sub, address_neighborhood: e.target.value })}
                    />
                  </Field>
                  <Field label="Endereço *">
                    <Input
                      value={sub.address_street ?? ""}
                      onChange={(e) => setSub({ ...sub, address_street: e.target.value })}
                    />
                  </Field>
                  <Field label="Número *">
                    <Input
                      value={sub.address_number ?? ""}
                      onChange={(e) => setSub({ ...sub, address_number: e.target.value })}
                    />
                  </Field>
                  <Field label="Complemento / Referência">
                    <Input
                      value={sub.address_complement ?? ""}
                      onChange={(e) => setSub({ ...sub, address_complement: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={saveInfo}
                  disabled={saving || isLocked}
                  style={{ background: "var(--gradient-brand)" }}
                  className="text-white"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar
                </Button>
              </div>
            </fieldset>
          </div>
        )}

        {tab === "documentos" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Envie seus documentos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie seus documentos para a análise da sua conta
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <DocCard
                title="Selfie segurando o documento de identificação"
                description={
                  <>
                    <strong className="text-foreground">Apenas um arquivo.</strong> Foto sua segurando o documento
                    de identificação. Deve ser possível ver seu rosto e o documento.
                  </>
                }
                approved={isApproved}
                slots={[
                  {
                    key: "selfie",
                    label: "Selfie",
                    existing: docs.find((d) => d.doc_type === "selfie"),
                  },
                ]}
                uploading={uploading}
                disabled={isLocked}
                onUpload={handleUpload}
                onRemove={removeDoc}
              />
              <DocCard
                title="Documento de identificação (frente e verso)"
                description={
                  <>
                    <strong className="text-foreground">Apenas um arquivo.</strong> Qualquer foto ou scan do seu
                    documento de identificação (RG, CNH, etc). Deve conter seu nome completo, foto e data de nascimento.
                    Caso você tenha os dois lados do documento em PDFs separados, você pode usar{" "}
                    <a
                      href="https://www.ilovepdf.com/pt/juntar_pdf"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      esta ferramenta
                    </a>{" "}
                    para juntar os arquivos.
                  </>
                }
                approved={isApproved}
                slots={[
                  {
                    key: "id_front",
                    label: "Frente",
                    existing: docs.find((d) => d.doc_type === "id_front"),
                  },
                  {
                    key: "id_back",
                    label: "Verso",
                    existing: docs.find((d) => d.doc_type === "id_back"),
                  },
                ]}
                uploading={uploading}
                disabled={isLocked}
                onUpload={handleUpload}
                onRemove={removeDoc}
              />
            </div>
          </div>
        )}



        {tab === "banco" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Contas bancárias</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre a conta que receberá os pagamentos.
            </p>
            <fieldset disabled={isLocked} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Banco *">
                  <Input
                    value={bank.bank_name}
                    onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}
                  />
                </Field>
                <Field label="Tipo de conta *">
                  <select
                    value={bank.account_type}
                    onChange={(e) =>
                      setBank({ ...bank, account_type: e.target.value as "corrente" | "poupanca" })
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                  </select>
                </Field>
                <Field label="Titular *">
                  <Input
                    value={bank.holder_name}
                    onChange={(e) => setBank({ ...bank, holder_name: e.target.value })}
                  />
                </Field>
                <Field label="CPF/CNPJ do titular *">
                  <Input
                    value={bank.holder_document}
                    onChange={(e) => setBank({ ...bank, holder_document: e.target.value })}
                  />
                </Field>
                <Field label="Agência *">
                  <Input
                    value={bank.agency}
                    onChange={(e) => setBank({ ...bank, agency: e.target.value })}
                  />
                </Field>
                <Field label="Conta *">
                  <Input
                    value={bank.account_number}
                    onChange={(e) => setBank({ ...bank, account_number: e.target.value })}
                  />
                </Field>
                <Field label="Chave PIX">
                  <Input
                    value={bank.pix_key ?? ""}
                    onChange={(e) => setBank({ ...bank, pix_key: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={saveBank}
                  disabled={saving || isLocked}
                  style={{ background: "var(--gradient-brand)" }}
                  className="text-white"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar
                </Button>
              </div>
            </fieldset>
          </div>
        )}

        {tab === "verificacao" && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Verificação de identidade</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhe o status da análise do seu cadastro.
            </p>

            <div className="mt-6 space-y-4">
              <StatusCard status={sub.status} />
              <div className="rounded-xl border border-border bg-background p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Tipo de cadastro</span>
                  <span>{sub.person_type === "pf" ? "Pessoa física" : "Pessoa jurídica"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Documento</span>
                  <span>{sub.document || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Nome</span>
                  <span>{sub.full_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Documentos enviados</span>
                  <span>
                    {docs.length}/{(sub.person_type === "pf" ? PF_DOCS : PJ_DOCS).length}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Conta bancária</span>
                  <span>{bank.bank_name ? "Cadastrada" : "Pendente"}</span>
                </div>
              </div>

              {!isLocked && (
                <div className="flex justify-end">
                  <Button
                    onClick={submitForReview}
                    style={{ background: "var(--gradient-brand)" }}
                    className="text-white"
                  >
                    Enviar para verificação
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatusBanner({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <div className="rounded-xl border border-border bg-foreground/10 px-4 py-3 text-sm text-foreground">
        Seu cadastro foi aprovado!
      </div>
    );
  }
  if (status === "submitted") {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
        Seu cadastro está em análise.
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Cadastro rejeitado. Corrija os dados e envie novamente.
      </div>
    );
  }
  return null;
}

function StatusCard({ status }: { status: string }) {
  const map: Record<string, { icon: typeof CheckCircle2; label: string; color: string }> = {
    none: { icon: AlertCircle, label: "Não iniciado", color: "text-muted-foreground" },
    pending: { icon: Clock, label: "Rascunho", color: "text-muted-foreground" },
    submitted: { icon: Clock, label: "Em análise", color: "text-yellow-400" },
    approved: { icon: CheckCircle2, label: "Aprovado", color: "text-foreground" },
    rejected: { icon: AlertCircle, label: "Rejeitado", color: "text-destructive" },
  };
  const info = map[status] ?? map.none;
  const Icon = info.icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
      <Icon className={`h-6 w-6 ${info.color}`} />
      <div>
        <div className="text-sm text-muted-foreground">Status</div>
        <div className={`font-semibold ${info.color}`}>{info.label}</div>
      </div>
    </div>
  );
}

function DocCard({
  title,
  description,
  approved,
  slots,
  uploading,
  disabled,
  onUpload,
  onRemove,
}: {
  title: string;
  description: React.ReactNode;
  approved: boolean;
  slots: { key: string; label: string; existing?: DocRow }[];
  uploading: string | null;
  disabled: boolean;
  onUpload: (docType: string, file: File) => void;
  onRemove: (row: DocRow) => void;
}) {
  const allSent = slots.every((s) => !!s.existing);
  const verified = approved && allSent;

  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>

      <div className="mt-4 space-y-2">
        {verified ? (
          <div className="rounded-md border border-border bg-foreground/10 px-3 py-2 text-xs font-medium text-foreground">
            Documento verificado
          </div>
        ) : allSent ? (
          <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs font-medium text-yellow-400">
            Documento pendente de verificação
          </div>
        ) : (
          <div className="rounded-md border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-400">
            Documento pendente
          </div>
        )}

        {!verified && (
          <div className={slots.length > 1 ? "grid gap-2 sm:grid-cols-2" : ""}>
            {slots.map((s) => (
              <SlotUpload
                key={s.key}
                label={s.label}
                existing={s.existing}
                uploading={uploading === s.key}
                disabled={disabled}
                onFile={(f) => onUpload(s.key, f)}
                onRemove={s.existing ? () => onRemove(s.existing!) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SlotUpload({
  label,
  existing,
  uploading,
  disabled,
  onFile,
  onRemove,
}: {
  label: string;
  existing?: DocRow;
  uploading: boolean;
  disabled: boolean;
  onFile: (f: File) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        {existing && !disabled && onRemove && (
          <button onClick={onRemove} className="hover:text-destructive" aria-label="Remover">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {existing ? (
        <div className="flex items-center gap-1.5 text-[11px] text-foreground">
          <CheckCircle2 className="h-3 w-3" />
          <span className="truncate">{existing.file_name || "enviado"}</span>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded border border-dashed border-border py-2 text-[11px] text-muted-foreground hover:bg-secondary/40">
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Upload className="h-3 w-3" />
              <span>Enviar arquivo</span>
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

function DocUpload({

  label,
  existing,
  uploading,
  disabled,
  onFile,
  onRemove,
}: {
  label: string;
  existing?: DocRow;
  uploading: boolean;
  disabled: boolean;
  onFile: (f: File) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {existing && !disabled && onRemove && (
          <button
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remover"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {existing ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-foreground">
          <CheckCircle2 className="h-4 w-4" />
          <span className="truncate">{existing.file_name || "arquivo enviado"}</span>
        </div>
      ) : (
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-xs text-muted-foreground hover:bg-secondary/40">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Enviar arquivo</span>
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

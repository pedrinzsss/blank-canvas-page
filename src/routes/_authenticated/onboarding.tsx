import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parsePriceInput, formatPriceCents } from "@/lib/checkout-url";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

type PersonType = "pf" | "pj";
type StepId = "type" | "info" | "personal" | "address" | "documents" | "bank" | "review";

type Form = {
  person_type: PersonType;
  // contact / business
  document: string;
  email: string;
  phone: string;
  website: string;
  avg_ticket_cents: number;
  products_description: string;
  // PJ
  company_name: string;
  trade_name: string;
  // PF / representative
  full_name: string;
  birth_date: string;
  mother_name: string;
  monthly_income_cents: number;
  occupation: string;
  // address
  address_zip: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
};

const emptyForm: Form = {
  person_type: "pf",
  document: "",
  email: "",
  phone: "",
  website: "",
  avg_ticket_cents: 0,
  products_description: "",
  company_name: "",
  trade_name: "",
  full_name: "",
  birth_date: "",
  mother_name: "",
  monthly_income_cents: 0,
  occupation: "",
  address_zip: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_state: "",
};

type DocType =
  | "id_front"
  | "id_back"
  | "selfie"
  | "address_proof"
  | "social_contract"
  | "partner_id_front"
  | "partner_id_back"
  | "partner_selfie";

const DOC_LABELS: Record<DocType, string> = {
  id_front: "Documento (frente)",
  id_back: "Documento (verso)",
  selfie: "Selfie segurando o documento",
  address_proof: "Comprovante de residência",
  social_contract: "Contrato social",
  partner_id_front: "Documento do sócio (frente)",
  partner_id_back: "Documento do sócio (verso)",
  partner_selfie: "Selfie do sócio com documento",
};

const PF_DOCS: DocType[] = ["id_front", "id_back", "selfie", "address_proof"];
const PJ_DOCS: DocType[] = [
  "social_contract",
  "partner_id_front",
  "partner_id_back",
  "partner_selfie",
];

type BankAccount = {
  bank_name: string;
  account_type: "corrente" | "poupanca";
  holder_name: string;
  holder_document: string;
  agency: string;
  account_number: string;
  pix_key: string;
};

const emptyBank: BankAccount = {
  bank_name: "",
  account_type: "corrente",
  holder_name: "",
  holder_document: "",
  agency: "",
  account_number: "",
  pix_key: "",
};

type UploadedDoc = { doc_type: DocType; storage_path: string; file_name: string };

function OnboardingPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("none");
  const [step, setStep] = useState<StepId>("type");
  const [form, setForm] = useState<Form>(emptyForm);
  const [bank, setBank] = useState<BankAccount>(emptyBank);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<DocType | null>(null);

  const steps: { id: StepId; label: string }[] = useMemo(
    () => [
      { id: "type", label: "Tipo" },
      { id: "info", label: "Negócio" },
      { id: "personal", label: "Pessoal" },
      { id: "address", label: "Endereço" },
      { id: "documents", label: "Documentos" },
      { id: "bank", label: "Banco" },
      { id: "review", label: "Revisão" },
    ],
    [],
  );
  const stepIndex = steps.findIndex((s) => s.id === step);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      setUserId(userRes.user.id);
      const { data: sub } = await supabase
        .from("kyc_submissions")
        .select("*")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (sub) {
        setSubmissionId(sub.id);
        setStatus(sub.status);
        setForm({
          person_type: sub.person_type as PersonType,
          document: sub.document ?? "",
          email: sub.email ?? userRes.user.email ?? "",
          phone: sub.phone ?? "",
          website: sub.website ?? "",
          avg_ticket_cents: sub.avg_ticket_cents ?? 0,
          products_description: sub.products_description ?? "",
          company_name: sub.company_name ?? "",
          trade_name: sub.trade_name ?? "",
          full_name: sub.full_name ?? "",
          birth_date: sub.birth_date ?? "",
          mother_name: sub.mother_name ?? "",
          monthly_income_cents: sub.monthly_income_cents ?? 0,
          occupation: sub.occupation ?? "",
          address_zip: sub.address_zip ?? "",
          address_street: sub.address_street ?? "",
          address_number: sub.address_number ?? "",
          address_complement: sub.address_complement ?? "",
          address_neighborhood: sub.address_neighborhood ?? "",
          address_city: sub.address_city ?? "",
          address_state: sub.address_state ?? "",
        });
        const [{ data: docList }, { data: bankList }] = await Promise.all([
          supabase.from("kyc_documents").select("doc_type, storage_path, file_name").eq("submission_id", sub.id),
          supabase.from("kyc_bank_accounts").select("*").eq("submission_id", sub.id).limit(1),
        ]);
        setDocs(
          (docList ?? []).map((d) => ({
            doc_type: d.doc_type as DocType,
            storage_path: d.storage_path,
            file_name: d.file_name ?? "",
          })),
        );
        if (bankList && bankList[0]) {
          const b = bankList[0];
          setBank({
            bank_name: b.bank_name,
            account_type: (b.account_type as "corrente" | "poupanca") ?? "corrente",
            holder_name: b.holder_name,
            holder_document: b.holder_document,
            agency: b.agency,
            account_number: b.account_number,
            pix_key: b.pix_key ?? "",
          });
        }
      } else {
        setForm((f) => ({ ...f, email: userRes.user!.email ?? "" }));
      }
      setLoading(false);
    })();
  }, []);

  function up<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function ensureSubmission(): Promise<string | null> {
    if (submissionId) {
      const { error } = await supabase
        .from("kyc_submissions")
        .update({
          person_type: form.person_type,
          document: form.document || null,
          email: form.email || null,
          phone: form.phone || null,
          website: form.website || null,
          avg_ticket_cents: form.avg_ticket_cents || null,
          products_description: form.products_description || null,
          company_name: form.company_name || null,
          trade_name: form.trade_name || null,
          full_name: form.full_name || null,
          birth_date: form.birth_date || null,
          mother_name: form.mother_name || null,
          monthly_income_cents: form.monthly_income_cents || null,
          occupation: form.occupation || null,
          address_zip: form.address_zip || null,
          address_street: form.address_street || null,
          address_number: form.address_number || null,
          address_complement: form.address_complement || null,
          address_neighborhood: form.address_neighborhood || null,
          address_city: form.address_city || null,
          address_state: form.address_state || null,
        })
        .eq("id", submissionId);
      if (error) {
        toast.error(error.message);
        return null;
      }
      return submissionId;
    }
    if (!userId) return null;
    const { data, error } = await supabase
      .from("kyc_submissions")
      .insert({
        user_id: userId,
        person_type: form.person_type,
        status: "pending",
        email: form.email || null,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setSubmissionId(data.id);
    return data.id;
  }

  async function next() {
    setSaving(true);
    const id = await ensureSubmission();
    setSaving(false);
    if (!id) return;
    const i = steps.findIndex((s) => s.id === step);
    if (i < steps.length - 1) setStep(steps[i + 1].id);
  }

  function back() {
    const i = steps.findIndex((s) => s.id === step);
    if (i > 0) setStep(steps[i - 1].id);
  }

  async function handleUpload(docType: DocType, file: File) {
    if (!userId) return;
    const id = submissionId ?? (await ensureSubmission());
    if (!id) return;
    setUploading(docType);
    try {
      // Delete existing of same type
      const existing = docs.find((d) => d.doc_type === docType);
      if (existing) {
        await supabase.storage.from("kyc-documents").remove([existing.storage_path]);
        await supabase
          .from("kyc_documents")
          .delete()
          .eq("submission_id", id)
          .eq("doc_type", docType);
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
      setDocs((d) => [
        ...d.filter((x) => x.doc_type !== docType),
        { doc_type: docType, storage_path: path, file_name: file.name },
      ]);
      toast.success("Documento enviado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(null);
    }
  }

  async function removeDoc(docType: DocType) {
    const existing = docs.find((d) => d.doc_type === docType);
    if (!existing || !submissionId) return;
    await supabase.storage.from("kyc-documents").remove([existing.storage_path]);
    await supabase
      .from("kyc_documents")
      .delete()
      .eq("submission_id", submissionId)
      .eq("doc_type", docType);
    setDocs((d) => d.filter((x) => x.doc_type !== docType));
  }

  async function saveBank(): Promise<boolean> {
    if (!userId) return false;
    const id = submissionId ?? (await ensureSubmission());
    if (!id) return false;
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
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  }

  async function submit() {
    setSaving(true);
    const id = await ensureSubmission();
    if (!id) {
      setSaving(false);
      return;
    }
    const bankOk = await saveBank();
    if (!bankOk) {
      setSaving(false);
      return;
    }
    const requiredDocs = form.person_type === "pf" ? PF_DOCS : PJ_DOCS;
    const missing = requiredDocs.filter((t) => !docs.some((d) => d.doc_type === t));
    if (missing.length > 0) {
      setSaving(false);
      toast.error(`Faltam documentos: ${missing.map((m) => DOC_LABELS[m]).join(", ")}`);
      setStep("documents");
      return;
    }
    const { error } = await supabase
      .from("kyc_submissions")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStatus("submitted");
    toast.success("Cadastro enviado para análise!");
    navigate({ to: "/dashboard" });
  }

  const isLocked = status === "submitted" || status === "approved";

  if (loading) {
    return (
      <AppShell title="Finalizar cadastro">
        <div className="grid place-items-center p-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Finalizar cadastro" subtitle="Complete seu cadastro para começar a operar">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        {/* Stepper */}
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                    active
                      ? "text-white"
                      : done
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                  }`}
                  style={active ? { background: "var(--gradient-brand)" } : undefined}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && <div className="h-px w-4 bg-border" />}
              </div>
            );
          })}
        </div>

        {isLocked && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            {status === "submitted"
              ? "Seu cadastro está em análise. Os dados abaixo estão bloqueados até o retorno da nossa equipe."
              : "Seu cadastro foi aprovado."}
          </div>
        )}

        <fieldset disabled={isLocked} className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            {step === "type" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Você é Pessoa Física ou Jurídica?</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <TypeCard
                    active={form.person_type === "pf"}
                    onClick={() => up("person_type", "pf")}
                    icon={UserIcon}
                    title="Pessoa Física"
                    desc="Cadastro com CPF"
                  />
                  <TypeCard
                    active={form.person_type === "pj"}
                    onClick={() => up("person_type", "pj")}
                    icon={Building2}
                    title="Pessoa Jurídica"
                    desc="Cadastro com CNPJ"
                  />
                </div>
              </div>
            )}

            {step === "info" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Dados do negócio</h2>
                {form.person_type === "pj" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Razão social">
                      <Input value={form.company_name} onChange={(e) => up("company_name", e.target.value)} />
                    </Field>
                    <Field label="Nome fantasia">
                      <Input value={form.trade_name} onChange={(e) => up("trade_name", e.target.value)} />
                    </Field>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={form.person_type === "pf" ? "CPF" : "CNPJ"}>
                    <Input value={form.document} onChange={(e) => up("document", e.target.value)} />
                  </Field>
                  <Field label="E-mail">
                    <Input type="email" value={form.email} onChange={(e) => up("email", e.target.value)} />
                  </Field>
                  <Field label="Telefone / WhatsApp">
                    <Input value={form.phone} onChange={(e) => up("phone", e.target.value)} />
                  </Field>
                  <Field label="Site (opcional)">
                    <Input value={form.website} onChange={(e) => up("website", e.target.value)} />
                  </Field>
                  <Field label="Ticket médio (R$)">
                    <Input
                      inputMode="decimal"
                      defaultValue={formatPriceCents(form.avg_ticket_cents).replace("R$", "").trim()}
                      onBlur={(e) => up("avg_ticket_cents", parsePriceInput(e.target.value))}
                    />
                  </Field>
                </div>
                <Field label="Descrição dos produtos que vende">
                  <Textarea
                    value={form.products_description}
                    onChange={(e) => up("products_description", e.target.value)}
                    rows={4}
                  />
                </Field>
              </div>
            )}

            {step === "personal" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Dados pessoais {form.person_type === "pj" && "(do responsável)"}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome completo">
                    <Input value={form.full_name} onChange={(e) => up("full_name", e.target.value)} />
                  </Field>
                  <Field label="Data de nascimento">
                    <Input type="date" value={form.birth_date} onChange={(e) => up("birth_date", e.target.value)} />
                  </Field>
                  <Field label="Nome da mãe">
                    <Input value={form.mother_name} onChange={(e) => up("mother_name", e.target.value)} />
                  </Field>
                  <Field label="Renda mensal (R$)">
                    <Input
                      inputMode="decimal"
                      defaultValue={formatPriceCents(form.monthly_income_cents).replace("R$", "").trim()}
                      onBlur={(e) => up("monthly_income_cents", parsePriceInput(e.target.value))}
                    />
                  </Field>
                  <Field label="Ocupação">
                    <Input value={form.occupation} onChange={(e) => up("occupation", e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {step === "address" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Endereço completo</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="CEP">
                    <Input value={form.address_zip} onChange={(e) => up("address_zip", e.target.value)} />
                  </Field>
                  <Field label="Cidade">
                    <Input value={form.address_city} onChange={(e) => up("address_city", e.target.value)} />
                  </Field>
                  <Field label="Estado (UF)">
                    <Input maxLength={2} value={form.address_state} onChange={(e) => up("address_state", e.target.value.toUpperCase())} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
                  <Field label="Rua">
                    <Input value={form.address_street} onChange={(e) => up("address_street", e.target.value)} />
                  </Field>
                  <Field label="Número">
                    <Input value={form.address_number} onChange={(e) => up("address_number", e.target.value)} />
                  </Field>
                  <Field label="Complemento">
                    <Input value={form.address_complement} onChange={(e) => up("address_complement", e.target.value)} />
                  </Field>
                </div>
                <Field label="Bairro">
                  <Input value={form.address_neighborhood} onChange={(e) => up("address_neighborhood", e.target.value)} />
                </Field>
              </div>
            )}

            {step === "documents" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Documentos</h2>
                <p className="text-sm text-muted-foreground">
                  Envie os documentos abaixo em PDF ou imagem (JPG/PNG). Máx 10 MB por arquivo.
                </p>
                <div className="grid gap-3">
                  {(form.person_type === "pf" ? PF_DOCS : PJ_DOCS).map((t) => {
                    const uploaded = docs.find((d) => d.doc_type === t);
                    return (
                      <DocRow
                        key={t}
                        label={DOC_LABELS[t]}
                        uploaded={uploaded?.file_name}
                        uploading={uploading === t}
                        onFile={(f) => handleUpload(t, f)}
                        onRemove={uploaded ? () => removeDoc(t) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {step === "bank" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Conta bancária para recebimentos</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Banco">
                    <Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} />
                  </Field>
                  <Field label="Tipo de conta">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={bank.account_type}
                      onChange={(e) => setBank({ ...bank, account_type: e.target.value as "corrente" | "poupanca" })}
                    >
                      <option value="corrente">Corrente</option>
                      <option value="poupanca">Poupança</option>
                    </select>
                  </Field>
                  <Field label="Titular">
                    <Input value={bank.holder_name} onChange={(e) => setBank({ ...bank, holder_name: e.target.value })} />
                  </Field>
                  <Field label="CPF/CNPJ do titular">
                    <Input value={bank.holder_document} onChange={(e) => setBank({ ...bank, holder_document: e.target.value })} />
                  </Field>
                  <Field label="Agência">
                    <Input value={bank.agency} onChange={(e) => setBank({ ...bank, agency: e.target.value })} />
                  </Field>
                  <Field label="Número da conta">
                    <Input value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} />
                  </Field>
                  <Field label="Chave PIX (opcional)">
                    <Input value={bank.pix_key} onChange={(e) => setBank({ ...bank, pix_key: e.target.value })} />
                  </Field>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Revisão</h2>
                <ReviewGrid
                  items={[
                    ["Tipo", form.person_type === "pf" ? "Pessoa Física" : "Pessoa Jurídica"],
                    [form.person_type === "pf" ? "CPF" : "CNPJ", form.document],
                    ["E-mail", form.email],
                    ["Telefone", form.phone],
                    ["Ticket médio", formatPriceCents(form.avg_ticket_cents)],
                    ["Nome", form.full_name],
                    ["Cidade / UF", `${form.address_city} / ${form.address_state}`],
                    ["Banco", `${bank.bank_name} — Ag ${bank.agency} / CC ${bank.account_number}`],
                    ["Documentos enviados", `${docs.length}`],
                  ]}
                />
                <p className="text-xs text-muted-foreground">
                  Ao enviar, seu cadastro será revisado pela equipe. As funções da plataforma serão
                  liberadas após a aprovação.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={back}
              disabled={stepIndex === 0 || saving || isLocked}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {step === "review" ? (
              <Button
                onClick={submit}
                disabled={saving || isLocked}
                className="gap-2 text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Enviar cadastro
              </Button>
            ) : (
              <Button
                onClick={next}
                disabled={saving || isLocked}
                className="gap-2 text-white"
                style={{ background: "var(--gradient-brand)" }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </fieldset>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      }`}
    >
      <div
        className="grid h-10 w-10 place-items-center rounded-lg text-white"
        style={{ background: "var(--gradient-brand)" }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function DocRow({
  label,
  uploaded,
  uploading,
  onFile,
  onRemove,
}: {
  label: string;
  uploaded?: string;
  uploading: boolean;
  onFile: (f: File) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {uploaded ? (
          <div className="truncate text-xs text-muted-foreground">{uploaded}</div>
        ) : (
          <div className="text-xs text-muted-foreground">Nenhum arquivo enviado</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} type="button">
            <X className="h-4 w-4" />
          </Button>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploaded ? "Substituir" : "Enviar"}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

function ReviewGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-background p-4 text-sm md:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{k}</span>
          <span className="text-right font-medium">{v || "—"}</span>
        </div>
      ))}
    </div>
  );
}

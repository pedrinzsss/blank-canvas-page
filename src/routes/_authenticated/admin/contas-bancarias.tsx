import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Ban, Check } from "lucide-react";
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

type Row = {
  id: string;
  bank_name: string;
  account_type: string;
  holder_name: string;
  holder_document: string;
  account_number: string;
  agency: string;
  pix_key: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export const Route = createFileRoute("/_authenticated/admin/contas-bancarias")({
  component: ContasBancariasPage,
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  active: "border-border bg-foreground/10 text-foreground",
  pending: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  blocked: "border-red-500/30 bg-red-500/15 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  blocked: "Bloqueado",
};

function ContasBancariasPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);

  async function load() {
    const { data } = await supabase
      .from("kyc_bank_accounts")
      .select(
        "id, bank_name, account_type, holder_name, holder_document, account_number, agency, pix_key, status, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function updateStatus(id: string, status: "active" | "blocked") {
    const { error } = await supabase
      .from("kyc_bank_accounts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar conta: " + error.message);
      return;
    }
    toast.success(status === "active" ? "Conta aprovada" : "Conta bloqueada");
    await load();
  }

  return (
    <AdminShell title="Contas Bancárias" subtitle="Cadastro">
      <div className="p-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-4 py-4 font-medium">Tipo</th>
                <th className="px-4 py-4 font-medium">Titular</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Criação</th>
                <th className="px-4 py-4 text-right font-medium">Ações</th>
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
                    Nenhuma conta bancária cadastrada ainda.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-6 py-5 font-semibold">{r.bank_name}</td>
                    <td className="px-4 py-5 text-muted-foreground">{r.account_type}</td>
                    <td className="px-4 py-5">
                      <p className="font-medium">{r.holder_name}</p>
                      <p className="text-xs text-muted-foreground">{r.holder_document}</p>
                    </td>
                    <td className="px-4 py-5">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          STATUS_STYLES[r.status] ?? STATUS_STYLES.pending
                        }`}
                      >
                        {STATUS_LABEL[r.status] ?? "Pendente"}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-xs">
                      <p className="font-medium">{formatDate(r.created_at)}</p>
                      <p className="text-muted-foreground">
                        Atualizado: {formatDate(r.updated_at)}
                      </p>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewing(r)}
                          title="Ver detalhes"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "blocked")}
                          disabled={r.status === "blocked"}
                          title="Bloquear conta"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-40"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "active")}
                          disabled={r.status === "active"}
                          title="Aprovar conta"
                          className="grid h-8 w-8 place-items-center rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/10 disabled:opacity-40"
                        >
                          <Check className="h-4 w-4" />
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

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da conta bancária</DialogTitle>
            <DialogDescription>Informações completas do cadastro</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Banco" value={viewing.bank_name} />
              <Field label="Tipo de conta" value={viewing.account_type} />
              <Field label="Titular" value={viewing.holder_name} />
              <Field label="CPF/CNPJ do titular" value={viewing.holder_document} />
              <Field label="Agência" value={viewing.agency} />
              <Field label="Número da conta" value={viewing.account_number} />
              <Field label="Chave Pix" value={viewing.pix_key ?? "—"} full />
              <Field
                label="Status"
                value={STATUS_LABEL[viewing.status] ?? "Pendente"}
              />
              <Field label="Criado em" value={formatDate(viewing.created_at)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-all">{value}</p>
    </div>
  );
}

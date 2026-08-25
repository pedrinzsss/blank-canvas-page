import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Credential = {
  id: string;
  name: string;
  permissions: string[];
  expiresAt: string | null;
  requireManualApproval: boolean;
  createdAt: string;
};

type AllowedIp = { id: string; ip: string; createdAt: string };

const PERMISSIONS = [
  { key: "transacoes", label: "Criar/Consultar Transações" },
  { key: "saques", label: "Criar/Consultar Saques" },
  { key: "checkouts", label: "Criar Checkouts" },
  { key: "conta", label: "Consultar dados da conta/ver saldo" },
];

export const Route = createFileRoute("/_authenticated/admin/integracao-api")({
  component: IntegracaoApiPage,
});

function IntegracaoApiPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [ips, setIps] = useState<AllowedIp[]>([]);
  const [showCredModal, setShowCredModal] = useState(false);
  const [showIpModal, setShowIpModal] = useState(false);

  return (
    <AdminShell title="Integração API" subtitle="Configurações">
      <div className="space-y-6">
        {/* Credenciais de API */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Credenciais de API</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie suas credenciais de API para integrar com a plataforma
              </p>
              <p className="text-sm text-muted-foreground">
                Leia a{" "}
                <a href="/docs" className="underline text-primary">
                  documentação
                </a>{" "}
                para mais detalhes sobre como usar as credenciais de API
              </p>
            </div>
            <Button
              onClick={() => setShowCredModal(true)}
              
            >
              Nova Credencial
            </Button>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-background/40 p-6">
            {credentials.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Você ainda não possui credenciais de API. Crie uma nova para começar.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {credentials.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.permissions.length} permissões
                        {c.expiresAt ? ` · expira em ${c.expiresAt}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setCredentials((list) => list.filter((x) => x.id !== c.id))
                      }
                      className="text-sm text-destructive hover:underline"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* IPs Autorizados */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">IPs Autorizados</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O bloqueio de IP serve apenas para travar solicitações de{" "}
                <span className="font-semibold text-foreground">transferências</span> via API.
              </p>
            </div>
            <Button
              onClick={() => setShowIpModal(true)}
              className="gap-1"
            >
              Adicionar IP <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Data de autorização</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-16 text-center text-sm text-muted-foreground"
                    >
                      Nenhum IP autorizado
                    </td>
                  </tr>
                ) : (
                  ips.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-4 py-3">{row.ip}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.createdAt}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setIps((list) => list.filter((x) => x.id !== row.id))}
                          className="text-destructive hover:underline"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCredModal && (
        <NewCredentialModal
          onClose={() => setShowCredModal(false)}
          onCreate={(cred) => {
            setCredentials((list) => [...list, cred]);
            toast.success("Credencial criada.");
            setShowCredModal(false);
          }}
        />
      )}

      {showIpModal && (
        <NewIpModal
          onClose={() => setShowIpModal(false)}
          onAdd={(ip) => {
            setIps((list) => [
              ...list,
              {
                id: crypto.randomUUID(),
                ip,
                createdAt: new Date().toLocaleDateString("pt-BR"),
              },
            ]);
            toast.success("IP adicionado.");
            setShowIpModal(false);
          }}
        />
      )}
    </AdminShell>
  );
}

function NewCredentialModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (c: Credential) => void;
}) {
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [manual, setManual] = useState(false);

  function toggle(key: string) {
    setPerms((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  }

  function submit() {
    if (!name.trim()) {
      toast.error("Informe o nome da credencial.");
      return;
    }
    onCreate({
      id: crypto.randomUUID(),
      name: name.trim(),
      permissions: perms,
      expiresAt: expiresAt || null,
      requireManualApproval: manual,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <ModalShell onClose={onClose} title="Criar Nova Credencial" width="max-w-md">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">Nome da Credencial</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: API Integração"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Permissões</p>
          <div className="space-y-2">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={perms.includes(p.key)}
                  onChange={() => toggle(p.key)}
                  className="h-4 w-4 accent-foreground"
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Data de Expiração (Opcional)</p>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <p className="text-sm font-semibold">Configurações de saque</p>
          <label className="mt-2 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={manual}
              onChange={(e) => setManual(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-foreground"
            />
            <span>Exigir aprovação manual minha para saques via API</span>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Quando ativo, transferências criadas com esta credencial precisam ser aprovadas
            manualmente no painel antes de enviar o saque.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="text-sm text-muted-foreground hover:underline">
            Cancelar
          </button>
          <Button onClick={submit} >
            Criar
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function NewIpModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (ip: string) => void;
}) {
  const [ip, setIp] = useState("");

  function submit() {
    const value = ip.trim();
    if (!value) {
      toast.error("Informe o IP.");
      return;
    }
    onAdd(value);
  }

  return (
    <ModalShell onClose={onClose} title="Adicionar um IP" width="max-w-sm">
      <div className="space-y-4">
        <div className="rounded-xl border-2 border-primary bg-background/40 px-4 py-3">
          <p className="text-xs text-muted-foreground">IP</p>
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.0.1 ou 2001:db8::1"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="text-sm text-destructive hover:underline">
            Cancelar
          </button>
          <Button onClick={submit} >
            Adicionar
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  onClose,
  title,
  width,
  children,
}: {
  onClose: () => void;
  title: string;
  width: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className={`w-full ${width} rounded-2xl border border-border bg-card p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Webhook,
  Circle,
} from "lucide-react";

import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  regenerateWebhookSecret,
} from "@/lib/api-v1/keys.functions";
import { logAudit } from "@/lib/audit";

type Env = "sandbox" | "live";

type ApiClient = {
  id: string;
  environment: Env;
  webhook_secret_prefix: string | null;
};

type ApiKey = {
  id: string;
  client_id: string;
  public_key: string;
  secret_key_prefix: string;
  status: "active" | "revoked";
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/adquirente")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const rotateWebhook = useServerFn(regenerateWebhookSecret);

  const [clients, setClients] = useState<ApiClient[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [env, setEnv] = useState<Env>("sandbox");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ secret: string; kind: "api" | "webhook"; env: Env } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await list();
      setClients(res.clients as ApiClient[]);
      setKeys(res.keys as ApiKey[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar chaves");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const currentClient = useMemo(
    () => clients.find((c) => c.environment === env),
    [clients, env],
  );
  const currentKeys = useMemo(
    () => keys.filter((k) => k.client_id === currentClient?.id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [keys, currentClient],
  );

  async function handleCreate() {
    setBusy(true);
    try {
      const res = await create({ data: { environment: env } });
      setRevealed({ secret: res.secret_key, kind: "api", env });
      void logAudit("api_key_create", { environment: env, key_id: res.key.id });
      await reload();
      toast.success("Chave criada. Copie a Secret Key agora — ela não será exibida novamente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar chave");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revogar esta Secret Key? Integrações que a utilizam pararão de funcionar.")) return;
    setBusy(true);
    try {
      await revoke({ data: { key_id: id } });
      void logAudit("api_key_revoke", { key_id: id });
      await reload();
      toast.success("Chave revogada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao revogar");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerateWebhook() {
    setBusy(true);
    try {
      const res = await rotateWebhook({ data: { environment: env } });
      setRevealed({ secret: res.webhook_secret, kind: "webhook", env });
      await reload();
      toast.success("Webhook secret gerado. Copie agora.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar webhook secret");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="API Keys" subtitle="Configurações · Adquirente">
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="inline-flex rounded-lg bg-secondary p-1">
            {(["sandbox", "live"] as Env[]).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEnv(e)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                  env === e ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {e === "sandbox" ? "Sandbox" : "Produção"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void reload()} className="gap-2 border-border bg-transparent">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={busy}
              className="gap-2 text-white"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Plus className="h-4 w-4" /> Criar API Key
            </Button>
          </div>
        </div>

        {revealed && (
          <RevealBanner
            title={revealed.kind === "api" ? "Sua Secret Key" : "Seu Webhook Secret"}
            secret={revealed.secret}
            environment={revealed.env}
            onClose={() => setRevealed(null)}
          />
        )}

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">
                Chaves — {env === "sandbox" ? "Sandbox" : "Produção"}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {currentKeys.length} chave{currentKeys.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Public Key</th>
                  <th className="px-5 py-3 font-medium">Secret Key</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Criada em</th>
                  <th className="px-5 py-3 font-medium">Último uso</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">Carregando…</td></tr>
                ) : currentKeys.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">Nenhuma chave criada ainda.</td></tr>
                ) : currentKeys.map((k) => (
                  <tr key={k.id} className="border-b border-border/60 hover:bg-secondary/30">
                    <td className="px-5 py-3">
                      <CopyableCode value={k.public_key} />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {k.secret_key_prefix}••••••••
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={k.status} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(k.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {k.last_used_at ? format(new Date(k.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {k.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleRevoke(k.id)}
                          className="gap-1.5 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Revogar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Webhook Secret</h2>
            </div>
            <Button
              variant="outline"
              onClick={() => void handleRegenerateWebhook()}
              disabled={busy}
              className="gap-2 border-border bg-transparent"
            >
              <RefreshCw className="h-4 w-4" />
              {currentClient?.webhook_secret_prefix ? "Regenerar" : "Gerar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Utilizado para assinar as chamadas de webhook enviadas ao seu servidor.
          </p>
          <div className="mt-3 font-mono text-xs text-muted-foreground">
            {currentClient?.webhook_secret_prefix ? `${currentClient.webhook_secret_prefix}••••••••` : "—"}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function StatusPill({ status }: { status: "active" | "revoked" }) {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "border-border bg-foreground/10 text-foreground"
          : "border-rose-500/20 bg-rose-500/10 text-rose-400"
      }`}
    >
      <Circle className="h-2 w-2 fill-current" />
      {isActive ? "Ativa" : "Revogada"}
    </span>
  );
}

function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1 font-mono text-xs text-foreground/90 hover:bg-secondary"
    >
      {value}
      {copied ? <Check className="h-3 w-3 text-foreground" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

function RevealBanner({
  title,
  secret,
  environment,
  onClose,
}: {
  title: string;
  secret: string;
  environment: Env;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-300">
          {title} · {environment === "sandbox" ? "Sandbox" : "Produção"}
        </p>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-amber-200 hover:bg-amber-500/10">
          Fechar
        </Button>
      </div>
      <p className="text-xs text-amber-200/80">
        Copie agora — este valor não será exibido novamente. Guarde em um local seguro.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-amber-500/30 bg-background/40 p-3 font-mono text-sm text-amber-100">
          {secret}
        </code>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="gap-2 border-amber-500/40 bg-transparent text-amber-100 hover:bg-amber-500/10"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

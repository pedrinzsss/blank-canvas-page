import { useServerFn } from "@tanstack/react-start";
import { Fragment, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Webhook,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  ScrollText,
  RotateCw,
  Circle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  listWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  rotateEndpointSecret,
  listWebhookDeliveries,
  retryWebhookDelivery,
} from "@/lib/api-v1/webhooks.functions";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/api-v1/webhook-events";

type Env = "sandbox" | "live";

type Endpoint = {
  id: string;
  client_id: string;
  url: string;
  description: string | null;
  events: string[];
  status: string;
  secret_prefix: string | null;
  created_at: string;
};
type ClientRow = { id: string; environment: Env };
type Delivery = {
  id: string;
  endpoint_id: string;
  endpoint_url: string;
  event: string;
  status: "pending" | "delivered" | "failed";
  response_code: number | null;
  response_body: string | null;
  attempts: number;
  created_at: string;
  delivered_at: string | null;
  payload: unknown;
};

export function WebhooksPanel() {
  const list = useServerFn(listWebhookEndpoints);
  const create = useServerFn(createWebhookEndpoint);
  const update = useServerFn(updateWebhookEndpoint);
  const remove = useServerFn(deleteWebhookEndpoint);
  const rotate = useServerFn(rotateEndpointSecret);
  const listDel = useServerFn(listWebhookDeliveries);
  const retry = useServerFn(retryWebhookDelivery);

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [env, setEnv] = useState<Env>("sandbox");
  const [tab, setTab] = useState<"endpoints" | "logs">("endpoints");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | "all">("all");
  const [openDelivery, setOpenDelivery] = useState<string | null>(null);

  const currentClient = useMemo(() => clients.find((c) => c.environment === env), [clients, env]);
  const currentEndpoints = useMemo(
    () => endpoints.filter((e) => e.client_id === currentClient?.id),
    [endpoints, currentClient],
  );
  const filteredDeliveries = useMemo(() => {
    const ids = new Set(currentEndpoints.map((e) => e.id));
    return deliveries.filter((d) => ids.has(d.endpoint_id) && (selectedEndpoint === "all" || d.endpoint_id === selectedEndpoint));
  }, [deliveries, currentEndpoints, selectedEndpoint]);

  async function reload() {
    setLoading(true);
    try {
      const [ep, dl] = await Promise.all([list(), listDel({ data: {} })]);
      setEndpoints(ep.endpoints as Endpoint[]);
      setClients(ep.clients as ClientRow[]);
      setDeliveries(dl.deliveries as Delivery[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void reload(); }, []);

  async function handleCreate(input: { url: string; description: string; events: WebhookEvent[] }) {
    setBusy(true);
    try {
      const res = await create({ data: { environment: env, url: input.url, description: input.description || null, events: input.events, status: "active" } });
      setReveal(res.secret);
      setShowForm(false);
      await reload();
      toast.success("Webhook criado. Copie o secret agora.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  async function togglePause(id: string, status: string) {
    setBusy(true);
    try {
      await update({ data: { id, status: status === "active" ? "paused" : "active" } });
      await reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }
  async function handleDelete(id: string) {
    if (!confirm("Remover este webhook?")) return;
    setBusy(true);
    try { await remove({ data: { id } }); await reload(); toast.success("Removido."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }
  async function handleRotate(id: string) {
    setBusy(true);
    try {
      const res = await rotate({ data: { id } });
      setReveal(res.secret);
      await reload();
      toast.success("Secret regenerado.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }
  async function handleRetry(id: string) {
    setBusy(true);
    try { await retry({ data: { delivery_id: id } }); await reload(); toast.success("Reentrega enviada."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
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
          <div className="inline-flex rounded-lg bg-secondary p-1">
            <button type="button" onClick={() => setTab("endpoints")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${tab === "endpoints" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              Endpoints
            </button>
            <button type="button" onClick={() => setTab("logs")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${tab === "logs" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
              Logs
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void reload()} className="gap-2 border-border bg-transparent">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          {tab === "endpoints" && (
            <Button onClick={() => setShowForm(true)} disabled={busy} className="gap-2 text-white" style={{ background: "var(--gradient-brand)" }}>
              <Plus className="h-4 w-4" /> Novo webhook
            </Button>
          )}
        </div>
      </div>

      {reveal && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-300">Webhook Secret</p>
            <Button variant="ghost" size="sm" onClick={() => setReveal(null)} className="text-amber-200 hover:bg-amber-500/10">Fechar</Button>
          </div>
          <p className="text-xs text-amber-200/80">Copie agora — este valor não será exibido novamente.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-amber-500/30 bg-background/40 p-3 font-mono text-sm text-amber-100">{reveal}</code>
            <CopyButton value={reveal} />
          </div>
        </div>
      )}

      {showForm && (
        <EndpointForm busy={busy} onCancel={() => setShowForm(false)} onSubmit={handleCreate} />
      )}

      {tab === "endpoints" ? (
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Endpoints — {env === "sandbox" ? "Sandbox" : "Produção"}</h2>
            </div>
            <span className="text-xs text-muted-foreground">{currentEndpoints.length} endpoint(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">URL</th>
                  <th className="px-5 py-3 font-medium">Eventos</th>
                  <th className="px-5 py-3 font-medium">Secret</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Criado</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">Carregando…</td></tr>
                ) : currentEndpoints.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">Nenhum webhook configurado.</td></tr>
                ) : currentEndpoints.map((e) => (
                  <tr key={e.id} className="border-b border-border/60 hover:bg-secondary/30">
                    <td className="px-5 py-3">
                      <div className="max-w-md truncate font-mono text-xs text-foreground/90">{e.url}</div>
                      {e.description && <div className="mt-0.5 text-xs text-muted-foreground">{e.description}</div>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {e.events.slice(0, 3).map((ev) => (
                          <span key={ev} className="rounded border border-border bg-secondary/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{ev}</span>
                        ))}
                        {e.events.length > 3 && <span className="text-xs text-muted-foreground">+{e.events.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{e.secret_prefix ? `${e.secret_prefix}••••••` : "—"}</td>
                    <td className="px-5 py-3">
                      <StatusPill kind={e.status === "active" ? "on" : "off"} label={e.status === "active" ? "Ativo" : "Pausado"} />
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(e.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => void togglePause(e.id, e.status)} className="text-xs">
                          {e.status === "active" ? "Pausar" : "Ativar"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleRotate(e.id)} className="gap-1 text-xs">
                          <RotateCw className="h-3 w-3" /> Rotacionar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(e.id)} className="gap-1 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Logs de entrega</h2>
            </div>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="all">Todos endpoints</option>
              {currentEndpoints.map((e) => (
                <option key={e.id} value={e.id}>{e.url}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Evento</th>
                  <th className="px-5 py-3 font-medium">URL</th>
                  <th className="px-5 py-3 font-medium">HTTP</th>
                  <th className="px-5 py-3 font-medium">Tentativas</th>
                  <th className="px-5 py-3 font-medium">Data</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">Carregando…</td></tr>
                ) : filteredDeliveries.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-muted-foreground">Nenhuma entrega registrada.</td></tr>
                ) : filteredDeliveries.map((d) => (
                  <Fragment key={d.id}>
                    <tr key={d.id} className="border-b border-border/60 hover:bg-secondary/30 cursor-pointer" onClick={() => setOpenDelivery(openDelivery === d.id ? null : d.id)}>
                      <td className="px-5 py-3 font-mono text-xs">{d.event}</td>
                      <td className="px-5 py-3 max-w-xs truncate text-xs text-muted-foreground">{d.endpoint_url}</td>
                      <td className="px-5 py-3 font-mono text-xs">{d.response_code ?? "—"}</td>
                      <td className="px-5 py-3 text-xs">{d.attempts}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(d.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </td>
                      <td className="px-5 py-3">
                        <StatusPill kind={d.status === "delivered" ? "on" : d.status === "pending" ? "warn" : "off"}
                          label={d.status === "delivered" ? "Sucesso" : d.status === "pending" ? "Pendente" : "Falha"} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); void handleRetry(d.id); }} className="gap-1 text-xs">
                          <RotateCw className="h-3 w-3" /> Reenviar
                        </Button>
                      </td>
                    </tr>
                    {openDelivery === d.id && (
                      <tr key={`${d.id}-body`} className="border-b border-border/60 bg-secondary/20">
                        <td colSpan={7} className="px-5 py-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-semibold text-muted-foreground">Payload enviado</p>
                              <pre className="max-h-48 overflow-auto rounded-md bg-background/60 p-3 text-[11px]">{JSON.stringify(d.payload, null, 2)}</pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-muted-foreground">Resposta</p>
                              <pre className="max-h-48 overflow-auto rounded-md bg-background/60 p-3 text-[11px]">{d.response_body ?? "—"}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EndpointForm({
  busy, onCancel, onSubmit,
}: {
  busy: boolean;
  onCancel: () => void;
  onSubmit: (v: { url: string; description: string; events: WebhookEvent[] }) => void;
}) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const toggle = (e: WebhookEvent) => setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  const submit = () => {
    if (!url) return toast.error("URL obrigatória");
    if (events.length === 0) return toast.error("Selecione ao menos um evento");
    onSubmit({ url, description, events });
  };
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">Novo endpoint</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.seusite.com/webhooks"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notificações de cobrança"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Eventos</p>
        <div className="flex flex-wrap gap-2">
          {WEBHOOK_EVENTS.map((ev) => (
            <button
              type="button" key={ev} onClick={() => toggle(ev)}
              className={`rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                events.includes(ev)
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >{ev}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={submit} disabled={busy} className="text-white" style={{ background: "var(--gradient-brand)" }}>Criar</Button>
      </div>
    </div>
  );
}

function StatusPill({ kind, label }: { kind: "on" | "off" | "warn"; label: string }) {
  const map = {
    on: "border-border bg-foreground/10 text-foreground",
    off: "border-rose-500/20 bg-rose-500/10 text-rose-400",
    warn: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[kind]}`}>
      <Circle className="h-2 w-2 fill-current" />{label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="gap-2 border-amber-500/40 bg-transparent text-amber-100 hover:bg-amber-500/10">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

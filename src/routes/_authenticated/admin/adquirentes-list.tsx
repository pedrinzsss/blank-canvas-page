import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { usePlatformSettings } from "@/lib/use-platform-settings";
import { logAudit } from "@/lib/audit";
import medusaLogo from "@/assets/medusa.png.asset.json";
import pagarmeLogo from "@/assets/pagarme.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin/adquirentes-list")({
  component: AdquirentesPage,
});

const TABS = [
  "Conexões",
  "Roteamento inteligente (Depósito)",
  "Roteamento inteligente (Saque)",
  "Regras de custos",
] as const;
type TabId = (typeof TABS)[number];

type Method = "pix" | "cartao" | "boleto";
type RoutingSettings = {
  pix: string[];
  cartao: string[];
  boleto: string[];
};
const DEFAULT_ROUTING: RoutingSettings = { pix: [], cartao: [], boleto: [] };

function useActiveAcquirerOptions(feature: Feature): { id: string; label: string }[] {
  const { data } = usePlatformSettings<ConexoesSettings>("adquirentes_conexoes");
  return ACQUIRERS_CATALOG
    .filter((a) => a.features.includes(feature))
    .filter((a) => {
      const conn = data?.[a.id];
      return !!conn && conn.ativa !== false && !!conn.chave_publica && !!conn.chave_privada;
    })
    .map((a) => ({ id: a.id, label: a.name }));
}



function AdquirentesPage() {
  const [tab, setTab] = useState<TabId>(TABS[0]);

  return (
    <AdminShell
      title="Adquirentes"
      subtitle="Configure o roteamento inteligente de pagamentos e adicione novas conexões de adquirentes."
    >
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {tab === "Roteamento inteligente (Depósito)" ? (
          <RoteamentoDeposito />
        ) : tab === "Roteamento inteligente (Saque)" ? (
          <RoteamentoSaque />
        ) : tab === "Conexões" ? (
          <Conexoes />
        ) : tab === "Regras de custos" ? (
          <RegrasDeCustos />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {tab} — em breve.
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function RoteamentoDeposito() {
  const { data, loading, saving, save } = usePlatformSettings<RoutingSettings>(
    "adquirentes_roteamento_deposito",
  );
  const [values, setValues] = useState<RoutingSettings>(DEFAULT_ROUTING);
  const pixOptions = useActiveAcquirerOptions("pix");
  const cartaoOptions = useActiveAcquirerOptions("cartao");
  const boletoOptions = useActiveAcquirerOptions("boleto");

  useEffect(() => {
    const base = data ? { ...DEFAULT_ROUTING, ...data } : DEFAULT_ROUTING;
    setValues({
      pix: base.pix.length ? base.pix : pixOptions.map((o) => o.id),
      cartao: base.cartao.length ? base.cartao : cartaoOptions.map((o) => o.id),
      boleto: base.boleto.length ? base.boleto : boletoOptions.map((o) => o.id),
    });
  }, [data, pixOptions, cartaoOptions, boletoOptions]);


  function toggle(method: Method, id: string) {
    setValues((prev) => {
      const list = prev[method];
      return {
        ...prev,
        [method]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
      };
    });
  }

  function move(method: Method, from: number, to: number) {
    setValues((prev) => {
      const list = [...prev[method]];
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { ...prev, [method]: list };
    });
  }

  async function handleSave() {
    try {
      await save(values);
      await logAudit("config_update", { section: "adquirentes_roteamento_deposito" });
      toast.success("Roteamento de depósito salvo e aplicado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  function restore(method: Method) {
    setValues((prev) => ({ ...prev, [method]: [] }));
    toast.info(`Configuração de ${method.toUpperCase()} restaurada. Clique em Salvar para aplicar.`);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <MethodColumn
          title="Adquirentes de PIX"
          method="pix"
          selected={values.pix}
          onToggle={(id) => toggle("pix", id)}
          onMove={(f, t) => move("pix", f, t)}
          orderLabel="Ordem para PIX"
          options={pixOptions}
        />
        <MethodColumn
          title="Adquirentes de Cartão"
          method="cartao"
          selected={values.cartao}
          onToggle={(id) => toggle("cartao", id)}
          onMove={(f, t) => move("cartao", f, t)}
          orderLabel="Ordem para Cartão"
          emptyHint="Para ativar a transação de Cartão, é necessário adicionar ao menos uma adquirente"
          options={cartaoOptions}
        />
        <MethodColumn
          title="Adquirentes de Boleto"
          method="boleto"
          selected={values.boleto}
          onToggle={(id) => toggle("boleto", id)}
          onMove={(f, t) => move("boleto", f, t)}
          orderLabel="Ordem para boleto"
          options={boletoOptions}
        />

      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>

      <div className="border-t border-border pt-6">
        <h3 className="text-base font-semibold text-foreground">
          Restaurar configurações de adquirente dos produtores
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Essa ação irá restaurar todas as configurações específicas de adquirente dos produtores
          para a configuração padrão da empresa.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => restore("pix")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Restaurar PIX
          </Button>
          <Button
            type="button"
            onClick={() => restore("cartao")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Restaurar cartão
          </Button>
          <Button
            type="button"
            onClick={() => restore("boleto")}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Restaurar boleto
          </Button>
        </div>
      </div>
    </div>
  );
}

function MethodColumn({
  title,
  selected,
  onToggle,
  onMove,
  orderLabel,
  emptyHint,
  options,
}: {
  title: string;
  method: Method;
  selected: string[];
  onToggle: (id: string) => void;
  onMove: (from: number, to: number) => void;
  orderLabel: string;
  emptyHint?: string;
  options: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const empty = options.length === 0;


  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>

      <div className="relative">
        <button
          type="button"
          onClick={() => !empty && setOpen((v) => !v)}
          disabled={empty}
          className="flex w-full items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2.5 text-left text-sm text-foreground disabled:opacity-60"
        >
          <span className="flex flex-col">
            <span className="text-[10px] text-primary">Selecione as desejadas</span>
            <span className="text-sm text-muted-foreground">
              {empty
                ? "Nenhuma adquirente integrada"
                : selected.length === 0
                  ? "Nenhuma selecionada"
                  : `${selected.length} selecionada(s)`}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {open && !empty && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover p-2 shadow-lg">
            {options.map((o) => {
              const checked = selected.includes(o.id);
              return (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(o.id)}
                    className="h-4 w-4"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {selected.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{orderLabel}</p>
          <div className="space-y-1.5">
            {selected.map((id, idx) => {
              const label = options.find((o) => o.id === id)?.label ?? id;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">
                    #{idx + 1} {label}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <button
                      type="button"
                      onClick={() => idx > 0 && onMove(idx, idx - 1)}
                      className="rounded px-1 hover:text-foreground"
                      aria-label="Mover para cima"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => idx < selected.length - 1 && onMove(idx, idx + 1)}
                      className="rounded px-1 hover:text-foreground"
                      aria-label="Mover para baixo"
                    >
                      ↓
                    </button>
                    <GripVertical className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : emptyHint ? (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      ) : null}
    </div>
  );
}

type SaqueSettings = { saque: string[] };
const DEFAULT_SAQUE: SaqueSettings = { saque: [] };

function RoteamentoSaque() {
  const { data, loading, saving, save } = usePlatformSettings<SaqueSettings>(
    "adquirentes_roteamento_saque",
  );
  const [values, setValues] = useState<SaqueSettings>(DEFAULT_SAQUE);
  const saqueOptions = useActiveAcquirerOptions("pix");

  useEffect(() => {
    const base = data ?? DEFAULT_SAQUE;
    setValues({
      saque: base.saque.length ? base.saque : saqueOptions.map((o) => o.id),
    });
  }, [data, saqueOptions]);

  function toggle(id: string) {
    setValues((prev) => ({
      saque: prev.saque.includes(id)
        ? prev.saque.filter((x) => x !== id)
        : [...prev.saque, id],
    }));
  }

  function move(from: number, to: number) {
    setValues((prev) => {
      const list = [...prev.saque];
      const [item] = list.splice(from, 1);
      list.splice(to, 0, item);
      return { saque: list };
    });
  }

  async function handleSave() {
    try {
      await save(values);
      await logAudit("config_update", { section: "adquirentes_roteamento_saque" });
      toast.success("Roteamento de saque salvo e aplicado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  function restore() {
    setValues({ saque: [] });
    toast.info("Configuração de saque restaurada. Clique em Salvar para aplicar.");
  }

  return (
    <div className="space-y-6">
      <MethodColumn
        title="Adquirentes de Saque"
        method="pix"
        selected={values.saque}
        onToggle={toggle}
        onMove={move}
        orderLabel="Ordem para Saque"
        options={saqueOptions}
      />


      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>

      <div className="border-t border-border pt-6">
        <h3 className="text-base font-semibold text-foreground">
          Restaurar configurações de adquirentes de saque dos produtores
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Essa ação irá restaurar todas as configurações específicas de adquirentes de saque dos
          produtores para a configuração padrão da empresa.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            onClick={restore}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Restaurar saque
          </Button>
        </div>
      </div>
    </div>
  );
}

type Feature =
  | "pix"
  | "cartao"
  | "boleto"
  | "assinatura_cartao"
  | "cartao_via_api"
  | "data_expiracao"
  | "compra_1_clique";

const FEATURES: { id: Feature; label: string }[] = [
  { id: "pix", label: "Pix" },
  { id: "cartao", label: "Cartão" },
  { id: "boleto", label: "Boleto" },
  { id: "assinatura_cartao", label: "Assinatura Cartão" },
  { id: "cartao_via_api", label: "Cartão Via Api" },
  { id: "data_expiracao", label: "Data e Expiração" },
  { id: "compra_1_clique", label: "Compra Com 1 Clique" },
];

type AcquirerCatalog = { id: string; name: string; features: Feature[]; logo?: string };
const ACQUIRERS_CATALOG: AcquirerCatalog[] = [
  {
    id: "medusa_payments",
    name: "Medusa Payments",
    features: ["pix"],
    logo: medusaLogo.url,
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    features: ["pix"],
    logo: pagarmeLogo.url,
  },
];

type ConnectionData = {
  chave_privada: string;
  chave_publica: string;
  chave_saque_externo: string;
  ativa: boolean;
};
type ConexoesSettings = Record<string, ConnectionData>;
const EMPTY_CONNECTION: ConnectionData = {
  chave_privada: "",
  chave_publica: "",
  chave_saque_externo: "",
  ativa: true,
};

function Conexoes() {
  const { data, save, saving } = usePlatformSettings<ConexoesSettings>("adquirentes_conexoes");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Feature[]>([]);
  const [editing, setEditing] = useState<AcquirerCatalog | null>(null);
  const [form, setForm] = useState<ConnectionData>(EMPTY_CONNECTION);

  const connections: ConexoesSettings = data ?? {};

  function openIntegrar(a: AcquirerCatalog) {
    setEditing(a);
    setForm(connections[a.id] ?? EMPTY_CONNECTION);
  }

  async function handleSave() {
    if (!editing) return;
    const next: ConexoesSettings = { ...connections, [editing.id]: form };
    try {
      await save(next);
      await logAudit("config_update", { section: "adquirentes_conexoes", acquirer_id: editing.id, ativa: form.ativa });
      toast.success(`Conexão com ${editing.name} salva.`);
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  function toggleFeature(f: Feature) {
    setSelected((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  const filtered = ACQUIRERS_CATALOG.filter((a) => {
    const matchesQuery = a.name.toLowerCase().includes(query.toLowerCase());
    const matchesFeatures =
      selected.length === 0 || selected.every((f) => a.features.includes(f));
    return matchesQuery && matchesFeatures;
  });

  const connectedList = ACQUIRERS_CATALOG.filter((a) => !!connections[a.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Minhas adquirentes</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Adquirentes com chaves de conexão já informadas.
        </p>
        {connectedList.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Nenhuma adquirente conectada ainda. Escolha uma na lista abaixo e clique em
            “Integrar” para informar suas chaves.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {connectedList.map((a) => {
              const conn = connections[a.id];
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3"
                >
                  {a.logo && (
                    <img src={a.logo} alt={a.name} className="h-8 w-8 rounded-md object-contain" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Chave pública: {conn.chave_publica ? `${conn.chave_publica.slice(0, 6)}••••` : "não informada"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      conn.ativa
                        ? "bg-foreground/10 text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {conn.ativa ? "Ativa" : "Desativada"}
                  </span>
                  <Button type="button" variant="ghost" onClick={() => openIntegrar(a)}>
                    Editar chaves
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="rounded-md border border-border bg-background/50 px-3 py-2">
          <label className="block text-[10px] font-medium text-primary">
            Buscar adquirente por nome
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome da adquirente"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Filtrar por funcionalidades
          </p>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => {
              const active = selected.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFeature(f.id)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Nenhuma adquirente encontrada
          {selected.length > 0 ? " para os filtros selecionados." : "."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const conn = connections[a.id];
            const integrated = !!conn;
            return (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    {a.logo && (
                      <img
                        src={a.logo}
                        alt={a.name}
                        className="h-10 w-10 rounded-md object-contain"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{a.name}</p>
                      {integrated && (
                        <span
                          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] ${
                            conn.ativa
                              ? "bg-foreground/10 text-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {conn.ativa ? "Ativa" : "Desativada"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.features.map((f) => (
                      <span
                        key={f}
                        className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {FEATURES.find((x) => x.id === f)?.label}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={() => openIntegrar(a)}
                  className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {integrated ? "Editar integração" : "Integrar"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {editing.logo && (
                <img
                  src={editing.logo}
                  alt={editing.name}
                  className="h-10 w-10 rounded-md object-contain"
                />
              )}
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Integrar {editing.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Informe as chaves fornecidas pela adquirente.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Field
                label="Chave privada"
                value={form.chave_privada}
                onChange={(v) => setForm((f) => ({ ...f, chave_privada: v }))}
                type="password"
              />
              <Field
                label="Chave pública"
                value={form.chave_publica}
                onChange={(v) => setForm((f) => ({ ...f, chave_publica: v }))}
              />
              <Field
                label="Chave de saque externo"
                value={form.chave_saque_externo}
                onChange={(v) => setForm((f) => ({ ...f, chave_saque_externo: v }))}
                type="password"
              />

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { v: true, label: "Ativa" },
                      { v: false, label: "Desativada" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={String(opt.v)}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, ativa: opt.v }))}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        form.ativa === opt.v
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditing(null)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2">
      <label className="block text-[10px] font-medium text-primary">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-foreground outline-none"
      />
    </div>
  );
}



type CostAction = "venda" | "saque";
type CostMethod = "pix" | "cartao" | "boleto";
type CostRule = {
  id: string;
  acquirer_id: string;
  action: CostAction;
  method: CostMethod;
  parcelas: number;
  taxa_fixa: number;
  taxa_variavel: number;
  taxa_fixa_max: number;
};
type CostSettings = { rules: CostRule[] };
const DEFAULT_COSTS: CostSettings = { rules: [] };

const ACTION_LABEL: Record<CostAction, string> = { venda: "Venda", saque: "Saque" };
const METHOD_LABEL: Record<CostMethod, string> = {
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
};

function RegrasDeCustos() {
  const { data, loading, saving, save } = usePlatformSettings<CostSettings>(
    "adquirentes_regras_custos",
  );
  const [values, setValues] = useState<CostSettings>(DEFAULT_COSTS);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Omit<CostRule, "id">>({
    acquirer_id: "",
    action: "venda",
    method: "pix",
    parcelas: 1,
    taxa_fixa: 0,
    taxa_variavel: 0,
    taxa_fixa_max: 0,
  });

  // filters
  const [fAcquirer, setFAcquirer] = useState("");
  const [fAction, setFAction] = useState<CostAction | "">("");
  const [fMethod, setFMethod] = useState<CostMethod | "">("");
  const [fMaxFee, setFMaxFee] = useState("");
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (data) setValues({ ...DEFAULT_COSTS, ...data });
  }, [data]);

  const filtered = values.rules.filter((r) => {
    if (fAcquirer && r.acquirer_id !== fAcquirer) return false;
    if (fAction && r.action !== fAction) return false;
    if (fMethod && r.method !== fMethod) return false;
    if (fMaxFee && r.taxa_fixa > Number(fMaxFee)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  async function persist(next: CostSettings) {
    try {
      await save(next);
      await logAudit("config_update", { section: "adquirentes_regras_custos" });
      toast.success("Regras de custos salvas e aplicadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function addRule() {
    if (!draft.acquirer_id) {
      toast.error("Selecione uma adquirente.");
      return;
    }
    const rule: CostRule = { ...draft, id: crypto.randomUUID() };
    const next = { rules: [...values.rules, rule] };
    setValues(next);
    setShowForm(false);
    await persist(next);
  }

  async function removeRule(id: string) {
    const next = { rules: values.rules.filter((r) => r.id !== id) };
    setValues(next);
    await persist(next);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Regras de Custos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina as regras de custos para cada adquirente.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            disabled={loading || saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Adicionar regra
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <SelectBox
            label="Adquirentes"
            value={fAcquirer}
            onChange={setFAcquirer}
            options={[
              { value: "", label: "Todas" },
              ...ACQUIRERS_CATALOG.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <SelectBox
            label="Tipo da ação"
            value={fAction}
            onChange={(v) => setFAction(v as CostAction | "")}
            options={[
              { value: "", label: "Todos" },
              { value: "venda", label: "Venda" },
              { value: "saque", label: "Saque" },
            ]}
          />
          <SelectBox
            label="Métodos de pagamento"
            value={fMethod}
            onChange={(v) => setFMethod(v as CostMethod | "")}
            options={[
              { value: "", label: "Todos" },
              { value: "pix", label: "PIX" },
              { value: "cartao", label: "Cartão" },
              { value: "boleto", label: "Boleto" },
            ]}
          />
          <div className="rounded-md border border-border bg-background/50 px-3 py-2">
            <label className="block text-[10px] text-primary">Taxa fixa máxima (R$)</label>
            <input
              type="number"
              value={fMaxFee}
              onChange={(e) => setFMaxFee(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {showForm && (
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-background/40 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <SelectBox
                label="Adquirente"
                value={draft.acquirer_id}
                onChange={(v) => setDraft((d) => ({ ...d, acquirer_id: v }))}
                options={[
                  { value: "", label: "Selecione" },
                  ...ACQUIRERS_CATALOG.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <SelectBox
                label="Ação"
                value={draft.action}
                onChange={(v) => setDraft((d) => ({ ...d, action: v as CostAction }))}
                options={[
                  { value: "venda", label: "Venda" },
                  { value: "saque", label: "Saque" },
                ]}
              />
              <SelectBox
                label="Método"
                value={draft.method}
                onChange={(v) => setDraft((d) => ({ ...d, method: v as CostMethod }))}
                options={[
                  { value: "pix", label: "PIX" },
                  { value: "cartao", label: "Cartão" },
                  { value: "boleto", label: "Boleto" },
                ]}
              />
              <NumField
                label="Nº de Parcelas"
                value={draft.parcelas}
                onChange={(v) => setDraft((d) => ({ ...d, parcelas: v }))}
              />
              <NumField
                label="Taxa Fixa (R$)"
                value={draft.taxa_fixa}
                onChange={(v) => setDraft((d) => ({ ...d, taxa_fixa: v }))}
                step="0.01"
              />
              <NumField
                label="Taxa Variável (%)"
                value={draft.taxa_variavel}
                onChange={(v) => setDraft((d) => ({ ...d, taxa_variavel: v }))}
                step="0.01"
              />
              <NumField
                label="Taxa Fixa Máx. (R$)"
                value={draft.taxa_fixa_max}
                onChange={(v) => setDraft((d) => ({ ...d, taxa_fixa_max: v }))}
                step="0.01"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={addRule}
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Salvar regra
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-muted-foreground">
            <tr>
              <Th>Adquirente</Th>
              <Th>Ação</Th>
              <Th>Método</Th>
              <Th>Número de Parcelas</Th>
              <Th>Taxa Fixa</Th>
              <Th>Taxa Variável</Th>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  Sem resultados
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <Td>{ACQUIRERS_CATALOG.find((a) => a.id === r.acquirer_id)?.name ?? "—"}</Td>
                  <Td>{ACTION_LABEL[r.action]}</Td>
                  <Td>{METHOD_LABEL[r.method]}</Td>
                  <Td>{r.parcelas}</Td>
                  <Td>R$ {r.taxa_fixa.toFixed(2)}</Td>
                  <Td>{r.taxa_variavel.toFixed(2)}%</Td>
                  <Td>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-auto px-3 py-1 text-xs"
                      onClick={() => removeRule(r.id)}
                    >
                      Remover
                    </Button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Por página</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-border bg-background/50 px-2 py-1 text-foreground"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectBox({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2">
      <label className="block text-[10px] text-primary">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm text-foreground outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background text-foreground">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2">
      <label className="block text-[10px] text-primary">{label}</label>
      <input
        type="number"
        step={step ?? "1"}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent text-sm text-foreground outline-none"
      />
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{children}</th>;
}
function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 text-foreground">{children}</td>;
}

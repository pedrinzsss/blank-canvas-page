import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { usePlatformSettings } from "@/lib/use-platform-settings";

export const Route = createFileRoute("/_authenticated/admin/taxas")({
  component: TaxasPage,
});

type MethodTaxa = {
  taxa_fixa: number;
  taxa_variavel: number;
  taxa_minima: number;
  ocultar_taxa_minima: boolean;
  dias_liberacao: number;
  dias_retencao: number;
  porcentagem_retencao: number;
};

type SaqueTaxa = {
  taxa_fixa: number;
  taxa_variavel: number;
  taxa_minima: number;
  cripto_taxa_fixa: number;
  cripto_taxa_variavel: number;
  cripto_taxa_minima: number;
};

type GeralTaxa = {
  cobrar_taxa_fixa_por_produto: boolean;
};

type AntecipacaoTaxa = {
  antecipacao_minima: "D+2" | "D+14" | "D+30";
  taxa_d14: number;
  calcular_por_dias: boolean;
};

type CartaoTierTaxa = { taxa_fixa: number; taxa_variavel: number };

type CartaoTaxa = {
  taxa_parcelamento_cliente: number;
  avista: CartaoTierTaxa;
  ate6x: CartaoTierTaxa;
  ate12x: CartaoTierTaxa;
  dias_liberacao: number;
  dias_retencao: number;
  porcentagem_retencao: number;
};

type TaxasSettings = {
  pix: MethodTaxa;
  boleto: MethodTaxa;
  cartao: CartaoTaxa;
  saque: SaqueTaxa;
  geral: GeralTaxa;
  antecipacao: AntecipacaoTaxa;
};

const DEFAULT_METHOD: MethodTaxa = {
  taxa_fixa: 2,
  taxa_variavel: 4.99,
  taxa_minima: 0,
  ocultar_taxa_minima: false,
  dias_liberacao: 0,
  dias_retencao: 30,
  porcentagem_retencao: 0,
};

const DEFAULT_TAXAS: TaxasSettings = {
  pix: { ...DEFAULT_METHOD },
  boleto: { ...DEFAULT_METHOD, taxa_fixa: 3.5, taxa_variavel: 2.99 },
  cartao: {
    taxa_parcelamento_cliente: 3.1,
    avista: { taxa_fixa: 2, taxa_variavel: 4.99 },
    ate6x: { taxa_fixa: 2, taxa_variavel: 4.99 },
    ate12x: { taxa_fixa: 2, taxa_variavel: 4.99 },
    dias_liberacao: 30,
    dias_retencao: 30,
    porcentagem_retencao: 0,
  },
  saque: { taxa_fixa: 3.99, taxa_variavel: 0, taxa_minima: 0, cripto_taxa_fixa: 0, cripto_taxa_variavel: 0, cripto_taxa_minima: 0 },
  geral: { cobrar_taxa_fixa_por_produto: false },
  antecipacao: { antecipacao_minima: "D+14", taxa_d14: 6.99, calcular_por_dias: true },
};

const TABS = ["PIX", "Boleto", "Cartão", "Saque", "Geral", "Antecipação"] as const;
type TabId = (typeof TABS)[number];

function TaxasPage() {
  const [tab, setTab] = useState<TabId>("PIX");
  const { data, loading, saving, save } = usePlatformSettings<TaxasSettings>("taxas");
  const [values, setValues] = useState<TaxasSettings>(DEFAULT_TAXAS);

  useEffect(() => {
    if (data) {
      setValues({
        pix: { ...DEFAULT_TAXAS.pix, ...(data.pix ?? {}) },
        boleto: { ...DEFAULT_TAXAS.boleto, ...(data.boleto ?? {}) },
        cartao: { ...DEFAULT_TAXAS.cartao, ...(data.cartao ?? {}) },
        saque: { ...DEFAULT_TAXAS.saque, ...(data.saque ?? {}) },
        geral: { ...DEFAULT_TAXAS.geral, ...(data.geral ?? {}) },
        antecipacao: { ...DEFAULT_TAXAS.antecipacao, ...(data.antecipacao ?? {}) },
      });
    }
  }, [data]);

  async function handleSave() {
    try {
      await save(values);
      await logAudit("config_update", { section: "taxas" });
      toast.success("Taxas salvas e aplicadas a todos os produtores sem taxa específica.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <AdminShell title="Configurações" subtitle="Taxas">
      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">Taxas da plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esses valores serão aplicados para todos os produtores que não tem uma taxa específica
            (você pode alterar a taxa específica no perfil do produtor).
          </p>
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3">
          {TABS.map((t) => {
            const active = t === tab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          {tab === "PIX" && (
            <MethodForm
              title="Alterar taxas de PIX"
              value={values.pix}
              onChange={(v) => setValues((p) => ({ ...p, pix: v }))}
              methodLabel="PIX"
            />
          )}
          {tab === "Boleto" && (
            <MethodForm
              title="Alterar taxas de Boleto"
              value={values.boleto}
              onChange={(v) => setValues((p) => ({ ...p, boleto: v }))}
              methodLabel="Boleto"
              hideMinima
            />
          )}
          {tab === "Cartão" && (
            <CartaoForm
              value={values.cartao}
              onChange={(v) => setValues((p) => ({ ...p, cartao: v }))}
            />
          )}
          {tab === "Saque" && (
            <SaqueForm
              value={values.saque}
              onChange={(v) => setValues((p) => ({ ...p, saque: v }))}
            />
          )}
          {tab === "Geral" && (
            <GeralForm
              value={values.geral}
              onChange={(v) => setValues((p) => ({ ...p, geral: v }))}
            />
          )}
          {tab === "Antecipação" && (
            <AntecipacaoForm
              value={values.antecipacao}
              onChange={(v) => setValues((p) => ({ ...p, antecipacao: v }))}
            />
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="mt-6 h-11 w-full bg-primary text-white hover:bg-primary disabled:opacity-60"
          >
            {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}

function MethodForm({
  title,
  value,
  onChange,
  methodLabel,
  hideMinima,
}: {
  title: string;
  value: MethodTaxa;
  onChange: (v: MethodTaxa) => void;
  methodLabel: string;
  hideMinima?: boolean;
}) {
  function set<K extends keyof MethodTaxa>(k: K, v: MethodTaxa[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="rounded-md border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
        Esses valores serão aplicados para todos os produtores que não tem uma taxa específica
        (você pode alterar a taxa específica no perfil do produtor).
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Taxa de operação</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <NumField
            label="Taxa fixa"
            required
            prefix="R$"
            value={value.taxa_fixa}
            onChange={(v) => set("taxa_fixa", v)}
            hint="Valor fixo cobrado por transação."
          />
          <NumField
            label="Taxa variável"
            required
            suffix="%"
            value={value.taxa_variavel}
            onChange={(v) => set("taxa_variavel", v)}
            hint="Valor variável cobrado por transação. Essa taxa é calculada em cima do valor total da transação."
          />
          {!hideMinima && (
            <NumField
              label="Taxa mínima"
              prefix="R$"
              value={value.taxa_minima}
              onChange={(v) => set("taxa_minima", v)}
              hint="Valor mínimo da taxa cobrada por transação."
            />
          )}
        </div>


        {!hideMinima && (
          <label className="flex items-start gap-3 pt-2">
            <button
              type="button"
              role="switch"
              aria-checked={value.ocultar_taxa_minima}
              onClick={() => set("ocultar_taxa_minima", !value.ocultar_taxa_minima)}
              className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
                value.ocultar_taxa_minima ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  value.ocultar_taxa_minima ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-sm">
              <span className="font-medium">Ocultar taxa mínima de {methodLabel} para produtores</span>
              <span className="block text-xs text-muted-foreground">
                Se ativo, a taxa mínima será oculta no painel de taxas de todos os produtores.
              </span>
            </span>
          </label>
        )}
      </section>

      <div className="border-t border-border" />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Liberação e Retenção</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <NumField
            label="Quantidade de dias para liberação de venda"
            required
            prefix="D+"
            value={value.dias_liberacao}
            onChange={(v) => set("dias_liberacao", v)}
            hint="Quantidade de dias que a venda ficará pendente."
            integer
          />
          <NumField
            label="Quantidade de dias para retenção"
            required
            prefix="D+"
            value={value.dias_retencao}
            onChange={(v) => set("dias_retencao", v)}
            hint="Quantidade de dias que o valor ficará retido."
            integer
          />
          <NumField
            label="Porcentagem de retenção"
            required
            suffix="%"
            value={value.porcentagem_retencao}
            onChange={(v) => set("porcentagem_retencao", v)}
          />
        </div>
      </section>
    </div>
  );
}

function SaqueForm({ value, onChange }: { value: SaqueTaxa; onChange: (v: SaqueTaxa) => void }) {
  function set<K extends keyof SaqueTaxa>(k: K, v: SaqueTaxa[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Alterar taxas de Saque</h2>

      <div className="rounded-md border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
        Esses valores serão aplicados para todos os produtores que não tem uma taxa específica
        (você pode alterar a taxa específica no perfil do produtor).
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <NumField label="Taxa fixa" required prefix="R$" value={value.taxa_fixa} onChange={(v) => set("taxa_fixa", v)} hint="Valor fixo cobrado por transação." />
        <NumField label="Taxa variável" required suffix="%" value={value.taxa_variavel} onChange={(v) => set("taxa_variavel", v)} hint="Valor variável cobrado por transação. Essa taxa é calculada em cima do valor total da transação." />
        <NumField label="Taxa mínima de saque" required suffix="R$" value={value.taxa_minima} onChange={(v) => set("taxa_minima", v)} hint="Valor mínimo cobrado por saque." />
      </div>

      <h3 className="text-lg font-semibold pt-2">Taxa de operação cripto</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <NumField label="Taxa fixa cripto" required prefix="R$" value={value.cripto_taxa_fixa} onChange={(v) => set("cripto_taxa_fixa", v)} hint="Valor fixo cobrado por saque cripto." />
        <NumField label="Taxa variável cripto" required suffix="%" value={value.cripto_taxa_variavel} onChange={(v) => set("cripto_taxa_variavel", v)} hint="Valor variável cobrado por saque cripto. Essa taxa é calculada em cima do valor total do saque." />
        <NumField label="Taxa mínima de saque cripto" required suffix="R$" value={value.cripto_taxa_minima} onChange={(v) => set("cripto_taxa_minima", v)} hint="Valor mínimo cobrado por saque cripto." />
      </div>
    </div>
  );
}

function GeralForm({ value, onChange }: { value: GeralTaxa; onChange: (v: GeralTaxa) => void }) {
  function set<K extends keyof GeralTaxa>(k: K, v: GeralTaxa[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Alterações configurações gerais</h2>

      <div className="rounded-md border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
        Configurações gerais aplicadas para todos os produtores.
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Regras de aplicação</h3>
        <label className="flex items-start gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={value.cobrar_taxa_fixa_por_produto}
            onClick={() => set("cobrar_taxa_fixa_por_produto", !value.cobrar_taxa_fixa_por_produto)}
            className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
              value.cobrar_taxa_fixa_por_produto ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                value.cobrar_taxa_fixa_por_produto ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm">
            <span className="font-medium">Cobrar taxa fixa por cada produto</span>
            <span className="block text-xs text-muted-foreground">
              Se ativo, a taxa fixa será cobrada por cada produto e não apenas uma vez na cobrança.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}

function AntecipacaoForm({
  value,
  onChange,
}: {
  value: AntecipacaoTaxa;
  onChange: (v: AntecipacaoTaxa) => void;
}) {
  function set<K extends keyof AntecipacaoTaxa>(k: K, v: AntecipacaoTaxa[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Configurar antecipação global</h2>

      <div className="rounded-md border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground space-y-2">
        <p>
          Essas configurações definem quais opções de antecipação ficam disponíveis para os
          produtores e quais taxas serão cobradas em cada prazo.
        </p>
        <p>
          Selecione a menor antecipação permitida pela sua operação. Se você selecionar D+2,
          produtores podem usar D+2, D+14 ou D+30. Se selecionar D+14, produtores podem usar D+14
          ou D+30.
        </p>
      </div>

      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Configure apenas prazos que suas adquirentes conseguem processar. Se alguma adquirente
        trabalha com bolsão, mantenha na conta master o menor prazo possível para evitar falhas na
        antecipação.
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
        A antecipação funciona apenas para vendas no cartão.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">
            Antecipação mínima <span className="text-destructive">*</span>
          </span>
          <select
            value={value.antecipacao_minima}
            onChange={(e) =>
              set("antecipacao_minima", e.target.value as AntecipacaoTaxa["antecipacao_minima"])
            }
            className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="D+2">D+2</option>
            <option value="D+14">D+14</option>
            <option value="D+30">D+30</option>
          </select>
          <span className="block text-xs text-muted-foreground">
            Define o menor prazo de liberação que os produtores podem escolher.
          </span>
        </label>

        <NumField
          label="Antecipação D+14"
          required
          suffix="%"
          value={value.taxa_d14}
          onChange={(v) => set("taxa_d14", v)}
          hint="Taxa cobrada quando o produtor escolhe receber 14 dias após a venda."
        />
      </div>

      <div className="rounded-md border border-border bg-background/40 p-4 space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.calcular_por_dias}
            onChange={(e) => set("calcular_por_dias", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm font-medium">Calcular por dias antecipados</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Com essa opção desativada, a taxa percentual é cobrada sobre o valor total da venda.
          Exemplo: em uma venda de R$ 100,00 com taxa de 2%, o produtor paga R$ 2,00 para
          antecipar.
        </p>
        <p className="text-xs text-muted-foreground">
          Com essa opção ativada, a taxa é calculada pelos dias antecipados usando a fórmula PMT.
          O valor aumenta conforme o parcelamento, mas não é um cálculo direto de 2% multiplicado
          pela quantidade de parcelas.
        </p>
      </div>
    </div>
  );
}

function CartaoForm({ value, onChange }: { value: CartaoTaxa; onChange: (v: CartaoTaxa) => void }) {
  function setTop<K extends keyof CartaoTaxa>(k: K, v: CartaoTaxa[K]) {
    onChange({ ...value, [k]: v });
  }
  function setTier(tier: "avista" | "ate6x" | "ate12x", v: CartaoTierTaxa) {
    onChange({ ...value, [tier]: v });
  }

  const tiers: { key: "avista" | "ate6x" | "ate12x"; label: string }[] = [
    { key: "avista", label: "À vista" },
    { key: "ate6x", label: "Parcelado até 6x" },
    { key: "ate12x", label: "Parcelado até 12x" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Alterar taxas de Cartão</h2>

      <div className="rounded-md border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
        Esses valores serão aplicados para todos os produtores que não tem uma taxa específica
        (você pode alterar a taxa específica no perfil do produtor).
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Taxa de parcelamento paga pelo cliente</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <NumField
            label="Taxa variável"
            required
            suffix="%"
            value={value.taxa_parcelamento_cliente}
            onChange={(v) => setTop("taxa_parcelamento_cliente", v)}
            hint="Essa é a taxa de parcelamento repassada para o cliente (Essa taxa é a.m, ou seja, calculada por parcela)."
          />
          <div className="flex items-start">
            <button
              type="button"
              className="mt-5 h-11 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary"
            >
              Calculadora de taxas de parcelamento ›
            </button>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {tiers.map((t) => (
        <section key={t.key} className="space-y-3">
          <h3 className="text-sm font-semibold">{t.label}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <NumField
              label="Taxa fixa"
              required
              prefix="R$"
              value={value[t.key].taxa_fixa}
              onChange={(v) => setTier(t.key, { ...value[t.key], taxa_fixa: v })}
              hint="Valor fixo cobrado por transação."
            />
            <NumField
              label="Taxa variável"
              required
              suffix="%"
              value={value[t.key].taxa_variavel}
              onChange={(v) => setTier(t.key, { ...value[t.key], taxa_variavel: v })}
              hint="Valor variável cobrado por transação. Essa taxa é calculada em cima do valor total da transação."
            />
          </div>
        </section>
      ))}

      <div className="border-t border-border" />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Liberação das vendas</h3>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">
            Quantidade de dias para liberação de venda <span className="text-destructive">*</span>
          </span>
          <select
            value={value.dias_liberacao}
            onChange={(e) => setTop("dias_liberacao", parseInt(e.target.value, 10))}
            className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {[2, 15, 30, 45, 60, 90].map((d) => (
              <option key={d} value={d}>
                {d} dias
              </option>
            ))}
          </select>
          <span className="block text-xs text-muted-foreground">
            Para mais informações, veja a aba de antecipação. Ou fale com o nosso suporte.
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Retenção (Reserva de emergência)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <NumField
            label="Quantidade de dias para retenção"
            required
            prefix="D+"
            value={value.dias_retencao}
            onChange={(v) => setTop("dias_retencao", v)}
            hint="Quantidade de dias que o valor ficará retido."
            integer
          />
          <NumField
            label="Porcentagem de retenção"
            required
            suffix="%"
            value={value.porcentagem_retencao}
            onChange={(v) => setTop("porcentagem_retencao", v)}
          />
        </div>
      </section>
    </div>
  );
}

function NumField({
  label,
  required,
  prefix,
  suffix,
  value,
  onChange,
  hint,
  integer,
}: {
  label: string;
  required?: boolean;
  prefix?: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  integer?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          step={integer ? "1" : "0.01"}
          min="0"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const n = integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="w-full bg-transparent text-sm text-foreground outline-none"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

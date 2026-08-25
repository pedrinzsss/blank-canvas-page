import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { supabase } from "@/integrations/supabase/client";
import {
  usePlatformSettings,
  type EmpresaSettings,
} from "@/lib/use-platform-settings";
import {
  applyCores,
  DEFAULT_CORES,
  setThemePreference,
  type CoresSettings,
} from "@/lib/theme-applier";
import {
  applyTextos,
  DEFAULT_TEXTOS,
  type TextosSettings,
} from "@/lib/textos-applier";
import { applyImagens } from "@/lib/images-applier";

type ImagensSettings = {
  icon_path: string | null;
  logo_dark_path: string | null;
  logo_light_path: string | null;
  login_logo_path: string | null;
};

const EMPTY_IMAGENS: ImagensSettings = {
  icon_path: null,
  logo_dark_path: null,
  logo_light_path: null,
  login_logo_path: null,
};

const TABS = [
  "Empresa",
  "Imagens",
  "Cores",
  "Textos",
  "Extras",
  "Financeiro",
  "Compliance",
  "Fingerprints",
  "Banners",
  "Programa de indicação",
] as const;

type TabId = (typeof TABS)[number];

export const Route = createFileRoute("/_authenticated/admin/adquirentes")({
  component: GeralPage,
});

function GeralPage() {
  const [tab, setTab] = useState<TabId>("Empresa");

  return (
    <AdminShell title="Configurações" subtitle="Configurações">
      <div className="space-y-4 p-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui você consegue configurar o seu gateway da forma que desejar!
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
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {tab === "Empresa" ? (
          <EmpresaForm />
        ) : tab === "Imagens" ? (
          <ImagensForm />
        ) : tab === "Cores" ? (
          <CoresForm />
        ) : tab === "Textos" ? (
          <TextosForm />
        ) : tab === "Financeiro" ? (
          <FinanceiroForm />
        ) : tab === "Compliance" ? (
          <ComplianceForm />
        ) : tab === "Fingerprints" ? (
          <FingerprintsForm />
        ) : tab === "Banners" ? (
          <BannersForm />
        ) : tab === "Programa de indicação" ? (
          <IndicacaoForm />
        ) : (
          <ComingSoon label={tab} />
        )}
      </div>
    </AdminShell>
  );
}

const EMPTY_EMPRESA: EmpresaSettings = {
  cep: "",
  uf: "",
  cidade: "",
  bairro: "",
  rua: "",
  numero: "",
  email_suporte: "",
  link_suporte: "",
  link_comprador: "",
  cnpj: "",
  razao_social: "",
};

function EmpresaForm() {
  const { data, loading, saving, save } = usePlatformSettings<EmpresaSettings>("empresa");
  const [values, setValues] = useState<EmpresaSettings>(EMPTY_EMPRESA);

  useEffect(() => {
    if (data) setValues({ ...EMPTY_EMPRESA, ...data });
  }, [data]);

  function bind<K extends keyof EmpresaSettings>(key: K) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setValues((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save(values);
      await logAudit("config_update", { section: "empresa" });
      toast.success("Configurações salvas e aplicadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">Alterar dados da empresa</h2>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm text-muted-foreground">Endereço da empresa</h3>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="CEP" required>
            <Input {...bind("cep")} />
          </Field>
          <Field label="Estado (UF)" required>
            <Input {...bind("uf")} />
          </Field>
          <Field label="Cidade" required>
            <Input {...bind("cidade")} />
          </Field>
        </div>

        <div className="border-t border-border" />

        <Field label="Bairro" required>
          <Input {...bind("bairro")} />
        </Field>
        <Field label="Rua" required>
          <Input {...bind("rua")} />
        </Field>
        <Field label="Número" required>
          <Input {...bind("numero")} />
        </Field>
      </section>

      <div className="border-t border-border" />

      <section className="grid gap-4 md:grid-cols-3">
        <Field
          label="Email de suporte"
          hint="Esse email aparecerá nas páginas legais e, se o link para o comprador não for preenchido, também no email de confirmação de compra."
        >
          <Input {...bind("email_suporte")} />
        </Field>
        <Field
          label="Link para entrar em contato com o suporte"
          hint="Este link aparecerá no menu lateral do produtor."
        >
          <Input {...bind("link_suporte")} />
        </Field>
        <Field
          label="Link para o comprador entrar em contato com o suporte"
          hint="Este link aparecerá no email de realização de pedido do comprador e substituirá o email de suporte acima nesse contexto."
        >
          <Input {...bind("link_comprador")} />
        </Field>
      </section>

      <div className="border-t border-border" />

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="CNPJ" required>
          <Input {...bind("cnpj")} />
        </Field>
        <Field label="Razão Social" required>
          <Input {...bind("razao_social")} />
        </Field>
      </section>

      <Button
        type="submit"
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
    />
  );
}

function ImagensForm() {
  const { data, loading, saving, save } = usePlatformSettings<ImagensSettings>("imagens");
  const [values, setValues] = useState<ImagensSettings>(EMPTY_IMAGENS);

  useEffect(() => {
    if (data) setValues({ ...EMPTY_IMAGENS, ...data });
  }, [data]);

  async function handleSave() {
    try {
      await save(values);
      applyImagens(values);
      await logAudit("config_update", { section: "imagens" });
      toast.success("Imagens salvas e aplicadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Alterar imagens</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <ImageSlot
          label="Ícone do site"
          value={values.icon_path}
          onChange={(p) => setValues((v) => ({ ...v, icon_path: p }))}
          folder="icon"
        />
        <ImageSlot
          label="Logo no modo escuro"
          value={values.logo_dark_path}
          onChange={(p) => setValues((v) => ({ ...v, logo_dark_path: p }))}
          folder="logo-dark"
          dark
        />
        <ImageSlot
          label="Logo no modo claro"
          value={values.logo_light_path}
          onChange={(p) => setValues((v) => ({ ...v, logo_light_path: p }))}
          folder="logo-light"
          light
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
    </div>
  );
}

function ImageSlot({
  label,
  value,
  onChange,
  folder,
  dark,
  light,
}: {
  label: string;
  value: string | null;
  onChange: (path: string | null) => void;
  folder: string;
  dark?: boolean;
  light?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function resolve() {
      if (!value) return setPreview(null);
      const { data } = await supabase.storage
        .from("platform-assets")
        .createSignedUrl(value, 60 * 60);
      if (alive) setPreview(data?.signedUrl ?? null);
    }
    void resolve();
    return () => {
      alive = false;
    };
  }, [value]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB).");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("platform-assets")
      .upload(path, file, { upsert: true, contentType: file.type });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (value) {
      void supabase.storage.from("platform-assets").remove([value]);
    }
    onChange(path);
  }

  const bg = dark ? "bg-[#0b0b0b]" : light ? "bg-white" : "bg-background/40";

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div
        className={`relative aspect-square overflow-hidden rounded-xl border border-border ${bg}`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="h-full w-full object-contain p-6" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Remover"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Upload className="h-6 w-6" />
            {busy ? "Enviando…" : "Clique para enviar"}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
      {label} — em breve
    </div>
  );
}

function CoresForm() {
  const { data, loading, saving, save } = usePlatformSettings<CoresSettings>("cores");
  const [values, setValues] = useState<CoresSettings>(DEFAULT_CORES);
  const [editMode, setEditMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (data) {
      const merged = {
        ...DEFAULT_CORES,
        ...data,
        dark: { ...DEFAULT_CORES.dark, ...(data.dark ?? {}) },
        light: { ...DEFAULT_CORES.light, ...(data.light ?? {}) },
      };
      setValues(merged);
      setEditMode(merged.default_theme);
    }
  }, [data]);

  // Live preview while editing
  useEffect(() => {
    applyCores(values, editMode);
  }, [values, editMode]);

  function setTop<K extends "primary" | "secondary" | "primary_button_text">(k: K, v: string) {
    setValues((p) => ({ ...p, [k]: v }));
  }
  function setMode(mode: "light" | "dark", k: keyof CoresSettings["dark"], v: string) {
    setValues((p) => ({ ...p, [mode]: { ...p[mode], [k]: v } }));
  }

  async function handleSave() {
    try {
      await save(values);
      setThemePreference(editMode);
      applyCores(values, editMode);
      await logAudit("config_update", { section: "cores" });
      toast.success("Cores salvas e aplicadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  const modeVars = values[editMode];

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Alterar cores</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <ColorField
          label="Cor primária"
          hint="Essa cor aparecerá em todos os elementos principais do sistema, como botões de ação, ícones e alguns títulos."
          value={values.primary}
          onChange={(v) => setTop("primary", v)}
        />
        <ColorField
          label="Cor secundária"
          hint="Essa cor será aplicada em alguns elementos secundários do sistema, como botões de ação secundários."
          value={values.secondary}
          onChange={(v) => setTop("secondary", v)}
        />
        <ColorField
          label="Texto do botão principal"
          hint="Cor do texto que aparece nos botões de ação. Escolha uma cor que contraste com a cor primária."
          value={values.primary_button_text}
          onChange={(v) => setTop("primary_button_text", v)}
        />
      </div>

      <div className="grid gap-6 border-t border-border pt-6 md:grid-cols-2">
        <ThemeColumn
          title="Tema escuro"
          vars={values.dark}
          onChange={(k, v) => setMode("dark", k, v)}
          onFocus={() => setEditMode("dark")}
        />
        <ThemeColumn
          title="Tema claro"
          vars={values.light}
          onChange={(k, v) => setMode("light", k, v)}
          onFocus={() => setEditMode("light")}
        />
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <h3 className="text-sm font-semibold">Definir tema padrão</h3>
        <p className="text-xs text-muted-foreground">
          Escolha o tema padrão inicial que será utilizado na plataforma. OBS: O usuário pode
          alterar entre tema claro ou escuro se ele quiser.
        </p>
        <div className="flex items-center gap-6 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="default_theme"
              checked={values.default_theme === "light"}
              onChange={() => {
                setValues((p) => ({ ...p, default_theme: "light" }));
                setEditMode("light");
              }}
              className="h-4 w-4 accent-[color:var(--primary)]"
            />
            Modo claro
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="default_theme"
              checked={values.default_theme === "dark"}
              onChange={() => {
                setValues((p) => ({ ...p, default_theme: "dark" }));
                setEditMode("dark");
              }}
              className="h-4 w-4 accent-[color:var(--primary)]"
            />
            Modo Escuro
          </label>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Editando visualmente: <span className="font-medium">{editMode === "dark" ? "Tema escuro" : "Tema claro"}</span>
        {" "}— clique em qualquer campo do outro tema para alternar a pré-visualização.
        <span className="ml-2 hidden">{JSON.stringify(modeVars).slice(0, 0)}</span>
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>
    </div>
  );
}

function ThemeColumn({
  title,
  vars,
  onChange,
  onFocus,
}: {
  title: string;
  vars: { background: string; header: string; sidebar: string; widget: string };
  onChange: (k: "background" | "header" | "sidebar" | "widget", v: string) => void;
  onFocus: () => void;
}) {
  return (
    <div className="space-y-4" onFocusCapture={onFocus} onClickCapture={onFocus}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ColorField label="Cor de fundo" value={vars.background} onChange={(v) => onChange("background", v)} />
      <ColorField label="Cor do cabeçalho" value={vars.header} onChange={(v) => onChange("header", v)} />
      <ColorField label="Cor da barra lateral" value={vars.sidebar} onChange={(v) => onChange("sidebar", v)} />
      <ColorField label="Cor do widget" value={vars.widget} onChange={(v) => onChange("widget", v)} />
    </div>
  );
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const normalized = normalizeHex(value);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 pl-1 pr-2">
        <label className="relative h-8 w-10 shrink-0 cursor-pointer overflow-hidden rounded" style={{ background: normalized }}>
          <input
            type="color"
            value={normalized}
            onChange={(e) => onChange(e.target.value + hexAlphaSuffix(value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent px-1 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Limpar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function normalizeHex(v: string): string {
  if (!v) return "#000000";
  const m = /^#([0-9a-fA-F]{6})/.exec(v);
  return m ? `#${m[1]}` : "#000000";
}

function hexAlphaSuffix(v: string): string {
  const m = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})$/.exec(v);
  return m ? m[1] : "";
}

function TextosForm() {
  const { data, loading, saving, save } = usePlatformSettings<TextosSettings>("textos");
  const [values, setValues] = useState<TextosSettings>(DEFAULT_TEXTOS);

  useEffect(() => {
    if (data) setValues({ ...DEFAULT_TEXTOS, ...data });
  }, [data]);

  function bind<K extends keyof TextosSettings>(key: K) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setValues((p) => ({ ...p, [key]: e.target.value })),
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save(values);
      applyTextos(values);
      await logAudit("config_update", { section: "textos" });
      toast.success("Textos salvos e aplicados.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">Alterar textos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esses textos são utilizados para SEO, OpenGraph e etc
        </p>
      </div>

      <TextField
        label="Título do site"
        required
        hint="O título do site é o nome que aparece na aba do navegador."
        {...bind("site_title")}
      />
      <TextField
        label="Subtítulo do site"
        required
        hint="É o nome que aparece depois do título do site, na aba do navegador, quando o usuário está na página inicial."
        {...bind("site_subtitle")}
      />
      <TextField
        label="Descrição do site"
        required
        hint="É a descrição que aparece quando o site é compartilhado em redes sociais ou quando o usuário pesquisa o site no Google."
        {...bind("site_description")}
      />
      <TextField
        label="Mensagem de boas-vindas na página de login"
        hint="É a mensagem que aparece na página de login do site."
        {...bind("welcome_login")}
      />
      <TextField
        label="Mensagem de boas-vindas na página de registro"
        hint="É a mensagem que aparece na página de registro do site."
        {...bind("welcome_register")}
      />

      <Button
        type="submit"
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>
    </form>
  );
}

function TextField({
  label,
  required,
  hint,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="rounded-md border border-border bg-background/50 px-3 py-2">
        <label className="block text-xs font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        <input
          value={value}
          onChange={onChange}
          className="mt-1 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type FinanceiroSettings = {
  invoice_prefix: string;
  visa_descriptor: string;
  min_offer_value: number;
  max_offer_value: number;
  min_withdraw: number;
  min_withdraw_crypto: number;
  max_withdraw: number;
  max_daily_withdraw: number;
  allow_random_pix: boolean;
  withdraw_by_payment_method: boolean;
  auto_withdraw_all: boolean;
  auto_withdraw_crypto_all: boolean;
};

const DEFAULT_FINANCEIRO: FinanceiroSettings = {
  invoice_prefix: "",
  visa_descriptor: "",
  min_offer_value: 5,
  max_offer_value: 100000,
  min_withdraw: 10,
  min_withdraw_crypto: 0,
  max_withdraw: 0,
  max_daily_withdraw: 0,
  allow_random_pix: false,
  withdraw_by_payment_method: false,
  auto_withdraw_all: true,
  auto_withdraw_crypto_all: false,
};

const PRICE_LIMITS_DEFAULT = { min_offer_value: 5, max_offer_value: 100000 };
const WITHDRAW_LIMITS_DEFAULT = {
  min_withdraw: 10,
  min_withdraw_crypto: 0,
  max_withdraw: 0,
  max_daily_withdraw: 0,
};

function FinanceiroForm() {
  const { data, loading, saving, save } = usePlatformSettings<FinanceiroSettings>("financeiro");
  const [values, setValues] = useState<FinanceiroSettings>(DEFAULT_FINANCEIRO);

  useEffect(() => {
    if (data) setValues({ ...DEFAULT_FINANCEIRO, ...data });
  }, [data]);

  function setField<K extends keyof FinanceiroSettings>(key: K, v: FinanceiroSettings[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  async function handleSave() {
    if (values.invoice_prefix && (values.invoice_prefix.length < 5 || values.invoice_prefix.length > 9)) {
      toast.error("O prefixo da fatura deve ter entre 5 e 9 caracteres.");
      return;
    }
    try {
      await save(values);
      await logAudit("config_update", { section: "financeiro" });
      toast.success("Configurações financeiras salvas e aplicadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <div className="space-y-8 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">Configurações Financeiras</h2>

      {/* Prefixo da fatura */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Prefixo da fatura</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <BoxedField
            label="O prefixo que aparecerá na fatura do cliente"
            hint="Insira o prefixo que aparecerá na fatura do cliente (o prefixo deve ter entre 5 e 9 caracteres). Essa configuração não poderá ser alterada."
            value={values.invoice_prefix}
            onChange={(v) => setField("invoice_prefix", v.toUpperCase())}
          />
          <BoxedField
            label="Descriptor de alertas visa"
            hint="Descriptor de identificação para alertas antichargeback de vendas visa"
            value={values.visa_descriptor}
            onChange={(v) => setField("visa_descriptor", v)}
          />
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Limites de preço */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Configurações de limites de preço</h3>
          <button
            type="button"
            onClick={() =>
              setValues((p) => ({ ...p, ...PRICE_LIMITS_DEFAULT }))
            }
            className="rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            Restaurar limites de preço
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <BoxedField
            label="Valor mínimo da oferta"
            hint="Valor mínimo que os produtores podem definir sobre ofertas e vendas via API."
            type="number"
            value={String(values.min_offer_value)}
            onChange={(v) => setField("min_offer_value", Number(v) || 0)}
          />
          <BoxedField
            label="Valor máximo da oferta"
            hint="Valor máximo que os produtores podem definir sobre ofertas e vendas via API."
            type="number"
            value={String(values.max_offer_value)}
            onChange={(v) => setField("max_offer_value", Number(v) || 0)}
          />
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Configurações de saque */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Configurações de saque</h3>
          <button
            type="button"
            onClick={() =>
              setValues((p) => ({ ...p, ...WITHDRAW_LIMITS_DEFAULT }))
            }
            className="rounded-md border border-border bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
          >
            Restaurar limites de saque
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <BoxedField
            label="Valor mínimo por saque"
            hint="Valor mínimo que o usuário pode sacar por vez."
            prefix="R$"
            type="number"
            value={String(values.min_withdraw)}
            onChange={(v) => setField("min_withdraw", Number(v) || 0)}
          />
          <BoxedField
            label="Valor mínimo por saque cripto"
            hint="Valor mínimo que o usuário pode sacar por vez em saques cripto."
            prefix="R$"
            type="number"
            value={String(values.min_withdraw_crypto)}
            onChange={(v) => setField("min_withdraw_crypto", Number(v) || 0)}
          />
          <BoxedField
            label="Valor máximo por saque"
            hint="Valor máximo que o usuário pode sacar por vez."
            prefix="R$"
            type="number"
            value={String(values.max_withdraw)}
            onChange={(v) => setField("max_withdraw", Number(v) || 0)}
          />
          <BoxedField
            label="Saque máximo diário"
            hint="Valor máximo que o usuário pode sacar diariamente."
            prefix="R$"
            type="number"
            value={String(values.max_daily_withdraw)}
            onChange={(v) => setField("max_daily_withdraw", Number(v) || 0)}
          />
        </div>

        <div className="space-y-3 pt-2">
          <ToggleRow
            label="Permitir saques para chave PIX aleatória"
            hint="Os produtores poderão realizar saques de seus saldos utilizando chaves PIX aleatórias (caso a adquirente aceite)"
            checked={values.allow_random_pix}
            onChange={(v) => setField("allow_random_pix", v)}
          />
          <ToggleRow
            label="Saque por método de pagamento"
            hint="(para mais informações, entre em contato com o suporte)"
            checked={values.withdraw_by_payment_method}
            onChange={(v) => setField("withdraw_by_payment_method", v)}
          />
          <ToggleRow
            label="Saque automático para todos os produtores"
            hint="Faz com que os saques dos produtores sejam aprovados automaticamente"
            checked={values.auto_withdraw_all}
            onChange={(v) => setField("auto_withdraw_all", v)}
          />
          <ToggleRow
            label="Saque automático (Cripto) para todos os produtores"
            hint="Faz com que os saques cripto dos produtores sejam aprovados automaticamente"
            checked={values.auto_withdraw_crypto_all}
            onChange={(v) => setField("auto_withdraw_crypto_all", v)}
          />
        </div>
      </section>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>
    </div>
  );
}

function BoxedField({
  label,
  hint,
  value,
  onChange,
  prefix,
  type,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="rounded-md border border-border bg-background/50 px-3 py-2">
        <label className="block text-xs font-medium text-muted-foreground">{label}</label>
        <div className="mt-1 flex items-center gap-1.5">
          {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
          <input
            type={type ?? "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

const KYC_FIELDS = [
  { id: "full_name", label: "Nome completo" },
  { id: "cpf", label: "CPF" },
  { id: "rg", label: "RG" },
  { id: "birth_date", label: "Data de nascimento" },
  { id: "phone", label: "Telefone" },
  { id: "address", label: "Endereço completo" },
  { id: "selfie", label: "Selfie com documento" },
  { id: "doc_front", label: "Documento (frente)" },
  { id: "doc_back", label: "Documento (verso)" },
  { id: "proof_residence", label: "Comprovante de residência" },
  { id: "cnpj", label: "CNPJ (PJ)" },
  { id: "social_contract", label: "Contrato social (PJ)" },
] as const;

type ComplianceSettings = {
  kyc_required_fields: string[];
  block_pending_kyc: boolean;
  auto_approve_crypto_wallets: boolean;
  optional_bank_account: boolean;
  hide_default_terms: boolean;
  custom_terms_links: { label: string; url: string }[];
};

const DEFAULT_COMPLIANCE: ComplianceSettings = {
  kyc_required_fields: [],
  block_pending_kyc: true,
  auto_approve_crypto_wallets: false,
  optional_bank_account: false,
  hide_default_terms: false,
  custom_terms_links: [],
};

function ComplianceForm() {
  const { data, loading, saving, save } = usePlatformSettings<ComplianceSettings>("compliance");
  const [values, setValues] = useState<ComplianceSettings>(DEFAULT_COMPLIANCE);
  const [openKyc, setOpenKyc] = useState(false);

  useEffect(() => {
    if (data)
      setValues({
        ...DEFAULT_COMPLIANCE,
        ...data,
        kyc_required_fields: data.kyc_required_fields ?? [],
        custom_terms_links: data.custom_terms_links ?? [],
      });
  }, [data]);

  function setField<K extends keyof ComplianceSettings>(key: K, v: ComplianceSettings[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }
  function toggleKyc(id: string) {
    setValues((p) => {
      const set = new Set(p.kyc_required_fields);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...p, kyc_required_fields: [...set] };
    });
  }
  function addLink() {
    setField("custom_terms_links", [...values.custom_terms_links, { label: "", url: "" }]);
  }
  function updateLink(i: number, patch: Partial<{ label: string; url: string }>) {
    setField(
      "custom_terms_links",
      values.custom_terms_links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );
  }
  function removeLink(i: number) {
    setField(
      "custom_terms_links",
      values.custom_terms_links.filter((_, idx) => idx !== i),
    );
  }

  async function handleSave() {
    try {
      await save(values);
      await logAudit("config_update", { section: "compliance" });
      toast.success("Configurações de compliance salvas e aplicadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  const selectedLabel =
    values.kyc_required_fields.length === 0
      ? "Solicitar informações do produtor"
      : `${values.kyc_required_fields.length} informação(ões) selecionada(s)`;

  return (
    <div className="space-y-8 rounded-2xl border border-border bg-card p-6">
      {/* KYC */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Configuraçoes de KYC</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenKyc((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-border bg-background/50 px-4 py-3 text-left text-sm text-primary hover:bg-background/70"
          >
            <span>{selectedLabel}</span>
            <span className="text-muted-foreground">▾</span>
          </button>
          {openKyc && (
            <div className="absolute z-10 mt-2 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover p-2 shadow-lg">
              {KYC_FIELDS.map((f) => {
                const checked = values.kyc_required_fields.includes(f.id);
                return (
                  <label
                    key={f.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleKyc(f.id)}
                      className="h-4 w-4 accent-[color:var(--primary)]"
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Por padrão, o produtor não precisa preencher essas informações (nós auto preenchemos).
          Mas caso você queira por questões de compliance interno, selecione as opções que você
          deseja que o produtor preencha.
        </p>

        <div className="space-y-3 pt-2">
          <ToggleRow
            label="Bloquear todas as ações para produtores com KYC pendente"
            checked={values.block_pending_kyc}
            onChange={(v) => setField("block_pending_kyc", v)}
          />
          <ToggleRow
            label="Aprovar automaticamente carteiras cripto"
            hint="Quando ativado, carteiras cripto serão aprovadas automaticamente sem necessidade de revisão manual"
            checked={values.auto_approve_crypto_wallets}
            onChange={(v) => setField("auto_approve_crypto_wallets", v)}
          />
          <ToggleRow
            label="Permitir conta bancária opcional no KYC"
            hint="Remove a obrigatoriedade da conta bancária apenas do fluxo de KYC no painel do produtor"
            checked={values.optional_bank_account}
            onChange={(v) => setField("optional_bank_account", v)}
          />
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Termos de uso */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Termos de uso</h2>
        <ToggleRow
          label="Ocultar termos padrões"
          hint="para usar apenas os termos personalizados"
          checked={values.hide_default_terms}
          onChange={(v) => setField("hide_default_terms", v)}
        />

        <div className="space-y-2">
          {values.custom_terms_links.map((link, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 rounded-md border border-border bg-background/50 p-2">
              <input
                placeholder="Rótulo"
                value={link.label}
                onChange={(e) => updateLink(i, { label: e.target.value })}
                className="rounded bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <input
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                className="rounded bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="rounded px-2 text-muted-foreground hover:text-foreground"
                aria-label="Remover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="w-full rounded-md border border-border bg-background/40 px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Adicionar link
          </button>
        </div>
      </section>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>
    </div>
  );
}

type FingerprintsSettings = {
  threatmetrix_enabled: boolean;
  threatmetrix_org_id: string;
  threatmetrix_merchant_id: string;
};

const DEFAULT_FINGERPRINTS: FingerprintsSettings = {
  threatmetrix_enabled: true,
  threatmetrix_org_id: "",
  threatmetrix_merchant_id: "",
};

function FingerprintsForm() {
  const { data, loading, saving, save } = usePlatformSettings<FingerprintsSettings>("fingerprints");
  const [values, setValues] = useState<FingerprintsSettings>(DEFAULT_FINGERPRINTS);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (data) setValues({ ...DEFAULT_FINGERPRINTS, ...data });
  }, [data]);

  function setField<K extends keyof FingerprintsSettings>(key: K, v: FingerprintsSettings[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  async function handleSave() {
    try {
      await save(values);
      await logAudit("config_update", { section: "fingerprints" });
      toast.success("Configurações de fingerprints salvas e aplicadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">Configurações de Fingerprints</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure as integrações de fingerprint de dispositivo para prevenção de fraudes no
          checkout.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background/40">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold text-primary">ThreatMetrix</p>
            <p className="text-xs text-primary/80">
              Fingerprint de dispositivo para prevenção de fraudes
            </p>
          </div>
          <span className="mt-1 text-muted-foreground">{open ? "▴" : "▾"}</span>
        </button>

        {open && (
          <div className="space-y-4 border-t border-border px-5 py-5">
            <BoxedField
              label="Org ID *"
              hint="Identificador da organização no ThreatMetrix"
              value={values.threatmetrix_org_id}
              onChange={(v) => setField("threatmetrix_org_id", v)}
            />
            <BoxedField
              label="Provider Merchant ID *"
              hint="Identificador do merchant no provedor"
              value={values.threatmetrix_merchant_id}
              onChange={(v) => setField("threatmetrix_merchant_id", v)}
            />
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>
    </div>
  );
}

type Banner = {
  id: string;
  image_path: string;
  external_link: string;
};

type BannersSettings = { banners: Banner[] };

function BannersForm() {
  const { data, loading, saving, save } = usePlatformSettings<BannersSettings>("banners");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (data?.banners) setBanners(data.banners);
  }, [data]);

  async function persist(next: Banner[]) {
    setBanners(next);
    try {
      await save({ banners: next });
      await logAudit("config_update", { section: "banners" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 30MB).");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `banners/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("platform-assets")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const next = [
      ...banners,
      { id: crypto.randomUUID(), image_path: path, external_link: "" },
    ];
    setBanners(next);
    toast.success("Banner carregado. Clique em Salvar para aplicar.");
  }

  async function saveOne(id: string) {
    await persist(banners);
    toast.success("Banner salvo e aplicado.");
    void id;
  }

  async function deleteOne(id: string) {
    const target = banners.find((b) => b.id === id);
    if (target) {
      void supabase.storage.from("platform-assets").remove([target.image_path]);
    }
    const next = banners.filter((b) => b.id !== id);
    await persist(next);
    toast.success("Banner removido.");
  }

  function updateLink(id: string, url: string) {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, external_link: url } : b)));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">Banners</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Esses banners são apresentados no topo do painel do Produtor. O tamanho recomendado é de{" "}
          <span className="font-semibold text-foreground">1600x256 pixels</span>.
        </p>
        <p className="text-xs text-muted-foreground">
          Caso tenha mais de um banner, defina{" "}
          <span className="font-semibold text-foreground">todas elas com o mesmo tamanho</span> para
          não quebrar a formatação do painel.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {banners.map((b) => (
        <BannerCard
          key={b.id}
          banner={b}
          onChangeLink={(v) => updateLink(b.id, v)}
          onSave={() => saveOne(b.id)}
          onDelete={() => deleteOne(b.id)}
          saving={saving}
        />
      ))}

      {/* Upload new */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void uploadFile(f);
        }}
        onClick={() => uploadRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border bg-background/40 hover:bg-background/60"
        }`}
      >
        <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-foreground">
          <span className="font-semibold text-primary">Clique para enviar</span>{" "}
          <span className="text-muted-foreground">ou arraste até aqui</span>
        </p>
        <p className="text-xs text-primary/80">Apenas arquivos png, jpeg, jpg, webp e gif são aceitos</p>
        <p className="text-xs text-muted-foreground">O tamanho máximo é 30MB</p>
        {uploading && <p className="mt-2 text-xs text-muted-foreground">Enviando…</p>}
        <input
          ref={uploadRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Pending row for last unsaved banner (Link externo + Salvar) mirrors the mockup's empty state */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-2">
        <span className="text-xs text-primary">Link externo</span>
        <div className="flex-1" />
        <Button
          type="button"
          onClick={() => persist(banners)}
          disabled={saving || banners.length === 0}
          className="h-8 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

function BannerCard({
  banner,
  onChangeLink,
  onSave,
  onDelete,
  saving,
}: {
  banner: Banner;
  onChangeLink: (v: string) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function resolve() {
      const { data } = await supabase.storage
        .from("platform-assets")
        .createSignedUrl(banner.image_path, 60 * 60);
      if (alive) setPreview(data?.signedUrl ?? null);
    }
    void resolve();
    return () => {
      alive = false;
    };
  }, [banner.image_path]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-background/40">
        {preview ? (
          <img src={preview} alt="Banner" className="h-40 w-full object-cover" />
        ) : (
          <div className="h-40 w-full animate-pulse bg-muted" />
        )}
        <button
          type="button"
          onClick={onDelete}
          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
          aria-label="Remover"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 flex-col rounded-md border border-border bg-background/50 px-3 py-1.5">
          <span className="text-[10px] text-primary">Link externo</span>
          <input
            value={banner.external_link}
            onChange={(e) => onChangeLink(e.target.value)}
            placeholder="https://..."
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-auto bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          Salvar
        </Button>
        <Button
          type="button"
          onClick={onDelete}
          disabled={saving}
          variant="destructive"
          className="h-auto px-4 text-xs"
        >
          Deletar
        </Button>
      </div>
    </div>
  );
}

// ============================ Programa de indicação ============================
type IndicacaoSettings = {
  enabled: boolean;
  percentage: number;
  max_months: number;
  unlimited_time: boolean;
  subscriptions_enabled: boolean;
  subscription_max_cycles: number;
  subscription_unlimited: boolean;
};

const DEFAULT_INDICACAO: IndicacaoSettings = {
  enabled: true,
  percentage: 1,
  max_months: 12,
  unlimited_time: false,
  subscriptions_enabled: true,
  subscription_max_cycles: 3,
  subscription_unlimited: false,
};

function IndicacaoForm() {
  const { data, loading, saving, save } = usePlatformSettings<IndicacaoSettings>("indicacao");
  const [values, setValues] = useState<IndicacaoSettings>(DEFAULT_INDICACAO);

  useEffect(() => {
    if (data) setValues({ ...DEFAULT_INDICACAO, ...data });
  }, [data]);

  function setField<K extends keyof IndicacaoSettings>(key: K, v: IndicacaoSettings[K]) {
    setValues((p) => ({ ...p, [key]: v }));
  }

  async function handleSave() {
    if (values.percentage < 0 || values.percentage > 100) {
      toast.error("Porcentagem deve estar entre 0 e 100.");
      return;
    }
    if (!values.unlimited_time && (!Number.isFinite(values.max_months) || values.max_months < 1)) {
      toast.error("Informe uma quantidade de meses válida.");
      return;
    }
    if (
      values.subscriptions_enabled &&
      !values.subscription_unlimited &&
      (!Number.isFinite(values.subscription_max_cycles) || values.subscription_max_cycles < 1)
    ) {
      toast.error("Informe uma quantidade de ciclos válida.");
      return;
    }
    try {
      await save(values);
      await logAudit("config_update", { section: "indicacao" });
      toast.success("Programa de indicação salvo e aplicado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-6">
      <div>
        <h2 className="text-xl font-semibold">Programa de indicação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Com o programa de indicação seus produtores podem ganhar comissões indicando outros
          produtores. (Obs: As comissões são calculadas com base no valor das comissões da venda do
          produtor ou afiliado, e esses valores reduzem o lucro da sua empresa)
        </p>
      </div>

      <ToggleRow
        label="Ativar programa de indicações"
        checked={values.enabled}
        onChange={(v) => setField("enabled", v)}
      />

      <BoxedField
        label="Porcentagem paga"
        prefix="%"
        type="number"
        value={String(values.percentage)}
        onChange={(v) => setField("percentage", Number(v))}
      />

      <BoxedField
        label="Quantidade máxima de meses que irá gerar comissão de um novo cadastro"
        type="number"
        value={String(values.max_months)}
        onChange={(v) => setField("max_months", Number(v))}
      />

      <ToggleRow
        label="Gerar comissão por tempo indeterminado"
        checked={values.unlimited_time}
        onChange={(v) => setField("unlimited_time", v)}
      />

      <ToggleRow
        label="Ativar geração de comissões para assinaturas"
        checked={values.subscriptions_enabled}
        onChange={(v) => setField("subscriptions_enabled", v)}
      />

      <BoxedField
        label="Quantidade máxima de pagamentos de uma assinatura que irá gerar comissão"
        type="number"
        value={String(values.subscription_max_cycles)}
        onChange={(v) => setField("subscription_max_cycles", Number(v))}
      />

      <ToggleRow
        label="Gerar comissão para assinaturas sem limite de ciclos"
        checked={values.subscription_unlimited}
        onChange={(v) => setField("subscription_unlimited", v)}
      />

      <Button
        type="button"
        onClick={handleSave}
        disabled={loading || saving}
        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar"}
      </Button>

      <div>
        <Button
          type="button"
          variant="outline"
          className="h-10 px-4 text-sm"
          onClick={() => toast.info("Gerenciamento por produtor em breve.")}
        >
          Gerenciar por produtor
        </Button>
      </div>
    </div>
  );
}

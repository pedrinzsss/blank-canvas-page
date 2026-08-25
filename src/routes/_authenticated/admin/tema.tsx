import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin-shell";
import { ImagensPanel } from "@/components/imagens-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { applyCores, DEFAULT_CORES, type CoresSettings } from "@/lib/theme-applier";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin/tema")({
  component: TemaPage,
  head: () => ({
    meta: [
      { title: "Tema · Admin Paglink" },
      { name: "description", content: "Personalize cores e tema da plataforma Paglink." },
    ],
  }),
});

type Palette = { id: string; label: string; swatches: string[]; cores: CoresSettings };

const PRESETS: Palette[] = [
  {
    id: "paglink",
    label: "Paglink (padrão)",
    swatches: ["var(--primary)", "var(--primary)", "#000000", "#ffffff"],
    cores: DEFAULT_CORES,
  },
  {
    id: "midnight",
    label: "Midnight",
    swatches: ["#7c5cff", "#22d3ee", "#0b1020", "#f8fafc"],
    cores: {
      primary: "#7c5cff",
      secondary: "#22d3ee",
      primary_button_text: "#ffffff",
      dark: { background: "#0b1020", header: "#ffffff", sidebar: "#0b1020", widget: "#111735" },
      light: { background: "#f8fafc", header: "#0b1020", sidebar: "#ffffff", widget: "#ffffff" },
      default_theme: "dark",
    },
  },
  {
    id: "sunset",
    label: "Sunset",
    swatches: ["#fb7185", "#f59e0b", "#111111", "#fff7ed"],
    cores: {
      primary: "#fb7185",
      secondary: "#f59e0b",
      primary_button_text: "#ffffff",
      dark: { background: "#111111", header: "#ffffff", sidebar: "#111111", widget: "#1c1c1c" },
      light: { background: "#fff7ed", header: "#111111", sidebar: "#ffffff", widget: "#ffffff" },
      default_theme: "light",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    swatches: ["#0ea5e9", "#14b8a6", "#0b1220", "#f0f9ff"],
    cores: {
      primary: "#0ea5e9",
      secondary: "#14b8a6",
      primary_button_text: "#ffffff",
      dark: { background: "#0b1220", header: "#ffffff", sidebar: "#0b1220", widget: "#0f1a2e" },
      light: { background: "#f0f9ff", header: "#0b1220", sidebar: "#ffffff", widget: "#ffffff" },
      default_theme: "dark",
    },
  },
];

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

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
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const invalid = !HEX_RE.test(draft);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : "#000000"}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
          className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent"
          aria-label={`Selecionar ${label}`}
        />
        <Input
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            setDraft(v);
            if (HEX_RE.test(v)) onChange(v);
          }}
          onBlur={() => {
            if (!HEX_RE.test(draft)) setDraft(value);
          }}
          className={`font-mono ${invalid ? "border-destructive/60" : ""}`}
          placeholder="#000000"
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TemaPage() {
  const [tab, setTab] = useState<"cores" | "imagens">("cores");
  const [cores, setCores] = useState<CoresSettings>(DEFAULT_CORES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [livePreview, setLivePreview] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("data")
        .eq("section", "cores")
        .maybeSingle();
      const merged = { ...DEFAULT_CORES, ...((data?.data as Partial<CoresSettings>) ?? {}) };
      setCores(merged as CoresSettings);
      setLoading(false);
    })();
  }, []);

  // Real-time preview: apply as user tweaks
  useEffect(() => {
    if (loading || !livePreview) return;
    const id = setTimeout(() => applyCores(cores), 80);
    return () => clearTimeout(id);
  }, [cores, loading, livePreview]);

  function update<K extends keyof CoresSettings>(key: K, value: CoresSettings[K]) {
    setCores((prev) => ({ ...prev, [key]: value }));
  }

  function updateMode(mode: "light" | "dark", key: keyof CoresSettings["light"], value: string) {
    setCores((prev) => ({ ...prev, [mode]: { ...prev[mode], [key]: value } }));
  }

  function preview() {
    applyCores(cores);
    toast.success("Pré-visualização aplicada");
  }



  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ section: "cores", data: cores as never }, { onConflict: "section" });
      if (error) throw error;
      applyCores(cores);
      await logAudit("config_update", { section: "cores", cores });
      toast.success("Tema salvo com sucesso");

    } catch (err) {
      toast.error("Erro ao salvar tema", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(preset: Palette) {
    setCores(preset.cores);
    applyCores(preset.cores);
    toast.success(`Paleta "${preset.label}" aplicada`, {
      description: "Clique em Salvar tema para persistir.",
    });
  }

  async function resetToDefault() {
    if (!window.confirm("Restaurar o tema para o padrão original e salvar?")) return;
    setCores(DEFAULT_CORES);
    applyCores(DEFAULT_CORES);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert({ section: "cores", data: DEFAULT_CORES as never }, { onConflict: "section" });
      if (error) throw error;
      await logAudit("config_update", { section: "cores", reset: true });
      toast.success("Tema restaurado para o padrão");
    } catch (err) {
      toast.error("Erro ao restaurar", {
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }


  if (loading) {
    return (
      <AdminShell title="Tema" subtitle="Personalize as cores da plataforma">
        <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Tema" subtitle="Personalize cores e imagens da plataforma">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1 text-sm w-fit">
          {([
            { id: "cores", label: "Cores" },
            { id: "imagens", label: "Imagens" },
          ] as const).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "imagens" ? (
          <ImagensPanel />
        ) : (
        <>
        <section className="rounded-2xl border border-border bg-card p-5">

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Paletas prontas</h2>
            <span className="text-xs text-muted-foreground">Aplique e ajuste antes de salvar</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRESETS.map((preset) => {
              const isActive = preset.cores.primary.toLowerCase() === cores.primary.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`group flex flex-col gap-3 rounded-xl border p-3 text-left transition-all hover:border-primary/60 hover:bg-secondary/40 ${
                    isActive ? "border-primary/70 ring-1 ring-primary/40" : "border-border"
                  }`}
                >
                  <div className="flex h-10 overflow-hidden rounded-md">
                    {preset.swatches.map((c, i) => (
                      <span key={i} className="flex-1" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{preset.label}</span>
                    {isActive && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Ativa
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Marca</h2>
              <p className="text-xs text-muted-foreground">Cores principais aplicadas a botões, links e destaques.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={livePreview}
                onChange={(e) => setLivePreview(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Pré-visualização em tempo real
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ColorField
              label="Primária"
              hint="Botões, links e foco"
              value={cores.primary}
              onChange={(v) => update("primary", v)}
            />
            <ColorField
              label="Secundária (acento)"
              hint="Realces, badges e gradientes"
              value={cores.secondary}
              onChange={(v) => update("secondary", v)}
            />
            <ColorField
              label="Texto sobre primária"
              hint="Legibilidade em botões"
              value={cores.primary_button_text}
              onChange={(v) => update("primary_button_text", v)}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Tema escuro</h2>
          <p className="mb-4 text-xs text-muted-foreground">Superfícies e textos quando o modo escuro estiver ativo.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField label="Fundo" hint="Cor base da tela" value={cores.dark.background} onChange={(v) => updateMode("dark", "background", v)} />
            <ColorField label="Texto / Cabeçalho" hint="Títulos e conteúdo" value={cores.dark.header} onChange={(v) => updateMode("dark", "header", v)} />
            <ColorField label="Sidebar" value={cores.dark.sidebar} onChange={(v) => updateMode("dark", "sidebar", v)} />
            <ColorField label="Widget / Card" value={cores.dark.widget} onChange={(v) => updateMode("dark", "widget", v)} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 font-display text-lg font-semibold">Tema claro</h2>
          <p className="mb-4 text-xs text-muted-foreground">Superfícies e textos quando o modo claro estiver ativo.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ColorField label="Fundo" hint="Cor base da tela" value={cores.light.background} onChange={(v) => updateMode("light", "background", v)} />
            <ColorField label="Texto / Cabeçalho" hint="Títulos e conteúdo" value={cores.light.header} onChange={(v) => updateMode("light", "header", v)} />
            <ColorField label="Sidebar" value={cores.light.sidebar} onChange={(v) => updateMode("light", "sidebar", v)} />
            <ColorField label="Widget / Card" value={cores.light.widget} onChange={(v) => updateMode("light", "widget", v)} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Pré-visualização</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className="rounded-xl border border-border p-4"
              style={{ background: cores.dark.widget, color: cores.dark.header }}
            >
              <p className="text-xs opacity-70">Modo escuro</p>
              <p className="mt-1 font-display text-lg">Amostra de título</p>
              <button
                type="button"
                className="mt-3 rounded-md px-3 py-1.5 text-sm font-semibold"
                style={{ background: cores.primary, color: cores.primary_button_text }}
              >
                Botão primário
              </button>
              <span
                className="ml-2 rounded-full px-2 py-1 text-xs font-semibold"
                style={{ background: cores.secondary, color: cores.dark.background }}
              >
                Acento
              </span>
            </div>
            <div
              className="rounded-xl border border-border p-4"
              style={{ background: cores.light.widget, color: cores.light.header }}
            >
              <p className="text-xs opacity-70">Modo claro</p>
              <p className="mt-1 font-display text-lg">Amostra de título</p>
              <button
                type="button"
                className="mt-3 rounded-md px-3 py-1.5 text-sm font-semibold"
                style={{ background: cores.primary, color: cores.primary_button_text }}
              >
                Botão primário
              </button>
              <span
                className="ml-2 rounded-full px-2 py-1 text-xs font-semibold"
                style={{ background: cores.secondary, color: cores.light.background }}
              >
                Acento
              </span>
            </div>
          </div>
        </section>


        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold">Tema padrão</h2>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((m) => (
              <Button
                key={m}
                variant={cores.default_theme === m ? "default" : "outline"}
                onClick={() => update("default_theme", m)}
              >
                {m === "dark" ? "Escuro" : "Claro"}
              </Button>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => applyPreset(PRESETS[0])}>
            Aplicar paleta padrão
          </Button>
          <Button variant="outline" onClick={resetToDefault}>
            Resetar para original
          </Button>
          <Button variant="outline" onClick={preview}>Pré-visualizar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar tema"}</Button>
        </div>
        </>
        )}
      </div>
    </AdminShell>
  );
}

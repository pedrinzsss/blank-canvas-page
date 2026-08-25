import { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { usePlatformSettings } from "@/lib/use-platform-settings";
import {
  applyImagens,
  EMPTY_IMAGENS,
  type ImagensSettings,
} from "@/lib/images-applier";

function ImageSlot({
  label,
  hint,
  value,
  onChange,
  folder,
  variant,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (path: string | null) => void;
  folder: string;
  variant?: "dark" | "light";
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

  const bg =
    variant === "dark" ? "bg-[#0b0b0b]" : variant === "light" ? "bg-white" : "bg-background/40";

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
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

export function ImagensPanel() {
  const { data, loading, saving, save } = usePlatformSettings<ImagensSettings>("imagens");
  const [values, setValues] = useState<ImagensSettings>(EMPTY_IMAGENS);

  useEffect(() => {
    if (data) setValues({ ...EMPTY_IMAGENS, ...data });
  }, [data]);

  async function handleSave() {
    try {
      await save(values);
      await applyImagens(values);
      await logAudit("config_update", { section: "imagens" });
      toast.success("Imagens salvas e aplicadas em toda a plataforma.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Imagens da plataforma</h2>
        <p className="text-xs text-muted-foreground">
          Alterações são aplicadas em tempo real no painel admin, painel de usuário, favicon e tela
          de login — sem recarregar.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ImageSlot
          label="Favicon"
          hint="Ícone exibido na aba do navegador"
          value={values.icon_path}
          onChange={(p) => setValues((v) => ({ ...v, icon_path: p }))}
          folder="icon"
        />
        <ImageSlot
          label="Logo — tema escuro"
          hint="Aparece no header quando o modo escuro está ativo"
          value={values.logo_dark_path}
          onChange={(p) => setValues((v) => ({ ...v, logo_dark_path: p }))}
          folder="logo-dark"
          variant="dark"
        />
        <ImageSlot
          label="Logo — tema claro"
          hint="Aparece no header quando o modo claro está ativo"
          value={values.logo_light_path}
          onChange={(p) => setValues((v) => ({ ...v, logo_light_path: p }))}
          folder="logo-light"
          variant="light"
        />
        <ImageSlot
          label="Logo — tela de login"
          hint="Exibida na página de acesso"
          value={values.login_logo_path}
          onChange={(p) => setValues((v) => ({ ...v, login_logo_path: p }))}
          folder="logo-login"
          variant="light"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Salvando…" : loading ? "Carregando…" : "Salvar imagens"}
        </Button>
      </div>
    </section>
  );
}

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformSection =
  | "empresa"
  | "imagens"
  | "cores"
  | "textos"
  | "extras"
  | "financeiro"
  | "compliance"
  | "fingerprints"
  | "banners"
  | "indicacao"
  | "notificacoes"
  | "pwa"
  | "app"
  | "adquirentes_roteamento_deposito"
  | "adquirentes_roteamento_saque"
  | "adquirentes_conexoes"
  | "adquirentes_regras_custos"
  | "taxas";

export type EmpresaSettings = {
  cep: string;
  uf: string;
  cidade: string;
  bairro: string;
  rua: string;
  numero: string;
  email_suporte: string;
  link_suporte: string;
  link_comprador: string;
  cnpj: string;
  razao_social: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePlatformSettings<T = Record<string, any>>(section: PlatformSection) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: row, error } = await supabase
      .from("platform_settings")
      .select("data")
      .eq("section", section)
      .maybeSingle();
    if (!error && row) setData((row.data as T) ?? null);
    else if (!error) setData(null);
    setLoading(false);
  }, [section]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (next: T) => {
      setSaving(true);
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { section, data: next as never, updated_by: userRes.user?.id ?? null },
          { onConflict: "section" },
        );
      setSaving(false);
      if (error) throw new Error(error.message);
      setData(next);
    },
    [section],
  );

  return { data, loading, saving, save, reload: load };
}

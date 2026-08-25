import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TextosSettings = {
  site_title: string;
  site_subtitle: string;
  site_description: string;
  welcome_login: string;
  welcome_register: string;
};

export const DEFAULT_TEXTOS: TextosSettings = {
  site_title: "",
  site_subtitle: "",
  site_description: "",
  welcome_login: "",
  welcome_register: "",
};

function setMeta(selector: string, attr: string, name: string, content: string) {
  if (typeof document === "undefined" || !content) return;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function applyTextos(t: TextosSettings) {
  if (typeof document === "undefined") return;
  const fullTitle = [t.site_title, t.site_subtitle].filter(Boolean).join(" — ");
  if (fullTitle) document.title = fullTitle;
  if (t.site_description) {
    setMeta('meta[name="description"]', "name", "description", t.site_description);
    setMeta('meta[property="og:description"]', "property", "og:description", t.site_description);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", t.site_description);
  }
  if (t.site_title) {
    setMeta('meta[property="og:title"]', "property", "og:title", fullTitle || t.site_title);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle || t.site_title);
  }
  // Expose welcome messages as globals so login/register pages can pick them up
  (window as unknown as { __paglinkTextos?: TextosSettings }).__paglinkTextos = t;
  window.dispatchEvent(new CustomEvent("paglink:textos", { detail: t }));
}

export function TextosApplier() {
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("data")
          .eq("section", "textos")
          .maybeSingle();
        if (!alive) return;
        const t = { ...DEFAULT_TEXTOS, ...(data?.data as Partial<TextosSettings> | null) };
        applyTextos(t);
      } catch {
        /* ignore */
      }
    }
    void load();

    const channel = supabase
      .channel("platform_settings_textos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings", filter: "section=eq.textos" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { data?: Partial<TextosSettings> } | null;
          if (row?.data) applyTextos({ ...DEFAULT_TEXTOS, ...row.data });
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, []);
  return null;
}

export function useTextos(): TextosSettings {
  const initial =
    (typeof window !== "undefined" &&
      (window as unknown as { __paglinkTextos?: TextosSettings }).__paglinkTextos) ||
    DEFAULT_TEXTOS;
  const [state, setState] = useState<TextosSettings>(initial);
  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<TextosSettings>).detail;
      if (detail) setState(detail);
    }
    window.addEventListener("paglink:textos", onEvt);
    return () => window.removeEventListener("paglink:textos", onEvt);
  }, []);
  return state;
}

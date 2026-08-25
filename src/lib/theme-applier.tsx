import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CoresSettings = {
  primary: string;
  secondary: string;
  primary_button_text: string;
  dark: ThemeVars;
  light: ThemeVars;
  default_theme: "light" | "dark";
};

export type ThemeVars = {
  background: string;
  header: string;
  sidebar: string;
  widget: string;
};

export const DEFAULT_CORES: CoresSettings = {
  primary: "#ffffff",
  secondary: "#0503106e",
  primary_button_text: "#000000",

  dark: {
    background: "#000000",
    header: "#ffffff",
    sidebar: "#000000",
    widget: "#050505",
  },
  light: {
    background: "#f7f7f7",
    header: "#000000",
    sidebar: "#ffffff",
    widget: "#ffffff",
  },
  default_theme: "dark",
};

const THEME_PREF_KEY = "paglink_theme_pref";
const CORES_CACHE_KEY = "paglink_cores_cache";

export function applyCores(cores: CoresSettings, modeOverride?: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(CORES_CACHE_KEY, JSON.stringify(cores));
    }
  } catch {
    // ignore
  }
  const stored =
    (typeof localStorage !== "undefined" &&
      (localStorage.getItem(THEME_PREF_KEY) as "light" | "dark" | null)) ||
    null;
  const mode = modeOverride ?? stored ?? cores.default_theme;
  const vars = mode === "dark" ? cores.dark : cores.light;

  // Sistema monocromático: primária = branco no dark, preto no light
  const primary = mode === "dark" ? "#ffffff" : "#0a0a0a";
  const buttonText = mode === "dark" ? "#0a0a0a" : "#ffffff";

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", buttonText);
  root.style.setProperty("--primary-glow", primary);
  root.style.setProperty("--ring", primary);

  // Accent = superfície sutil neutra (não usar a cor da marca para não brigar com botões primários)
  const accentBg = mode === "dark" ? "#1f1f1f" : "#f1f1f1";
  const accentFg = mode === "dark" ? "#ffffff" : "#0a0a0a";
  root.style.setProperty("--accent", accentBg);
  root.style.setProperty("--accent-foreground", accentFg);
  // Secondary sempre neutro para pílulas/superfícies (a cor da marca fica só em primary)
  const secondaryBg = mode === "dark" ? "#1a1a1a" : "#f3f3f3";
  root.style.setProperty("--secondary", secondaryBg);


  root.style.setProperty("--background", vars.background);
  root.style.setProperty("--card", vars.widget);
  root.style.setProperty("--popover", vars.widget);
  root.style.setProperty("--sidebar-bg", vars.sidebar);
  root.style.setProperty("--header-bg", vars.header);

  if (mode === "dark") {
    root.classList.add("dark");
    root.style.setProperty("--foreground", "oklch(0.98 0 0)");
    root.style.setProperty("--card-foreground", "oklch(0.98 0 0)");
    root.style.setProperty("--popover-foreground", "oklch(0.98 0 0)");
    root.style.setProperty("--secondary-foreground", "oklch(0.98 0 0)");
    root.style.setProperty("--muted", "oklch(0.18 0.005 285)");
    root.style.setProperty("--muted-foreground", "oklch(0.68 0.01 285)");
    root.style.setProperty("--border", "oklch(1 0 0 / 8%)");
    root.style.setProperty("--input", "oklch(1 0 0 / 8%)");
  } else {
    root.classList.remove("dark");
    root.style.setProperty("--foreground", "oklch(0.18 0.01 285)");
    root.style.setProperty("--card-foreground", "oklch(0.18 0.01 285)");
    root.style.setProperty("--popover-foreground", "oklch(0.18 0.01 285)");
    root.style.setProperty("--secondary-foreground", "oklch(0.18 0.01 285)");
    root.style.setProperty("--muted", "oklch(0.96 0.003 285)");
    root.style.setProperty("--muted-foreground", "oklch(0.45 0.01 285)");
    root.style.setProperty("--border", "oklch(0 0 0 / 10%)");
    root.style.setProperty("--input", "oklch(0 0 0 / 10%)");
  }
}




export function ThemeApplier() {
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("data")
          .eq("section", "cores")
          .maybeSingle();
        if (!alive) return;
        const cores = { ...DEFAULT_CORES, ...(data?.data as Partial<CoresSettings> | null) };
        applyCores(cores as CoresSettings);
      } catch {
        applyCores(DEFAULT_CORES);
      }
    }
    void load();

    const channel = supabase
      .channel("platform_settings_cores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings", filter: "section=eq.cores" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { data?: Partial<CoresSettings> } | null;
          if (row?.data) applyCores({ ...DEFAULT_CORES, ...row.data } as CoresSettings);
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

export function setThemePreference(mode: "light" | "dark") {
  if (typeof localStorage !== "undefined") localStorage.setItem(THEME_PREF_KEY, mode);
}

export function getCurrentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export async function toggleTheme(): Promise<"light" | "dark"> {
  const next: "light" | "dark" = getCurrentTheme() === "dark" ? "light" : "dark";
  setThemePreference(next);
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("data")
      .eq("section", "cores")
      .maybeSingle();
    const cores = { ...DEFAULT_CORES, ...(data?.data as Partial<CoresSettings> | null) };
    applyCores(cores as CoresSettings, next);
  } catch {
    applyCores(DEFAULT_CORES, next);
  }
  return next;
}


import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ImagensSettings = {
  icon_path: string | null;
  logo_dark_path: string | null;
  logo_light_path: string | null;
  login_logo_path: string | null;
};

export type ResolvedImagens = {
  iconUrl: string | null;
  logoDarkUrl: string | null;
  logoLightUrl: string | null;
  loginLogoUrl: string | null;
};

export const EMPTY_IMAGENS: ImagensSettings = {
  icon_path: null,
  logo_dark_path: null,
  logo_light_path: null,
  login_logo_path: null,
};

const EMPTY_RESOLVED: ResolvedImagens = {
  iconUrl: null,
  logoDarkUrl: null,
  logoLightUrl: null,
  loginLogoUrl: null,
};

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("platform-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? null;
}

async function resolveAll(s: ImagensSettings): Promise<ResolvedImagens> {
  const [iconUrl, logoDarkUrl, logoLightUrl, loginLogoUrl] = await Promise.all([
    signedUrl(s.icon_path),
    signedUrl(s.logo_dark_path),
    signedUrl(s.logo_light_path),
    signedUrl(s.login_logo_path),
  ]);
  return { iconUrl, logoDarkUrl, logoLightUrl, loginLogoUrl };
}

function setFavicon(url: string | null) {
  if (typeof document === "undefined" || !url) return;
  document.head
    .querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]')
    .forEach((el) => el.parentNode?.removeChild(el));
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = url;
  document.head.appendChild(link);
}

const CACHE_KEY = "paglink:imagens:cache";

export async function applyImagens(s: ImagensSettings) {
  if (typeof window === "undefined") return;
  const resolved = await resolveAll(s);
  setFavicon(resolved.iconUrl);
  (window as unknown as { __paglinkImagens?: ResolvedImagens }).__paglinkImagens = resolved;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(resolved));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("paglink:imagens", { detail: resolved }));
}

function readCache(): ResolvedImagens {
  if (typeof window === "undefined") return EMPTY_RESOLVED;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return EMPTY_RESOLVED;
    return { ...EMPTY_RESOLVED, ...(JSON.parse(raw) as Partial<ResolvedImagens>) };
  } catch {
    return EMPTY_RESOLVED;
  }
}

/** Fetches settings + signed URLs. Safe on server (SSR) and client. */
export async function loadResolvedImagens(): Promise<ResolvedImagens> {
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("data")
      .eq("section", "imagens")
      .maybeSingle();
    const s = { ...EMPTY_IMAGENS, ...(data?.data as Partial<ImagensSettings> | null) };
    return await resolveAll(s);
  } catch {
    return EMPTY_RESOLVED;
  }
}

const ImagensContext = createContext<ResolvedImagens | null>(null);

/** Seeds images resolved on the server so the first paint already has the current logo. */
export function ImagensProvider({
  initial,
  children,
}: {
  initial: ResolvedImagens;
  children: ReactNode;
}) {
  const [state, setState] = useState<ResolvedImagens>(initial);

  if (typeof window !== "undefined") {
    (window as unknown as { __paglinkImagens?: ResolvedImagens }).__paglinkImagens = state;
  }

  useEffect(() => {
    setFavicon(state.iconUrl);
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<ResolvedImagens>).detail;
      if (detail) setState(detail);
    }
    window.addEventListener("paglink:imagens", onEvt);
    return () => window.removeEventListener("paglink:imagens", onEvt);
  }, []);

  return <ImagensContext.Provider value={state}>{children}</ImagensContext.Provider>;
}

export function ImagensApplier() {
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("data")
          .eq("section", "imagens")
          .maybeSingle();
        if (!alive) return;
        const s = { ...EMPTY_IMAGENS, ...(data?.data as Partial<ImagensSettings> | null) };
        applyImagens(s);
      } catch {
        /* ignore */
      }
    }
    if (!(window as unknown as { __paglinkImagens?: ResolvedImagens }).__paglinkImagens) {
      void load();
    }

    const channel = supabase
      .channel("platform_settings_imagens")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings", filter: "section=eq.imagens" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { data?: Partial<ImagensSettings> } | null;
          if (row?.data) applyImagens({ ...EMPTY_IMAGENS, ...row.data });
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

export function useImagens(): ResolvedImagens {
  const ctx = useContext(ImagensContext);
  const initial =
    ctx ??
    ((typeof window !== "undefined" &&
      (window as unknown as { __paglinkImagens?: ResolvedImagens }).__paglinkImagens) ||
    readCache());
  const [state, setState] = useState<ResolvedImagens>(initial);
  useEffect(() => {
    if (ctx) setState(ctx);
  }, [ctx]);
  useEffect(() => {
    function onEvt(e: Event) {
      const detail = (e as CustomEvent<ResolvedImagens>).detail;
      if (detail) setState(detail);
    }
    window.addEventListener("paglink:imagens", onEvt);
    return () => window.removeEventListener("paglink:imagens", onEvt);
  }, []);
  return state;
}

/** Returns the appropriate logo URL for the current theme, or null. */
export function useLogoUrl(): string | null {
  const { logoDarkUrl, logoLightUrl } = useImagens();
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : true,
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark ? logoDarkUrl ?? logoLightUrl : logoLightUrl ?? logoDarkUrl;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ThemeApplier } from "@/lib/theme-applier";
import { TextosApplier } from "@/lib/textos-applier";
import {
  ImagensApplier,
  ImagensProvider,
  loadResolvedImagens,
  type ResolvedImagens,
} from "@/lib/images-applier";
import { RouteLoadingOverlay } from "@/components/route-loading-overlay";

const PRIMARY_APP_ORIGIN = "https://paglinkapp.com.br";

function shouldUsePrimaryDomain(hostname: string) {
  return hostname.endsWith(".lovableproject.com") || hostname === "chic-auth-palette.lovable.app";
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async (): Promise<{ imagens: ResolvedImagens }> => ({
    imagens: await loadResolvedImagens(),
  }),
  staleTime: 60_000,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Paglink - Link De Pagamento" },
      { name: "description", content: "A Paglink é uma plataforma completa de pagamentos criada para empresas, empreendedores e negócios digitais que buscam mais praticidade, tecnologia e controle so" },
      { property: "og:title", content: "Paglink - Link De Pagamento" },
      { property: "og:description", content: "A Paglink é uma plataforma completa de pagamentos criada para empresas, empreendedores e negócios digitais que buscam mais praticidade, tecnologia e controle so" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Paglink - Link De Pagamento" },
      { name: "twitter:description", content: "A Paglink é uma plataforma completa de pagamentos criada para empresas, empreendedores e negócios digitais que buscam mais praticidade, tecnologia e controle so" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/70Zh7hHxCIRf463krwDnnOXh5r02/social-images/social-1784600641738-2.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/70Zh7hHxCIRf463krwDnnOXh5r02/social-images/social-1784600641738-2.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_BOOT_SCRIPT = `
(function(){try{
  var raw = localStorage.getItem('paglink_cores_cache');
  var mode = localStorage.getItem('paglink_theme_pref');
  if(!raw) return;
  var c = JSON.parse(raw);
  var m = mode || c.default_theme || 'dark';
  var vars = m === 'dark' ? c.dark : c.light;
  var r = document.documentElement;
  var primary = m === 'dark' ? '#ffffff' : '#0a0a0a';
  var btn = m === 'dark' ? '#0a0a0a' : '#ffffff';
  r.style.setProperty('--primary', primary);
  r.style.setProperty('--primary-foreground', btn);
  r.style.setProperty('--primary-glow', primary);
  r.style.setProperty('--ring', primary);
  r.style.setProperty('--accent', m === 'dark' ? '#1f1f1f' : '#f1f1f1');
  r.style.setProperty('--accent-foreground', m === 'dark' ? '#ffffff' : '#0a0a0a');
  r.style.setProperty('--secondary', m === 'dark' ? '#1a1a1a' : '#f3f3f3');
  if(vars){
    r.style.setProperty('--background', vars.background);
    r.style.setProperty('--card', vars.widget);
    r.style.setProperty('--popover', vars.widget);
    r.style.setProperty('--sidebar-bg', vars.sidebar);
    r.style.setProperty('--header-bg', vars.header);
  }
  if(m === 'dark'){
    r.classList.add('dark');
    r.style.setProperty('--foreground','oklch(0.98 0 0)');
    r.style.setProperty('--card-foreground','oklch(0.98 0 0)');
    r.style.setProperty('--popover-foreground','oklch(0.98 0 0)');
    r.style.setProperty('--secondary-foreground','oklch(0.98 0 0)');
    r.style.setProperty('--muted','oklch(0.18 0.005 285)');
    r.style.setProperty('--muted-foreground','oklch(0.68 0.01 285)');
    r.style.setProperty('--border','oklch(1 0 0 / 8%)');
    r.style.setProperty('--input','oklch(1 0 0 / 8%)');
  } else {
    r.classList.remove('dark');
    r.style.setProperty('--foreground','oklch(0.18 0.01 285)');
    r.style.setProperty('--card-foreground','oklch(0.18 0.01 285)');
    r.style.setProperty('--popover-foreground','oklch(0.18 0.01 285)');
    r.style.setProperty('--secondary-foreground','oklch(0.18 0.01 285)');
    r.style.setProperty('--muted','oklch(0.96 0.003 285)');
    r.style.setProperty('--muted-foreground','oklch(0.45 0.01 285)');
    r.style.setProperty('--border','oklch(0 0 0 / 10%)');
    r.style.setProperty('--input','oklch(0 0 0 / 10%)');
  }
}catch(e){}})();
`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body data-remix-msg="Na tela de usuario em antecipacoes deve exibir todas as vendas de cartao e boleto, exibindo o cliente, valor, metodo de pagamento se é boleto ou cartao, valor da venda e o que pode ser antecipado do valor">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { imagens } = Route.useLoaderData();
  const router = useRouter();

  useEffect(() => {
    if (!shouldUsePrimaryDomain(window.location.hostname)) return;

    window.location.replace(
      `${PRIMARY_APP_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }, []);

  useEffect(() => {
    let lastPath = "";
    const unsub = router.subscribe("onResolved", ({ toLocation }) => {
      const path = toLocation.pathname;
      if (path === lastPath) return;
      lastPath = path;
      // Avoid logging the public login screen and public checkout pages
      if (path === "/" || path.startsWith("/checkout/") || path.startsWith("/reset-password")) return;
      void (async () => {
        try {
          const { logAudit } = await import("@/lib/audit");
          await logAudit("page_view", { path });
        } catch {
          /* ignore */
        }
      })();
    });
    return () => unsub();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      <TextosApplier />
      <ImagensProvider initial={imagens}>
        <ImagensApplier />
        <RouteLoadingOverlay />
        <Outlet />
      </ImagensProvider>
    </QueryClientProvider>
  );
}

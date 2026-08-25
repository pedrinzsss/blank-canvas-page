import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, BookOpen, Zap, Webhook, Code2, ChevronRight, ChevronLeft, LogIn, UserPlus } from "lucide-react";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { docGroups, flattenSections, type DocSection, type Endpoint } from "@/lib/docs/data";
import logo from "@/assets/logo.png.asset.json";
import { useLogoUrl } from "@/lib/images-applier";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentação da API — Paglink" },
      { name: "description", content: "Documentação técnica completa da API Paglink: pagamentos, webhooks, split, saques e mais." },
      { property: "og:title", content: "Documentação da API — Paglink" },
      { property: "og:description", content: "Construa sua integração com a Paglink." },
    ],
  }),
  component: DocsPage,
});

const methodColors: Record<string, string> = {
  GET: "bg-foreground/10 text-foreground border-border",
  POST: "bg-primary/20 text-primary border-primary/40",
  PUT: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  DELETE: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  PATCH: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
};

function DocsPage() {
  const [activeId, setActiveId] = useState("welcome");
  const [env, setEnv] = useState<"sandbox" | "producao">("sandbox");
  const [query, setQuery] = useState("");
  const dynamicLogo = useLogoUrl();


  const flat = useMemo(() => flattenSections(), []);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return flat
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.content?.toLowerCase().includes(q) ||
          s.intro?.toLowerCase().includes(q) ||
          s.endpoint?.path.toLowerCase().includes(q) ||
          s.group.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, flat]);

  const currentIndex = flat.findIndex((s) => s.id === activeId);
  const prev = currentIndex > 0 ? flat[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : null;
  const currentGroup = flat[currentIndex]?.group ?? "Introdução";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={dynamicLogo ?? logo.url} alt="Paglink" className="h-7 w-auto" />
            <span className="hidden text-sm font-semibold text-white/70 md:inline">API Docs</span>
          </Link>

          <div className="relative ml-auto max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar endpoints, eventos, erros..."
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {results.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-2xl">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setActiveId(r.id);
                      setQuery("");
                    }}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-white/5 px-4 py-2.5 text-left transition hover:bg-white/5"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-primary">{r.group}</span>
                    <span className="text-sm text-white">{r.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 md:flex">
            {(["sandbox", "producao"] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEnv(e)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  env === e ? "bg-primary text-primary-foreground" : "text-white/60 hover:text-white"
                }`}
              >
                {e === "sandbox" ? "Sandbox" : "Produção"}
              </button>
            ))}
          </div>

          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition hover:text-white md:inline-flex"
          >
            <LogIn className="h-3.5 w-3.5" /> Entrar
          </Link>
          <Link
            to="/"
            className="hidden items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 md:inline-flex"
          >
            <UserPlus className="h-3.5 w-3.5" /> Criar conta
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-8 px-4 py-8 md:px-6">
        {/* Sidebar */}
        <aside className="sticky top-24 hidden h-[calc(100vh-7rem)] w-64 shrink-0 overflow-y-auto pr-4 lg:block">
          <button
            onClick={() => setActiveId("welcome")}
            className={`mb-4 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeId === "welcome" ? "bg-primary text-primary-foreground [&_svg]:text-primary-foreground" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4" /> Início
          </button>

          {docGroups.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={`flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm transition ${
                      activeId === s.id
                        ? "bg-primary text-primary-foreground"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {activeId === "welcome" ? (
            <WelcomePage onNavigate={setActiveId} />
          ) : (
            <SectionView section={flat[currentIndex]} env={env} group={currentGroup} />
          )}

          {activeId !== "welcome" && (
            <div className="mt-12 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
              {prev ? (
                <button
                  onClick={() => setActiveId(prev.id)}
                  className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-primary hover:bg-white/10"
                >
                  <ChevronLeft className="h-4 w-4 text-white/50" />
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Anterior</div>
                    <div className="text-sm font-medium text-white">{prev.title}</div>
                  </div>
                </button>
              ) : (
                <div />
              )}
              {next ? (
                <button
                  onClick={() => setActiveId(next.id)}
                  className="group ml-auto flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-right transition hover:border-primary hover:bg-white/10"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-white/40">Próximo</div>
                    <div className="text-sm font-medium text-white">{next.title}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/50" />
                </button>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function WelcomePage({ onNavigate }: { onNavigate: (id: string) => void }) {
  const cards = [
    { id: "primeiros-passos", icon: Zap, title: "Comece agora", desc: "Aprenda a realizar sua primeira integração." },
    { id: "criar-cobranca", icon: Code2, title: "Pagamentos", desc: "Crie cobranças utilizando PIX, cartão e boleto." },
    { id: "webhooks-intro", icon: Webhook, title: "Webhooks", desc: "Receba atualizações em tempo real sobre suas transações." },
    { id: "criar-cobranca", icon: BookOpen, title: "API Reference", desc: "Consulte todos os endpoints disponíveis." },
  ];
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/30 via-primary/10 to-black p-8 md:p-12">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
            API v1 · REST
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Construa sua integração com a{" "}
            <span className="text-primary">Paglink</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/70 md:text-lg">
            Uma API completa para receber pagamentos, criar cobranças, gerenciar transações e conectar sua aplicação
            à infraestrutura de pagamentos da Paglink.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.title}
            onClick={() => onNavigate(c.id)}
            className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-6 text-left transition hover:border-primary hover:bg-white/[0.04]"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <c.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="text-base font-semibold text-white">{c.title}</h3>
            <p className="mt-1 text-sm text-white/60">{c.desc}</p>
            <ChevronRight className="absolute right-5 top-6 h-4 w-4 text-white/30 transition group-hover:translate-x-1 group-hover:text-primary" />
          </button>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-white">Crie seu primeiro pagamento</h2>
        <ol className="mt-4 space-y-3">
          {[
            "Obtenha sua API Key no painel Paglink.",
            "Crie uma cobrança via POST /v1/charges.",
            "Receba o status da transação na resposta.",
            "Configure Webhooks para atualizações em tempo real.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <p className="text-sm text-white/80">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function SectionView({ section, env, group }: { section: DocSection; env: "sandbox" | "producao"; group: string }) {
  if (!section) return null;
  return (
    <article>
      <div className="mb-2 flex items-center gap-2 text-xs text-white/50">
        <span>{group}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white/80">{section.title}</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-white">{section.title}</h1>
      {section.intro && <p className="mt-3 text-lg text-white/70">{section.intro}</p>}
      {section.content && (
        <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-white/75">{section.content}</div>
      )}

      {section.endpoint && <EndpointView endpoint={section.endpoint} env={env} />}

      {section.table && (
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                {section.table.headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, i) => (
                <tr key={i} className="border-t border-white/5">
                  {row.map((c, j) => (
                    <td key={j} className="px-4 py-2.5 text-white/80">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {section.extraCode?.map((c, i) => (
        <div key={i} className="mt-4">
          <CodeBlock code={c.code} lang={c.label} />
        </div>
      ))}
    </article>
  );
}

function EndpointView({ endpoint, env }: { endpoint: Endpoint; env: "sandbox" | "producao" }) {
  const [tab, setTab] = useState(0);
  const [testResp, setTestResp] = useState<string | null>(null);
  const samples = endpoint.samples ?? [];
  const baseUrl = env === "sandbox" ? "https://api.sandbox.paglink.com.br" : "https://api.paglink.com.br";

  function handleTest() {
    setTestResp(
      JSON.stringify(
        {
          simulated: true,
          request: { method: endpoint.method, url: `${baseUrl}${endpoint.path}` },
          response: endpoint.response ? JSON.parse(endpoint.response) : { ok: true },
        },
        null,
        2,
      ),
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <span className={`rounded-md border px-2.5 py-1 font-mono text-xs font-bold ${methodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="font-mono text-sm text-white">{endpoint.path}</code>
        <button
          onClick={handleTest}
          className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Testar requisição
        </button>
      </div>

      {endpoint.description && <p className="text-sm text-white/70">{endpoint.description}</p>}

      {endpoint.headers && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white">Headers</h3>
          <CodeBlock
            lang="http"
            code={Object.entries(endpoint.headers)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")}
          />
        </div>
      )}

      {endpoint.body && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white">Body</h3>
          <CodeBlock lang="json" code={endpoint.body} />
        </div>
      )}

      {endpoint.response && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white">Resposta</h3>
          <CodeBlock lang="json" code={endpoint.response} />
        </div>
      )}

      {samples.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white">Exemplos de código</h3>
          <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {samples.map((s, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  tab === i ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <CodeBlock lang={samples[tab].label} code={samples[tab].code} />
        </div>
      )}

      {testResp && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white">
            Response · <span className="text-foreground">200 OK</span>
          </h3>
          <CodeBlock lang="json" code={testResp} />
        </div>
      )}
    </div>
  );
}

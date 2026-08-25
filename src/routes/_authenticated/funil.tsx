import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronLeft,
  Clipboard,
  Code2,
  FileText,
  GitBranch,
  Grid3x3,
  Headphones,
  Image as ImageIcon,
  LayoutGrid,
  List,
  ListChecks,
  MessageSquare,
  MonitorSmartphone,
  MousePointerClick,
  Play,
  PlayCircle,
  Plus,
  Redo2,
  Rocket,
  Settings2,
  Share2,
  SlidersHorizontal,
  Space,
  Sparkles,
  Tag,
  Type,
  Undo2,
  Users,
  Video,
  X,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  titulo: z.string().optional(),
  id: z.string().optional(),
});


export const Route = createFileRoute("/_authenticated/funil")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Editor de Funil" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FunilBuilderPage,
});

type Tab = "construtor" | "fluxo" | "design" | "leads" | "configuracoes";

const topTabs: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "construtor", label: "Construtor", icon: LayoutGrid },
  { id: "fluxo", label: "Fluxo", icon: GitBranch },
  { id: "design", label: "Design", icon: Sparkles },
  { id: "leads", label: "Leads", icon: Users },
  { id: "configuracoes", label: "Configurações", icon: Settings2 },
];

const paletteItems: { label: string; icon: ComponentType<{ className?: string }>; badge?: string }[] = [
  { label: "Alerta", icon: AlertTriangle },
  { label: "Argumentos", icon: MessageSquare },
  { label: "Audio", icon: Headphones },
  { label: "Botão", icon: MousePointerClick },
  { label: "Carregando", icon: PlayCircle },
  { label: "Carrosel", icon: LayoutGrid },
  { label: "Cartesiano", icon: BarChart3 },
  { label: "Comparar", icon: Grid3x3, badge: "Novo" },
  { label: "Confetti", icon: Sparkles, badge: "Novo" },
  { label: "Depoimentos", icon: MessageSquare },
  { label: "Entrada", icon: FileText },
  { label: "Espaçador", icon: Space },
  { label: "FAQ", icon: ListChecks, badge: "Novo" },
  { label: "Gráficos", icon: BarChart3 },
  { label: "Imagem", icon: ImageIcon },
  { label: "Lista", icon: List, badge: "Novo" },
  { label: "Marquise", icon: Share2, badge: "Novo" },
  { label: "Nível", icon: SlidersHorizontal },
  { label: "Opções", icon: ListChecks },
  { label: "Preço", icon: Tag },
  { label: "Script", icon: Code2 },
  { label: "Termos", icon: FileText },
  { label: "Texto", icon: Type },
  { label: "Título", icon: Type },
  { label: "Video", icon: Video },
];

function FunilBuilderPage() {
  const { titulo } = Route.useSearch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("construtor");
  const [stepName, setStepName] = useState(titulo || "Etapa 1");
  const [showLogo, setShowLogo] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [allowBack, setAllowBack] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/quizly" })}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Desfazer">
            <Undo2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Refazer">
            <Redo2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Copiar">
            <Clipboard className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex items-center gap-1 rounded-full bg-muted/40 p-1">
          {topTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Preview responsivo">
            <MonitorSmartphone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notificações">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Prévia">
            <Play className="h-5 w-5" />
          </Button>
          <Button variant="secondary">Salvar</Button>
          <Button>
            <Rocket className="mr-2 h-4 w-4" />
            Publicar
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: steps + palette */}
        <aside className="flex w-[320px] shrink-0 border-r border-border bg-card">
          <div className="flex w-40 shrink-0 flex-col border-r border-border p-3">
            <div className="flex items-center justify-between rounded-md bg-primary/10 px-2 py-2 text-sm font-medium">
              <span className="truncate">{stepName}</span>
              <button className="text-muted-foreground hover:text-foreground" aria-label="Opções">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
            <button className="mt-3 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-primary hover:bg-primary/10">
              <Plus className="h-4 w-4" />
              Adicionar Etapa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-2">
              {paletteItems.map((it) => {
                const Icon = it.icon;
                return (
                  <li key={it.label}>
                    <button className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:border-primary/50 hover:bg-primary/5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-left">{it.label}</span>
                      {it.badge && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                          {it.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex flex-1 flex-col items-center overflow-y-auto bg-muted/20 p-8">
          <div className="mb-4 self-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/quizly" })}
              aria-label="Voltar"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="w-full max-w-xl">
            <div className="flex items-center justify-center pb-4">
              <div className="grid h-10 w-14 place-items-center rounded-md border border-border bg-background text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="h-1 w-full rounded-full bg-border" />

            <div className="mt-8 rounded-xl border-2 border-dashed border-border bg-background/50 p-10 text-center">
              <p className="text-lg font-semibold">
                Nada por aqui <span aria-hidden>🙂</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione um componente para começar.
              </p>
            </div>
          </div>
        </main>

        {/* Right: settings */}
        <aside className="w-[300px] shrink-0 space-y-4 overflow-y-auto border-l border-border bg-card p-4">
          <section className="rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">Título da Etapa</h3>
            <div className="space-y-2">
              <Label htmlFor="nome-etapa" className="text-xs text-muted-foreground">
                Nome da Etapa
              </Label>
              <Input
                id="nome-etapa"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
              />
            </div>
          </section>

          <section className="rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">Header</h3>
            <div className="space-y-3">
              <ToggleRow label="Mostrar Logo" checked={showLogo} onChange={setShowLogo} />
              <ToggleRow label="Mostrar Progresso" checked={showProgress} onChange={setShowProgress} />
              <ToggleRow label="Permitir Voltar" checked={allowBack} onChange={setAllowBack} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// Keep unused import references tree-shakeable

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, ChevronLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cobranca-recorrente")({
  head: () => ({
    meta: [
      { title: "Cobrança recorrente — Paglink" },
      {
        name: "description",
        content:
          "Configure a recorrência, o vencimento e a quantidade de cobranças da sua assinatura na Paglink.",
      },
      { property: "og:title", content: "Cobrança recorrente — Paglink" },
      {
        property: "og:description",
        content:
          "Configure a recorrência, o vencimento e a quantidade de cobranças da sua assinatura na Paglink.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CobrancaRecorrentePage,
});

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatDueDate(date: Date) {
  const dd = String(date.getDate()).padStart(2, "0");
  return `${dd} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "biannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
] as const;

type Frequency = (typeof FREQUENCIES)[number]["value"];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-border bg-secondary text-foreground"
          : "border-border bg-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
      )}
    >
      {active && <CheckCircle2 className="h-4 w-4 text-foreground" />}
      {children}
    </button>
  );
}

function CobrancaRecorrentePage() {
  const navigate = useNavigate();

  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  });
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [countMode, setCountMode] = useState<"unlimited" | "custom">("unlimited");
  const [count, setCount] = useState(12);

  function handleConfirm() {
    const freqLabel =
      FREQUENCIES.find((f) => f.value === frequency)?.label ?? "Mensal";
    toast.success(
      countMode === "unlimited"
        ? `Recorrência ${freqLabel.toLowerCase()} por prazo indeterminado`
        : `Recorrência ${freqLabel.toLowerCase()} em ${count} cobranças`,
    );
    navigate({ to: "/criar-cobranca" });
  }

  return (
    <AppShell
      title="Cobrança recorrente"
      subtitle="Automatize suas cobranças e torne seu negócio mais prático"
      headerCenter={
        <Link
          to="/planos"
          className="hidden items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </Link>
      }
    >
      <div className="mx-auto max-w-xl p-4 sm:p-6">
        {/* Mobile header */}
        <div className="mb-6 flex items-center gap-3 sm:hidden">
          <Link to="/planos">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h2 className="font-display text-xl font-semibold">
            Cobrança recorrente
          </h2>
        </div>

        <div className="space-y-6">
          {/* Vencimento */}
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="text-sm font-semibold text-foreground">
                {formatDueDate(dueDate)}
              </p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className="h-9 rounded-full px-4 text-xs font-medium"
                >
                  Alterar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => d && setDueDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator className="bg-border/60" />

          {/* Recorrência */}
          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Recorrência
              </h3>
              <p className="text-sm text-muted-foreground">
                Selecione a frequência de pagamento que o seu cliente deve fazer
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map((f) => (
                <Pill
                  key={f.value}
                  active={frequency === f.value}
                  onClick={() => setFrequency(f.value)}
                >
                  {f.label}
                </Pill>
              ))}
            </div>
          </section>

          <Separator className="bg-border/60" />

          {/* Quantas vezes */}
          <section className="space-y-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Quantas vezes?
              </h3>
              <p className="text-sm text-muted-foreground">
                Caso seu cliente não pague quatro cobranças seguidas vamos
                cancelar essa recorrência
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill
                active={countMode === "unlimited"}
                onClick={() => setCountMode("unlimited")}
              >
                Indeterminado
              </Pill>
              <Pill
                active={countMode === "custom"}
                onClick={() => setCountMode("custom")}
              >
                Escolher
              </Pill>
              {countMode === "custom" && (
                <Input
                  type="number"
                  min={2}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.max(2, Number(e.target.value) || 2))
                  }
                  className="h-10 w-24 rounded-full border-border bg-card text-center text-sm"
                />
              )}
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-primary/15 px-4 py-4 text-sm text-foreground">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                {countMode === "unlimited"
                  ? "Ao selecionar o prazo indeterminado, a cobrança será enviada para sempre"
                  : `Serão geradas ${count} cobranças e depois a recorrência será encerrada`}
              </p>
            </div>
          </section>

          <Button
            onClick={handleConfirm}
            className="h-12 w-full rounded-full bg-foreground text-base font-semibold text-background hover:bg-foreground/90"
          >
            Confirmar
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

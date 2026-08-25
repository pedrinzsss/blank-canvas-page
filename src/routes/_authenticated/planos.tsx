import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  CreditCard,
  Users,
  Search,
  CalendarDays,
  SlidersHorizontal,
  Download,
  Minus,
  User,
  Clock,
  ChevronRight,
  ChevronLeft,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Hourglass,
  Eye,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  getAvailablePaymentMethods,
  type PaymentMethodAvailability,
  type PaymentMethodId,
} from "@/lib/payment-methods.functions";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({
    meta: [
      { title: "Assinaturas — Paglink" },
      {
        name: "description",
        content: "Gerencie suas assinaturas na Paglink.",
      },
      { property: "og:title", content: "Assinaturas — Paglink" },
      {
        property: "og:description",
        content: "Gerencie suas assinaturas na Paglink.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanosPage,
});

const quickActions = [
  {
    label: "Criar cobrança",
    to: "/criar-cobranca",
    icon: Plus,
    variant: "primary" as const,
  },
  {
    label: "Assinaturas",
    to: "/planos",
    icon: CreditCard,
    variant: "default" as const,
  },
  {
    label: "Seus Clientes",
    to: "/clientes",
    icon: Users,
    variant: "default" as const,
  },
];

const chargeOptions = [
  {
    title: "Cobrança única",
    description: "Crie uma cobrança rápida e fácil para um cliente",
    icon: User,
    to: "/criar-cobranca",
  },
  {
    title: "Cobrança recorrente",
    description: "Automatize suas cobranças e torne seu negócio mais prático",
    icon: Clock,
    to: "/cobranca-recorrente",
  },
];

const filterTabs = [
  { label: "Últimas cobranças", icon: CalendarDays },
  { label: "Filtros", icon: SlidersHorizontal },
  { label: "Relatório", icon: Download },
];

type InvoiceStat = { count: number; cents: number };

const STATUS_FILTERS = ["Em dia", "Pendente", "Atrasado", "Finalizado", "Cancelado"] as const;
const FREQ_FILTERS = ["Semestral", "Trimestral", "Mensal", "Semanal", "Anual"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type FreqFilter = (typeof FREQ_FILTERS)[number];

const METHOD_LABELS: Record<PaymentMethodId, string> = {
  pix: "Pix",
  boleto: "Boleto",
  cartao: "Cartão",
};

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );

function PlanosPage() {
  const [activeTab, setActiveTab] = useState<"assinaturas" | "meus-planos">("assinaturas");
  const [value, setValue] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState<StatusFilter[]>([]);
  const [freqFilters, setFreqFilters] = useState<FreqFilter[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodAvailability[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethodId[]>(["pix"]);
  const fetchMethods = useServerFn(getAvailablePaymentMethods);

  useEffect(() => {
    if (!detailsOpen || methods.length > 0) return;
    setMethodsLoading(true);
    fetchMethods()
      .then((res) => {
        setMethods(res);
        setSelectedMethods((prev) => prev.filter((m) => res.some((r) => r.id === m && r.enabled)));
      })
      .catch(() => setMethods([]))
      .finally(() => setMethodsLoading(false));
  }, [detailsOpen, methods.length, fetchMethods]);

  const toggleMethod = (id: PaymentMethodId) =>
    setSelectedMethods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );

  const [invoices, setInvoices] = useState<
    { id: string; amount_cents: number; status: string; due_date: string | null; customer_name: string; customer_email: string }[]
  >([]);
  const [plans, setPlans] = useState<
    { id: string; name: string; amount_cents: number; frequency: string; active_customers: number; next_billing_date: string | null }[]
  >([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) return;

      // Invoices
      const { data: invData } = await supabase
        .from("subscription_invoices")
        .select("id, amount_cents, status, due_date, customer_name, customer_email")
        .eq("user_id", userRes.user.id);
      
      if (!cancelled) setInvoices((invData as any) ?? []);

      // Load actual recurring products from DB
      const { data: productsData } = await supabase
        .from("products" as any)
        .select("id, title, price_cents, recurrence_frequency, created_at, user_id")
        .eq("payment_type", "recurring")
        .eq("user_id", userRes.user.id);
      
      if (!cancelled && productsData) {
        setPlans(productsData.map((p: any) => ({
          id: p.id,
          name: p.title,
          amount_cents: p.price_cents || 0,
          frequency: p.recurrence_frequency || "Mensal",
          active_customers: 0, // Would need a join/count for real data
          next_billing_date: null
        })));
      }
    };
    load();

    const channel = supabase
      .channel("planos-invoices")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscription_invoices" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const empty = (): InvoiceStat => ({ count: 0, cents: 0 });
    const res = { paid: empty(), overdue: empty(), pending: empty() };
    for (const inv of invoices) {
      const amount = Number(inv.amount_cents ?? 0);
      const status = (inv.status ?? "").toLowerCase();
      let bucket: InvoiceStat | null = null;
      if (status === "paid" || status === "pago") bucket = res.paid;
      else if (
        status === "overdue" ||
        status === "atrasado" ||
        (status === "pending" && inv.due_date && inv.due_date < today)
      )
        bucket = res.overdue;
      else if (status === "pending" || status === "pendente")
        bucket = res.pending;
      if (bucket) {
        bucket.count += 1;
        bucket.cents += amount;
      }
    }
    return res;
  }, [invoices]);

  const summaryCards = [
    {
      label: "Recebidos",
      icon: CheckCircle2,
      tone: "text-emerald-500",
      stat: stats.paid,
    },
    {
      label: "Atrasados",
      icon: AlertTriangle,
      tone: "text-destructive",
      stat: stats.overdue,
    },
    {
      label: "Pendentes",
      icon: Hourglass,
      tone: "text-amber-500",
      stat: stats.pending,
    },
  ];

  const formatCurrency = (val: string) => {
    const numericValue = val.replace(/\D/g, "");
    if (!numericValue) return "";
    const floatValue = parseFloat(numericValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(floatValue);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setValue(formatCurrency(rawValue));
  };

  return (
    <AppShell
      title="Assinaturas"
      subtitle="Gerencie suas assinaturas"
    >
      <div className="space-y-6 p-4 sm:p-6">
        {/* Tab Navigation */}
        <div className="flex gap-8 border-b border-border">
          <button
            onClick={() => setActiveTab("assinaturas")}
            className={cn(
              "pb-3 text-sm font-semibold transition-colors relative",
              activeTab === "assinaturas"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Assinaturas
          </button>
          <button
            onClick={() => setActiveTab("meus-planos")}
            className={cn(
              "pb-3 text-sm font-semibold transition-colors relative",
              activeTab === "meus-planos"
                ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Meus Planos
          </button>
        </div>

        {activeTab === "assinaturas" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Planos e assinaturas
              </h2>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button 
                    className="gap-2 rounded-full px-6 py-6 font-medium text-black transition-transform hover:scale-105"
                    style={{ background: "var(--color-primary)" }}
                  >
                    <Plus className="h-5 w-5" />
                    Criar plano
                  </Button>
                </SheetTrigger>

                <SheetContent 
                  side="right" 
                  className="w-full border-border bg-[#0a0a0a] p-0 sm:max-w-2xl overflow-y-auto"
                >
                  <div className="flex flex-col min-h-full">
                    <div className="flex items-center gap-3 p-6 pb-4">
                      <SheetTrigger asChild>
                        <button className="text-foreground hover:opacity-70 transition-opacity">
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                      </SheetTrigger>
                      <h2 className="text-xl font-bold tracking-tight text-white">Criar novo plano</h2>
                    </div>

                    <div className="flex-1 px-8 py-4 space-y-8">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Nome do plano</label>
                        <Input 
                          placeholder="Digite o nome do plano"
                          className="h-12 bg-[#1c1c1c] border-none text-white placeholder:text-muted-foreground/50 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Qual o valor?</label>
                        <div className="relative">
                          <Input 
                            placeholder="R$ 0,00"
                            value={value}
                            onChange={handleValueChange}
                            className="h-12 bg-[#1c1c1c] border-none text-white placeholder:text-muted-foreground/50 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Descrição do plano <span className="text-xs opacity-60">(opcional)</span></label>
                        <div className="relative">
                          <textarea 
                            placeholder="Digite a descrição do plano"
                            className="w-full min-h-[120px] bg-[#1c1c1c] border-none text-white placeholder:text-muted-foreground/50 rounded-lg p-4 focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                          />
                          <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground">
                            00/100
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-sm font-medium text-muted-foreground">Qual a frequência da cobrança?</label>
                        <div className="flex flex-wrap gap-2">
                          {["Semanal", "Mensal", "Trimestral", "Semestral", "Anual"].map((freq) => (
                            <button
                              key={freq}
                              className={cn(
                                "px-5 py-2 rounded-full text-sm font-medium border transition-all",
                                freq === "Mensal" 
                                  ? "bg-[#333333] border-white text-white" 
                                  : "bg-transparent border-border text-muted-foreground hover:bg-secondary/50"
                              )}
                            >
                              {freq}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDetailsOpen(true)}
                        className="flex items-center w-full gap-4 p-5 bg-[#1c1c1c] rounded-xl hover:bg-[#252525] transition-colors group"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground group-hover:text-white transition-colors">
                          <Settings2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="text-sm font-bold text-white">Detalhes do plano</h4>
                          <p className="text-xs text-muted-foreground">
                            {selectedMethods.length > 0
                              ? `Meios de pagamento: ${selectedMethods
                                  .map((m) => METHOD_LABELS[m])
                                  .join(", ")}`
                              : "Meios de pagamento e mais"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>

                      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                        <SheetContent
                          side="right"
                          className="w-full border-border bg-[#0a0a0a] p-0 sm:max-w-lg overflow-y-auto"
                        >
                          <div className="flex flex-col min-h-full">
                            <div className="flex items-center gap-3 p-6 pb-4">
                              <button
                                type="button"
                                onClick={() => setDetailsOpen(false)}
                                className="text-foreground hover:opacity-70 transition-opacity"
                              >
                                <ChevronLeft className="h-6 w-6" />
                              </button>
                              <h2 className="text-xl font-bold tracking-tight text-white">
                                Detalhes do plano
                              </h2>
                            </div>

                            <div className="flex-1 px-8 py-4 space-y-4">
                              {!methodsOpen ? (
                                <button
                                  type="button"
                                  onClick={() => setMethodsOpen(true)}
                                  className="flex items-center w-full gap-4 p-5 bg-[#1c1c1c] rounded-xl hover:bg-[#252525] transition-colors group"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 text-muted-foreground group-hover:text-white transition-colors">
                                    <CreditCard className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 text-left">
                                    <h4 className="text-sm font-bold text-white">Meios de pagamento</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      Aqui eu posso selecionar em ter cada opção de pagamento ou não mas no momento somente a função de pix está disponivel
                                    </p>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </button>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setMethodsOpen(false)}
                                      className="text-muted-foreground hover:text-white transition-colors"
                                    >
                                      <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <h3 className="text-sm font-semibold text-white">
                                      Meios de pagamento
                                    </h3>
                                  </div>

                                  {methodsLoading ? (
                                    <p className="text-xs text-muted-foreground">Carregando…</p>
                                  ) : (
                                    methods.map((m) => {
                                      const checked = selectedMethods.includes(m.id);
                                      return (
                                        <button
                                          key={m.id}
                                          type="button"
                                          disabled={!m.enabled}
                                          onClick={() => toggleMethod(m.id)}
                                          className={cn(
                                            "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors",
                                            m.enabled
                                              ? checked
                                                ? "border-primary bg-[#1c1c1c]"
                                                : "border-border bg-[#1c1c1c] hover:bg-[#252525]"
                                              : "cursor-not-allowed border-border/40 bg-[#141414] opacity-60",
                                          )}
                                        >
                                          <div className="flex-1">
                                            <p className="text-sm font-semibold text-white">
                                              {m.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {m.enabled
                                                ? "Disponível"
                                                : (m.reason ?? "Inativo")}
                                            </p>
                                          </div>
                                          <span
                                            className={cn(
                                              "rounded-full px-3 py-1 text-[10px] font-semibold uppercase",
                                              m.enabled
                                                ? checked
                                                  ? "bg-primary text-primary-foreground"
                                                  : "bg-secondary text-muted-foreground"
                                                : "bg-secondary/40 text-muted-foreground",
                                            )}
                                          >
                                            {m.enabled ? (checked ? "Selecionado" : "Ativo") : "Inativo"}
                                          </span>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-auto p-8 pt-4">
                              <Button
                                onClick={() => setDetailsOpen(false)}
                                className="w-full h-14 rounded-full bg-white text-black font-bold hover:bg-white/90"
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>

                    <div className="mt-auto p-8 pt-4">
                      <Button className="w-full h-14 rounded-full bg-white text-black font-bold hover:bg-white/90 transition-transform active:scale-[0.98]">
                        Continuar
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-border bg-card/60 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {card.label}
                      </span>
                      <Icon className={cn("h-4 w-4", card.tone)} />
                    </div>
                    <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
                      {brl(card.stat.cents)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.stat.count}{" "}
                      {card.stat.count === 1 ? "cobrança" : "cobranças"}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Pesquisar por cliente, CPF/CNPJ ou telefone"
                className="h-11 rounded-xl border-border bg-secondary/40 pl-10 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filterTabs.map((tab) => {
                const Icon = tab.icon;
                const isFiltros = tab.label === "Filtros";
                const activeCount = statusFilters.length + freqFilters.length;
                return (
                  <Button
                    key={tab.label}
                    variant="outline"
                    onClick={isFiltros ? () => setFiltersOpen(true) : undefined}
                    className="gap-2 rounded-full border-border bg-secondary/40 px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {tab.label}
                    {isFiltros && activeCount > 0 ? (
                      <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {activeCount}
                      </span>
                    ) : null}
                  </Button>
                );
              })}
            </div>

            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetContent
                side="right"
                className="w-full border-border bg-[#0a0a0a] p-0 sm:max-w-md overflow-y-auto"
              >
                <div className="flex min-h-full flex-col">
                  <div className="flex items-center gap-3 p-6 pb-4">
                    <button
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="text-foreground transition-opacity hover:opacity-70"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h2 className="text-xl font-bold tracking-tight text-white">Filtros</h2>
                  </div>

                  <div className="flex-1 space-y-8 px-6 py-2">
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Status</h3>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((s) => {
                          const active = statusFilters.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() =>
                                setStatusFilters((prev) =>
                                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                                )
                              }
                              className={cn(
                                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                                active
                                  ? "border-white bg-[#333333] text-white"
                                  : "border-border bg-transparent text-muted-foreground hover:bg-secondary/50",
                              )}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Frequência</h3>
                      <div className="flex flex-wrap gap-2">
                        {FREQ_FILTERS.map((f) => {
                          const active = freqFilters.includes(f);
                          return (
                            <button
                              key={f}
                              type="button"
                              onClick={() =>
                                setFreqFilters((prev) =>
                                  prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
                                )
                              }
                              className={cn(
                                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                                active
                                  ? "border-white bg-[#333333] text-white"
                                  : "border-border bg-transparent text-muted-foreground hover:bg-secondary/50",
                              )}
                            >
                              {f}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-3 p-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStatusFilters([]);
                        setFreqFilters([]);
                      }}
                      className="h-12 flex-1 rounded-full border-border bg-transparent text-sm font-medium"
                    >
                      Limpar
                    </Button>
                    <Button
                      onClick={() => setFiltersOpen(false)}
                      className="h-12 flex-1 rounded-full bg-white font-bold text-black hover:bg-white/90"
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprador</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vencimento</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.length > 0 ? (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">{inv.customer_name}</div>
                            <div className="text-xs text-muted-foreground">{inv.customer_email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                              inv.status.toLowerCase() === "pago" || inv.status.toLowerCase() === "paid"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : inv.status.toLowerCase() === "atrasado" || inv.status.toLowerCase() === "overdue"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-amber-500/10 text-amber-500"
                            )}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">{brl(inv.amount_cents)}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">
                            {inv.due_date ? new Date(inv.due_date).toLocaleDateString("pt-BR") : "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ver Comprovante">
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ver Detalhes">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                          Nenhuma assinatura encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clientes ativos</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frequência</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próxima cobrança</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plans.length > 0 ? (
                      plans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium">{plan.name}</td>
                          <td className="px-6 py-4 text-sm">{plan.active_customers}</td>
                          <td className="px-6 py-4 text-sm">{plan.frequency}</td>
                          <td className="px-6 py-4 text-sm">
                            {plan.next_billing_date 
                              ? new Date(plan.next_billing_date).toLocaleDateString("pt-BR") 
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold">{brl(plan.amount_cents)}</td>
                          <td className="px-6 py-4 text-sm">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                          Nenhum plano criado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

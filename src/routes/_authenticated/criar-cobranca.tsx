import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Copy,
  DollarSign,
  FileText,
  Loader2,
  Percent,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  User,
  X,
  ArrowDownToLine,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { createLinktapPixCharge } from "@/lib/linktap.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/criar-cobranca")({
  head: () => ({
    meta: [
      { title: "Financeiro — Paglink" },
      {
        name: "description",
        content: "Acompanhe seu saldo e gerencie suas cobranças.",
      },
      { property: "og:title", content: "Financeiro — Paglink" },
      {
        property: "og:description",
        content: "Acompanhe seu saldo e gerencie suas cobranças.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CobrancaUnicaPage,
});

function formatBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDueDate(date: Date) {
  const months = [
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
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd} ${months[date.getMonth()]}, ${yyyy}`;
}

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
};

type PixResult = {
  charge_id: string;
  pix_qrcode: string | null;
  pix_expiration_at: string | null;
  amount_cents: number;
};

function CobrancaUnicaPage() {
  const createCharge = useServerFn(createLinktapPixCharge);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixKey, setPixKey] = useState("");
  
  const [depositAmount, setDepositAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerDocument, setPayerDocument] = useState("");

  const [loading, setLoading] = useState(false);


  const handleWithdraw = () => {
    toast.success("Solicitação de saque enviada com sucesso!");
    setWithdrawOpen(false);
  };

  const handleDeposit = () => {
    toast.success("QR Code Pix gerado com sucesso!");
    setDepositOpen(false);
  };

  const handleCurrencyInput = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setter("R$ 0,00");
      return;
    }
    const cents = parseInt(digits);
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
    setter(formatted);
  };


  return (
    <AppShell
      title="Financeiro"
      subtitle="Seu saldo e a razão de entradas e saídas."
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
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Main Balance Card */}
          <div className="rounded-2xl border border-border bg-card/60 p-8 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Saldo disponível</p>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-5xl font-bold tracking-tight">R$ 0,00</h2>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setWithdrawOpen(true)}
                  className="bg-[#1e1e2d] text-white hover:bg-[#2a2a3c] rounded-lg px-6 h-11 font-semibold flex items-center gap-2"
                >
                  <ArrowDownToLine className="h-4 w-4" /> Sacar
                </Button>
                <Button 
                  onClick={() => setDepositOpen(true)}
                  variant="outline" 
                  className="bg-white/5 border-border hover:bg-white/10 rounded-lg px-6 h-11 font-semibold flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Depositar
                </Button>

              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="flex items-center gap-0.5 font-semibold text-[#61f938]">
                <TrendingUp className="h-4 w-4" /> +R$ 0,00
              </span>
              <span className="text-muted-foreground/60">nos últimos 30 dias</span>
            </div>
          </div>

          {/* Sub-metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <MetricCard label="Pendente" value="R$ 0,00" sub="a liberar" />
            <MetricCard label="Entradas" value="R$ 0,00" sub="no período" valueColor="text-[#61f938]" />
            <MetricCard label="Saídas" value="R$ 0,00" sub="no período" valueColor="text-[#ee135b]" />
            <MetricCard label="Sacado" value="R$ 0,00" sub="acumulado" />
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex rounded-lg border border-border bg-card/40 p-1">
            <Button variant="ghost" size="sm" className="rounded-md px-4 py-1.5 h-auto text-sm bg-secondary/50 text-foreground">Extrato <span className="ml-1 opacity-50 text-[10px]">0</span></Button>
            <Button variant="ghost" size="sm" className="rounded-md px-4 py-1.5 h-auto text-sm text-muted-foreground hover:text-foreground">Saques <span className="ml-1 opacity-50 text-[10px]">0</span></Button>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-11 bg-card/40 border-border rounded-lg text-sm" placeholder="4 de jul. 2026 - 3 de ago. 2026" readOnly />
            </div>
            <Button variant="outline" className="h-11 border-border bg-card/40 rounded-lg px-4 flex items-center gap-2 text-sm">
              <SlidersHorizontal className="h-4 w-4" /> Filtros
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 border-border bg-card/40 rounded-lg">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 border-t border-border/50">
          <p className="text-muted-foreground/60 text-sm">Nenhuma movimentação no período</p>
        </div>
      </div>
      
      {/* Withdraw Modal */}
      <Sheet open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] border-l border-border bg-card p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-bold">Solicitar Saque</SheetTitle>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Valor do Saque</label>
                <Input 
                  value={withdrawAmount}
                  onChange={(e) => handleCurrencyInput(e.target.value, setWithdrawAmount)}
                  placeholder="R$ 0,00"
                  className="h-14 bg-card/40 border-border text-lg font-mono"
                />
                <p className="text-[10px] text-muted-foreground/40 font-medium">Mín: R$ 3,00 - Disp: R$ 0,00</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Tipo de Chave PIX</label>
                <select 
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="flex h-12 w-full rounded-lg border border-border bg-card/40 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Celular</option>
                  <option value="random">Chave Aleatória</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Chave PIX</label>
                <Input 
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Informe a chave PIX"
                  className="h-12 bg-card/40 border-border"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border/50 bg-card/80 backdrop-blur-sm">
              <Button onClick={handleWithdraw} className="w-full h-14 bg-[#1e1e2d] text-white hover:bg-[#2a2a3c] text-base font-bold rounded-xl shadow-lg">
                Confirmar Solicitação
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Deposit Modal */}
      <Sheet open={depositOpen} onOpenChange={setDepositOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] border-l border-border bg-card p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl font-bold">Depositar Saldo</SheetTitle>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Valor do Depósito</label>
                <Input 
                  value={depositAmount}
                  onChange={(e) => handleCurrencyInput(e.target.value, setDepositAmount)}
                  placeholder="R$ 0,00"
                  className="h-14 bg-card/40 border-border text-lg font-mono"
                />
                <p className="text-[10px] text-muted-foreground/40 font-medium">Mínimo: R$ 10,00</p>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-dashed border-border/50" />
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Dados do Pagador (opcional)</p>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Nome Completo</label>
                  <Input 
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="Nome do pagador (opcional)"
                    className="h-12 bg-card/40 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">CPF/CNPJ</label>
                  <Input 
                    value={payerDocument}
                    onChange={(e) => setPayerDocument(e.target.value)}
                    placeholder="Documento do pagador (opcional)"
                    className="h-12 bg-card/40 border-border"
                  />
                  <p className="text-[10px] text-muted-foreground/40 font-medium italic">Se não informado, usará os dados do cadastro.</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border/50 bg-card/80 backdrop-blur-sm">
              <Button onClick={handleDeposit} className="w-full h-14 bg-[#1e1e2d] text-white hover:bg-[#2a2a3c] text-base font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                <QrCode className="h-5 w-5" /> Gerar PIX
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>


    </AppShell>
  );
}


function MetricCard({
  label,
  value,
  sub,
  valueColor = "text-foreground",
}: {
  label: string;
  value: string;
  sub: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      <p className={cn("mt-4 text-2xl font-bold tracking-tight", valueColor)}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground/40">{sub}</p>
    </div>
  );
}

function OptionRow({
  icon: Icon,
  iconClass,
  label,
  sub,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  label: string;
  sub?: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-secondary/40"
    >
      <Icon className={cn("h-5 w-5 shrink-0 text-muted-foreground", iconClass)} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-black">
            {badge}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function PaymentMethodOption({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:bg-secondary/40",
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {selected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
    </button>
  );
}

function discountLabel(type: "none" | "fixed" | "percent", value: number) {
  if (type === "none") return "Sem desconto";
  if (type === "fixed") return `R$ ${(value / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })} de desconto`;
  return `${value}% de desconto`;
}

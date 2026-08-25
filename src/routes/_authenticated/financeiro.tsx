import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Wallet, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScrollText,
  ArrowDownToLine,
  TrendingUp,
  Info,
  PlayCircle,
  CalendarClock,
  Search,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Paglink" },
      { name: "description", content: "Acompanhe saldo, saques e antecipações da sua conta Paglink." },
      { property: "og:title", content: "Financeiro — Paglink" },
      { property: "og:description", content: "Acompanhe saldo, saques e antecipações da sua conta Paglink." },
    ],
  }),
  component: FinanceiroPage,
});

type TopTab = "extrato" | "saque" | "antecipacoes";
type Period = "todo" | "hoje" | "ontem" | "7" | "30";

const TOP_TABS: { id: TopTab; label: string; icon: typeof ScrollText }[] = [
  { id: "extrato", label: "Extrato", icon: ScrollText },
  { id: "saque", label: "Saque", icon: ArrowDownToLine },
  { id: "antecipacoes", label: "Antecipações", icon: TrendingUp },
];

const PERIODS: { id: Period; label: string }[] = [
  { id: "todo", label: "Todo período" },
  { id: "hoje", label: "Hoje" },
  { id: "ontem", label: "Ontem" },
  { id: "7", label: "Últimos 7 dias" },
  { id: "30", label: "Últimos 30 dias" },
];

function FinanceiroPage() {
  const [tab, setTab] = useState<TopTab>("extrato");
  const [period, setPeriod] = useState<Period>("todo");
  const [pageSize, setPageSize] = useState("10");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  const tableHeaders =
    tab === "saque"
      ? ["Data", "Chave PIX", "Valor", "Taxa", "Status"]
      : tab === "antecipacoes"
      ? ["Data", "Valor solicitado", "Taxa", "Valor líquido", "Status"]
      : ["Data", "Tipo", "Descrição", "Valor", "Status"];

  return (
    <AppShell title="Financeiro" subtitle="Gerencie seu saldo, saques e antecipações">
      <div className="space-y-6 px-4 py-6 sm:px-6">
        {/* Top segmented tabs */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur-sm">
            {TOP_TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Balance cards — only on Extrato */}
        {tab === "extrato" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BalanceCard
              label="Saldo atual"
              value="R$ 0,00"
              action={{ label: "Resgatar", icon: PlayCircle }}
            />
            <BalanceCard
              label="Saldo a receber"
              value="R$ 0,00"
              action={{ label: "Antecipar", icon: CalendarClock }}
            />
            <BalanceCard label="Saldo em protesto" value="R$ 0,00" />
            <BalanceCard label="Reserva financeira" value="R$ 0,00" />
          </div>
        )}

        {/* Toolbar: period pills + right-side actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                      : "border border-border bg-card/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {tab === "extrato" ? (
              <>
                <div className="relative min-w-[220px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Pesquise..." className="h-10 rounded-lg border-border bg-card/60 pl-9" />
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg border-border bg-card/60">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                <Button className="h-10 rounded-lg gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="h-10 rounded-lg gap-2 border-border bg-card/60">
                  Exportar
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
                {tab === "saque" && (
                  <Button className="h-10 rounded-lg font-semibold" onClick={() => setWithdrawOpen(true)}>
                    Solicitar saque
                  </Button>
                )}
                {tab === "antecipacoes" && (
                  <Button className="h-10 rounded-lg font-semibold" onClick={() => setAdvanceOpen(true)}>
                    Solicitar antecipação
                  </Button>
                )}
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg border-border bg-card/60">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card/40 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground">
                  <th className="w-10 px-4 py-3 text-left"><Checkbox /></th>
                  {tableHeaders.map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={tableHeaders.length + 1} className="px-4 py-16 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>0 registro(s) no total</span>
              <Select value={pageSize} onValueChange={setPageSize}>
                <SelectTrigger className="h-8 w-[72px] rounded-md border-border bg-card/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["10", "25", "50", "100"].map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>Página 1 de 1</div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
      <AdvanceDialog open={advanceOpen} onOpenChange={setAdvanceOpen} />
    </AppShell>
  );
}

function WithdrawDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-card p-0">
        <div className="p-6">
          <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-xl font-semibold">Realizar saque</DialogTitle>
            <DialogDescription>Verifique os valores da antecipação antes de confirmar</DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-muted-foreground">
              Devido à nova regulamentação do Banco Central sobre fintechs, os saques estão{" "}
              <span className="font-semibold text-foreground">limitados a R$15.000 por transação.</span>{" "}
              Você pode fazer <span className="font-semibold text-foreground">várias transações de até R$15 mil no mesmo dia</span>, sem problema.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor da transferência</label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="R$ 0,00"
                className="h-11 rounded-lg border-border bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Conta de destino dos recebimentos</label>
              <Input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="h-11 rounded-lg border-border bg-muted/30"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Saldo disponível</span><span className="font-medium">R$ 0,00</span></div>
            <div className="h-px bg-border/70" />
            <div className="flex justify-between"><span className="text-muted-foreground">Taxa de transferência</span><span className="font-medium">R$ 0,00</span></div>
            <div className="h-px bg-border/70" />
            <div className="flex justify-between"><span className="text-muted-foreground">Valor a receber</span><span className="font-semibold">R$ 0,00</span></div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 border-t border-border/70 bg-muted/20 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="rounded-full px-6 font-semibold">Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BalanceCard({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: { label: string; icon: typeof PlayCircle };
}) {
  const ActionIcon = action?.icon;
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="truncate">{label}</span>
            <Info className="h-3.5 w-3.5 opacity-60" />
          </div>
          <div className="mt-2 font-display text-2xl font-semibold tracking-tight">
            {value}
          </div>
        </div>
        {action && ActionIcon && (
          <button className="flex flex-col items-center gap-1 text-xs font-medium text-primary transition-transform hover:scale-105">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <ActionIcon className="h-5 w-5" />
            </span>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function AdvanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl border-border bg-card p-0">
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Solicitar Antecipação</h2>
            <p className="mt-1 text-xs text-muted-foreground">Selecione os itens que deseja antecipar</p>
          </div>
        </div>
        <div className="px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Disponível para antecipar hoje</p>
              <p className="mt-2 text-2xl font-bold text-foreground">R$ 0,00</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Saldo a liberar</p>
              <p className="mt-2 text-2xl font-bold text-foreground">R$ 0,00</p>
            </div>
          </div>
        </div>
        <div className="mt-6 px-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Itens para Antecipação</h3>
              <p className="mt-1 text-xs text-muted-foreground">Selecione os itens que deseja antecipar</p>
            </div>
            <Button variant="outline" size="sm" className="h-9 rounded-lg">
              Selecionar Tudo
            </Button>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  {["Valor Líquido", "Taxa de Antecipação", "Valor Solicitado", "Status", "Criado Em"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum resultado encontrado.
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <span>0 registro(s) no total</span>
              <span>Página 1 de 1</span>
              <div className="flex gap-1">
                {["«","‹","›","»"].map((s) => (
                  <button key={s} className="h-7 w-7 rounded-md border border-border">{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border px-6 py-4">
          <span className="text-xs text-muted-foreground">Nenhum item selecionado</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">
              Fechar
            </Button>
            <Button className="rounded-lg font-semibold">Solicitar Antecipação</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

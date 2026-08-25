import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Scale,
  Calendar as CalendarIcon,
  Paperclip,
  ChevronDown,
  Trash2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { createTransaction, listTransactions, deleteTransaction } from "@/lib/transactions.functions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/despesas")({
  component: DespesasPage,
});

const brl = (value: number) =>
  (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function DespesasPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [received, setReceived] = useState(false); // received means "paid" for outcome
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState("Assinaturas");
  const [ignoreTransaction, setIgnoreTransaction] = useState(false);

  const createTransactionFn = useServerFn(createTransaction);
  const listTransactionsFn = useServerFn(listTransactions);
  const deleteTransactionFn = useServerFn(deleteTransaction);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await listTransactionsFn({ 
        data: { 
          type: "outcome",
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear()
        } 
      });
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentDate]);

  const handleCreate = async (closeAfter = true) => {
    if (!amount || !description) {
      toast.error("Preencha o valor e a descrição");
      return;
    }

    try {
      const value = parseInt(amount.replace(/\D/g, ""), 10) || 0;
      await createTransactionFn({
        data: {
          type: "outcome",
          amountCents: value,
          description,
          category: type,
          paymentMethod: type,
          received,
          date: date.toISOString(),
          ignoreTransaction
        }
      });
      
      toast.success("Despesa criada com sucesso");
      fetchTransactions();
      
      if (closeAfter) {
        setIsModalOpen(false);
        resetForm();
      } else {
        resetForm();
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar despesa");
    }
  };

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setReceived(false);
    setDate(new Date());
    setType("Assinaturas");
    setIgnoreTransaction(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransactionFn({ data: { id } });
      toast.success("Despesa excluída");
      fetchTransactions();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  const totalPendentes = transactions
    .filter(t => !t.received)
    .reduce((acc, t) => acc + t.amount_cents, 0);
  
  const totalPagas = transactions
    .filter(t => t.received)
    .reduce((acc, t) => acc + t.amount_cents, 0);

  const total = totalPendentes + totalPagas;

  return (
    <AppShell title="Transações" subtitle="Gestão de despesas e saídas">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground font-semibold">
            <ChevronDown className="h-4 w-4" />
            <span>Despesas</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-secondary text-primary hover:bg-secondary/80 border-none rounded-full h-10 px-4 font-bold text-xs uppercase tracking-wider"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Despesa
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-secondary text-muted-foreground w-10 h-10 hover:bg-secondary/80">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-secondary text-muted-foreground w-10 h-10 hover:bg-secondary/80">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full bg-secondary text-muted-foreground w-10 h-10 hover:bg-secondary/80">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ReferenceCard 
            label="Despesas pendentes" 
            value={brl(totalPendentes)} 
            icon={<ArrowUp className="h-5 w-5 text-white" />}
            iconBg="bg-primary/80"
          />
          <ReferenceCard 
            label="Despesas pagas" 
            value={brl(totalPagas)} 
            icon={<ArrowDown className="h-5 w-5 text-white" />}
            iconBg="bg-primary/80"
          />
          <ReferenceCard 
            label="Total" 
            value={brl(total)} 
            icon={<Scale className="h-5 w-5 text-white" />}
            iconBg="bg-primary/80"
          />
        </div>

        <div className="flex items-center justify-center gap-6 py-2">
          <button 
            onClick={() => {
              const d = new Date(currentDate);
              d.setMonth(d.getMonth() - 1);
              setCurrentDate(d);
            }}
            className="text-primary hover:opacity-80 transition-opacity"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="rounded-full border border-primary px-6 py-1.5 text-primary font-medium min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </div>
          <button 
            onClick={() => {
              const d = new Date(currentDate);
              d.setMonth(d.getMonth() + 1);
              setCurrentDate(d);
            }}
            className="text-primary hover:opacity-80 transition-opacity"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="rounded-2xl bg-secondary overflow-hidden">
          <div className="grid grid-cols-8 gap-4 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/5">
            <div className="flex items-center justify-center">
              <div className="h-4 w-4 border-2 border-muted-foreground rounded-sm" />
            </div>
            <div className="col-span-1">Situação</div>
            <div className="col-span-1 flex items-center gap-1">Data</div>
            <div className="col-span-1">Descrição</div>
            <div className="col-span-1">Categoria</div>
            <div className="col-span-1">Conta</div>
            <div className="col-span-1">Valor</div>
            <div className="col-span-1 text-right">Ações</div>
          </div>
          
          <div className="divide-y divide-border/5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground text-sm">Carregando...</p>
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((t) => (
                <div key={t.id} className="grid grid-cols-8 gap-4 px-6 py-4 items-center text-sm hover:bg-primary/5 transition-colors">
                  <div className="flex items-center justify-center">
                    <Checkbox checked={t.received} disabled />
                  </div>
                  <div className="col-span-1">
                    <Badge variant={t.received ? "default" : "outline"} className={cn("text-[10px] uppercase", t.received ? "bg-emerald-500" : "text-amber-500 border-amber-500")}>
                      {t.received ? "Paga" : "Pendente"}
                    </Badge>
                  </div>
                  <div className="col-span-1 text-xs text-muted-foreground">
                    {format(new Date(t.date), "dd/MM/yyyy")}
                  </div>
                  <div className="col-span-1 font-medium truncate">
                    {t.description}
                  </div>
                  <div className="col-span-1 text-xs">
                    {t.category}
                  </div>
                  <div className="col-span-1 text-xs text-muted-foreground">
                    Padrão
                  </div>
                  <div className="col-span-1 font-bold text-red-500">
                    {brl(t.amount_cents)}
                  </div>
                  <div className="col-span-1 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground text-sm">Nenhuma despesa encontrada para este período.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Despesa</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label className="text-sm font-semibold">Valor</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">R$</span>
                <Input
                  placeholder="0,00"
                  className="pl-10 text-xl font-bold bg-secondary/50 border-none h-12"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-secondary/30 p-3 rounded-xl border border-border/50">
              <Checkbox 
                id="received" 
                checked={received}
                onCheckedChange={(checked) => setReceived(!!checked)}
              />
              <Label htmlFor="received" className="text-sm cursor-pointer select-none">Esta despesa já foi paga</Label>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold">Descrição</Label>
              <Input
                placeholder="Ex: Aluguel"
                className="bg-secondary/50 border-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold">Data</Label>
              <div className="flex gap-2 flex-wrap">
                <Button variant={format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'secondary'} size="sm" className="rounded-full px-4" onClick={() => setDate(new Date())}>Hoje</Button>
                <Button variant={format(date, 'yyyy-MM-dd') === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') ? 'default' : 'secondary'} size="sm" className="rounded-full px-4" onClick={() => setDate(new Date(Date.now() - 86400000))}>Ontem</Button>
                <Popover>
                  <PopoverTrigger asChild><Button variant="secondary" size="sm" className="rounded-full px-4 gap-2"><CalendarIcon className="h-3 w-3" /> Outros...</Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus /></PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-sm font-semibold">Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-secondary/50 border-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Assinaturas">Assinaturas</SelectItem>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Salários">Salários</SelectItem>
                  <SelectItem value="Impostos">Impostos</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => handleCreate(false)} className="w-full sm:flex-1 font-bold text-xs uppercase">Salvar e criar nova</Button>
            <Button onClick={() => handleCreate(true)} className="w-full sm:flex-1 bg-primary text-primary-foreground font-bold text-xs uppercase">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ReferenceCard({ label, value, icon, iconBg }: any) {
  return (
    <div className="group relative flex items-center justify-between rounded-2xl bg-secondary p-6 transition-all hover:bg-secondary/80 cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={`grid h-12 w-12 place-items-center rounded-full ${iconBg}`}>{icon}</div>
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{label}</span>
            <ChevronRight className="h-3 w-3" />
          </div>
          <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground" />
    </div>
  );
}


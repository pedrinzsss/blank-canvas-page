import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Mail,
  Phone,
  X,
  Printer,
  Copy,
  ExternalLink,
  Trash2
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { deleteManualCharge } from "@/lib/manual-charges.functions";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: ExtratoPage,
});

type Transaction = {
  id: string;
  type: "income" | "outcome";
  amount_cents: number;
  status: string;
  description: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method: string;
  created_at: string;
  pix_qrcode?: string | null;
  secure_url?: string | null;
};

function ExtratoPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteChargeFn = useServerFn(deleteManualCharge);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const [chargesRes, manualRes] = await Promise.all([
        supabase
          .from("charges")
          .select("id, amount_cents, status, payment_method, created_at, client_id, customers(name, email, phone), description, pix_qrcode, secure_url")
          .order("created_at", { ascending: false }),
        supabase
          .from("manual_charges")
          .select("id, amount_cents, status, created_at, customer_name, customer_email, description, pix_qrcode, secure_url")
          .order("created_at", { ascending: false })
      ]);

      let all: Transaction[] = [];

      if (!chargesRes.error) {
        all = [...all, ...(chargesRes.data || []).map(c => ({
          id: c.id,
          type: "income" as const,
          amount_cents: c.amount_cents || 0,
          status: c.status || "pending",
          description: c.description || `Venda via ${c.payment_method || 'Cartão'}`,
          payment_method: c.payment_method || "card",
          created_at: c.created_at,
          customer_name: (c.customers as any)?.name,
          customer_email: (c.customers as any)?.email,
          customer_phone: (c.customers as any)?.phone,
          pix_qrcode: c.pix_qrcode,
          secure_url: c.secure_url
        }))];
      }

      if (!manualRes.error) {
        let data = manualRes.data || [];
        all = [...all, ...data.map(c => ({
          id: c.id,
          type: "income" as const,
          amount_cents: c.amount_cents || 0,
          status: c.status || "pending",
          description: c.description || `Pix QRCode para ${c.customer_name || 'Cliente'}`,
          customer_name: c.customer_name || undefined,
          customer_email: c.customer_email || undefined,
          payment_method: "pix",
          created_at: c.created_at,
          pix_qrcode: c.pix_qrcode,
          secure_url: c.secure_url
        }))];
      }

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTransactions(all);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || t.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesType = typeFilter === "all" || t.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [transactions, searchTerm, statusFilter, typeFilter]);

  const brl = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteChargeFn({ data: { id: deleteId } });
      toast.success("Transação excluída com sucesso");
      setTransactions(prev => prev.filter(t => t.id !== deleteId));
      setDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir transação");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "paid" || s === "approved" || s === "completed") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5">
          <CheckCircle2 className="h-3 w-3" />
          Aprovado
        </Badge>
      );
    }
    if (s === "pending" || s === "waiting_payment") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1.5">
          <Clock className="h-3 w-3" />
          Pendente
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1.5">
        <AlertCircle className="h-3 w-3" />
        Falhou
      </Badge>
    );
  };

  return (
    <AppShell title="Extrato" subtitle="Histórico detalhado de movimentações">
      <div className="space-y-6 p-4 md:p-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, cliente ou ID..."
                className="pl-9 bg-card border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-card border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="paid">Aprovados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falhados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] bg-card border-border">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="outcome">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="gap-2 border-border hover:bg-secondary/60">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-[100px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-40 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-4 w-16 animate-pulse rounded bg-muted" /></TableCell>
                    <TableCell><div className="h-6 w-24 animate-pulse rounded-full bg-muted" /></TableCell>
                    <TableCell><div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                  </TableRow>
                ))
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((t) => (
                  <TableRow 
                    key={t.id} 
                    className="hover:bg-secondary/20 transition-colors border-border cursor-pointer"
                    onClick={() => setSelectedTransaction(t)}
                  >
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(t.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm line-clamp-1">{t.description}</span>
                        {(t.customer_name || t.customer_email) && (
                          <span className="text-[10px] text-muted-foreground flex flex-wrap gap-x-2">
                            {t.customer_name && <span>{t.customer_name}</span>}
                            {t.customer_email && <span>• {t.customer_email}</span>}
                            {t.customer_phone && <span>• {t.customer_phone}</span>}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {t.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-secondary/50 text-[10px] uppercase font-bold">
                        {t.payment_method === 'pix' ? 'PIX' : t.payment_method === 'card' ? 'CARTÃO' : 'BOLETO'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(t.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`flex items-center justify-end gap-1.5 font-semibold ${t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.type === 'income' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3" />
                        )}
                        {brl(t.amount_cents)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center border-border">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2 opacity-20" />
                      <p>Nenhuma movimentação encontrada.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Transaction Detail Modal (Comprovante) */}
        <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
          <DialogContent className="sm:max-w-[450px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Comprovante de Transação
              </DialogTitle>
              <DialogDescription>
                Detalhes da operação realizada em {selectedTransaction && format(new Date(selectedTransaction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>

            {selectedTransaction && (
              <div className="space-y-6 pt-4">
                {/* Status & Amount */}
                <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-2xl border border-border/50">
                  <span className="text-sm text-muted-foreground mb-1">Valor total</span>
                  <span className="text-3xl font-bold">{brl(selectedTransaction.amount_cents)}</span>
                  <div className="mt-2">
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 gap-4 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-secondary/50">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Descrição</p>
                      <p className="font-medium">{selectedTransaction.description}</p>
                    </div>
                  </div>

                  {(selectedTransaction.customer_name || selectedTransaction.customer_email || selectedTransaction.customer_phone) && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-full bg-secondary/50">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Cliente</p>
                        <p className="font-medium">{selectedTransaction.customer_name || "N/A"}</p>
                        {selectedTransaction.customer_email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Mail className="h-3 w-3" />
                            {selectedTransaction.customer_email}
                          </div>
                        )}
                        {selectedTransaction.customer_phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Phone className="h-3 w-3" />
                            {selectedTransaction.customer_phone}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-secondary/50">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Data e Hora</p>
                      <p className="font-medium">
                        {format(new Date(selectedTransaction.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-secondary/50">
                      <Badge className="p-0 bg-transparent text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Método de Pagamento</p>
                      <p className="font-medium uppercase">{selectedTransaction.payment_method}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 rounded-full bg-secondary/50">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">ID da Transação</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border flex-1 break-all">
                          {selectedTransaction.id}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => {
                            navigator.clipboard.writeText(selectedTransaction.id);
                            toast.success("ID copiado!");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 border-border" 
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  {selectedTransaction.secure_url && (
                    <Button 
                      className="w-full gap-2" 
                      onClick={() => selectedTransaction.secure_url && window.open(selectedTransaction.secure_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver Online
                    </Button>
                  )}
                  {!selectedTransaction.secure_url && (
                    <Button variant="secondary" className="w-full gap-2 opacity-50 cursor-not-allowed">
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </Button>
                  )}
                </div>
                {/* Danger Zone */}
                {selectedTransaction.payment_method === 'pix' && (
                  <div className="pt-4 border-t border-border">
                    <Button 
                      variant="ghost" 
                      className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteId(selectedTransaction.id);
                        setSelectedTransaction(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Transação
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogContent className="sm:max-w-[400px] bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Confirmar Exclusão
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                variant="outline" 
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="border-border"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Sim, Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

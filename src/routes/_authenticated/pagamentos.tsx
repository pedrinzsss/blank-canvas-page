import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState, useEffect } from "react";
import { 
  Plus,
  Send,
  Search,
  SlidersHorizontal,
  Wallet2,
  Clock,
  QrCode,
  CreditCard,
  ChevronRight,
  Info,
  X,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Edit2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { 
  createManualCharge, 
  listManualCharges, 
  deleteManualCharge, 
  updateManualCharge 
} from "@/lib/manual-charges.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export const Route = createFileRoute("/_authenticated/pagamentos")({
  head: () => ({
    meta: [
      { title: "Pix QRCode — Paglink" },
      {
        name: "description",
        content: "Gerencie seus pagamentos, transferências e histórico financeiro.",
      },
    ],
  }),
  component: PagamentosPage,
});

function PagamentosPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [currentTx, setCurrentTx] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const createChargeFn = useServerFn(createManualCharge);
  const listChargesFn = useServerFn(listManualCharges);
  const deleteChargeFn = useServerFn(deleteManualCharge);
  const updateChargeFn = useServerFn(updateManualCharge);

  const mapRow = (row: any) => ({
    id: row.id,
    amount: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
      row.amount_cents / 100,
    ),
    date:
      new Date(row.created_at).toLocaleDateString("pt-BR") +
      " " +
      new Date(row.created_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    status: row.status,
    qrcode: row.pix_qrcode,
    payUrl: `${window.location.origin}/pagar/${row.id}`,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    description: row.description,
  });

  const loadCharges = async () => {
    try {
      const rows = await listChargesFn({});
      setTransactions(rows.map(mapRow));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCharges();
    const channel = supabase
      .channel("manual_charges_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "manual_charges" },
        () => {
          loadCharges();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    const digits = amount.replace(/\D/g, "");
    const cents = parseInt(digits);

    if (!cents || cents <= 0) {
      toast.error("Informe o valor da transação");
      return;
    }

    setLoading(true);
    try {
      const result = await createChargeFn({
        data: {
          amountCents: cents,
          email,
          customerName,
          description,
          origin: window.location.origin,
        },
      });
      console.log("[Pagamentos] createManualCharge result:", result);

      const chargeData = result;

      const newTx = {
        id: chargeData.id,
        amount,
        date:
          new Date().toLocaleDateString("pt-BR") +
          " " +
          new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        status: "pending",
        qrcode: chargeData.qrcode,
        payUrl: chargeData.payUrl,
        customerEmail: email,
        customerName: customerName,
        description: description,
      };

      setTransactions((prev) => [newTx, ...prev]);
      setCurrentTx(newTx);
      setCreateOpen(false);
      setQrModalOpen(true);

      setAmount("");
      setEmail("");
      setCustomerName("");
      setDescription("");

      toast.success("Cobrança gerada com sucesso!");
    } catch (error: any) {
      console.error("Create charge error:", error);
      toast.error(error.message || "Erro ao gerar cobrança");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (currentTx?.payUrl) {
      navigator.clipboard.writeText(currentTx.payUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("Link copiado!");
    }
  };

  const handleCopyCode = () => {
    if (currentTx?.qrcode) {
      navigator.clipboard.writeText(currentTx.qrcode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success("Código PIX copiado!");
    }
  };

  const handleCurrencyInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setAmount("R$ 0,00");
      return;
    }
    const cents = parseInt(digits);
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
    setAmount(formatted);
  };

  return (
    <AppShell
      title="Pix QRCode"
      subtitle="Crie links de pagamento, emita cobranças e acompanhe cada recebimento."
    >
      <div className="flex flex-col h-full bg-white dark:bg-transparent">
        {/* Tabs */}
        <div className="border-b border-border bg-white dark:bg-card/40 px-6">
          <div className="flex items-center gap-8 h-14">
            <button className="flex items-center gap-2 text-sm font-semibold border-b-2 border-primary h-full px-2 text-foreground">
              <Send className="h-4 w-4" /> Cobranças manuais
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 px-6 py-6">
          {/* Info Banner */}
          <div className="rounded-lg border border-border bg-secondary/10 dark:bg-secondary/5 p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-secondary/20">
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-foreground">
              Após criar a transação, <span className="font-bold">será mostrado o QR Code para pagamento</span> e enviado para o e-mail do cliente.
            </p>
          </div>

          {/* Action Button */}
          <Button 
            onClick={() => {
              setAmount("");
              setEmail("");
              setCustomerName("");
              setDescription("");
              setCreateOpen(true);
            }}
            className="bg-[#1e1e2d] text-white hover:bg-[#2a2a3c] rounded-md px-6 h-12 font-bold flex items-center gap-2 shadow-md"
          >
            <Plus className="h-4 w-4" /> Criar transação
          </Button>

          {/* Content Area */}
          <div className="min-h-[400px] flex flex-col items-center justify-center border-t border-border/50">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Send className="h-16 w-16 text-muted-foreground/20 mb-6 rotate-[-15deg]" />
                <p className="text-muted-foreground/60 text-lg font-medium">Nenhuma cobrança manual criada</p>
              </div>
            ) : (
              <div className="w-full space-y-4 py-4">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm group hover:bg-card/80 transition-colors"
                  >
                    <div 
                      className="flex flex-1 items-center gap-4 cursor-pointer"
                      onClick={() => {
                        setCurrentTx(tx);
                        setQrModalOpen(true);
                      }}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <QrCode className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{tx.amount}</p>
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[11px] font-medium text-foreground/80">
                            {tx.customerName || "Cliente"} {tx.customerEmail ? `(${tx.customerEmail})` : ""}
                          </p>
                          {tx.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{tx.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60">{tx.date} • #{tx.id?.slice(0, 8)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        tx.status === "approved" || tx.status === "paid" 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {tx.status === "approved" || tx.status === "paid" ? "Aprovada" : "Pendente"}
                      </span>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setCurrentTx(tx);
                            setQrModalOpen(true);
                          }}>
                            <QrCode className="mr-2 h-4 w-4" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setCurrentTx(tx);
                            setEmail(tx.customerEmail || "");
                            setCustomerName(tx.customerName || "");
                            setDescription(tx.description || "");
                            setEditOpen(true);
                          }}>
                            <Edit2 className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={async () => {
                              if (confirm("Tem certeza que deseja excluir esta cobrança?")) {
                                try {
                                  await deleteChargeFn({ data: { id: tx.id } });
                                  toast.success("Cobrança excluída");
                                  setTransactions(prev => prev.filter(t => t.id !== tx.id));
                                } catch (e: any) {
                                  toast.error(e.message);
                                }
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Transaction Modal */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] border-l border-border bg-card p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-6 border-b border-border/50">
              <SheetTitle className="text-xl font-bold">Criar Transação</SheetTitle>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Valor da Transação</label>
                <Input 
                  value={amount}
                  onChange={(e) => handleCurrencyInput(e.target.value)}
                  placeholder="R$ 0,00"
                  className="h-14 bg-card/40 border-border text-lg font-mono"
                />
                <p className="text-[10px] text-muted-foreground/40 font-medium">O QR Code será gerado automaticamente após a criação.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Nome do Cliente (opcional)</label>
                <Input 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome completo"
                  className="h-12 bg-card/40 border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">E-mail do Cliente (opcional)</label>
                <Input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="h-12 bg-card/40 border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Descrição</label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Identificador da venda"
                  className="h-12 bg-card/40 border-border"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border/50 bg-card/80 backdrop-blur-sm">
              <Button 
                onClick={handleCreate} 
                disabled={loading}
                className="w-full h-14 bg-[#1e1e2d] text-white hover:bg-[#2a2a3c] text-base font-bold rounded-xl shadow-lg"
              >
                {loading ? <Clock className="h-5 w-5 animate-spin mr-2" /> : null}
                Gerar Cobrança
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Transaction Modal */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[440px] border-l border-border bg-card p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="px-6 py-6 border-b border-border/50">
              <SheetTitle className="text-xl font-bold">Editar Transação</SheetTitle>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Nome do Cliente (opcional)</label>
                <Input 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome completo"
                  className="h-12 bg-card/40 border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">E-mail do Cliente (opcional)</label>
                <Input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="h-12 bg-card/40 border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Descrição</label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Identificador da venda"
                  className="h-12 bg-card/40 border-border"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border/50 bg-card/80 backdrop-blur-sm">
              <Button 
                onClick={async () => {
                  setLoading(true);
                  try {
                    await updateChargeFn({
                      data: {
                        id: currentTx.id,
                        email,
                        customerName,
                        description,
                      }
                    });
                    toast.success("Cobrança atualizada");
                    setTransactions(prev => prev.map(t => t.id === currentTx.id ? {
                      ...t,
                      customerEmail: email,
                      customerName,
                      description,
                    } : t));
                    setEditOpen(false);
                  } catch (e: any) {
                    toast.error(e.message);
                  } finally {
                    setLoading(false);
                  }
                }} 
                disabled={loading}
                className="w-full h-14 bg-[#1e1e2d] text-white hover:bg-[#2a2a3c] text-base font-bold rounded-xl shadow-lg"
              >
                {loading ? <Clock className="h-5 w-5 animate-spin mr-2" /> : null}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Transaction QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none bg-white dark:bg-card">
          <DialogHeader className="p-6 border-b border-border/50 relative">
            <DialogTitle className="text-lg font-bold">Transação #{currentTx?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          
          <div className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-border">
              {currentTx?.qrcode ? (
                <div className="flex flex-col items-center gap-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentTx.qrcode)}`} 
                    alt="QR Code PIX" 
                    className="h-48 w-48"
                  />
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Escaneie para pagar {currentTx.amount}</p>
                </div>
              ) : (
                <div className="h-48 w-48 flex items-center justify-center bg-secondary/10 rounded-xl">
                  <Clock className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-4 w-full">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  O cliente recebeu os dados no e-mail:
                </p>
                <p className="text-sm font-bold text-foreground">{currentTx?.customerEmail || "Não informado"}</p>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  asChild
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-lg"
                >
                  <a href={currentTx?.payUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Abrir Página de Pagamento
                  </a>
                </Button>

                <Button 
                  variant="outline"
                  onClick={handleCopyLink}
                  className="w-full h-12 font-bold rounded-lg flex items-center justify-center gap-2 border-primary/20 hover:bg-primary/5"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  Copiar Link de Pagamento
                </Button>

                <button 
                  onClick={handleCopyCode}
                  className="w-full py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  <QrCode className="h-4 w-4" />
                  Copiar Código PIX (Copia e Cola)
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}



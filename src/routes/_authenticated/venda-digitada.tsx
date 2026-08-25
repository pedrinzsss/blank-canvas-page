import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { 
  CreditCard, 
  User, 
  DollarSign, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Lock,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/venda-digitada")({
  component: VendaDigitadaPage,
});

type Step = "valor" | "cartao" | "pagador" | "revisao";

function VendaDigitadaPage() {
  const [step, setStep] = useState<Step>("valor");
  const [amount, setAmount] = useState<number>(210.00);
  
  // Form fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerDoc, setCustomerDoc] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const steps: { key: Step; label: string; icon: any }[] = [
    { key: "valor", label: "Valor", icon: DollarSign },
    { key: "cartao", label: "Cartão", icon: CreditCard },
    { key: "pagador", label: "Pagador", icon: User },
    { key: "revisao", label: "Revisão", icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  const handleNext = () => {
    if (step === "valor") setStep("cartao");
    else if (step === "cartao") setStep("pagador");
    else if (step === "pagador") setStep("revisao");
    else {
      toast.success("Venda processada com sucesso!");
    }
  };

  const handleBack = () => {
    if (step === "cartao") setStep("valor");
    else if (step === "pagador") setStep("cartao");
    else if (step === "revisao") setStep("pagador");
  };

  return (
    <AppShell title="Venda Digitada">
      <div className="max-w-2xl mx-auto py-10 px-6">
        {/* Progress bar */}
        <div className="mb-10">
          <p className="text-xs text-muted-foreground mb-4">Etapa {currentStepIndex + 1} de 4</p>
          <div className="flex items-center gap-2">
            {steps.map((s, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              
              return (
                <div key={s.key} className="flex-1 flex flex-col gap-2">
                  <div 
                    className={cn(
                      "h-1 rounded-full transition-colors",
                      isPast || isCurrent ? "bg-primary" : "bg-border"
                    )} 
                  />
                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                    isCurrent ? "text-foreground" : isPast ? "text-primary" : "text-muted-foreground/40"
                  )}>
                    <s.icon className={cn("h-3 w-3", isPast && "text-primary")} />
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {step === "valor" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Qual é o valor da cobrança?</h2>
                <p className="text-sm text-muted-foreground">Valor que vai ser cobrado nesta venda.</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Input 
                    type="text"
                    value={formatCurrency(amount)}
                    readOnly
                    className="h-16 text-2xl font-bold border-primary ring-offset-background focus-visible:ring-primary"
                  />
                  <div className="absolute top-2 right-2 text-[10px] text-primary font-bold">I</div>
                </div>
                <p className="text-[10px] text-muted-foreground">Valor mínimo de R$ 2,20</p>
                
                <div className="grid grid-cols-4 gap-3">
                  {[1, 5, 10, 20].map((v) => (
                    <Button 
                      key={v}
                      variant="outline" 
                      onClick={() => setAmount(prev => prev + v)}
                      className="h-12 border-border/50 hover:bg-secondary/40 font-bold"
                    >
                      +{v}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "cartao" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Dados do cartão de crédito</h2>
                <p className="text-sm text-muted-foreground">Informe os dados do cartão do seu cliente.</p>
              </div>

              <div className="space-y-6">
                {/* Virtual Card Preview */}
                <div className="relative h-44 w-full rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 p-6 flex flex-col justify-between overflow-hidden shadow-lg border border-white/10">
                   <div className="flex justify-between items-start">
                     <div className="w-10 h-8 bg-slate-400/20 rounded-md" />
                     <div className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Crédito</div>
                   </div>
                   <div className="space-y-4">
                     <div className="text-xl font-mono tracking-[0.2em] text-foreground/60">
                       {cardNumber.padEnd(16, "0").replace(/(.{4})/g, "$1 ")}
                     </div>
                     <div className="flex justify-between items-end">
                       <div className="space-y-1">
                         <div className="text-[8px] uppercase tracking-widest text-muted-foreground/40">Nome no cartão</div>
                         <div className="text-[10px] font-bold uppercase text-foreground/60">{cardName || "NOME NO CARTÃO"}</div>
                       </div>
                       <div className="space-y-1 text-right">
                         <div className="text-[8px] uppercase tracking-widest text-muted-foreground/40">Validade</div>
                         <div className="text-[10px] font-bold text-foreground/60">{expiry || "MM/AA"}</div>
                       </div>
                     </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Número do cartão</label>
                    <div className="relative">
                      <Input 
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="h-12 border-primary ring-primary"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center">
                        <span className="text-primary font-bold">I</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Nome como está no cartão</label>
                    <Input 
                      placeholder="Nome no cartão"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Vencimento</label>
                      <Input 
                        placeholder="MM/AA"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">CVV</label>
                      <div className="relative">
                        <Input 
                          placeholder="000"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="h-12 pl-10"
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Parcelamento</label>
                    <div className="h-12 rounded-md border border-border bg-secondary/20 flex items-center px-4 text-sm font-medium">
                      1x de {formatCurrency(amount)} (à vista)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "pagador" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Dados de quem vai pagar</h2>
                <p className="text-sm text-muted-foreground">Informe os dados da pessoa titular do cartão.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Nome completo</label>
                  <div className="relative">
                    <Input 
                      placeholder="Nome completo"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-12 border-primary ring-primary"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <span className="text-primary font-bold">I</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">E-mail</label>
                  <Input 
                    type="email"
                    placeholder="exemplo@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">CPF</label>
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">Opcional</span>
                  </div>
                  <Input 
                    placeholder="000.000.000-00"
                    value={customerDoc}
                    onChange={(e) => setCustomerDoc(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Celular com DDD</label>
                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">Opcional</span>
                  </div>
                  <Input 
                    placeholder="(00) 0 0000-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "revisao" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Confira os dados da venda</h2>
                <p className="text-sm text-muted-foreground">Você pode alterar e personalizar como preferir.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/60 hover:bg-card/80 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Valor da cobrança</p>
                      <p className="font-bold text-foreground">{formatCurrency(amount)}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/60 hover:bg-card/80 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                      <div className="h-4 w-6 bg-red-500 rounded-sm" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Cartão de crédito</p>
                      <p className="font-bold text-foreground">1x de {formatCurrency(amount)} (à vista)</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/20 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Dados de quem vai pagar</p>
                      <p className="font-bold text-foreground uppercase">{customerName || "NÃO INFORMADO"}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-12 flex items-center justify-end gap-3 pt-6 border-t border-border">
          {step !== "valor" && (
            <Button 
              variant="secondary" 
              onClick={handleBack}
              className="h-12 px-8 font-bold rounded-lg"
            >
              Voltar
            </Button>
          )}
          <Button 
            onClick={handleNext}
            className="h-12 px-8 font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
          >
            {step === "revisao" ? "Finalizar Venda" : "Continuar"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

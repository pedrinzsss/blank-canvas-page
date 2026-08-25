import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { 
  ArrowUpRight, 
  Search, 
  Filter, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Barcode,
  Calendar as CalendarIcon,
  HelpCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import pixIcon from "@/assets/pix-icon.png.asset.json";

export const Route = createFileRoute("/_authenticated/antecipacao")({
  component: AntecipacaoPage,
});

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function PaymentMethodIcon({ method }: { method: string }) {
  const m = (method ?? "").toLowerCase();
  if (m.includes("pix")) {
    return (
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#32BCAD]/10">
        <img src={pixIcon.url} alt="Pix" className="h-4 w-4 object-contain" />
      </span>
    );
  }
  if (m.includes("boleto")) {
    return (
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-foreground border border-border/50">
        <Barcode className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
      <CreditCard className="h-4 w-4" />
    </span>
  );
}

function AntecipacaoPage() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function fetchSales() {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) return;

        // Fetch sales that are eligible for anticipation (card and boleto)
        const { data, error } = await supabase
          .from("charges")
          .select("id, amount_cents, status, payment_method, created_at, paid_at, customer:customers(name, email)")
          .or("payment_method.ilike.%card%,payment_method.ilike.%boleto%")
          .eq("status", "paid")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setSales(data || []);
      } catch (err) {
        console.error("Error fetching antecipacoes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  const totals = useMemo(() => {
    const total = sales.reduce((acc, s) => acc + s.amount_cents, 0);
    // Rough estimate: 90% of the value can be anticipated after fees
    const anticipatable = Math.round(total * 0.9);
    return { total, anticipatable };
  }, [sales]);

  return (
    <AppShell title="Antecipação" subtitle="Antecipe seus recebíveis de cartão e boleto">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground font-semibold">
            <TrendingUp className="h-4 w-4" />
            <span>Antecipações Disponíveis</span>
          </div>
          
          <div className="flex items-center gap-2">
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

        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard 
            label="Total em Vendas (Cartão/Boleto)" 
            value={brl(totals.total)} 
            icon={<CreditCard className="h-5 w-5 text-white" />}
            iconBg="bg-primary/80"
          />
          <MetricCard 
            label="Valor Disponível para Antecipação" 
            value={brl(totals.anticipatable)} 
            icon={<ArrowUpRight className="h-5 w-5 text-white" />}
            iconBg="bg-emerald-500/80"
            subtext="Valor aproximado após taxas de antecipação"
          />
        </div>

        <div className="rounded-2xl bg-secondary overflow-hidden border border-border/50">
          <div className="grid grid-cols-8 gap-4 px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/5 bg-secondary/50">
            <div className="col-span-2">Cliente</div>
            <div className="col-span-1 text-center">Método</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Data/Hora</div>
            <div className="col-span-1 text-right">Valor Venda</div>
            <div className="col-span-1 text-right">Antecipável</div>
            <div className="col-span-1 text-right">Ação</div>
          </div>
          
          <div className="divide-y divide-border/5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-muted-foreground text-sm">Carregando vendas...</p>
              </div>
            ) : sales.length > 0 ? (
              sales.map((s) => {
                const anticipatable = Math.round(s.amount_cents * 0.9);
                return (
                  <div key={s.id} className="grid grid-cols-8 gap-4 px-6 py-4 items-center text-sm hover:bg-primary/5 transition-colors group">
                    <div className="col-span-2 flex flex-col">
                      <span className="font-medium truncate text-foreground">{s.customer?.name || "Cliente Final"}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{s.customer?.email || "sem-email@exemplo.com"}</span>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <PaymentMethodIcon method={s.payment_method} />
                    </div>
                    <div className="col-span-1">
                      <Badge variant="outline" className="text-[10px] uppercase border-emerald-500/50 text-emerald-500 bg-emerald-500/5">
                        Aprovado
                      </Badge>
                    </div>
                    <div className="col-span-1 flex flex-col text-[11px] text-muted-foreground">
                      <span>{format(new Date(s.created_at), "dd/MM/yyyy")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(s.created_at), "HH:mm")}</span>
                    </div>
                    <div className="col-span-1 text-right font-medium text-foreground">
                      {brl(s.amount_cents)}
                    </div>
                    <div className="col-span-1 text-right font-bold text-emerald-500">
                      {brl(anticipatable)}
                    </div>
                    <div className="col-span-1 text-right">
                      <Button size="sm" className="h-8 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground font-bold text-[10px] uppercase">
                        Antecipar
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <HelpCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">Nenhuma venda disponível para antecipação.</p>
                <p className="text-xs text-muted-foreground/60">Apenas vendas de cartão e boleto aprovadas podem ser antecipadas.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value, icon, iconBg, subtext }: any) {
  return (
    <div className="group relative flex flex-col rounded-2xl bg-secondary p-6 transition-all hover:bg-secondary/80 border border-border/50">
      <div className="flex items-center gap-4 mb-2">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl ${iconBg} shadow-lg shadow-black/10`}>{icon}</div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
        </div>
      </div>
      {subtext && <p className="text-[10px] text-muted-foreground/60 italic">{subtext}</p>}
    </div>
  );
}

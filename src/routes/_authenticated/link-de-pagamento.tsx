import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Plus,
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  Smartphone,
  Monitor,
  Eye,
  ChevronDown,
  Upload,
  CreditCard,
  QrCode,
  FileText,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/link-de-pagamento")({
  component: LinkDePagamentoPage,
  head: () => ({
    meta: [
      { title: "Link de Pagamento — Paglink" },
      { name: "description", content: "Crie e gerencie links de pagamento para compartilhar com seus clientes" },
      { property: "og:title", content: "Link de Pagamento — Paglink" },
      { property: "og:description", content: "Crie e gerencie links de pagamento para compartilhar com seus clientes" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LinkDePagamentoPage() {
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"card" | "pix" | "boleto">("pix");

  const stats = [
    { label: "Total de Links", value: "0", sub: "criados", icon: LinkIcon },
    { label: "Links Ativos", value: "0", sub: "em funcionamento", icon: ExternalLink },
    { label: "Valor Total", value: "R$ 0,00", sub: "em todos os links", icon: Smartphone },
    { label: "Links Inativos", value: "0", sub: "desativados", icon: Trash2 },
  ];

  return (
    <AppShell title="Link de Pagamento">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Link de Pagamento</h1>
            <Badge variant="secondary" className="bg-foreground/10 text-foreground hover:bg-foreground/20 border-none px-2 py-0 text-[10px] uppercase font-bold">BETA</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Crie e gerencie links de pagamento para compartilhar com seus clientes</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col justify-between rounded-xl border border-white/5 bg-card/40 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className="rounded-lg bg-foreground/10 p-2">
                  <stat.icon className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{stat.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar produto ou link..." 
              className="pl-10 bg-card/40 border-white/5 focus-visible:ring-foreground/50"
            />
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-foreground text-background hover:bg-foreground/90 font-semibold rounded-lg px-6">
                <Plus className="mr-2 h-4 w-4" />
                Criar Link de Pagamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-[#0a0a0a] border-white/5 text-white p-0 overflow-hidden">
              <div className="p-6 space-y-6">
                <DialogHeader className="flex flex-row items-center justify-between border-none p-0">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-foreground rounded-full" />
                    <DialogTitle className="text-xl font-bold">Criar Link de Pagamento</DialogTitle>
                  </div>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Nome do Produto *</Label>
                    <Input 
                      placeholder="Ex: Curso de Marketing Digital" 
                      className="bg-white/5 border-white/10 h-12 focus-visible:ring-foreground/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Imagem do Produto *</Label>
                    <div className="border-2 border-dashed border-foreground/30 rounded-xl bg-foreground/5 p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-foreground/10 transition-colors group">
                      <div className="p-3 bg-foreground/20 rounded-xl group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">Clique para fazer upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG ou WebP</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold">Valor *</Label>
                    <div className="relative">
                      <Input 
                        placeholder="R$ 0,00" 
                        className="bg-white/5 border-white/10 h-12 pl-4 font-bold focus-visible:ring-foreground/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-bold">Métodos de Pagamento *</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        onClick={() => setSelectedMethod("card")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedMethod === 'card' ? 'bg-foreground/10 border-foreground' : 'bg-white/5 border-white/10 opacity-40'}`}
                      >
                        <CreditCard className={`h-5 w-5 ${selectedMethod === 'card' ? 'text-foreground' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-bold">Cartão</span>
                      </button>
                      <button 
                        onClick={() => setSelectedMethod("pix")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedMethod === 'pix' ? 'bg-foreground/10 border-foreground' : 'bg-white/5 border-white/10'}`}
                      >
                        <QrCode className={`h-5 w-5 ${selectedMethod === 'pix' ? 'text-foreground' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-bold">PIX</span>
                      </button>
                      <button 
                        onClick={() => setSelectedMethod("boleto")}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${selectedMethod === 'boleto' ? 'bg-foreground/10 border-foreground' : 'bg-white/5 border-white/10 opacity-40'}`}
                      >
                        <FileText className={`h-5 w-5 ${selectedMethod === 'boleto' ? 'text-foreground' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-bold">Boleto</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 p-6 flex justify-end gap-3 border-t border-white/5">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:bg-white/10 font-bold"
                >
                  Cancelar
                </Button>
                <Button className="bg-foreground hover:bg-foreground/90 text-background font-bold px-8">
                  Criar Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table Container */}
        <div className="rounded-xl border border-white/5 bg-card/20 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-card/40 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Link de Pagamento</th>
                <th className="px-6 py-4 text-center">Valor</th>
                <th className="px-6 py-4 text-center">Métodos</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Data de Criação</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr className="h-24">
                <td colSpan={7} className="px-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Preview Section */}
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Eye className="h-4 w-4" />
            Preview do Checkout
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Device Toggles */}
            <div className="flex items-center gap-2 rounded-lg bg-card/40 border border-white/5 p-1">
              <button 
                onClick={() => setPreviewDevice("mobile")}
                className={`p-2 rounded-md transition-colors ${previewDevice === 'mobile' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setPreviewDevice("desktop")}
                className={`p-2 rounded-md transition-colors ${previewDevice === 'desktop' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>

            {/* Preview Frame */}
            <div className={`relative transition-all duration-300 border-x-8 border-t-8 border-b-[24px] border-zinc-900 bg-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden ${previewDevice === 'mobile' ? 'w-[320px] aspect-[9/19]' : 'w-[800px] h-[500px]'}`}>
              {/* Device Notch/Top Bar */}
              <div className="absolute top-0 left-0 right-0 h-6 bg-zinc-900 flex justify-center items-center px-4">
                <div className="w-20 h-4 bg-black rounded-b-xl" />
              </div>

              {/* Internal Content (The Mock Checkout) */}
              <div className="h-full w-full bg-slate-50 overflow-y-auto pt-6 pb-2 px-4 text-zinc-900">
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold">Resumo do Pedido</h3>
                    <p className="text-[10px] text-slate-500">Confira um resumo total do seu pedido</p>
                    
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <button className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                        Ocultar detalhes do pedido
                        <ChevronDown className="h-3 w-3 rotate-180" />
                      </button>
                      <span className="text-[11px] font-bold">R$ 1,50</span>
                    </div>

                    <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-lg p-2">
                      <div className="h-10 w-10 shrink-0 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400">CM</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate">Curso Marketing Digital Completo</div>
                        <div className="text-[10px] font-bold text-emerald-500">R$ 1,50</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5 text-[11px]">
                      <div className="flex justify-between text-slate-500">
                        <span>Produtos:</span>
                        <span>R$ 1,50</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Descontos:</span>
                        <span>R$ 0,00</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1.5 border-t border-slate-100">
                        <span>Total:</span>
                        <span>R$ 1,50</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold">Informações Pessoais</h3>
                      <p className="text-[10px] text-slate-500">Use seu e-mail para identificar a compra.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold">E-mail</label>
                      <input 
                        type="email" 
                        placeholder="email@gmail.com" 
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] bg-slate-50/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold">Nome Completo</label>
                      <input 
                        type="text" 
                        placeholder="Informe seu nome completo" 
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] bg-slate-50/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold">CPF</label>
                        <input 
                          type="text" 
                          placeholder="___.___.___-__" 
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] bg-slate-50/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold">Celular</label>
                        <input 
                          type="text" 
                          placeholder="(__) _____-____" 
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col items-center gap-4">
                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors shadow-sm">
                      Continuar para Pagamento
                      <Plus className="h-3 w-3 rotate-45" />
                    </button>

                    <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-3">
                      <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /><path d="M7 15h.01" /><path d="M11 15h2" /></svg>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold">Formas de Pagamento</h3>
                        <p className="text-[10px] text-slate-500">Escolha como deseja pagar.</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 pt-4 border-t border-slate-100 w-full">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formas de Pagamento</span>
                      <div className="flex flex-wrap justify-center gap-1.5 opacity-80 grayscale hover:grayscale-0 transition-all duration-300">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 w-auto" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 w-auto self-center" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-3 w-auto self-center" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png" alt="Pix" className="h-3 w-auto self-center" />
                        <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/EAN-13-5901234123457.svg" alt="Boleto" className="h-4 w-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Device Home Indicator */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-zinc-800 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

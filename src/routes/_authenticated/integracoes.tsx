import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MessageSquare, LineChart, FileText, Truck, Webhook, Plug, Plus, ShoppingBag, Loader2, CheckCircle2, RefreshCw, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import activeCampaignLogo from "@/assets/active-campaign.png.asset.json";
import smsFunnelLogo from "@/assets/sms-funnel.png.asset.json";
import gtiSmsLogo from "@/assets/gti-sms.png.asset.json";
import mexSmsLogo from "@/assets/mex-sms.png.asset.json";
import nemuLogo from "@/assets/nemu.png.asset.json";
import xtrackyLogo from "@/assets/xtracky.png.asset.json";
import utmifyLogo from "@/assets/utmify.png.asset.json";
import spedyLogo from "@/assets/spedy.png.asset.json";
import notazzLogo from "@/assets/notazz.png.asset.json";
import correiosLogo from "@/assets/correios.png.asset.json";
import blingLogo from "@/assets/bling.png.asset.json";
import paglinkLogo from "@/assets/paglink.png.asset.json";
import {
  connectShopify,
  disconnectShopify,
  getShopifyConnection,
  syncShopifyProducts,
} from "@/lib/shopify.functions";

export const Route = createFileRoute("/_authenticated/integracoes")({
  component: IntegracoesPage,
});

type TabKey = "email" | "sms" | "traqueamento" | "notas" | "logistica" | "ecommerce" | "webhooks";

const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { key: "email", label: "Email Marketing", icon: Mail, description: "Conecte plataformas de e-mail marketing para automações e disparos." },
  { key: "sms", label: "SMS", icon: MessageSquare, description: "Envie SMS transacionais e campanhas via provedores integrados." },
  { key: "traqueamento", label: "Traqueamento", icon: LineChart, description: "Integre pixels e ferramentas de traqueamento de conversões." },
  { key: "notas", label: "Notas Fiscais", icon: FileText, description: "Emissão automática de notas fiscais para vendas aprovadas." },
  { key: "logistica", label: "Logística", icon: Truck, description: "Conecte transportadoras e plataformas de fulfillment." },
  { key: "ecommerce", label: "E-commerce", icon: ShoppingBag, description: "Conecte sua loja para importar produtos e processar vendas pelo gateway." },
  { key: "webhooks", label: "Webhooks", icon: Webhook, description: "Integração universal com outras plataformas via webhook posts." },
];


function IntegracoesPage() {
  const [active, setActive] = useState<TabKey>("email");
  const activeTab = tabs.find((t) => t.key === active)!;

  return (
    <AppShell title="Integrações" subtitle="Conecte serviços externos à sua conta">
      <div className="p-6">
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap gap-2 border-b border-border p-4">
            {tabs.map((t) => {
              const isActive = t.key === active;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActive(t.key)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wider transition-colors ${
                    isActive
                      ? "bg-primary text-black shadow-sm"
                      : "bg-secondary text-secondary-foreground/70 hover:bg-primary/10 hover:text-foreground"
                  }`}
                >
                  {t.label.toUpperCase()}
                </button>
              );
            })}
          </div>


          <div className="p-6">
            {active === "email" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <IntegrationCard
                  logoUrl={activeCampaignLogo.url}
                  name="Active Campaign"
                  description="As ferramentas de marketing por e-mail, automação de marketing e CRM de que você precisa para criar experiências incríveis para o cliente."
                  count={0}
                />
              </div>
            ) : active === "sms" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <IntegrationCard
                  logoUrl={smsFunnelLogo.url}
                  name="SMS Funnel"
                  description="Com SMS Funnel você divulga seu produto ou serviço em tempo real para todo Brasil e todas as operadoras."
                  count={0}
                  variant="smsfunnel"
                />
                <IntegrationCard
                  logoUrl={gtiSmsLogo.url}
                  name="GTI SMS"
                  description="Comunicação rápida, simples e direta via SMS e WhatsApp. Diretamente conectado com todas as operadoras do Brasil."
                  count={0}
                  variant="gtisms"
                />
                <IntegrationCard
                  logoUrl={mexSmsLogo.url}
                  name="MEX 10 SMS"
                  description="SMS Marketing é com a Mex Envie SMS de forma rápida e ágil, direto para as mãos do seu público alvo, cliente ou colaborador."
                  count={0}
                  variant="mex10"
                />
              </div>
            ) : active === "traqueamento" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <IntegrationCard
                  logoUrl={nemuLogo.url}
                  name="Nemu"
                  description="Faça o traqueamento da origem das suas vendas e escale suas campanhas"
                  count={0}
                  variant="nemu"
                />
                <IntegrationCard
                  logoUrl={xtrackyLogo.url}
                  name="Xtracky"
                  description="Rastreie todas as suas vendas e tenha dados precisos da sua operação no Kwai."
                  count={0}
                  variant="xtracky"
                />
                <IntegrationCard
                  logoUrl={utmifyLogo.url}
                  name="Utmify"
                  description="Rastreie suas vendas de forma precisa e aumente seu lucro em até 40%"
                  count={0}
                  variant="utmify"
                />
              </div>
            ) : active === "notas" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <IntegrationCard
                  logoUrl={spedyLogo.url}
                  name="Spedy"
                  description="Minimizamos o trabalho operacional do seu negócio, conectando na sua plataforma de pagamento e emitindo as notas fiscais automaticamente."
                  count={0}
                  variant="spedy"
                />
                <IntegrationCard
                  logoUrl={notazzLogo.url}
                  name="Notazz"
                  description="Minimizamos o trabalho operacional do seu negócio, conectando na sua plataforma de pagamento e emitindo as notas fiscais automaticamente."
                  count={0}
                  variant="notazz"
                />

              </div>
            ) : active === "logistica" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <IntegrationCard
                  logoUrl={correiosLogo.url}
                  name="Correios"
                  description="Integração com os correios para calcular o frete e gerar etiquetas."
                  count={0}
                  variant="correios"
                />
                <IntegrationCard
                  logoUrl={blingLogo.url}
                  name="Bling"
                  description="Com o sistema ERP Bling, você automatiza tarefas, como emissão de notas fiscais e controle fiscal, com integração multicanal, gestão financeira, operacional."
                  count={0}
                  variant="bling"
                />
              </div>
            ) : active === "ecommerce" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <ShopifyCard />
              </div>
            ) : active === "webhooks" ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <IntegrationCard
                  logoUrl={paglinkLogo.url}
                  name="Paglink Webhooks"
                  description="Integração universal com outras plataformas via Webhook Posts."
                  count={0}
                  variant="paglinkwebhooks"
                />
              </div>
            ) : (
              <IntegrationEmpty
                icon={activeTab.icon}
                title={activeTab.label}
                description={activeTab.description}
              />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function IntegrationEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-[280px] place-items-center text-center">
      <div className="max-w-md space-y-3">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Icon className="h-6 w-6 text-black" />
        </span>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="pt-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Plug className="h-3.5 w-3.5" /> Nenhuma integração conectada ainda.
        </p>
      </div>
    </div>
  );
}

type DialogVariant = "activecampaign" | "smsfunnel" | "gtisms" | "mex10" | "nemu" | "utmify" | "xtracky" | "spedy" | "notazz" | "correios" | "bling" | "paglinkwebhooks";

function IntegrationCard({
  logoUrl,
  name,
  description,
  count,
  variant = "activecampaign",
}: {
  logoUrl: string;
  name: string;
  description: string;
  count: number;
  variant?: DialogVariant;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <img src={logoUrl} alt={name} className="h-10 w-10 rounded-lg object-contain" />
        <p className="text-base font-semibold">{name}</p>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
          Integrações: {count}
        </span>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 gap-1.5 text-xs font-semibold tracking-wider text-black"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus className="h-3.5 w-3.5" />
          ADICIONAR
        </Button>
      </div>
      {variant === "smsfunnel" ? (
        <SmsFunnelDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "gtisms" ? (
        <GtiSmsDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "mex10" ? (
        <Mex10Dialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "nemu" ? (
        <NemuDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "utmify" ? (
        <UtmifyDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "xtracky" ? (
        <XtrackyDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "spedy" ? (
        <SpedyDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "notazz" ? (
        <NotazzDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "correios" ? (
        <CorreiosDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "bling" ? (
        <BlingDialog open={open} onOpenChange={setOpen} name={name} />
      ) : variant === "paglinkwebhooks" ? (
        <PaglinkWebhooksDialog open={open} onOpenChange={setOpen} />
      ) : (
        <ActiveCampaignDialog open={open} onOpenChange={setOpen} name={name} />
      )}

    </div>
  );
}

function SmsFunnelDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FieldText label="" placeholder="URL de Postback" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Métodos de Pagamento</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Status do Pagamento</p>
            <div className="space-y-2">
              {STATUS_LIST.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GtiSmsDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FieldText label="" placeholder="E-mail da conta" />
          <FieldText label="" placeholder="Token da API" />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Métodos de Pagamento</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Status do Pagamento</p>
            <div className="space-y-2">
              {STATUS_LIST.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function XtrackyDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-background px-1 text-[10px] text-muted-foreground">
              Título
            </span>
            <Input defaultValue="Xtracky" className="h-10" />
          </div>
          <FieldText label="" placeholder="URL de Postback" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Métodos de Pagamento</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Status do Pagamento</p>
            <div className="space-y-2">
              {STATUS_LIST.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UtmifyDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const utmifyStatus = ["Pago", "Reembolsado", "Aguardando Pagamento", "Recusado", "Chargeback"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FieldText label="" placeholder="Token da API" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Métodos de Pagamento</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Status do Pagamento</p>
            <div className="space-y-2">
              {utmifyStatus.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NemuDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FieldText label="" placeholder="Token da API" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Métodos de Pagamento</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Status do Pagamento</p>
            <div className="space-y-2">
              {STATUS_LIST.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Mex10Dialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Mex 10</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FieldText label="" placeholder="URL de Webhook" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Mensagem de abandono" className="min-h-[90px]" />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Métodos de Pagamento</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Status do Pagamento</p>
            <div className="space-y-2">
              {STATUS_LIST.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PAYMENT_METHODS = [
  "Cartão de Crédito",
  "Boleto",
  "PIX",
  "Pay After Delivery",
  "Wallet",
  "Transferência Bancária",
  "Voucher",
];

const STATUS_LIST = [
  "Em processamento",
  "Pago",
  "Reembolsado",
  "Aguardando pagamento",
  "Recusado",
  "Chargeback",
  "Cancelado",
  "Antifraude",
  "Pré Chargeback",
  "Falha",
  "Em disputa",
  "Em análise",
  "Não pago",
  "PAD Aprovado",
  "Checkout Abandonado",
];

function ActiveCampaignDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [enabled, setEnabled] = useState(true);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Produtos
            </Label>
            <Select>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Métodos de Pagamento
            </p>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status de Pagamento
            </p>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {STATUS_LIST.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <FieldText label="URL de conversão" />
          <FieldText label="Token da API" />
          <FieldText label="ID da Lista" />

          <FieldText label="Tag de Conversão de pedidos cadastro_cliente" placeholder="cadastro_cliente" />
          <FieldText label="Tag de Conversão de pedidos feitos por Cartão" placeholder="pedidos_cartao" />
          <FieldText label="Tag de Conversão de pedidos feitos por Pix" placeholder="pedidos_pix" />
          <FieldText label="Tag de Conversão de pedidos feitos por Boleto" placeholder="pedidos_boleto" />
          <FieldText label="Tag de Cartão aprovado" placeholder="pagamentos_cartao" />
          <FieldText label="Tag de Pix pago" placeholder="pagamentos_pix" />
          <FieldText label="Tag de Boleto pago" placeholder="pagamentos_boleto" />
          <FieldText label="Tag de Abandono de Carrinho" placeholder="carrinho_abandonado" />
          <FieldText label="Tag de Pedido recusado" placeholder="pedido_recusado" />

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm">Status da Integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldText({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input placeholder={placeholder} className="h-10" />
    </div>
  );
}

function SpedyDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [noteType, setNoteType] = useState<"nfse" | "nfe">("nfse");
  const [sendEmail, setSendEmail] = useState(false);
  const [enabled, setEnabled] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FieldText label="" placeholder="Token da API" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Tipo de nota fiscal</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="spedy-note-type"
                checked={noteType === "nfse"}
                onChange={() => setNoteType("nfse")}
                className="accent-fuchsia-500"
              />
              <span>NFS-e (serviço) (padrão)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="spedy-note-type"
                checked={noteType === "nfe"}
                onChange={() => setNoteType("nfe")}
                className="accent-fuchsia-500"
              />
              <span>NF-e (produto)</span>
            </label>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Quando emitir a nota</p>
            <Select>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Emitir após o período de garantia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="garantia">Emitir após o período de garantia</SelectItem>
                <SelectItem value="pagamento">Emitir após o pagamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            <span className="text-sm text-muted-foreground">
              Enviar nota fiscal para o e-mail do cliente?
            </span>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NotazzDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  const [noteType, setNoteType] = useState<"nfse" | "nfe">("nfse");
  const [days, setDays] = useState("0");
  const [sendEmail, setSendEmail] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <FieldText label="" placeholder="Token da API" />
          <FieldText label="" placeholder="Token do webhook" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Tipo de nota fiscal</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="notazz-note-type"
                checked={noteType === "nfse"}
                onChange={() => setNoteType("nfse")}
                className="accent-fuchsia-500"
              />
              <span>NFS-e (serviço) (recomendado)</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="notazz-note-type"
                checked={noteType === "nfe"}
                onChange={() => setNoteType("nfe")}
                className="accent-fuchsia-500"
              />
              <span>NF-e (produto)</span>
            </label>
          </div>

          <FieldText label="" placeholder="Token do logisticard" />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Tempo de emissão</p>
            <p className="text-xs text-muted-foreground">Quantos dias após o pagamento?</p>
            <div className="relative">
              <Input
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-10 pr-14"
                inputMode="numeric"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                dias
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              A nota fiscal será emitida automaticamente {days || 0} dia(s) após a confirmação do pagamento.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
            <span className="text-sm text-muted-foreground">
              Enviar nota fiscal para o e-mail do cliente?
            </span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CorreiosDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <Select disabled>
            <SelectTrigger className="h-10 opacity-60">
              <SelectValue placeholder="Ofertas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
          <FieldText label="" placeholder="Número do cartão postal" />
          <FieldText label="" placeholder="Código do serviço" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Formato do pacote" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="caixa">Caixa/Pacote</SelectItem>
              <SelectItem value="rolo">Rolo/Prisma</SelectItem>
              <SelectItem value="envelope">Envelope</SelectItem>
            </SelectContent>
          </Select>
          <FieldText label="" placeholder="Usuário dos Correios" />
          <FieldText label="" placeholder="Token de acesso dos Correios" />

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BlingDialog({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-background px-1 text-[10px] text-muted-foreground">
              Tipo
            </span>
            <Select>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nfe">NF-e</SelectItem>
                <SelectItem value="nfce">NFC-e</SelectItem>
                <SelectItem value="nfse">NFS-e</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FieldText label="" placeholder="Url callback" />
          <FieldText label="" placeholder="Client id" />
          <FieldText label="" placeholder="Client secret" />

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR E CONCEDER ACESSO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaglinkWebhooksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [title, setTitle] = useState("Webhooks");
  const [enabled, setEnabled] = useState(false);
  const [affiliates, setAffiliates] = useState(false);
  const [tracking, setTracking] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Webhooks</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="relative">
            <span className="absolute -top-2 left-3 bg-background px-1 text-[10px] text-muted-foreground">
              Título
            </span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10" />
          </div>
          <FieldText label="" placeholder="URL de Postback" />
          <Select>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Produtos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Métodos de Pagamento</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Status do Pagamento</p>
            <div className="space-y-2">
              {STATUS_LIST.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm text-muted-foreground">Status da integração</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={affiliates} onCheckedChange={setAffiliates} />
            <span className="text-sm text-muted-foreground">Disparar para novos afiliados</span>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={tracking} onCheckedChange={setTracking} />
            <span className="text-sm text-muted-foreground">Enviar Código de Rastreio</span>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => onOpenChange(false)}
          >
            SALVAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}




type ShopifyConnStatus =
  | { connected: false }
  | {
      connected: true;
      connection: {
        id: string;
        shop_domain: string;
        shop_name: string | null;
        shop_email: string | null;
        currency: string | null;
        status: string;
        last_sync_at: string | null;
        last_error: string | null;
      };
      productCount: number;
    };

function ShopifyCard() {
  const [status, setStatus] = useState<ShopifyConnStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useServerFn(getShopifyConnection);
  const sync = useServerFn(syncShopifyProducts);
  const disconnect = useServerFn(disconnectShopify);

  useEffect(() => {
    void load().then((s) => setStatus(s as ShopifyConnStatus));
  }, [load]);

  const connected = status?.connected === true;
  const conn = connected ? status.connection : null;

  async function handleSync() {
    setBusy(true);
    try {
      const res = await sync();
      toast.success(`Sincronização concluída — ${res.count} produto(s).`);
      const s = await load();
      setStatus(s as ShopifyConnStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Desconectar a loja Shopify? Os produtos importados serão apagados.")) return;
    setBusy(true);
    try {
      await disconnect();
      toast.success("Loja desconectada.");
      setStatus({ connected: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#96bf48] text-white">
          <ShoppingBag className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-semibold">Shopify</p>
          {connected && conn?.shop_domain && (
            <p className="text-[11px] text-muted-foreground">{conn.shop_domain}</p>
          )}
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        Conecte sua loja Shopify para importar produtos automaticamente e processar as vendas pelo
        gateway Paglink.
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
          {connected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Conectado · {(status as { productCount: number }).productCount} produtos
            </>
          ) : (
            "Integrações: 0"
          )}
        </span>
        {connected ? (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={busy}
              className="h-8 gap-1.5 text-xs"
              title="Sincronizar produtos"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sincronizar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDisconnect}
              disabled={busy}
              className="h-8 w-8 p-0 text-destructive"
              title="Desconectar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            ADICIONAR
          </Button>
        )}
      </div>
      <ShopifyDialog
        open={open}
        onOpenChange={setOpen}
        onConnected={async () => {
          const s = await load();
          setStatus(s as ShopifyConnStatus);
        }}
      />
    </div>
  );
}

function ShopifyDialog({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConnected: () => void | Promise<void>;
}) {
  const [shop, setShop] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const connect = useServerFn(connectShopify);

  async function handleSubmit() {
    if (!shop.trim() || !token.trim()) {
      toast.error("Preencha o domínio e o token.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await connect({ data: { shop: shop.trim(), token: token.trim() } });
      toast.success(`Conectado a ${res.shop}. Produtos sincronizados.`);
      setShop("");
      setToken("");
      onOpenChange(false);
      await onConnected();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível conectar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Conectar loja Shopify</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Domínio da loja
            </Label>
            <Input
              placeholder="minhaloja.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Admin API access token
            </Label>
            <Input
              placeholder="shpat_..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="h-10 font-mono text-xs"
              type="password"
            />
          </div>
          <details className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Como obter o token? <ExternalLink className="ml-1 inline h-3 w-3" />
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>No admin da Shopify: <strong>Settings → Apps and sales channels → Develop apps</strong>.</li>
              <li>Clique em <strong>Create an app</strong> e dê um nome (ex.: Paglink).</li>
              <li>Em <strong>Configuration → Admin API</strong>, marque os escopos: <code className="text-[11px]">read_products</code>, <code className="text-[11px]">read_product_listings</code>, <code className="text-[11px]">read_inventory</code>.</li>
              <li>Salve, clique em <strong>Install app</strong> e copie o <em>Admin API access token</em> (começa com <code>shpat_</code>).</li>
              <li>Cole o token e o domínio da loja aqui.</li>
            </ol>
          </details>
          <Button
            className="w-full h-11 text-sm font-semibold tracking-wider text-black"
            style={{ background: "var(--gradient-brand)" }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> CONECTANDO…
              </>
            ) : (
              "CONECTAR E SINCRONIZAR"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

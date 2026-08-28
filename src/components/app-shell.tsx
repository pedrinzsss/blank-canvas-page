import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  BarChart3,
  Wallet,
  Plug,
  Code2,
  Bell,
  Moon,
  LogOut,
  Webhook,
  BookOpen,
  Lock,
  ArrowRight,
  Clock,
  ChevronDown,
  User as UserIcon,
  FileText,
  Sun,
  Gift,
  Trophy,
  CreditCard,
  QrCode,
  Menu,
  ShoppingBag,
  Wallet2,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Package,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  Receipt,
  ArrowLeftRight,
  Banknote,
  Settings,
  Calendar,
  Send,
  Barcode,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
} from "lucide-react";


import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import logo from "@/assets/logo.png.asset.json";
import { useLogoUrl } from "@/lib/images-applier";
import { useKycStatus } from "@/lib/use-kyc-status";
import { toggleTheme, getCurrentTheme } from "@/lib/theme-applier";
import { NotificationsBell } from "@/components/notifications-bell";


type NavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to?: string;
  children?: NavItem[];
  badge?: string;
};


function SectionTitle({ children, className = "", collapsed = false }: { children: ReactNode; className?: string; collapsed?: boolean }) {
  return (
    <div className={`px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-opacity duration-300 ${collapsed ? "opacity-0" : "opacity-100"} ${className}`}>
      {children}
    </div>
  );
}

const quickActions = [
  { icon: QrCode, label: "Pix", to: "/pagamentos" as const },
  { icon: ArrowLeftRight, label: "Transferir", to: "/criar-cobranca" as const },
  { icon: Banknote, label: "Pagar", to: "/link-de-pagamento" as const },
];

const navItems: NavItem[] = [
  { icon: Home, label: "Início", to: "/dashboard" },
  { icon: Receipt, label: "Extrato", to: "/relatorios" },
  { icon: Users, label: "Clientes", to: "/clientes" },
  { icon: ArrowDownCircle, label: "Recebimentos", to: "/recebimentos" },
  { icon: Store, label: "Vendas", to: "/vendas" },
  { icon: Package, label: "Catalogo", to: "/catalogo" },
  { icon: TrendingUp, label: "Antecipação", to: "/antecipacao" },
  { icon: Barcode, label: "Emitir Boleto", to: "/boletos" },
  { icon: QrCode, label: "Criar QRCode", to: "/pagamentos" },
  { icon: Send, label: "Link de Pagamento", to: "/link-de-pagamento" },
  { icon: CreditCard, label: "Venda Digitada", to: "/venda-digitada" },
  { icon: Calendar, label: "Assinaturas", to: "/planos" },
  { icon: BarChart3, label: "Simular Taxas", to: "/simular-taxas" },
  { icon: Users, label: "Equipe", to: "/equipe" },
  { icon: Users, label: "Afiliados e Split", to: "/split-de-pagamentos" },
  { icon: Wallet2, label: "Minha conta de afiliado", to: "/minhas-afiliacoes" },
];

const navItemsManagement: NavItem[] = [
  { icon: LayoutGrid, label: "Geral", to: "/configuracoes" },
  { icon: TrendingUp, label: "Receitas", to: "/receitas" },
  { icon: TrendingDown, label: "Despesas", to: "/despesas" },
];
const navItemsApps: NavItem[] = [];


interface AppShellProps {
  title: string;
  subtitle?: string;
  headerCenter?: ReactNode;
  children: ReactNode;
  showMobileBalance?: boolean;
}

export function AppShell({ title, subtitle, headerCenter, children, showMobileBalance = false }: AppShellProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("Usuário");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dynamicLogo = useLogoUrl();

  const {
    status: kycStatus,
    loading: kycLoading,
    isApproved: kycApproved,
    isDemo,
    accountKind,
  } = useKycStatus();
  const isAdminArea = pathname.startsWith("/admin");
  const isOnboarding = pathname.startsWith("/onboarding");
  const kycRestricted = !kycLoading && !isAdminArea && !isOnboarding && !kycApproved;
  const affiliateStatementAllowed =
    accountKind === "affiliate" && pathname.startsWith("/minhas-afiliacoes");
  const gated = kycRestricted && !affiliateStatementAllowed;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const name =
        profile?.full_name ||
        (user.user_metadata?.full_name as string | undefined) ||
        user.email ||
        "Usuário";
      setUserName(name.split(" ")[0]);
    });
    setTheme(getCurrentTheme());
  }, []);


  async function handleSignOut() {
    const { logAudit } = await import("@/lib/audit");
    await logAudit("logout", {});
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        style={{ background: "var(--gradient-panel)" }}
        aria-hidden
      />
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-border bg-card/40 py-5 backdrop-blur-sm lg:flex">
          <SidebarBody
            dynamicLogo={dynamicLogo}
            pathname={pathname}
            gated={kycRestricted}
            allowAffiliateStatement={accountKind === "affiliate"}
            onSignOut={handleSignOut}
          />
        </aside>

        {/* Mobile Sidebar */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="w-72 border-r border-border bg-card/95 px-4 py-5 backdrop-blur-sm lg:hidden"
          >
            <div onClick={() => setMobileNavOpen(false)} className="flex h-full flex-col">
              <SidebarBody
                dynamicLogo={dynamicLogo}
                pathname={pathname}
                gated={kycRestricted}
                allowAffiliateStatement={accountKind === "affiliate"}
                onSignOut={handleSignOut}
              />
            </div>
          </SheetContent>
        </Sheet>



        {/* Main */}
        <main className="flex-1 min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border/70 bg-background/70 px-4 py-4 backdrop-blur-md sm:gap-6 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground hover:bg-secondary/60 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {headerCenter}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:bg-secondary/60"
                onClick={async () => {
                  const next = await toggleTheme();
                  setTheme(next);
                }}
                aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <NotificationsBell />
              <div className="ml-1 h-8 w-px bg-border/70" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-2 py-1 backdrop-blur hover:bg-secondary/60 transition-colors">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white ring-1 ring-white/10"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="pr-1 text-sm font-medium">{userName}</span>
                    <ChevronDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <div
                      className="grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white"
                      style={{ background: "var(--gradient-brand)" }}
                    >
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{userName}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/perfil" })}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/dashboard" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/documentacao" })}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Documentação
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={() => navigate({ to: "/onboarding" })}>
                    <FileText className="mr-2 h-4 w-4" />
                    Meus documentos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/docs" })}>
                    <Code2 className="mr-2 h-4 w-4" />
                    Documentação API
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={async () => {
                      const next = await toggleTheme();
                      setTheme(next);
                    }}
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Desconectar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {gated ? (
            <KycGateBanner status={kycStatus} />
          ) : null}
          {isDemo && !isAdminArea ? <DemoModeBanner /> : null}
          {showMobileBalance && (
            <div className="lg:hidden p-4 border-b border-border/60">
              <MobileBalanceCard />
            </div>
          )}
          <div
            className={
              gated
                ? "pointer-events-none select-none opacity-40 blur-[2px]"
                : undefined
            }
            aria-hidden={gated}
          >
            {children}
          </div>
        </main>
      </div>
      <Toaster theme="dark" />
      
    </div>
  );
}

function DemoModeBanner() {
  return (
    <div className="mx-4 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 sm:mx-6">
      <span className="font-semibold">Conta de demonstração.</span>{" "}
      Você pode navegar e testar os recursos, mas credenciais e movimentações financeiras reais permanecem bloqueadas.
    </div>
  );
}

function SidebarBody({
  dynamicLogo,
  pathname,
  gated,
  allowAffiliateStatement,
  onSignOut,
}: {
  dynamicLogo: string | null | undefined;
  pathname: string;
  gated: boolean;
  allowAffiliateStatement: boolean;
  onSignOut: () => void;
}) {
  const [showBalance, setShowBalance] = useState(true);
  const [account, setAccount] = useState<{ name: string; doc: string }>({
    name: "Minha conta",
    doc: "",
  });
  const [balance, setBalance] = useState<{ available: number; pending: number }>({
    available: 0,
    pending: 0,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || !alive) return;

      // 1. Get auth metadata
      const meta = (userRes.user.user_metadata ?? {}) as Record<string, unknown>;
      
      // 2. Try to get from kyc_submissions (source of document)
      const [{ data: kyc }, { data: profile }] = await Promise.all([
        supabase
          .from("kyc_submissions")
          .select("document, company_name, full_name")
          .eq("user_id", userRes.user.id)
          .maybeSingle(),
        (supabase as any)
          .from("profiles")
          .select("full_name, email")
          .eq("id", userRes.user.id)
          .maybeSingle(),
      ]);

      if (alive) {
        const rawDoc = kyc?.document || (meta.document as string) || (userRes.user.email ?? "");
        let formattedDoc = rawDoc;
        
        // Formatar CPF ou CNPJ se contiver apenas números
        const digits = rawDoc.replace(/\D/g, "");
        if (digits.length === 11) {
          formattedDoc = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        } else if (digits.length === 14) {
          formattedDoc = digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        }

        setAccount({
          name:
            kyc?.company_name ||
            kyc?.full_name ||
            profile?.full_name ||
            (meta.company_name as string) ||
            (meta.full_name as string) ||
            userRes.user.email ||
            "Minha conta",
          doc: formattedDoc,
        });
      }

      const { data: charges } = await supabase
        .from("manual_charges")
        .select("amount_cents,status")
        .limit(500);

      if (!alive || !charges) return;
      let available = 0;
      let pending = 0;
      for (const c of charges as Array<{ amount_cents: number | null; status: string | null }>) {
        const cents = c.amount_cents ?? 0;
        const st = (c.status ?? "").toLowerCase();
        if (st === "paid" || st === "approved") available += cents;
        else if (st === "pending" || st === "waiting_payment") pending += cents;
      }
      setBalance({ available: available / 100, pending: pending / 100 });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const money = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-10 items-center px-5">
        {dynamicLogo ? (
          <img src={dynamicLogo} alt="Paglink" className="h-8 w-auto object-contain" />
        ) : null}
      </div>

      {/* Conta */}
      <Link
        to="/perfil"
        className="mt-4 flex items-center gap-2 border-b border-border/60 px-5 pb-4 transition-colors hover:bg-secondary/40"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{account.doc}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      {/* Saldo */}
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">Saldo da conta</p>
            <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-foreground">
              {showBalance ? money(balance.available) : "••••••"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowBalance((v) => !v)}
            aria-label={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            R$ {showBalance ? money(0) : "••••"} bloqueados
          </p>
        </div>

        {/* Ações rápidas */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`flex flex-col items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground ${
                gated ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary/70 text-foreground transition-colors group-hover:bg-secondary">
                <action.icon className="h-4 w-4" />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Navegação */}
      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLinkItem
            key={item.label}
            item={item}
            activePath={pathname}
            disabled={gated && !(allowAffiliateStatement && item.to === "/minhas-afiliacoes")}
          />
        ))}

        {navItemsManagement.length > 0 && (
          <>
            <SectionTitle className="mt-5">Gestão</SectionTitle>
            {navItemsManagement.map((item) => (
              <NavLinkItem key={item.label} item={item} activePath={pathname} disabled={gated} />
            ))}
          </>
        )}

        {navItemsApps.length > 0 && (
          <>
            <SectionTitle className="mt-5">Aplicativos</SectionTitle>
            {navItemsApps.map((item) => (
              <NavLinkItem key={item.label} item={item} activePath={pathname} disabled={gated} />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-border/60 px-3 py-3">
        <Button
          variant="ghost"
          onClick={onSignOut}
          className="w-full justify-start gap-3 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </Button>
      </div>
    </div>
  );
}




function NavLinkItem({
  item,
  activePath,
  disabled,
  collapsed = false,
}: {
  item: NavItem;
  activePath: string;
  disabled?: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  const active = !!item.to && activePath === item.to;
  const hasChildren = !!item.children && item.children.length > 0;
  const childActive =
    hasChildren && item.children!.some((c) => c.to && activePath === c.to);
  const [open, setOpen] = useState(childActive || (hasChildren && !item.to));
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const className = `group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all ${
    active
      ? "bg-secondary/80 font-medium text-foreground"
      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
  } ${disabled ? "pointer-events-none cursor-not-allowed opacity-40" : ""} ${collapsed ? "lg:px-5" : ""}`;

  const activeBar = active ? (
    <span
      className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-foreground"
      aria-hidden
    />
  ) : null;


  const chevron = hasChildren ? (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      className="ml-auto rounded p-1 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      aria-label={open ? "Recolher" : "Expandir"}
      aria-expanded={open}
    >
      <ChevronDown
        className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
  ) : null;

  const badge = item.badge ? (
    <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      {item.badge}
    </span>
  ) : null;

  const rendered =
    item.to && !disabled ? (
      <Link to={item.to} className={className}>
        {activeBar}
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary-glow" : "group-hover:text-foreground"}`} />
        <span className={`flex-1 text-left transition-opacity duration-300 ${collapsed ? "lg:opacity-0 lg:group-hover/sidebar:opacity-100" : ""}`}>{item.label}</span>
        {badge}
        {chevron}
      </Link>
    ) : (
      <button
        className={className}
        type="button"
        disabled={disabled}
        onClick={hasChildren ? () => setOpen((v) => !v) : undefined}
      >
        {activeBar}
        <Icon className="h-4 w-4 shrink-0" />
        <span className={`flex-1 text-left transition-opacity duration-300 ${collapsed ? "lg:opacity-0 lg:group-hover/sidebar:opacity-100" : ""}`}>{item.label}</span>
        {badge}
        {disabled ? <Lock className="h-3.5 w-3.5 opacity-70" /> : chevron}
      </button>
    );


  if (!hasChildren) return rendered;

  return (
    <div>
      {rendered}
      {open && (
        <div className="mt-0.5 ml-4 space-y-0.5 border-l border-border/70 pl-2">
          {item.children!.map((child) => (
            <NavLinkItem
              key={child.label}
              item={child}
              activePath={activePath}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KycGateBanner({ status }: { status: string | null }) {
  const isSubmitted = status === "submitted";
  const isChanges = status === "changes_requested";
  const isRejected = status === "rejected";

  const title = isSubmitted
    ? "Cadastro enviado — em análise"
    : isChanges
      ? "Precisamos de ajustes no seu cadastro"
      : isRejected
        ? "Cadastro rejeitado"
        : "Finalize seu cadastro para começar";
  const description = isSubmitted
    ? "Nossa equipe está revisando seus dados e documentos. As funções da plataforma serão liberadas após a aprovação."
    : isChanges
      ? "Um analista solicitou mudanças. Ajuste as informações e envie novamente."
      : isRejected
        ? "Seu cadastro foi rejeitado. Ajuste as informações e envie novamente para nova análise."
        : "Preencha seus dados, envie seus documentos e cadastre sua conta bancária para liberar o uso completo da plataforma.";
  const cta = isSubmitted ? "Ver meu cadastro" : "Finalizar cadastro";
  const Icon = isSubmitted ? Clock : Lock;

  return (
    <div
      className="m-6 rounded-2xl border border-border p-5"
      style={{ background: "var(--gradient-panel)" }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Link
          to="/onboarding"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow"
          style={{ background: "var(--gradient-brand)" }}
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function MobileBalanceCard() {
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState<{ available: number; pending: number }>({
    available: 0,
    pending: 0,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user || !alive) return;

      const { data: charges } = await supabase
        .from("manual_charges")
        .select("amount_cents,status")
        .limit(500);

      if (!alive || !charges) return;
      let available = 0;
      let pending = 0;
      for (const c of charges as Array<{ amount_cents: number | null; status: string | null }>) {
        const cents = c.amount_cents ?? 0;
        const st = (c.status ?? "").toLowerCase();
        if (st === "paid" || st === "approved") available += cents;
        else if (st === "pending" || st === "waiting_payment") pending += cents;
      }
      setBalance({ available: available / 100, pending: pending / 100 });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const money = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">Saldo da conta</p>
          <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-foreground">
            {showBalance ? money(balance.available) : "••••••"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBalance((v) => !v)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3 shrink-0" />
        R$ {showBalance ? money(0) : "••••"} bloqueados
      </p>

      <div className="grid grid-cols-3 gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="flex flex-col items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary/70 text-foreground transition-colors group-hover:bg-secondary">
              <action.icon className="h-4 w-4" />
            </span>
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

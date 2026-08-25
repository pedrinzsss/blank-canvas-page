import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FileCheck2,
  Landmark,
  ShoppingCart,
  ArrowDownToLine,
  CreditCard,
  Webhook,
  ScrollText,
  ShieldCheck,
  Package,
  Share2,
  LogOut,
  Bell,
  Moon,
  Sun,
  ArrowLeftRight,
  Building2,
  BookOpen,
  UserSquare2,
  RefreshCcw,
  FileText,
  Undo2,
  Target,
  BarChart3,
  Store,
  Plug,
  Palette,
  Menu,
  Users,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import logo from "@/assets/logo.png.asset.json";
import { useLogoUrl } from "@/lib/images-applier";
import { NotificationsBell } from "@/components/notifications-bell";
import { toggleTheme, getCurrentTheme } from "@/lib/theme-applier";

type NavItem = { icon: React.ComponentType<{ className?: string }>; label: string; to: string };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { icon: LayoutDashboard, label: "Home", to: "/admin/dashboard" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: ShieldCheck, label: "Verificação KYC", to: "/admin/kyc" },
      { icon: UserSquare2, label: "Clientes", to: "/admin/produtores" },
      { icon: Landmark, label: "Contas Bancárias", to: "/admin/contas-bancarias" },
    ],
  },



  {
    label: "Financeiro",
    items: [
      { icon: BarChart3, label: "Relatórios", to: "/admin/relatorios" },
      { icon: ArrowDownToLine, label: "Saques", to: "/admin/saques" },
      { icon: Landmark, label: "Saldo", to: "/admin/saldo" },
      { icon: ArrowLeftRight, label: "Transações", to: "/admin/transacoes" },
      { icon: Undo2, label: "Reembolsos", to: "/admin/reembolsos" },
    ],
  },

  {
    label: "Configurações",
    items: [
      { icon: Store, label: "Adquirentes", to: "/admin/adquirentes-list" },
      { icon: Palette, label: "Tema", to: "/admin/tema" },
      { icon: ScrollText, label: "Logs", to: "/admin/logs" },
      { icon: Users, label: "Colaboradores", to: "/admin/colaboradores" },
    ],

  },
];

interface AdminShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("Admin");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const dynamicLogo = useLogoUrl();
  const [theme, setTheme] = useState<"light" | "dark">(() => getCurrentTheme());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name =
        (data.user?.user_metadata?.full_name as string | undefined) ??
        data.user?.email ??
        "Admin";
      setUserName(name.split(" ")[0]);
    });
  }, []);

  async function handleSignOut() {
    const { logAudit } = await import("@/lib/audit");
    await logAudit("logout", {});
    localStorage.removeItem("admin_access");
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
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/40 px-4 py-5 lg:flex backdrop-blur-sm">
          <AdminSidebarBody dynamicLogo={dynamicLogo} pathname={pathname} onSignOut={handleSignOut} />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="w-72 border-r border-border bg-card/95 px-4 py-5 backdrop-blur-sm lg:hidden"
          >
            <div onClick={() => setMobileNavOpen(false)} className="flex h-full flex-col">
              <AdminSidebarBody
                dynamicLogo={dynamicLogo}
                pathname={pathname}
                onSignOut={handleSignOut}
              />
            </div>
          </SheetContent>
        </Sheet>

        <main className="flex-1 min-w-0 overflow-hidden">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-background/70 px-4 py-4 backdrop-blur-md sm:gap-6 sm:px-6">
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
              {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
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
              <div className="ml-1 hidden h-8 w-px bg-border/70 sm:block" />
              <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-2 py-1 backdrop-blur sm:flex">
                <div
                  className="grid h-7 w-7 place-items-center rounded-full text-xs font-semibold text-white ring-1 ring-white/10"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="pr-2 text-sm font-medium">{userName}</span>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
      <Toaster theme="dark" />
    </div>
  );
}

function AdminSidebarBody({
  dynamicLogo,
  pathname,
  onSignOut,
}: {
  dynamicLogo: string | null | undefined;
  pathname: string;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="mb-6 flex h-8 items-center justify-between px-2">
        {dynamicLogo ? (
          <img src={dynamicLogo} alt="Paglink Admin" className="h-8 w-auto object-contain" />
        ) : (
          <span />
        )}
        <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/90">
          Admin
        </span>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLinkItem key={item.label} item={item} activePath={pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 space-y-1 border-t border-border/70 pt-3">
        <Link
          to="/dashboard"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-secondary/60 hover:text-foreground"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Ir para painel do usuário
        </Link>
        <Button
          variant="ghost"
          onClick={onSignOut}
          className="w-full justify-start gap-3 rounded-xl text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );
}

function NavLinkItem({ item, activePath }: { item: NavItem; activePath: string }) {
  const Icon = item.icon;
  const active = activePath === item.to;
  const className = `group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all ${
    active
      ? "bg-primary/10 text-foreground"
      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
  }`;

  return (
    <Link to={item.to} className={className}>
      {active && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full"
          style={{ background: "var(--gradient-brand)" }}
          aria-hidden
        />
      )}
      <Icon className={`h-4 w-4 ${active ? "text-primary-glow" : "group-hover:text-foreground"}`} />
      <span className="flex-1 text-left">{item.label}</span>
    </Link>
  );
}

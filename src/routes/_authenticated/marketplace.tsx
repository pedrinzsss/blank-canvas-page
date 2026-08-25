import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, Package, Flame, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/marketplace")({
  component: MarketplacePage,
});

type Product = {
  id: string;
  title: string;
  category: string | null;
  image_url: string | null;
  price_cents: number | null;
  recurrence_price_cents: number | null;
  payment_type: string;
  affiliate_commission_percent: number | null;
  created_at?: string;
  owner_name?: string | null;
};

type ProductDetail = Product & {
  user_id: string;
  description: string | null;
  affiliate_description: string | null;
  support_email: string | null;
  affiliation_mode: string | null;
  created_at: string;
  owner: {
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
  } | null;
};

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paymentLabel(t: string) {
  return t === "recurrence" || t === "subscription" ? "Assinatura" : "Pagamento Único";
}

const TABS = ["Todos", "Em alta", "Mais lucrativos", "Novidades"] as const;
type Tab = (typeof TABS)[number];

function MarketplacePage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Todos");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, title, category, image_url, price_cents, recurrence_price_cents, payment_type, affiliate_commission_percent, created_at, user_id",
        )
        .eq("show_in_showcase", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      const list = (data ?? []) as any[];
      const ownerIds = Array.from(new Set(list.map((p) => p.user_id).filter(Boolean)));
      let owners: Record<string, string> = {};
      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        owners = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
      }
      setProducts(list.map((p) => ({ ...p, owner_name: owners[p.user_id] ?? null })) as Product[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.owner_name ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  const sections = useMemo(() => {
    const emAlta = [...filtered].slice(0, 10);
    const maisLucrativos = [...filtered]
      .sort((a, b) => {
        const ca = ((a.price_cents ?? a.recurrence_price_cents ?? 0) * Number(a.affiliate_commission_percent ?? 0)) / 100;
        const cb = ((b.price_cents ?? b.recurrence_price_cents ?? 0) * Number(b.affiliate_commission_percent ?? 0)) / 100;
        return cb - ca;
      })
      .slice(0, 10);
    const novidades = [...filtered]
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
      .slice(0, 10);
    return { emAlta, maisLucrativos, novidades };
  }, [filtered]);

  const headerCenter = (
    <div className="hidden items-center gap-2 md:flex">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar"
          className="w-56 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
      <button className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground">
        <SlidersHorizontal className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <AppShell title="Marketplace" headerCenter={headerCenter}>
      <div className="space-y-8 p-6">
        <div className="flex w-fit items-center gap-1 rounded-xl border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {products === null ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
              <Package className="h-6 w-6 text-muted-foreground" />
            </span>
            <p className="text-lg font-semibold">
              {query ? "Nenhum produto encontrado" : "Nenhum produto na vitrine ainda"}
            </p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {query
                ? "Tente ajustar sua busca."
                : "Produtos aparecem aqui quando produtores marcam a opção de exibir na vitrine de afiliação."}
            </p>
          </div>
        ) : (
          <>
            {(tab === "Todos" || tab === "Em alta") && (
              <ProductRow title="Em alta" items={sections.emAlta} onOpen={setOpenId} />
            )}
            {(tab === "Todos" || tab === "Mais lucrativos") && (
              <ProductRow title="Mais lucrativos" items={sections.maisLucrativos} onOpen={setOpenId} />
            )}
            {(tab === "Todos" || tab === "Novidades") && (
              <ProductRow title="Novidades" items={sections.novidades} onOpen={setOpenId} />
            )}
          </>
        )}
      </div>

      <ProductDetailsDialog
        productId={openId}
        open={!!openId}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </AppShell>
  );
}

function ProductRow({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: Product[];
  onOpen: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  if (!items.length) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <button className="text-sm font-medium text-primary hover:underline">Ver mais</button>
      </div>
      <div className="group relative">
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 z-10 hidden h-9 w-9 -translate-x-2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground shadow-md group-hover:grid"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((p) => (
            <div key={p.id} className="w-[200px] shrink-0">
              <ProductCard product={p} onOpen={() => onOpen(p.id)} />
            </div>
          ))}
        </div>
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 z-10 hidden h-9 w-9 translate-x-2 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground shadow-md group-hover:grid"
          aria-label="Próximo"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const priceCents = product.price_cents ?? product.recurrence_price_cents ?? 0;
  const pct = Number(product.affiliate_commission_percent ?? 0);
  const commission = Math.floor((priceCents * pct) / 100);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/50"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-sm font-semibold">{product.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Por {product.owner_name ?? "Produtor"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Receba até <span className="font-semibold text-foreground">{money(commission)}</span>
        </p>
      </div>
    </button>
  );
}


function ProductDetailsDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [affiliating, setAffiliating] = useState(false);
  const [alreadyStatus, setAlreadyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    setDetail(null);
    setAlreadyStatus(null);
    setLoading(true);
    (async () => {
      const { data: p } = await supabase
        .from("products")
        .select(
          "id, title, category, image_url, price_cents, recurrence_price_cents, payment_type, affiliate_commission_percent, user_id, description, affiliate_description, support_email, affiliation_mode, created_at",
        )
        .eq("id", productId)
        .maybeSingle();
      if (!p) {
        setLoading(false);
        return;
      }
      const { data: owner } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, created_at")
        .eq("id", (p as any).user_id)
        .maybeSingle();

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: existing } = await supabase
          .from("affiliations")
          .select("status")
          .eq("product_id", productId)
          .eq("affiliate_user_id", userData.user.id)
          .maybeSingle();
        setAlreadyStatus((existing as any)?.status ?? null);
      }

      const { data: offer } = await supabase
        .from("offers")
        .select("description, support_email")
        .eq("product_id", productId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      setDetail({
        ...(p as any),
        description: (offer as any)?.description ?? (p as any).description ?? null,
        support_email: (offer as any)?.support_email ?? (p as any).support_email ?? null,
        owner: (owner as any) ?? null,
      });
      setLoading(false);
    })();
  }, [open, productId]);

  async function handleAffiliate() {
    if (!detail) return;
    if (detail.affiliation_mode === "disabled") {
      toast.error("Este produto não aceita afiliados");
      return;
    }
    setAffiliating(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Faça login para se afiliar");
      setAffiliating(false);
      return;
    }
    const { data: inserted, error } = await supabase
      .from("affiliations")
      .insert({
        product_id: detail.id,
        affiliate_user_id: userData.user.id,
        commission_percent: Number(detail.affiliate_commission_percent ?? 0),
      } as any)
      .select("status")
      .maybeSingle();
    if (error) {
      setAffiliating(false);
      toast.error(error.message.includes("duplicate") ? "Você já é afiliado" : "Erro ao se afiliar");
      return;
    }
    const status = (inserted as any)?.status ?? "pending";
    setAlreadyStatus(status);
    if (status === "approved") {
      toast.success("Afiliação aprovada!");
      setTimeout(() => {
        onOpenChange(false);
        navigate({ to: "/minhas-afiliacoes" });
      }, 600);
      return;
    }
    setAffiliating(false);
    toast.success("Solicitação enviada. Aguarde a aprovação do produtor.");
  }

  const priceCents = detail ? detail.price_cents ?? detail.recurrence_price_cents ?? 0 : 0;
  const pct = detail ? Number(detail.affiliate_commission_percent ?? 0) : 0;
  const maxCommission = Math.floor((priceCents * pct) / 100);
  const since = detail?.owner?.created_at
    ? new Date(detail.owner.created_at).toLocaleDateString("pt-BR", {
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">Detalhes</h2>
        </div>

        {loading || !detail ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <>
            <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,240px)_1fr]">
              <div className="space-y-3">
                <div className="aspect-square overflow-hidden rounded-xl bg-secondary">
                  {detail.image_url ? (
                    <img src={detail.image_url} alt={detail.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-foreground">
                      <Package className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                    {detail.owner?.avatar_url ? (
                      <img
                        src={detail.owner.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {(detail.owner?.full_name ?? "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {detail.owner?.full_name ?? "Produtor"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Desde {new Date(detail.created_at).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-semibold">{detail.title}</h3>
                  <div className="flex items-center gap-1 text-sm">
                    <Flame className="h-4 w-4 text-foreground" />
                    <span className="font-medium">{Math.round(pct)}</span>
                  </div>
                </div>

                <div
                  className="rounded-xl border-2 px-4 py-3 text-center"
                  style={{ borderColor: "hsl(var(--primary))" }}
                >
                  <div className="text-xs text-muted-foreground">Comissão máxima</div>
                  <div className="text-lg font-bold text-primary">{money(maxCommission)}</div>
                </div>

                <FieldBox label="Tipo" value={paymentLabel(detail.payment_type)} />
                <FieldBox label="Email de suporte" value={detail.support_email ?? "—"} />

                <div>
                  <div className="mb-1 text-sm font-semibold">Descrição do produto</div>
                  <div className="rounded-lg border border-border bg-background/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {detail.description || "Sem descrição."}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-sm font-semibold">Descrição para afiliados</div>
                  <div className="max-h-40 overflow-auto rounded-lg border border-border bg-background/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {detail.affiliate_description || "Sem descrição."}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={affiliating}>
                Fechar
              </Button>
              <Button
                onClick={handleAffiliate}
                disabled={
                  affiliating ||
                  alreadyStatus === "approved" ||
                  alreadyStatus === "pending" ||
                  detail.affiliation_mode === "disabled"
                }
                className="text-white sm:min-w-[200px]"
                style={{ background: "var(--gradient-brand)" }}
              >
                {affiliating ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processando...
                  </span>
                ) : alreadyStatus === "approved" ? (
                  "Já afiliado"
                ) : alreadyStatus === "pending" ? (
                  "Aguardando aprovação"
                ) : detail.affiliation_mode === "disabled" ? (
                  "Afiliações desativadas"
                ) : (
                  "Afiliar-se"
                )}
              </Button>
            </div>
            {affiliating && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-background/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  Processando afiliação...
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


function FieldBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

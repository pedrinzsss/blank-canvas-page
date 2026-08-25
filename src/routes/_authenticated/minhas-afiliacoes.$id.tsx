import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, ExternalLink, Facebook, Package } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCheckoutUrl } from "@/lib/checkout-url";

export const Route = createFileRoute("/_authenticated/minhas-afiliacoes/$id")({
  component: AfiliacaoDetalhesPage,
});

type Tab = "info" | "links" | "pixel" | "track";

type Data = {
  id: string;
  commission_percent: number;
  product: {
    id: string;
    title: string;
    description: string | null;
    image_url: string | null;
    affiliate_description: string | null;
  } | null;
  offer: {
    id: string;
    checkout_token: string | null;
    offer_code: string | null;
  } | null;
};

function affiliateCode(affiliationId: string) {
  return affiliationId.replace(/-/g, "").slice(0, 6);
}

function AfiliacaoDetalhesPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("info");
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    (async () => {
      const { data: af } = await supabase
        .from("affiliations")
        .select("id, commission_percent, product_id")
        .eq("id", id)
        .maybeSingle();
      if (!af) {
        setData(null);
        return;
      }
      const { data: product } = await supabase
        .from("products")
        .select("id, title, description, image_url, affiliate_description")
        .eq("id", (af as any).product_id)
        .maybeSingle();
      const { data: offers } = await supabase
        .from("offers")
        .select("id, checkout_token, offer_code, status")
        .eq("product_id", (af as any).product_id)
        .order("created_at", { ascending: true });
      const active = (offers ?? []).find((o: any) => o.status === "active") ?? (offers ?? [])[0];
      setData({
        id: (af as any).id,
        commission_percent: Number((af as any).commission_percent ?? 0),
        product: (product as any) ?? null,
        offer: active
          ? {
              id: (active as any).id,
              checkout_token: (active as any).checkout_token ?? null,
              offer_code: (active as any).offer_code ?? null,
            }
          : null,
      });
    })();
  }, [id]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Informações" },
    { key: "links", label: "Links" },
    { key: "pixel", label: "Pixel de rastreamento" },
    { key: "track", label: "Trackeamento" },
  ];

  const salesUrl = data?.offer?.checkout_token
    ? `${getCheckoutUrl(data.offer.checkout_token)}?ref=${affiliateCode(id)}`
    : null;

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copiado"));
  }

  return (
    <AppShell title="Detalhes da afiliação" subtitle="Gerencie seu produto afiliado">
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/minhas-afiliacoes" })}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex gap-2 border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {!data ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : tab === "info" ? (
            <div className="grid gap-6 pt-6 md:grid-cols-[1fr_auto]">
              <div>
                <h3 className="text-lg font-semibold">Produto</h3>
                <p className="text-sm text-muted-foreground">
                  Você é um afiliado do produto
                </p>
                <div className="mt-4 flex gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {data.product?.image_url ? (
                      <img
                        src={data.product.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-semibold">
                      {data.product?.title ?? "Produto"}
                    </div>
                    {data.product?.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {data.product.description}
                      </p>
                    )}
                  </div>
                </div>

                {data.product?.affiliate_description && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold">Descrição para afiliados</h3>
                    <div className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
                      {data.product.affiliate_description}
                    </div>
                  </div>
                )}
              </div>
              <div className="md:text-right">
                <div className="text-sm font-semibold">Sua comissão</div>
                <div className="mt-2 inline-block rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold text-foreground">
                  {data.commission_percent}%
                </div>
              </div>
            </div>
          ) : tab === "links" ? (
            <div className="space-y-4 pt-6">
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                Evite usar encurtadores de links, pois eles podem ser bloqueados por alguns
                navegadores.
              </div>
              <div>
                <div className="mb-1.5 text-sm font-semibold">Página de vendas</div>
                <div className="flex gap-2">
                  <div className="flex-1 truncate rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
                    {salesUrl ?? "Nenhuma oferta ativa disponível"}
                  </div>
                  {salesUrl && (
                    <>
                      <Button variant="outline" size="icon" onClick={() => copy(salesUrl)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => window.open(salesUrl, "_blank")}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Visualizar página
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : tab === "pixel" ? (
            <div className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                Integre seu produto com diversos pixels de rastreamento para monitorar o
                comportamento dos seus clientes.
              </p>
              <div className="divide-y divide-border rounded-lg border border-border bg-secondary/20">
                <div className="flex items-center gap-3 px-4 py-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#1877F2]/15 text-[#1877F2]">
                    <Facebook className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Facebook</div>
                    <div className="text-xs text-muted-foreground">
                      Traquear as conversões pelo Pixel do Facebook Ads.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-4">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M12 2 2 12l10 10 10-10L12 2Zm0 4.2 5.8 5.8L12 17.8 6.2 12 12 6.2Z" />
                    </svg>
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Google Tag Manager</div>
                    <div className="text-xs text-muted-foreground">
                      Gerenciar as TAG's no site através do Google Tag Manager.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                Configure a integração de rastreamento que deve receber as vendas dos seus
                links de afiliação deste produto.
              </p>
              <div className="rounded-lg border border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary font-bold">
                    U
                  </span>
                  <div>
                    <div className="text-sm font-semibold">UTMify</div>
                    <div className="text-xs text-muted-foreground">
                      Conecte a UTMify que deve receber o rastreamento deste produto afiliado.
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-border bg-background/50 px-4 py-3 text-sm">
                  <div className="font-semibold">Contexto da configuração</div>
                  <div className="mt-1 text-muted-foreground">
                    Produto afiliado: {data.product?.title ?? "—"}
                  </div>
                  <div className="text-muted-foreground">
                    Código de afiliado: {affiliateCode(id)}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Esta integração representa a sua UTMify para este produto. As vendas
                    atribuídas ao seu código de afiliado utilizam esta configuração para o
                    rastreamento.
                  </p>
                </div>
                <div className="mt-3 rounded-md border border-primary/40 bg-primary/5 px-4 py-3 text-sm text-primary">
                  <div className="font-semibold">Uma configuração por produto afiliado</div>
                  <div className="text-primary/80">
                    Você pode manter uma configuração da UTMify para esta afiliação.
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma configuração da UTMify foi conectada para este produto afiliado
                  ainda.
                </div>
                <Button
                  variant="outline"
                  className="mt-3 w-full border-border text-foreground hover:bg-foreground/10 hover:text-foreground"
                  onClick={() => toast.info("Em breve")}
                >
                  Conectar UTMify
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

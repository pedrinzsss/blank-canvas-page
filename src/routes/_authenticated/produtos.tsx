import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Eye, MoreVertical, Package, ShoppingCart, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { resolveProductImageUrl } from "@/lib/product-image";
import { SimpleCreateProductDialog } from "@/components/products/simple-create-product-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: ProdutosPage,
});

interface ProductRow {
  id: string;
  title: string;
  image_url: string | null;
  product_type: string;
  payment_type: string;
  price_cents: number | null;
  recurrence_price_cents: number | null;
  is_active: boolean;
  created_at: string;
}

function formatPrice(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProdutosPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"meus" | "coproducao">("meus");
  const [createOpen, setCreateOpen] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toDelete, setToDelete] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [imageUrlByProduct, setImageUrlByProduct] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, title, image_url, product_type, payment_type, price_cents, recurrence_price_cents, is_active, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as ProductRow[];
    setProducts(rows);
    setLoading(false);
    const entries = await Promise.all(
      rows
        .filter((r) => r.image_url)
        .map(async (r) => [r.id, await resolveProductImageUrl(r.image_url)] as const),
    );
    setImageUrlByProduct(
      Object.fromEntries(entries.filter(([, url]) => !!url) as Array<[string, string]>),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => (tab === "meus" ? products : []), [tab, products]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", toDelete.id);
    if (error) {
      toast.error(error.message);
    } else {
      await logAudit("product_delete", { product_id: toDelete.id, title: toDelete.title });
      toast.success("Produto deletado");
      setToDelete(null);
      load();
    }
    setDeleting(false);
  }

  function goToProduct(id: string) {
    navigate({ to: "/produtos/$id", params: { id } });
  }

  return (
    <AppShell title="Produtos">
      <div className="space-y-6 p-6">
        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex items-center gap-8">
            {(
              [
                ["meus", "Meus produtos"],
                ["coproducao", "Coprodução"],
              ] as const
            ).map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`relative pb-3 text-sm font-medium transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  {active && (
                    <span
                      className="absolute inset-x-0 -bottom-px h-0.5 rounded-full"
                      style={{ background: "var(--gradient-brand, hsl(var(--primary)))" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => {
              const price =
                p.payment_type === "recorrente"
                  ? formatPrice(p.recurrence_price_cents)
                  : formatPrice(p.price_cents);
              return (
                <div
                  key={p.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                      {imageUrlByProduct[p.id] ? (
                        <img
                          src={imageUrlByProduct[p.id]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => goToProduct(p.id)}
                        className="block truncate text-left font-semibold text-foreground hover:underline"
                      >
                        {p.title}
                      </button>
                      <div className="mt-1 text-sm font-semibold text-foreground">{price}</div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            p.is_active
                              ? "bg-foreground/10 text-foreground"
                              : "bg-slate-500/15 text-slate-300"
                          }`}
                        >
                          {p.is_active ? "Ativo" : "Oculto"}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => goToProduct(p.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setToDelete(p)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SimpleCreateProductDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={load}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto{" "}
              <span className="font-medium">{toDelete?.title}</span> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-border p-10">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center -space-x-3">
          <IconBubble>
            <Box className="h-5 w-5 text-primary" />
          </IconBubble>
          <IconBubble>
            <ShoppingCart className="h-5 w-5 text-primary" />
          </IconBubble>
          <IconBubble>
            <Star className="h-5 w-5 text-primary" />
          </IconBubble>
        </div>
        <h3 className="mt-5 text-base font-semibold text-foreground">Ainda não há produtos</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece criando seu primeiro produto para visualizar aqui.
        </p>
        <Button
          onClick={onCreate}
          className="mt-5 rounded-full px-6 text-foreground"
          variant="outline"
        >
          Criar Produto
        </Button>
      </div>
    </div>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card shadow-sm">
      {children}
    </div>
  );
}

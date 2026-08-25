import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/minhas-afiliacoes")({
  component: MinhasAfiliacoesPage,
});

type Row = {
  id: string;
  status: string;
  commission_percent: number;
  created_at: string;
  product: {
    id: string;
    title: string;
    image_url: string | null;
    payment_type: string;
  } | null;
};

function statusLabel(s: string) {
  if (s === "approved")
    return { label: "Aprovado", cls: "bg-foreground/10 text-foreground" };
  if (s === "pending") return { label: "Pendente", cls: "bg-amber-500/15 text-amber-500" };
  if (s === "rejected")
    return { label: "Rejeitado", cls: "bg-destructive/15 text-destructive" };
  return { label: s, cls: "bg-muted text-muted-foreground" };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("pt-BR");
  return `${time} - ${date}`;
}

function MinhasAfiliacoesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setRows([]);
        return;
      }
      const { data: afs } = await supabase
        .from("affiliations")
        .select("id, status, commission_percent, created_at, product_id")
        .eq("affiliate_user_id", userData.user.id)
        .order("created_at", { ascending: false });
      const list = (afs ?? []) as any[];
      const ids = list.map((r) => r.product_id);
      const productsMap = new Map<string, any>();
      if (ids.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, title, image_url, payment_type")
          .in("id", ids);
        (products ?? []).forEach((p: any) => productsMap.set(p.id, p));
      }
      setRows(
        list.map((r) => ({
          id: r.id,
          status: r.status,
          commission_percent: Number(r.commission_percent ?? 0),
          created_at: r.created_at,
          product: productsMap.get(r.product_id) ?? null,
        })),
      );
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => (r.product?.title ?? "").toLowerCase().includes(s));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  return (
    <AppShell title="Minhas Afiliações" subtitle="Produtos aos quais você é afiliado">
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Produtos afiliados</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Lista de produtos que você está afiliado
              </p>
            </div>
            <Button
              onClick={() => navigate({ to: "/marketplace" })}
              className="bg-primary text-white hover:bg-primary"
            >
              Quero me afiliar a um produto
            </Button>
          </div>

          <div className="mt-6 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium">Data de afiliação</th>
                  <th className="px-4 py-3 font-medium text-primary text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows === null ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-muted-foreground">
                      Nenhuma afiliação encontrada
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => {
                    const st = statusLabel(r.status);
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                              {r.product?.image_url ? (
                                <img
                                  src={r.product.image_url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-muted-foreground">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-primary">
                                {r.product?.title ?? "Produto"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}
                          >
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={r.status !== "approved"}
                            onClick={() =>
                              navigate({
                                to: "/minhas-afiliacoes/$id",
                                params: { id: r.id },
                              })
                            }
                          >
                            Ver detalhes
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="text-muted-foreground">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Por página</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

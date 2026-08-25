import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/minhas-coproducoes")({
  component: MinhasCoproducoesPage,
});

interface Row {
  id: string;
  commission_percent: number;
  created_at: string;
  product: { id: string; title: string | null; image_url: string | null } | null;
}

function MinhasCoproducoesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("product_coproducers" as any)
        .select("id, commission_percent, created_at, product_id")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Erro ao carregar coproduções");
        setRows([]);
        setLoading(false);
        return;
      }
      const list = (data ?? []) as unknown as {
        id: string;
        commission_percent: number;
        created_at: string;
        product_id: string;
      }[];
      if (list.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: products } = await supabase
        .from("products")
        .select("id, title, image_url")
        .in("id", list.map((r) => r.product_id));
      const map = new Map<string, any>();
      (products ?? []).forEach((p: any) => map.set(p.id, p));
      setRows(
        list.map((r) => ({
          id: r.id,
          commission_percent: r.commission_percent,
          created_at: r.created_at,
          product: map.get(r.product_id) ?? null,
        })),
      );
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => (r.product?.title ?? "").toLowerCase().includes(s));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <AppShell title="Minhas Co-Produções" subtitle="Produtos em que você atua como co-produtor">
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div>
            <h2
              className="text-xl font-bold"
              style={{
                background: "var(--gradient-brand)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Produtos coprodutor
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lista de produtos que você um coprodutor
            </p>
          </div>

          <div className="mt-6">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar"
              className="h-11 rounded-full bg-secondary/60"
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Comissão</th>
                  <th className="px-4 py-3 font-medium">Data início da coprodução</th>
                  <th className="px-4 py-3 text-right font-medium text-primary">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center font-semibold">
                      Sem resultados
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.product?.image_url ? (
                            <img
                              src={r.product.image_url}
                              alt=""
                              className="h-9 w-9 rounded object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted" />
                          )}
                          <span className="font-medium">{r.product?.title ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{Number(r.commission_percent).toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground">—</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Por página</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
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

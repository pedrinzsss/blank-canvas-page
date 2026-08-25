import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileDown, Eye, MessageCircle, Plus } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes")({
  component: ClientesPage,
});

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip_code: string | null;
  approved: number;
  created_at: string;
};

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${hh}:${mm} - ${dd}/${mo}/${yy}`;
  } catch {
    return "—";
  }
}

function whatsappUrl(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

function ClientesPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    document: "",
    phone: "",
    email: "",
    zip_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const loadCustomers = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    const { data: clients } = await supabase
      .from("api_clients")
      .select("id")
      .eq("user_id", uid);
    const clientIds = (clients ?? []).map((c) => c.id);
    if (clientIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });
    const customerIds = (customers ?? []).map((c) => c.id);
    const approvedByCustomer = new Map<string, number>();
    if (customerIds.length > 0) {
      const { data: charges } = await supabase
        .from("charges")
        .select("customer_id, status")
        .in("customer_id", customerIds)
        .eq("status", "paid");
      for (const ch of charges ?? []) {
        if (!ch.customer_id) continue;
        approvedByCustomer.set(
          ch.customer_id,
          (approvedByCustomer.get(ch.customer_id) ?? 0) + 1,
        );
      }
    }
    const mapped: CustomerRow[] = (customers ?? []).map((c) => ({
      ...c,
      approved: approvedByCustomer.get(c.id) ?? 0,
    })) as CustomerRow[];
    setRows(mapped);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Não autenticado");

      let { data: clients } = await supabase
        .from("api_clients")
        .select("id")
        .eq("user_id", uid)
        .limit(1);

      let clientId = clients?.[0]?.id;

      if (!clientId) {
        const { data: newClient, error: clientErr } = await supabase
          .from("api_clients")
          .insert({
            name: "Default Client",
            user_id: uid,
            environment: "live",
          })
          .select()
          .single();

        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }

      const { error } = await supabase.from("customers").insert({
        client_id: clientId,
        name: formData.name,
        document: formData.document,
        phone: formData.phone,
        email: formData.email,
        address_zip_code: formData.zip_code,
        address_street: formData.street,
        address_number: formData.number,
        address_complement: formData.complement,
        address_neighborhood: formData.neighborhood,
        address_city: formData.city,
        address_state: formData.state,
        metadata: {},
      });

      if (error) throw error;

      toast.success("Cliente cadastrado com sucesso!");
      setIsModalOpen(false);
      setFormData({
        name: "",
        document: "",
        phone: "",
        email: "",
        zip_code: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      });
      loadCustomers();
    } catch (err: any) {
      toast.error("Erro ao cadastrar cliente: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <AppShell title="Clientes" subtitle="Lista de clientes cadastrados no sistema">
      <div className="space-y-6 p-6">
        {/* Filtros */}
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
            <div className="flex items-center gap-2">
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo cliente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastrar novo cliente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCustomer} className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: João Silva"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="document">CPF/CNPJ</Label>
                        <Input
                          id="document"
                          required
                          value={formData.document}
                          onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="joao@exemplo.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                          id="phone"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border mt-2">
                      <h4 className="text-sm font-medium">Endereço Completo</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zip_code">CEP</Label>
                          <Input
                            id="zip_code"
                            value={formData.zip_code}
                            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="street">Rua/Logradouro</Label>
                          <Input
                            id="street"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            placeholder="Rua das Flores"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="number">Número</Label>
                          <Input
                            id="number"
                            value={formData.number}
                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="complement">Complemento</Label>
                          <Input
                            id="complement"
                            value={formData.complement}
                            onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                            placeholder="Apto 101"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="neighborhood">Bairro</Label>
                          <Input
                            id="neighborhood"
                            value={formData.neighborhood}
                            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                            placeholder="Centro"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Cidade</Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            placeholder="São Paulo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">Estado</Label>
                          <Input
                            id="state"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            placeholder="SP"
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsModalOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isSubmitting ? "Salvando..." : "Cadastrar Cliente"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Nome/email do cliente"
            className="h-11 bg-secondary/40"
          />
        </section>

        {/* Tabela */}
        <section className="rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-4 font-medium">Email</th>
                  <th className="px-5 py-4 font-medium">Telefone</th>
                  <th className="px-5 py-4 font-medium">Tx. aprovadas</th>
                  <th className="px-5 py-4 font-medium">Data de cadastro</th>
                  <th className="px-5 py-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center text-sm text-muted-foreground"
                    >
                      Carregando clientes...
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-16 text-center text-sm text-muted-foreground"
                    >
                      Nenhum cliente cadastrado ainda. Quando alguém comprar um
                      dos seus produtos, ele aparecerá aqui automaticamente.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => {
                    const wa = whatsappUrl(r.phone);
                    return (
                      <tr key={r.id} className="border-b border-border/60 last:border-0">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-foreground">{r.name}</div>
                          <div className="text-xs text-primary">{r.email ?? "—"}</div>
                        </td>
                        <td className="px-5 py-4 text-foreground">{r.phone ?? "—"}</td>
                        <td className="px-5 py-4 text-foreground">
                          {r.approved > 0 ? r.approved : "-"}
                        </td>
                        <td className="px-5 py-4 text-foreground">{formatDateTime(r.created_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <button
                                  type="button"
                                  title="Ver detalhes"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Detalhes do Cliente</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Informações Pessoais</h4>
                                    <div className="mt-2 space-y-1 text-sm">
                                      <p><span className="font-medium">Nome:</span> {r.name}</p>
                                      <p><span className="font-medium">CPF/CNPJ:</span> {r.document || "—"}</p>
                                      <p><span className="font-medium">Email:</span> {r.email || "—"}</p>
                                      <p><span className="font-medium">Telefone:</span> {r.phone || "—"}</p>
                                    </div>
                                  </div>
                                  {(r.address_street || r.address_zip_code) && (
                                    <div className="pt-3 border-t border-border">
                                      <h4 className="text-xs font-semibold text-muted-foreground uppercase">Endereço</h4>
                                      <div className="mt-2 space-y-1 text-sm">
                                        <p><span className="font-medium">CEP:</span> {r.address_zip_code || "—"}</p>
                                        <p><span className="font-medium">Rua:</span> {r.address_street || "—"}, {r.address_number || "S/N"}</p>
                                        {r.address_complement && <p><span className="font-medium">Compl.:</span> {r.address_complement}</p>}
                                        <p><span className="font-medium">Bairro:</span> {r.address_neighborhood || "—"}</p>
                                        <p><span className="font-medium">Cidade/UF:</span> {r.address_city || "—"}/{r.address_state || "—"}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="pt-3 border-t border-border">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Histórico</h4>
                                    <div className="mt-2 space-y-1 text-sm">
                                      <p><span className="font-medium">Data de Cadastro:</span> {formatDateTime(r.created_at)}</p>
                                      <p><span className="font-medium">Transações Aprovadas:</span> {r.approved}</p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            {wa ? (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Conversar no WhatsApp"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-foreground/10 text-foreground hover:bg-foreground/10"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-secondary/40 text-muted-foreground/50">
                                <MessageCircle className="h-4 w-4" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <span>Por página</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
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
        </section>
      </div>
    </AppShell>
  );
}

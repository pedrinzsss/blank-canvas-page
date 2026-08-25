import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Mail, Plus, Shield, ShieldBan, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/colaboradores")({
  component: CollaboratorsPage,
});

type Collaborator = {
  id: string;
  email: string;
  role: string | null;
  active: boolean;
  user_id: string | null;
  created_at: string | null;
};

function CollaboratorsPage() {
  const db = supabase as any;
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("admin_collaborators")
      .select("id, email, role, active, user_id, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(`Erro ao carregar colaboradores: ${error.message}`);
    setRows((data ?? []) as Collaborator[]);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCollaborator(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    const { error } = await db.rpc("admin_add_collaborator", { _email: email.trim() });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Acesso administrativo concedido com autenticação segura");
    setEmail("");
    setOpen(false);
    await load();
  }

  async function setActive(row: Collaborator, active: boolean) {
    const { error } = await db.rpc("admin_set_collaborator_active", {
      _id: row.id,
      _active: active,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(active ? "Colaborador reativado" : "Colaborador bloqueado");
    await load();
  }

  async function remove(row: Collaborator) {
    if (!confirm(`Remover o acesso administrativo de ${row.email}?`)) return;
    const { error } = await db.rpc("admin_remove_collaborator", { _id: row.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Acesso removido");
    await load();
  }

  return (
    <AdminShell title="Colaboradores" subtitle="Acessos administrativos protegidos pelo login da plataforma">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Equipe administrativa</h2>
            <p className="text-sm text-muted-foreground">
              Senhas ficam exclusivamente no sistema de autenticação e nunca são armazenadas nesta tabela.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Adicionar colaborador</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar colaborador</DialogTitle>
                <DialogDescription>
                  A pessoa precisa criar uma conta normalmente antes de receber acesso administrativo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addCollaborator} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="collaborator-email">E-mail da conta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="collaborator-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="colaborador@empresa.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Conceder acesso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Permissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum colaborador cadastrado</TableCell></TableRow>
              ) : rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>Administrador</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.active ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>
                      {row.active ? "Ativo" : "Bloqueado"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => void setActive(row, !row.active)}>
                        {row.active ? <ShieldBan className="mr-2 h-4 w-4" /> : <Shield className="mr-2 h-4 w-4" />}
                        {row.active ? "Bloquear" : "Reativar"}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => void remove(row)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminShell>
  );
}

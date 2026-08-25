import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Trash2, Mail, Lock, Shield, Loader2, Edit2, Check } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/colaboradores")({
  component: CollaboratorsPage,
});

interface Collaborator {
  id: string;
  email: string;
  password?: string;
  role: string | null;
  created_at: string | null;
}

function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCollab, setCurrentCollab] = useState<Collaborator | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCollaborators();
  }, []);

  async function loadCollaborators() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_collaborators")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCollaborators(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar colaboradores: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from("admin_collaborators").insert([
        {
          email: email.trim(),
          password: password,
          role: role,
        },
      ]);

      if (error) throw error;

      toast.success("Colaborador criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      loadCollaborators();
    } catch (error: any) {
      toast.error("Erro ao criar colaborador: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCollab || !email) return;

    try {
      setSubmitting(true);
      const updateData: any = {
        email: email.trim(),
        role: role,
      };
      
      if (password) {
        updateData.password = password;
      }

      const { error } = await supabase
        .from("admin_collaborators")
        .update(updateData)
        .eq("id", currentCollab.id);

      if (error) throw error;

      toast.success("Colaborador atualizado com sucesso!");
      setIsEditDialogOpen(false);
      resetForm();
      loadCollaborators();
    } catch (error: any) {
      toast.error("Erro ao atualizar colaborador: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setEmail("");
    setPassword("");
    setRole("admin");
    setCurrentCollab(null);
  }

  function openEdit(collab: Collaborator) {
    setCurrentCollab(collab);
    setEmail(collab.email);
    setPassword(""); // Keep blank unless changing
    setRole(collab.role || "admin");
    setIsEditDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este colaborador?")) return;

    try {
      const { error } = await supabase
        .from("admin_collaborators")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Colaborador excluído");
      loadCollaborators();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  }

  return (
    <AdminShell title="Colaboradores" subtitle="Gerencie as credenciais de acesso ao painel administrativo">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Lista de Colaboradores</h2>
            <p className="text-sm text-muted-foreground">Usuários com acesso ao painel admin</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo colaborador</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador Total</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="support">Suporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Credenciais"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if(!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar colaborador</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">Senha (deixe em branco para manter)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-password"
                    type="password"
                    placeholder="Nova senha opcional"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Função</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador Total</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="support">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar Colaborador"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : collaborators.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    Nenhum colaborador cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                collaborators.map((collab) => (
                  <TableRow key={collab.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        {collab.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {collab.role === 'admin' ? 'Administrador' : collab.role === 'manager' ? 'Gerente' : 'Suporte'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {collab.created_at ? new Date(collab.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : "—"}
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => openEdit(collab)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(collab.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-primary">Nota de Segurança</p>
            <p className="text-muted-foreground">
              Quem acessar pela tela de login com a credencial criada na aba colaboradores terá acesso ao mesmo painel admin.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
